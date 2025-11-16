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
  ArrowRight,
  Check,
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
import { Link, useNavigate } from "react-router-dom";
import { StripeConnectOnboarding } from "@/components/StripeConnectOnboarding";
import { StripeSettingsPanel } from "@/components/StripeSettingsPanel";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const navigate = useNavigate();
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
  const handleEditSubmission = async (submissionId: string) => {
    try {
      // Fetch full submission details with files
      const { data: submission, error } = await supabase
        .from('content_submissions')
        .select(`
          *,
          content_files (*)
        `)
        .eq('id', submissionId)
        .single();

      if (error) throw error;
      if (!submission) {
        toast.error('Produit introuvable');
        return;
      }

      // Format files for ProductManagement
      const formattedFiles = submission.content_files?.map((file: any) => ({
        id: file.id,
        url: file.file_path,
        name: file.file_name,
        type: file.file_type,
        size: file.file_size,
        isWatermarked: !file.is_original,
        thumbnailUrl: file.thumbnail_path,
        previewUrl: file.preview_path
      })) || [];

      // Store editing context in sessionStorage
      sessionStorage.setItem('editingSubmission', JSON.stringify({
        submissionId: submission.id,
        title: submission.title,
        description: submission.description,
        category: submission.category_id,
        tags: submission.tags || [],
        price: submission.price,
        status: submission.status
      }));
      sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(formattedFiles));

      // Navigate to product management
      navigate('/product-management');
      toast.success('Chargement du produit pour modification...');
    } catch (error) {
      console.error('Error loading submission for edit:', error);
      toast.error('Erreur lors du chargement du produit');
    }
  };
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
    isWatermarked?: boolean;
    thumbnailUrl?: string;
    previewUrl?: string;
  }>>([]);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    url: string;
    name: string;
    type: string;
    previewUrl?: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const handleFilesUploaded = (files: Array<{
    id: string;
    url: string;
    name: string;
    type: string;
    size: number;
    isWatermarked?: boolean;
    thumbnailUrl?: string;
    previewUrl?: string;
  }>) => {
    setUploadedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} fichier(s) uploadé(s) avec succès`);
  };

  const handleContinueToProducts = () => {
    if (uploadedFiles.length === 0) {
      toast.error("Veuillez uploader au moins un fichier avant de continuer");
      return;
    }

    sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(uploadedFiles));
    navigate('/product-management');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openAudioPreview = async (file: { id: string; file_path: string; file_name: string; file_type: string }) => {
    // For audio files, generate a signed URL
    if (file.file_type === 'audio') {
      try {
        console.log('🔐 Generating signed URL for audio file:', file.file_path);
        
        // Extract bucket and file path from the full path
        // file_path format: "user_id/audios/filename.mp3"
        const filePath = file.file_path;
        
        const { data, error } = await supabase.storage
          .from('uploads')
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) {
          console.error('Error generating signed URL:', error);
          toast.error('Erreur lors de la génération de l\'URL d\'aperçu');
          return;
        } else if (data?.signedUrl) {
          console.log('✅ Signed URL generated:', data.signedUrl);
          setPreviewFile({ 
            id: file.id, 
            url: data.signedUrl, 
            name: file.file_name, 
            type: file.file_type,
            previewUrl: data.signedUrl 
          });
          setIsPreviewOpen(true);
          return;
        }
      } catch (error) {
        console.error('Error processing audio URL:', error);
        toast.error('Erreur lors du traitement du fichier audio');
        return;
      }
    }
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
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
                              <DropdownMenuItem onClick={() => handleEditSubmission(submission.id)}>
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
                                <div key={file.id} className="relative bg-muted rounded-lg p-3 group">
                                  <div className="flex items-center justify-center h-16 mb-2">
                                    {file.file_type === 'image' && <Image className="h-8 w-8 text-muted-foreground" />}
                                    {file.file_type === 'video' && <Film className="h-8 w-8 text-muted-foreground" />}
                                    {file.file_type === 'audio' && <Music className="h-8 w-8 text-muted-foreground" />}
                                    {!['image', 'video', 'audio'].includes(file.file_type) && <FileText className="h-8 w-8 text-muted-foreground" />}
                                  </div>
                                  {file.file_type === 'audio' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAudioPreview(file)}
                                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
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
          <TabsContent value="upload" className="space-y-6">
            <div className="mb-6">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">1</span>
                <span>Upload des fichiers</span>
                <ArrowRight className="h-4 w-4" />
                <span className="px-3 py-1 rounded-full bg-muted">2</span>
                <span>Gestion des produits</span>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Uploader vos fichiers</h2>
              <p className="text-muted-foreground">
                Commencez par uploader tous vos fichiers numériques. Vous pourrez ensuite configurer chaque produit individuellement.
              </p>
            </div>

            {/* File Upload Section */}
            <Card className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Zone d'upload</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Déposez ou sélectionnez vos fichiers. Les images seront automatiquement filigranées pour la marketplace.
                </p>
              </div>
              
              <SimpleFileUpload 
                onFilesUploaded={handleFilesUploaded} 
                maxFiles={100} 
                maxFileSize={1000} 
              />
            </Card>

            {/* Uploaded Files Summary */}
            {uploadedFiles.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold">
                    Fichiers uploadés ({uploadedFiles.length})
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {uploadedFiles.slice(0, 6).map((file) => (
                    <div key={file.id} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                      {file.previewUrl && file.type.startsWith('image/') ? (
                        <img 
                          src={file.previewUrl} 
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.type.split('/')[0]}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {uploadedFiles.length > 6 && (
                    <div className="flex items-center justify-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        +{uploadedFiles.length - 6} autres fichiers
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <Button 
                    onClick={handleContinueToProducts}
                    size="lg"
                    className="flex-1"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Continuer vers la gestion des produits
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => setUploadedFiles([])}
                  >
                    Annuler
                  </Button>
                </div>
              </Card>
            )}

            {/* Instructions */}
            <Card className="p-6 bg-muted/50">
              <h3 className="font-semibold mb-2">Prochaines étapes</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Uploadez tous vos fichiers en une fois</li>
                <li>• Passez ensuite à l'étape de configuration des produits</li>
                <li>• Chaque fichier aura son propre formulaire de métadonnées</li>
                <li>• Vous pourrez sauvegarder en brouillon ou publier directement</li>
              </ul>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Audio Preview Modal */}
        {isPreviewOpen && previewFile && previewFile.type === 'audio' && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closePreview}
          >
            <div 
              className="bg-background rounded-lg p-6 max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Aperçu Audio - {previewFile.name}</h3>
                <Button variant="ghost" size="sm" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-48 h-48 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Music className="h-16 w-16 text-primary" />
                </div>
                <div className="w-full">
                  <AudioPlayer
                    src={previewFile.previewUrl || previewFile.url}
                    autoPlay={false}
                    showJumpControls={false}
                    customAdditionalControls={[]}
                    style={{
                      borderRadius: '0.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;