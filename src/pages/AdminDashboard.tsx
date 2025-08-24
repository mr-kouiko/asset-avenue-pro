import { useState } from "react";
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
  X
} from "lucide-react";
import { AdminTransactionsDashboard } from "@/components/AdminTransactionsDashboard";
import { StripeSettingsPanel } from "@/components/StripeSettingsPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data: submissions, error: submissionsError } = await supabase
        .from('content_submissions')
        .select('id, status, price');
        
      if (submissionsError) throw submissionsError;

      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');
        
      if (usersError) throw usersError;

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount_total, status');
        
      if (transactionsError) throw transactionsError;

      const totalUsers = users.length;
      const totalSubmissions = submissions.length;
      const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
      const approvedSubmissions = submissions.filter(s => s.status === 'approved').length;
      const rejectedSubmissions = submissions.filter(s => s.status === 'rejected').length;
      
      const totalRevenue = transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.amount_total / 100), 0);

      return {
        totalUsers,
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        totalRevenue
      };
    }
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
    }
  });

  const updateSubmissionStatus = async (id: string, status: string, rejectionReason?: string) => {
    const { error } = await supabase
      .from('content_submissions')
      .update({ 
        status, 
        rejection_reason: rejectionReason || null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
        approved_by: status === 'approved' ? (await supabase.auth.getUser()).data.user?.id : null
      })
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }

    toast.success(`Contenu ${status === 'approved' ? 'approuvé' : status === 'rejected' ? 'rejeté' : 'mis à jour'}`);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
            <p className="text-muted-foreground">
              Gérez la plateforme et modérez les contenus
            </p>
          </div>
          <Badge variant="destructive" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="content">Modération</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : `${stats?.totalRevenue?.toFixed(2) || '0.00'}€`}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenus de la plateforme
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contenus en attente</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.pendingSubmissions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nécessitent une modération
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contenus approuvés</CardTitle>
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
                            <span>Par: {(submission.profiles as any)?.display_name || (submission.profiles as any)?.store_name || 'Créateur anonyme'}</span>
                            <span>{submission.price ? `${submission.price}€` : 'Gratuit'}</span>
                            <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                          </div>
                          {submission.rejection_reason && (
                            <p className="text-sm text-red-600 mt-2">
                              Raison du rejet: {submission.rejection_reason}
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
          <TabsContent value="transactions">
            <AdminTransactionsDashboard />
          </TabsContent>

          {/* Stripe Tab */}
          <TabsContent value="stripe">
            <StripeSettingsPanel />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres de la plateforme</CardTitle>
                <CardDescription>
                  Configuration générale de la marketplace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Paramètres en cours de développement...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;