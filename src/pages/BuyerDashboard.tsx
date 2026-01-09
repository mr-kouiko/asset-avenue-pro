import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ShoppingBag,
  Download,
  Heart,
  Search,
  Eye,
  Package,
  CreditCard,
  History,
  User,
  Sparkles,
  Coins,
  Calendar,
  TrendingUp,
  Crown,
  RefreshCw,
  ImageIcon,
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

interface CreditStats {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
}

interface CreditPurchase {
  id: string;
  pack_type: string | null;
  credits_amount: number | null;
  amount: number;
  currency: string;
  created_at: string;
  status: string;
}

interface CreditUsage {
  id: string;
  prompt: string;
  created_at: string;
  image_url: string | null;
}

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  credits_per_month: number;
  is_yearly: boolean;
  monthly_price: number;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
}

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPurchases: 0,
    totalDownloads: 0,
    totalSpent: 0,
    favoriteItems: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  
  // Credit-related state
  const [creditStats, setCreditStats] = useState<CreditStats>({
    balance: 0,
    totalPurchased: 0,
    totalUsed: 0,
  });
  const [creditPurchases, setCreditPurchases] = useState<CreditPurchase[]>([]);
  const [creditUsage, setCreditUsage] = useState<CreditUsage[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (user) {
      fetchPurchases();
      fetchCreditsData();
    }
  }, [user]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      
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
      
      const totalPurchases = purchasesData?.length || 0;
      const totalSpent = purchasesData?.reduce((sum, purchase) => 
        sum + (purchase.content_submissions?.price || 0), 0
      ) || 0;
      
      setStats({
        totalPurchases,
        totalDownloads: totalPurchases,
        totalSpent,
        favoriteItems: 0,
      });

    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditsData = async () => {
    if (!user) return;
    
    setCreditsLoading(true);
    try {
      // Fetch credit balance and stats
      const { data: creditsData, error: creditsError } = await supabase
        .from('user_credits')
        .select('credits_balance, total_purchased, total_used')
        .eq('user_id', user.id)
        .single();
      
      if (!creditsError && creditsData) {
        setCreditStats({
          balance: creditsData.credits_balance || 0,
          totalPurchased: creditsData.total_purchased || 0,
          totalUsed: creditsData.total_used || 0,
        });
      }

      // Fetch credit purchase history from paypal_orders
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('paypal_orders')
        .select('id, pack_type, credits_amount, amount, currency, created_at, status')
        .eq('user_id', user.id)
        .eq('order_type', 'credits')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!purchasesError && purchasesData) {
        setCreditPurchases(purchasesData as CreditPurchase[]);
      }

      // Fetch credit usage history (AI image generations)
      const { data: usageData, error: usageError } = await supabase
        .from('ai_image_generations')
        .select('id, prompt, created_at, image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!usageError && usageData) {
        setCreditUsage(usageData as CreditUsage[]);
      }

      // Fetch active subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('id, plan_type, status, credits_per_month, is_yearly, monthly_price, current_period_start, current_period_end, next_billing_date')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!subError && subData) {
        setSubscription(subData as Subscription);
      }

    } catch (error) {
      console.error('Error fetching credits data:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  const refreshCredits = () => {
    fetchCreditsData();
    toast.success('Données de crédits actualisées');
  };

  const formatPackName = (packType: string | null) => {
    if (!packType) return 'Pack crédit';
    const names: Record<string, string> = {
      starter: 'Pack Starter',
      pro: 'Pack Pro',
      premium: 'Pack Premium',
      ultimate: 'Pack Ultimate',
    };
    return names[packType.toLowerCase()] || packType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.content_submissions?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const usagePercentage = creditStats.totalPurchased > 0 
    ? Math.round((creditStats.totalUsed / creditStats.totalPurchased) * 100) 
    : 0;

  return (
    <ProtectedRoute allowedRoles={['client', 'admin']}>
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Tableau de bord acheteur</h1>
              <p className="text-muted-foreground">
                Gérez vos achats, téléchargements et crédits
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="credits" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Crédits
              </TabsTrigger>
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
                    <CardTitle className="text-sm font-medium">Crédits IA</CardTitle>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditStats.balance}</div>
                    <p className="text-xs text-muted-foreground">
                      Crédits disponibles
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
                    <CardTitle className="text-sm font-medium">Images générées</CardTitle>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditStats.totalUsed}</div>
                    <p className="text-xs text-muted-foreground">
                      Via génération IA
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

            {/* Credits Tab */}
            <TabsContent value="credits" className="space-y-6">
              {/* Credit Balance & Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-primary" />
                        Solde de crédits
                      </CardTitle>
                      <CardDescription>
                        Vos crédits disponibles pour la génération d'images IA
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshCredits} disabled={creditsLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${creditsLoading ? 'animate-spin' : ''}`} />
                      Actualiser
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {creditsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-5xl font-bold text-primary">{creditStats.balance}</div>
                            <p className="text-muted-foreground">crédits disponibles</p>
                          </div>
                          <Button asChild>
                            <Link to="/buy-credits">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Acheter des crédits
                            </Link>
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Utilisation totale</span>
                            <span>{creditStats.totalUsed} / {creditStats.totalPurchased} crédits utilisés</span>
                          </div>
                          <Progress value={usagePercentage} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{creditStats.totalPurchased}</div>
                            <p className="text-sm text-muted-foreground">Total acheté</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{creditStats.totalUsed}</div>
                            <p className="text-sm text-muted-foreground">Total utilisé</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subscription Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Abonnement
                    </CardTitle>
                    <CardDescription>
                      Votre plan actuel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {creditsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      </div>
                    ) : subscription ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-yellow-500">
                            {subscription.plan_type}
                          </Badge>
                          {subscription.is_yearly && (
                            <Badge variant="outline">Annuel</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Crédits/mois</span>
                            <span className="font-medium">{subscription.credits_per_month}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prix</span>
                            <span className="font-medium">{subscription.monthly_price}€/mois</span>
                          </div>
                          {subscription.next_billing_date && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Renouvellement</span>
                              <span className="font-medium">{formatDate(subscription.next_billing_date)}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" className="w-full" asChild>
                          <Link to="/packages-pricing">
                            Gérer l'abonnement
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Crown className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground mb-4">Pas d'abonnement actif</p>
                        <Button variant="outline" className="w-full" asChild>
                          <Link to="/packages-pricing">
                            Voir les plans
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Credit Purchase History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Historique des achats de crédits
                  </CardTitle>
                  <CardDescription>
                    Tous vos achats de packs de crédits
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {creditsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : creditPurchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun achat de crédits pour le moment</p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link to="/buy-credits">Acheter des crédits</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creditPurchases.map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Coins className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{formatPackName(purchase.pack_type)}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatDateTime(purchase.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              +{purchase.credits_amount || 0} crédits
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {purchase.amount.toFixed(2)} {purchase.currency}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credit Usage History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historique d'utilisation
                  </CardTitle>
                  <CardDescription>
                    Vos dernières générations d'images IA (1 crédit par génération)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {creditsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : creditUsage.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune image générée pour le moment</p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link to="/ai-image-generator">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Générer une image
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {creditUsage.map((usage) => (
                        <div key={usage.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              {usage.image_url ? (
                                <img 
                                  src={usage.image_url} 
                                  alt="Generated" 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate max-w-md" title={usage.prompt}>
                                {usage.prompt.length > 60 ? usage.prompt.slice(0, 60) + '...' : usage.prompt}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateTime(usage.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Badge variant="outline" className="text-orange-600 border-orange-200">
                              -1 crédit
                            </Badge>
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