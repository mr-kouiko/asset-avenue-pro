import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  TrendingUp,
  DollarSign,
  Download,
  Eye,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Image,
  Film,
  Music,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { StripeConnectOnboarding } from "@/components/StripeConnectOnboarding";
import { StripeSettingsPanel } from "@/components/StripeSettingsPanel";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Dashboard = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { 
    loading, 
    stats, 
    submissions, 
    updateSubmission, 
    deleteSubmission,
    refreshData 
  } = useSellerDashboard();
  
  const { accountStatus, isAccountReady } = useStripeConnect();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);

  const StripeConnectWarning = () => {
    if (!accountStatus || isAccountReady()) return null;

    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Stripe requise</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Vous devez configurer votre compte Stripe Connect pour recevoir des paiements.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setActiveTab("stripe")}
          >
            Configurer maintenant
          </Button>
        </AlertDescription>
      </Alert>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <AlertCircle className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Accès non autorisé</h1>
          <p className="text-muted-foreground mb-8">
            Vous devez être connecté pour accéder au dashboard vendeur
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold">Tableau de bord vendeur</h1>
            <p className="text-muted-foreground">
              Gérez votre contenu et suivez vos performances
            </p>
          </div>
          <Button 
            className="flex items-center gap-2"
            asChild
          >
            <Link to="/file-upload">
              <Plus className="h-4 w-4" />
              Ajouter du contenu
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="content">Mon contenu</TabsTrigger>
            <TabsTrigger value="analytics">Statistiques</TabsTrigger>
            <TabsTrigger value="stripe">Paiements</TabsTrigger>
            <TabsTrigger value="upload">Uploader</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stripe Connect Warning */}
            <StripeConnectWarning />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus estimés</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRevenue?.toFixed(2) || '0.00'}€</div>
                  <p className="text-xs text-muted-foreground">
                    Basé sur les contenus approuvés
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Téléchargements</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDownloads || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Nombre total de téléchargements
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Contenus approuvés</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.approvedSubmissions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Sur {stats.totalSubmissions || 0} soumis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En attente</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingSubmissions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Contenus en cours de validation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Contenus récents</CardTitle>
                <CardDescription>
                  Vos derniers uploads et leur statut
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Chargement...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">Aucun contenu uploadé pour le moment</p>
                    <Button asChild>
                      <Link to="/file-upload">
                        <Plus className="h-4 w-4 mr-2" />
                        Uploader votre premier contenu
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{submission.title}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{submission.content_files?.length || 0} fichier(s)</span>
                            <span>{submission.price ? `${submission.price}€` : 'Gratuit'}</span>
                            <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                          </div>
                          {submission.rejection_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              Raison du rejet: {submission.rejection_reason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>Mon contenu</CardTitle>
                  <CardDescription>
                    Gérez vos créations et suivez leur statut
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link to="/file-upload">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau contenu
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Chargement...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Upload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Aucun contenu</h3>
                    <p className="mb-4">Commencez par créer votre premier contenu</p>
                    <Button asChild>
                      <Link to="/file-upload">
                        <Plus className="h-4 w-4 mr-2" />
                        Créer du contenu
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {submissions.map((submission) => (
                      <Card key={submission.id} className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-lg">{submission.title}</h4>
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
                            <p className="text-muted-foreground mb-2">{submission.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{submission.content_files?.length || 0} fichier(s)</span>
                              <span>{submission.price ? `${submission.price}€` : 'Gratuit'}</span>
                              <span>Créé le {new Date(submission.created_at).toLocaleDateString()}</span>
                            </div>
                            {submission.tags && submission.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {submission.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {submission.rejection_reason && (
                              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                <p className="text-sm text-destructive font-medium">Raison du rejet:</p>
                                <p className="text-sm text-destructive">{submission.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Ouvrir le menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingSubmission(submission.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contenu ? Cette action est irréversible.')) {
                                    deleteSubmission(submission.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Files Grid */}
                        {submission.content_files && submission.content_files.length > 0 && (
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-3">Fichiers associés ({submission.content_files.length})</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {submission.content_files.slice(0, 4).map((file) => (
                                <div key={file.id} className="relative bg-muted rounded-lg p-3">
                                  <div className="flex items-center justify-center h-16 mb-2">
                                    {file.file_type === 'image' && <Image className="h-8 w-8 text-muted-foreground" />}
                                    {file.file_type === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                                    {file.file_type === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                                    {!['image', 'video', 'audio'].includes(file.file_type) && <FileText className="h-8 w-8 text-muted-foreground" />}
                                  </div>
                                  <p className="text-xs text-center truncate">{file.file_name}</p>
                                  <Badge variant="secondary" className="text-xs mt-1 w-full justify-center">
                                    {file.file_type}
                                  </Badge>
                                </div>
                              ))}
                              {submission.content_files.length > 4 && (
                                <div className="relative bg-muted/50 rounded-lg p-3 flex items-center justify-center">
                                  <div className="text-center">
                                    <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                                    <p className="text-xs text-muted-foreground">
                                      +{submission.content_files.length - 4} autres
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance générale
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taux d'approbation</span>
                    <span className="font-medium">
                      {stats.totalSubmissions > 0 
                        ? `${((stats.approvedSubmissions / stats.totalSubmissions) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Revenus par contenu</span>
                    <span className="font-medium">
                      {stats.approvedSubmissions > 0 
                        ? `${(stats.totalRevenue / stats.approvedSubmissions).toFixed(2)}€`
                        : '0€'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Popularité
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Téléchargements par contenu</span>
                    <span className="font-medium">
                      {stats.approvedSubmissions > 0 
                        ? `${Math.round(stats.totalDownloads / stats.approvedSubmissions)}`
                        : '0'
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stripe Tab */}
          <TabsContent value="stripe">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Stripe</CardTitle>
                  <CardDescription>
                    Configurez votre compte Stripe pour recevoir vos paiements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StripeConnectOnboarding />
                </CardContent>
              </Card>

              <StripeSettingsPanel />
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Nouveau système d'upload</CardTitle>
                <CardDescription>
                  Processus d'upload amélioré en deux étapes pour une meilleure organisation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">1</span>
                      <div>
                        <h3 className="font-semibold">Upload groupé</h3>
                        <p className="text-sm text-muted-foreground">
                          Uploadez tous vos fichiers numériques en une seule fois avec aperçu et gestion de queue
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">2</span>
                      <div>
                        <h3 className="font-semibold">Configuration individuelle</h3>
                        <p className="text-sm text-muted-foreground">
                          Configurez ensuite chaque produit avec ses propres métadonnées (titre, description, prix, catégorie, tags)
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-4">
                    <Button size="lg" asChild>
                      <Link to="/file-upload">
                        <Plus className="h-4 w-4 mr-2" />
                        Commencer l'upload
                      </Link>
                    </Button>
                    
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/upload">
                        Ancien système (déprécié)
                      </Link>
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  <h4 className="font-medium">Avantages du nouveau système :</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Upload plus rapide et fiable</li>
                    <li>• Gestion individuelle de chaque produit</li>
                    <li>• Possibilité de sauvegarder en brouillon</li>
                    <li>• Interface plus claire et intuitive</li>
                    <li>• Meilleur suivi de l'état d'upload</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;