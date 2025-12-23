import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  ShoppingCart,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Order {
  id: string;
  user_id: string;
  submission_id: string;
  created_at: string;
  downloaded_at: string | null;
  expires_at: string | null;
  user_profile?: {
    display_name: string;
    email: string;
  };
  content?: {
    title: string;
  };
}

export const AdminOrdersTracking = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: downloads, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('downloads')
        .select(`
          *,
          content_submissions(title)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const getOrderStatus = (order: any) => {
    if (order.downloaded_at) return 'downloaded';
    if (order.expires_at && new Date(order.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  const filteredOrders = downloads?.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.content_submissions?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const status = getOrderStatus(order);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (order: any) => {
    const status = getOrderStatus(order);
    switch (status) {
      case 'downloaded':
        return <Badge variant="default" className="bg-green-500">Téléchargé</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expiré</Badge>;
      default:
        return <Badge variant="secondary">En attente</Badge>;
    }
  };

  const getStatusIcon = (order: any) => {
    const status = getOrderStatus(order);
    switch (status) {
      case 'downloaded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalOrders = downloads?.length || 0;
  const downloadedOrders = downloads?.filter(o => getOrderStatus(o) === 'downloaded').length || 0;
  const pendingOrders = downloads?.filter(o => getOrderStatus(o) === 'pending').length || 0;
  const expiredOrders = downloads?.filter(o => getOrderStatus(o) === 'expired').length || 0;

  return (
    <div className="space-y-6">
      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" />
              Téléchargés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{downloadedOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{pendingOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Expirés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{expiredOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Suivi des commandes
          </CardTitle>
          <CardDescription>
            Historique et suivi de toutes les commandes
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher commandes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tous
              </Button>
              <Button 
                variant={statusFilter === 'downloaded' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('downloaded')}
              >
                Téléchargés
              </Button>
              <Button 
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                En attente
              </Button>
              <Button 
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('expired')}
              >
                Expirés
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Chargement des commandes...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune commande trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getStatusIcon(order)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {order.content_submissions?.title || 'Contenu supprimé'}
                        </h4>
                        {getStatusBadge(order)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {order.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p>Créé le {new Date(order.created_at).toLocaleDateString()}</p>
                    {order.downloaded_at && (
                      <p className="text-green-500">
                        Téléchargé le {new Date(order.downloaded_at).toLocaleDateString()}
                      </p>
                    )}
                    {order.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expire le {new Date(order.expires_at).toLocaleDateString()}
                      </p>
                    )}
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
