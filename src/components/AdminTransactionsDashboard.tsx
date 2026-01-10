import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  DollarSign, 
  TrendingUp, 
  Users,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  stripe_payment_intent_id: string;
  buyer_id: string;
  seller_id: string;
  submission_id: string;
  amount_total: number;
  amount_seller: number;
  amount_commission: number;
  currency: string;
  status: string;
  created_at: string;
  buyer_profile?: {
    display_name: string;
    email: string;
  };
  seller_profile?: {
    display_name: string;
    email: string;
  };
  content_submissions?: {
    title: string;
  };
}

interface AdminStats {
  total_revenue: number;
  total_commission: number;
  total_transactions: number;
  active_sellers: number;
}

export const AdminTransactionsDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_revenue: 0,
    total_commission: 0,
    total_transactions: 0,
    active_sellers: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      console.log('Fetching admin transactions...');

      // Fetch transactions with content submissions only (no FK to profiles)
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select(`
          *,
          content_submissions(title)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Erreur lors du chargement des transactions');
        return;
      }

      // Fetch profiles separately for buyers and sellers
      const buyerIds = [...new Set(transactionsData?.map(t => t.buyer_id) || [])];
      const sellerIds = [...new Set(transactionsData?.map(t => t.seller_id) || [])];
      const allUserIds = [...new Set([...buyerIds, ...sellerIds])];

      let profilesMap: Record<string, { display_name: string; email: string }> = {};

      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .in('user_id', allUserIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = { display_name: p.display_name || '', email: p.email };
            return acc;
          }, {} as Record<string, { display_name: string; email: string }>);
        }
      }

      // Merge transactions with profile data
      const enrichedTransactions = (transactionsData || []).map(t => ({
        ...t,
        buyer_profile: profilesMap[t.buyer_id],
        seller_profile: profilesMap[t.seller_id]
      }));

      console.log('Transactions loaded:', enrichedTransactions.length);
      setTransactions(enrichedTransactions);

      // Calculate stats
      const successfulTransactions = enrichedTransactions.filter(t => t.status === 'succeeded');
      const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount_total, 0);
      const totalCommission = successfulTransactions.reduce((sum, t) => sum + t.amount_commission, 0);
      const uniqueSellers = new Set(successfulTransactions.map(t => t.seller_id)).size;

      setStats({
        total_revenue: Math.round(totalRevenue / 100),
        total_commission: Math.round(totalCommission / 100),
        total_transactions: successfulTransactions.length,
        active_sellers: uniqueSellers
      });

    } catch (error) {
      console.error('Error in fetchTransactions:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.content_submissions?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.buyer_profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.seller_profile?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.stripe_payment_intent_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default">Réussi</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échoué</Badge>;
      case 'canceled':
        return <Badge variant="outline">Annulé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'affaires</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_revenue.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Total des transactions réussies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_commission.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">
              Revenus de la plateforme
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_transactions}</div>
            <p className="text-xs text-muted-foreground">
              Paiements réussis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendeurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_sellers}</div>
            <p className="text-xs text-muted-foreground">
              Vendeurs avec ventes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Gestion et suivi de toutes les transactions de la marketplace
          </CardDescription>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={fetchTransactions}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Chargement des transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {transaction.content_submissions?.title || 'Contenu supprimé'}
                      </h4>
                      {getStatusBadge(transaction.status)}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {(transaction.amount_total / 100).toFixed(2)}€
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Commission: {(transaction.amount_commission / 100).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div>
                      <p><strong>Acheteur:</strong> {transaction.buyer_profile?.display_name || 'Utilisateur supprimé'}</p>
                      <p className="text-xs">{transaction.buyer_profile?.email || ''}</p>
                    </div>
                    <div>
                      <p><strong>Vendeur:</strong> {transaction.seller_profile?.display_name || 'Utilisateur supprimé'}</p>
                      <p className="text-xs">{transaction.seller_profile?.email || ''}</p>
                    </div>
                    <div className="text-right">
                      <p><strong>Date:</strong> {new Date(transaction.created_at).toLocaleDateString()}</p>
                      <p className="text-xs">ID: {transaction.stripe_payment_intent_id.slice(-8)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};