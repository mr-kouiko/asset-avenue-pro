import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Store,
  RefreshCw,
  Package,
  DollarSign,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface VendorData {
  user_id: string;
  display_name: string | null;
  store_name: string | null;
  email_masked: string;
  created_at: string;
  total_products: number;
  approved_products: number;
  pending_products: number;
  total_sales: number;
}

export const AdminVendorManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch vendors with their stats
  const { data: vendors, isLoading, refetch } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      // Get all creators
      const { data: profiles, error: profilesError } = await supabase.rpc('get_admin_profiles_safe');
      if (profilesError) throw profilesError;

      const creators = profiles?.filter(p => p.role === 'creator') || [];

      // Get submissions counts for each creator
      const vendorData: VendorData[] = await Promise.all(
        creators.map(async (creator) => {
          const { data: submissions } = await supabase
            .from('content_submissions')
            .select('id, status')
            .eq('creator_id', creator.user_id);

          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount_seller')
            .eq('seller_id', creator.user_id)
            .eq('status', 'succeeded');

          const totalSales = transactions?.reduce((sum, t) => sum + (t.amount_seller || 0), 0) || 0;

          return {
            user_id: creator.user_id,
            display_name: creator.display_name,
            store_name: creator.store_name,
            email_masked: creator.email_masked,
            created_at: creator.created_at,
            total_products: submissions?.length || 0,
            approved_products: submissions?.filter(s => s.status === 'approved').length || 0,
            pending_products: submissions?.filter(s => s.status === 'pending').length || 0,
            total_sales: totalSales / 100,
          };
        })
      );

      return vendorData;
    }
  });

  const filteredVendors = vendors?.filter(vendor => 
    searchTerm === '' || 
    vendor.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email_masked?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalVendors = vendors?.length || 0;
  const activeVendors = vendors?.filter(v => v.total_products > 0).length || 0;
  const totalProducts = vendors?.reduce((sum, v) => sum + v.total_products, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Vendor Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Store className="h-4 w-4" />
              Total vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVendors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Active vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activeVendors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Vendors List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Gestion des vendeurs
          </CardTitle>
          <CardDescription>
            Suivi et gestion de tous les vendeurs de la marketplace
          </CardDescription>
          <div className="flex items-center gap-4 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Rechercher vendeurs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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
              <p className="text-muted-foreground mt-2">Chargement des vendeurs...</p>
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun vendeur trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVendors.map((vendor) => (
                <div key={vendor.user_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{vendor.store_name || vendor.display_name || 'No name'}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{vendor.email_masked}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined on {new Date(vendor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <p className="text-lg font-semibold">{vendor.total_products}</p>
                      <p className="text-xs text-muted-foreground">Produits</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-500">{vendor.approved_products}</p>
                      <p className="text-xs text-muted-foreground">Approuvés</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{vendor.total_sales.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">Ventes</p>
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
