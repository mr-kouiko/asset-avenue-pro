import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Store,
  ShoppingCart,
  BarChart3,
  Lock,
  Search,
  MessageSquare,
  Flag,
  FileArchive,
  HardDrive
} from "lucide-react";
import { Bot } from "lucide-react";
import { AdminTransactionsDashboard } from "@/components/AdminTransactionsDashboard";
import { AdminSEOCoPilot } from "@/components/admin/AdminSEOCoPilot";
import { AdminPayoutsPanel } from "@/components/admin/AdminPayoutsPanel";
import { Wallet } from "lucide-react";
import { AdminUsersManagement } from "@/components/admin/AdminUsersManagement";
import { AdminSecurityLogs } from "@/components/admin/AdminSecurityLogs";
import { AdminVendorManagement } from "@/components/admin/AdminVendorManagement";
import { AdminOrdersTracking } from "@/components/admin/AdminOrdersTracking";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { AdminSupportTickets } from "@/components/admin/AdminSupportTickets";
import { AdminContentReports } from "@/components/admin/AdminContentReports";
import { AdminBulkExport } from "@/components/admin/AdminBulkExport";
import { AdminIntegrityPanel } from "@/components/admin/AdminIntegrityPanel";
import { AdminProductTranslations } from "@/components/admin/AdminProductTranslations";
import { AdminModerationQueue } from "@/components/admin/AdminModerationQueue";
import { AdminVideoBackfill } from "@/components/admin/AdminVideoBackfill";
import { AdminFailedPreviews } from "@/components/admin/AdminFailedPreviews";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AUTHORIZED_ADMIN_EMAIL = "info@visitenow.ma";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Double-check admin authorization
  useEffect(() => {
    const checkAdminAuthorization = async () => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      // Verify the user email matches the authorized admin
      if (user.email !== AUTHORIZED_ADMIN_EMAIL) {
        toast.error("Accès non autorisé. Cette zone est réservée à l'administrateur.");
        navigate("/");
        return;
      }

      // Also verify in database
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role !== 'admin') {
        toast.error("Accès non autorisé.");
        navigate("/");
        return;
      }

      setIsAuthorized(true);
      setCheckingAuth(false);
    };

    if (!authLoading) {
      checkAdminAuthorization();
    }
  }, [user, authLoading, navigate]);

  // Fetch admin stats using secure RPC
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
      
      if (error) throw error;
      
      return {
        totalUsers: Number(data[0]?.total_users || 0),
        totalSubmissions: Number(data[0]?.total_submissions || 0),
        pendingSubmissions: Number(data[0]?.pending_submissions || 0),
        approvedSubmissions: Number(data[0]?.approved_submissions || 0),
        rejectedSubmissions: Number(data[0]?.rejected_submissions || 0),
        totalRevenue: Number(data[0]?.total_revenue || 0)
      };
    },
    enabled: isAuthorized
  });

  // Fetch recent submissions for review
  const { data: submissions, isLoading: submissionsLoading, refetch: refetchSubmissions } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_submissions')
        .select(`
          id, 
          title, 
          description, 
          status, 
          price, 
          created_at,
          rejection_reason,
          profiles:creator_id (display_name, store_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      return data;
    },
    enabled: isAuthorized
  });

  const updateSubmissionStatus = async (id: string, status: string, rejectionReason?: string) => {
    const { error } = await supabase
      .from('content_submissions')
      .update({ 
        status, 
        rejection_reason: rejectionReason || null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        approved_by: status === 'approved' ? user?.id : null
      })
      .eq('id', id);

    if (error) {
      toast.error('Error updating status');
      return;
    }

    toast.success(`Content ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'}`);
    refetchSubmissions();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'pending':
        return 'En attente';
      case 'rejected':
        return 'Rejeté';
      default:
        return 'Inconnu';
    }
  };

  // Show loading while checking authorization
  if (authLoading || checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
            <p className="text-muted-foreground">
              Contrôle total de la marketplace VisuStock
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Exclusif
            </Badge>
            <Badge variant="outline" className="text-xs">
              {user?.email}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-12 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-1">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Payouts</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Support</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1">
              <Flag className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">SEO</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1">
              <FileArchive className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
            <TabsTrigger value="integrity" className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              <span className="hidden sm:inline">Integrity</span>
            </TabsTrigger>
          </TabsList>

          {/* AI Moderation Tab */}
          <TabsContent value="moderation">
            <AdminModerationQueue />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs totaux</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.totalUsers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilisateurs inscrits
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statsLoading ? '...' : `${stats?.totalRevenue?.toFixed(2) || '0.00'}€`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenus de la plateforme
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En attente</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {statsLoading ? '...' : stats?.pendingSubmissions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contenus à modérer
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approuvés</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.approvedSubmissions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sur {statsLoading ? '...' : stats?.totalSubmissions || 0} soumis
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab('users')}>
                <CardContent className="flex items-center gap-4 p-6">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Gérer les utilisateurs</h3>
                    <p className="text-sm text-muted-foreground">Voir tous les comptes</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab('content')}>
                <CardContent className="flex items-center gap-4 p-6">
                  <FileText className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">Modérer le contenu</h3>
                    <p className="text-sm text-muted-foreground">{stats?.pendingSubmissions || 0} en attente</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveTab('security')}>
                <CardContent className="flex items-center gap-4 p-6">
                  <Shield className="h-8 w-8 text-red-500" />
                  <div>
                    <h3 className="font-semibold">Logs de sécurité</h3>
                    <p className="text-sm text-muted-foreground">Surveiller l'activité</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Settings Quick Access */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AdminSettings />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUsersManagement />
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <AdminVendorManagement />
          </TabsContent>

          {/* Content Moderation Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Modération des contenus</CardTitle>
                <CardDescription>
                  Approuvez ou rejetez les contenus soumis par les créateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Chargement...</p>
                  </div>
                ) : submissions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun contenu à modérer</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions?.map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{submission.title}</h4>
                            {getStatusIcon(submission.status)}
                            <Badge
                              variant={
                                submission.status === "approved" ? "default" :
                                submission.status === "rejected" ? "destructive" : "secondary"
                              }
                            >
                              {getStatusLabel(submission.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {submission.description}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>By: {(submission.profiles as any)?.display_name || (submission.profiles as any)?.store_name || 'Anonymous Creator'}</span>
                            <span>{submission.price ? `€${submission.price}` : 'Free'}</span>
                            <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                          </div>
                          {submission.rejection_reason && (
                            <p className="text-sm text-red-600 mt-2">
                              Rejection reason: {submission.rejection_reason}
                            </p>
                          )}
                        </div>
                        
                        {submission.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                const reason = prompt('Raison du rejet (optionnel):');
                                updateSubmissionStatus(submission.id, 'rejected', reason || undefined);
                              }}
                            >
                              Rejeter
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => updateSubmissionStatus(submission.id, 'approved')}
                            >
                              Approuver
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="payouts">
            <AdminPayoutsPanel />
          </TabsContent>

          <TabsContent value="transactions">
            <AdminTransactionsDashboard />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <AdminOrdersTracking />
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="support">
            <AdminSupportTickets />
          </TabsContent>

          {/* Content Reports Tab */}
          <TabsContent value="reports">
            <AdminContentReports />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <AdminSecurityLogs />
          </TabsContent>

          {/* SEO Co-Pilot Tab */}
          <TabsContent value="seo">
            <AdminSEOCoPilot />
          </TabsContent>

          {/* Bulk Export Tab */}
          <TabsContent value="export">
            <AdminBulkExport />
          </TabsContent>

          {/* Integrity Scanner Tab */}
          <TabsContent value="integrity">
            <AdminIntegrityPanel />
            <div className="mt-6">
              <AdminVideoBackfill />
            </div>
            <div className="mt-6">
              <AdminFailedPreviews />
            </div>
            <div className="mt-6">
              <AdminProductTranslations />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
