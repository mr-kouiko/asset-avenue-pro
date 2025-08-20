import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Download,
  Heart,
  Search,
  Filter,
  Eye,
  Star,
  Package,
  CreditCard,
  History,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface Purchase {
  id: string;
  submission_id: string;
  created_at: string;
  content_submissions: {
    title: string;
    price: number;
    content_files: Array<{
      file_name: string;
      file_type: string;
      thumbnail_path?: string;
    }>;
  };
}

interface Stats {
  totalPurchases: number;
  totalDownloads: number;
  totalSpent: number;
  favoriteItems: number;
}

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPurchases: 0,
    totalDownloads: 0,
    totalSpent: 0,
    favoriteItems: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
      // Fetch user purchases from downloads table
      const { data: purchasesData, error } = await supabase
        .from('downloads')
        .select(`
          id,
          submission_id,
          created_at,
          content_submissions!inner(
            title,
            price,
            content_files(
              file_name,
              file_type,
              thumbnail_path
            )
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchases:', error);
        toast.error('Erreur lors du chargement de vos achats');
        return;
      }

      setPurchases(purchasesData || []);
      
      // Calculate stats
      const totalPurchases = purchasesData?.length || 0;
      const totalSpent = purchasesData?.reduce((sum, purchase) => 
        sum + (purchase.content_submissions?.price || 0), 0
      ) || 0;
      
      setStats({
        totalPurchases,
        totalDownloads: totalPurchases, // For now, assume 1 download per purchase
        totalSpent,
        favoriteItems: 0, // TODO: Implement favorites
      });

    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.content_submissions?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['client', 'admin']}>
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Tableau de bord acheteur</h1>
              <p className="text-muted-foreground">
                Gérez vos achats et téléchargements
              </p>
            </div>
            <Button asChild>
              <Link to="/marketplace">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Explorer le catalogue
              </Link>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="purchases">Mes achats</TabsTrigger>
              <TabsTrigger value="downloads">Téléchargements</TabsTrigger>
              <TabsTrigger value="profile">Profil</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total des achats</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPurchases}</div>
                    <p className="text-xs text-muted-foreground">
                      Contenus achetés
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Téléchargements</CardTitle>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalDownloads}</div>
                    <p className="text-xs text-muted-foreground">
                      Fichiers téléchargés
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Montant dépensé</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSpent.toFixed(2)}€</div>
                    <p className="text-xs text-muted-foreground">
                      Total des achats
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Favoris</CardTitle>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.favoriteItems}</div>
                    <p className="text-xs text-muted-foreground">
                      Contenus favoris
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Purchases */}
              <Card>
                <CardHeader>
                  <CardTitle>Achats récents</CardTitle>
                  <CardDescription>
                    Vos derniers téléchargements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Chargement...</p>
                    </div>
                  ) : purchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun achat effectué pour le moment</p>
                      <Button className="mt-4" asChild>
                        <Link to="/marketplace">Explorer le catalogue</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {purchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{purchase.content_submissions?.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{purchase.content_submissions?.content_files?.length || 0} fichier(s)</span>
                              <span>{purchase.content_submissions?.price ? `${purchase.content_submissions.price}€` : 'Gratuit'}</span>
                              <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Téléchargé</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Purchases Tab */}
            <TabsContent value="purchases" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mes achats</CardTitle>
                  <CardDescription>
                    Tous vos contenus achetés
                  </CardDescription>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Rechercher dans vos achats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Chargement...</p>
                    </div>
                  ) : filteredPurchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun achat trouvé</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPurchases.map((purchase) => (
                        <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="aspect-video bg-muted rounded-md mb-4 flex items-center justify-center">
                              {purchase.content_submissions?.content_files?.[0]?.thumbnail_path ? (
                                <img
                                  src={purchase.content_submissions.content_files[0].thumbnail_path}
                                  alt={purchase.content_submissions.title}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <Eye className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                            <h3 className="font-medium mb-2">{purchase.content_submissions?.title}</h3>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                              <span>{purchase.content_submissions?.content_files?.length || 0} fichier(s)</span>
                              <span>{purchase.content_submissions?.price ? `${purchase.content_submissions.price}€` : 'Gratuit'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge variant="default">Téléchargé</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(purchase.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Downloads Tab */}
            <TabsContent value="downloads" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Téléchargements</CardTitle>
                  <CardDescription>
                    Gérez vos téléchargements et accédez à nouveau à vos fichiers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Fonctionnalité de re-téléchargement à venir</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profil acheteur</CardTitle>
                  <CardDescription>
                    Gérez vos informations personnelles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Gestion du profil à implémenter</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default BuyerDashboard;