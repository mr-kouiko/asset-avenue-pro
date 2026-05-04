import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { SecureDownloadButton } from '@/components/SecureDownloadButton';

interface OrderItem {
  id: string;
  submission_id: string | null;
  created_at: string;
  downloaded_at: string | null;
  expires_at: string | null;
  content_title?: string;
  content_price?: number;
  content_file_id?: string;
  file_name?: string;
}

interface ContentFileRow {
  id: string;
  file_name: string;
  is_original: boolean | null;
}

interface DownloadRow {
  id: string;
  submission_id: string | null;
  created_at: string;
  downloaded_at: string | null;
  expires_at: string | null;
  content_submissions: {
    title: string | null;
    price: number | null;
    content_files: ContentFileRow[] | null;
  } | null;
}

export const BuyerOrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('downloads')
        .select(`
          *,
          content_submissions(
            title,
            price,
            content_files(
              id,
              file_name,
              is_original
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithContent = ((data || []) as DownloadRow[]).map((order) => {
        const files = order.content_submissions?.content_files || [];
        const originalFile = files.find((file) => file.is_original) || files[0];

        return {
          id: order.id,
          submission_id: order.submission_id,
          created_at: order.created_at,
          downloaded_at: order.downloaded_at,
          expires_at: order.expires_at,
          content_title: order.content_submissions?.title || 'Deleted content',
          content_price: order.content_submissions?.price || 0,
          content_file_id: originalFile?.id,
          file_name: originalFile?.file_name
        };
      });

      setOrders(ordersWithContent);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getOrderStatus = (order: OrderItem) => {
    if (order.downloaded_at) return 'downloaded';
    if (order.expires_at && new Date(order.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  const getStatusBadge = (order: OrderItem) => {
    const status = getOrderStatus(order);
    switch (status) {
      case 'downloaded':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Downloaded</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">Ready to Download</Badge>;
    }
  };

  const getStatusIcon = (order: OrderItem) => {
    const status = getOrderStatus(order);
    switch (status) {
      case 'downloaded':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Order History</h2>
          <p className="text-muted-foreground">View and manage your purchases</p>
        </div>
        <Button variant="outline" onClick={fetchOrders} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start exploring our marketplace to find amazing content
            </p>
            <Button onClick={() => navigate('/marketplace')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {getStatusIcon(order)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{order.content_title}</h4>
                    {getStatusBadge(order)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Order #{order.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    {order.content_price ? (
                      <>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          ${order.content_price.toFixed(2)}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {order.submission_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/product/${order.submission_id}`)}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                  )}
                  {getOrderStatus(order) !== 'expired' && (
                    order.content_file_id ? (
                      <SecureDownloadButton
                        contentFileId={order.content_file_id}
                        fileName={order.file_name}
                        size="sm"
                        className="gap-2"
                      >
                        Download
                      </SecureDownloadButton>
                    ) : (
                      <Button size="sm" disabled className="gap-2">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    )
                  )}
                </div>
              </div>
              
              {order.downloaded_at && (
                <div className="border-t px-4 py-2 bg-muted/30 text-sm text-muted-foreground">
                  Downloaded on {new Date(order.downloaded_at).toLocaleString()}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
