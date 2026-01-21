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
  User,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const AdminOrdersTracking = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch downloads (orders)
  const { data: downloads, isLoading: downloadsLoading, refetch: refetchDownloads } = useQuery({
    queryKey: ['admin-downloads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('downloads')
        .select(`
          *,
          content_submissions(title, price, creator_id)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
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

  // Fetch PayPal orders
  const { data: paypalOrders, isLoading: paypalLoading, refetch: refetchPaypal } = useQuery({
    queryKey: ['admin-paypal-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paypal_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    }
  });

  const isLoading = downloadsLoading || transactionsLoading || paypalLoading;

  const refetchAll = () => {
    refetchDownloads();
    refetchTransactions();
    refetchPaypal();
  };

  const getOrderStatus = (order: any) => {
    if (order.downloaded_at) return 'downloaded';
    if (order.expires_at && new Date(order.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  const filteredDownloads = downloads?.filter(order => {
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
        return <Badge variant="default" className="bg-green-500">Downloaded</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
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

  // Stats
  const totalDownloads = downloads?.length || 0;
  const downloadedOrders = downloads?.filter(o => getOrderStatus(o) === 'downloaded').length || 0;
  const totalTransactions = transactions?.length || 0;
  const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount_total || 0), 0) || 0;
  const totalCommission = transactions?.reduce((sum, t) => sum + (t.amount_commission || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDownloads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{downloadedOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-blue-500" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{totalTransactions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">${(totalRevenue / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">${(totalCommission / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Downloads List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders & Downloads
          </CardTitle>
          <CardDescription>
            Track all orders and download history
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search orders..."
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
                All
              </Button>
              <Button 
                variant={statusFilter === 'downloaded' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('downloaded')}
              >
                Downloaded
              </Button>
              <Button 
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
              >
                Pending
              </Button>
              <Button 
                variant={statusFilter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('expired')}
              >
                Expired
              </Button>
            </div>
            <Button 
              variant="outline" 
              onClick={refetchAll}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading orders...</p>
            </div>
          ) : filteredDownloads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDownloads.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {getStatusIcon(order)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {order.content_submissions?.title || 'Deleted content'}
                        </h4>
                        {getStatusBadge(order)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {order.id.slice(0, 8)}... | User: {order.user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
                    {order.downloaded_at && (
                      <p className="text-green-500">
                        Downloaded: {new Date(order.downloaded_at).toLocaleDateString()}
                      </p>
                    )}
                    {order.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(order.expires_at).toLocaleDateString()}
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
