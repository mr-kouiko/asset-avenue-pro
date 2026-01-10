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
import { BuyerProfileCard } from "@/components/BuyerProfileCard";

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
        toast.error('Error loading your purchases');
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
      toast.error('Error loading data');
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
    toast.success('Credit data refreshed');
  };

  const formatPackName = (packType: string | null) => {
    if (!packType) return 'Credit Pack';
    const names: Record<string, string> = {
      starter: 'Starter Pack',
      pro: 'Pro Pack',
      premium: 'Premium Pack',
      ultimate: 'Ultimate Pack',
    };
    return names[packType.toLowerCase()] || packType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
              <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your purchases, downloads and credits
              </p>
            </div>
            <Button asChild>
              <Link to="/marketplace">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Catalog
              </Link>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="credits" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Credits
              </TabsTrigger>
              <TabsTrigger value="purchases">My Purchases</TabsTrigger>
              <TabsTrigger value="downloads">Downloads</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPurchases}</div>
                    <p className="text-xs text-muted-foreground">
                      Content purchased
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">AI Credits</CardTitle>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditStats.balance}</div>
                    <p className="text-xs text-muted-foreground">
                      Credits available
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Amount Spent</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                      Total purchases
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Images Generated</CardTitle>
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{creditStats.totalUsed}</div>
                    <p className="text-xs text-muted-foreground">
                      Via AI generation
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Purchases */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Purchases</CardTitle>
                  <CardDescription>
                    Your latest downloads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading...</p>
                    </div>
                  ) : purchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No purchases made yet</p>
                      <Button className="mt-4" asChild>
                        <Link to="/marketplace">Browse Catalog</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {purchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{purchase.content_submissions?.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{purchase.content_submissions?.content_files?.length || 0} file(s)</span>
                              <span>{purchase.content_submissions?.price ? `$${purchase.content_submissions.price}` : 'Free'}</span>
                              <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Downloaded</Badge>
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
                        Credit Balance
                      </CardTitle>
                      <CardDescription>
                        Your available credits for AI image generation
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshCredits} disabled={creditsLoading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${creditsLoading ? 'animate-spin' : ''}`} />
                      Refresh
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
                            <p className="text-muted-foreground">credits available</p>
                          </div>
                          <Button asChild>
                            <Link to="/buy-credits">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Buy Credits
                            </Link>
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total usage</span>
                            <span>{creditStats.totalUsed} / {creditStats.totalPurchased} credits used</span>
                          </div>
                          <Progress value={usagePercentage} className="h-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{creditStats.totalPurchased}</div>
                            <p className="text-sm text-muted-foreground">Total purchased</p>
                          </div>
                          <div className="text-center p-4 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">{creditStats.totalUsed}</div>
                            <p className="text-sm text-muted-foreground">Total used</p>
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
                      Subscription
                    </CardTitle>
                    <CardDescription>
                      Your current plan
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
                            <Badge variant="outline">Yearly</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Credits/month</span>
                            <span className="font-medium">{subscription.credits_per_month}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-medium">${subscription.monthly_price}/month</span>
                          </div>
                          {subscription.next_billing_date && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Renewal</span>
                              <span className="font-medium">{formatDate(subscription.next_billing_date)}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" className="w-full" asChild>
                          <Link to="/packages-pricing">
                            Manage Subscription
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Crown className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground mb-4">No active subscription</p>
                        <Button variant="outline" className="w-full" asChild>
                          <Link to="/packages-pricing">
                            View Plans
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
                    Credit Purchase History
                  </CardTitle>
                  <CardDescription>
                    All your credit pack purchases
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
                      <p>No credit purchases yet</p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link to="/buy-credits">Buy Credits</Link>
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
                              +{purchase.credits_amount || 0} credits
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
                    Usage History
                  </CardTitle>
                  <CardDescription>
                    Your recent AI image generations (1 credit per generation)
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
                      <p>No images generated yet</p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link to="/ai-image-generator">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate an Image
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
                              -1 credit
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
                  <CardTitle>My Purchases</CardTitle>
                  <CardDescription>
                    All your purchased content
                  </CardDescription>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search your purchases..."
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
                      <p className="text-muted-foreground mt-2">Loading...</p>
                    </div>
                  ) : filteredPurchases.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No purchases found</p>
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
                              <span>{purchase.content_submissions?.content_files?.length || 0} file(s)</span>
                              <span>{purchase.content_submissions?.price ? `$${purchase.content_submissions.price}` : 'Free'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge variant="default">Downloaded</Badge>
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
                  <CardTitle>Downloads</CardTitle>
                  <CardDescription>
                    Manage your downloads and access your files again
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Re-download feature coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <BuyerProfileCard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default BuyerDashboard;