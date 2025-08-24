import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/FileUpload";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { StripeConnectOnboarding } from "@/components/StripeConnectOnboarding";

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    loading, 
    stats, 
    submissions, 
    categories,
    draftFiles,
    createSubmission, 
    updateSubmission, 
    deleteSubmission,
    addFilesToSubmission,
    addDraftFiles,
    clearDraftFiles,
    refreshData 
  } = useSellerDashboard();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    price: '',
    tags: [] as string[],
    currentTag: ''
  });

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

  const handleCreateSubmission = async () => {
    console.log('handleCreateSubmission called with formData:', formData);
    
    if (!formData.title || !formData.description) {
      console.log('Missing title or description');
      toast.error('Titre et description requis');
      return;
    }

    console.log('Calling createSubmission with data:', {
      title: formData.title,
      description: formData.description,
      category_id: formData.category_id || undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      tags: formData.tags
    });

    const submission = await createSubmission({
      title: formData.title,
      description: formData.description,
      category_id: formData.category_id || undefined,
      price: formData.price ? parseFloat(formData.price) : undefined,
      tags: formData.tags
    });

    console.log('createSubmission result:', submission);

    if (submission) {
      console.log('Submission successful, clearing form and closing dialog');
      setFormData({
        title: '',
        description: '',
        category_id: '',
        price: '',
        tags: [],
        currentTag: ''
      });
      setIsCreateDialogOpen(false);
    } else {
      console.log('Submission failed');
    }
  };

  const handleCloseDialog = () => {
    console.log('handleCloseDialog called');
    clearDraftFiles();
    setIsCreateDialogOpen(false);
  };

  const handleFilesUploaded = async (files: { url: string; name: string; type: string }[], submissionId: string) => {
    await addFilesToSubmission(submissionId, files);
  };

  const handleAddTag = () => {
    if (formData.currentTag && !formData.tags.includes(formData.currentTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag],
        currentTag: ''
      }));
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
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
            <h1 className="text-3xl font-bold">Tableau de bord vendeur</h1>
            <p className="text-muted-foreground">
              Gérez votre contenu et suivez vos performances
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button 
                className="flex items-center gap-2"
                onClick={() => {
                  console.log('Ajouter du contenu button clicked');
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Ajouter du contenu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau contenu</DialogTitle>
                <DialogDescription>
                  Ajoutez les informations et fichiers de votre nouveau contenu
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Titre *</Label>
                    <Input 
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Titre de votre création"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Catégorie</Label>
                    <Select onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea 
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Décrivez votre création..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input 
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0 pour gratuit"
                  />
                </div>
                
                <div>
                  <Label>Tags</Label>
                  <div className="flex space-x-2">
                    <Input 
                      value={formData.currentTag}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentTag: e.target.value }))}
                      placeholder="Ajouter un tag"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* File Upload Section */}
                <div className="border-t pt-6">
                  <Label className="text-base font-medium">Fichiers</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ajoutez vos fichiers à ce contenu. Ils seront automatiquement associés lors de la création.
                  </p>
                  <FileUpload
                    onFilesUploaded={addDraftFiles}
                    maxFiles={10}
                    maxFileSize={100}
                  />
                  {draftFiles.length > 0 && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-green-600">
                        {draftFiles.length} fichier(s) prêt(s) à être associé(s) à ce contenu
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateSubmission}>
                    Créer le contenu
                    {draftFiles.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        +{draftFiles.length} fichier(s)
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
                    <p>Aucun contenu uploadé pour le moment</p>
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

          {/* Content Management Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion de contenu</CardTitle>
                <CardDescription>
                  Gérez tous vos uploads et ajoutez des fichiers
                </CardDescription>
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
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer du contenu
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
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                <strong>Raison du rejet:</strong> {submission.rejection_reason}
                              </div>
                            )}
                            {submission.admin_notes && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                <strong>Notes admin:</strong> {submission.admin_notes}
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingSubmission(submission.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {submission.status === 'pending' && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) {
                                      deleteSubmission(submission.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Files list */}
                        {submission.content_files && submission.content_files.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Fichiers ({submission.content_files.length})
                            </h5>
                            <div className="grid gap-2">
                              {submission.content_files.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                  <div className="flex items-center gap-2">
                                    {file.file_type.startsWith('image/') ? (
                                      <Image className="h-4 w-4" />
                                    ) : file.file_type.startsWith('video/') ? (
                                      <Film className="h-4 w-4" />
                                    ) : file.file_type.startsWith('audio/') ? (
                                      <Music className="h-4 w-4" />
                                    ) : (
                                      <FileText className="h-4 w-4" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{file.file_name}</p>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                        {file.is_original && (
                                          <Badge variant="outline" className="text-xs">Original</Badge>
                                        )}
                                        {file.preview_path && (
                                          <Badge variant="secondary" className="text-xs">Watermarqué</Badge>
                                        )}
                                        {file.thumbnail_path && (
                                          <Badge variant="outline" className="text-xs">Miniature</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {file.preview_path && (
                                      <Badge variant="default" className="text-xs">
                                        <Eye className="h-3 w-3 mr-1" />
                                        Preview
                                      </Badge>
                                    )}
                                    {submission.status === 'approved' && (
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        Publié
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* File upload for existing submission */}
                        {submission.status === 'approved' && (
                          <div className="border-t pt-4">
                            <h5 className="font-medium mb-3">Ajouter des fichiers:</h5>
                            <p className="text-sm text-muted-foreground mb-3">
                              Les nouveaux fichiers seront automatiquement watermarqués et publiés.
                            </p>
                            <FileUpload
                              onFilesUploaded={(files) => handleFilesUploaded(files, submission.id)}
                              maxFiles={20}
                              maxFileSize={500}
                            />
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
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistiques détaillées</CardTitle>
                <CardDescription>
                  Analysez les performances de votre contenu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Les statistiques détaillées seront bientôt disponibles</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stripe Tab */}
          <TabsContent value="stripe" className="space-y-6">
            <StripeConnectOnboarding />
          </TabsContent>
          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload rapide</CardTitle>
                <CardDescription>
                  Uploadez directement des fichiers - créez d'abord un contenu pour une gestion complète
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUpload
                  onFilesUploaded={(files) => {
                    const watermarkedCount = files.filter(f => f.isWatermarked).length;
                    toast.success(`${files.length} fichier(s) uploadé(s)${watermarkedCount > 0 ? ` (${watermarkedCount} avec watermarking)` : ''}. N'oubliez pas de les associer à un contenu.`);
                  }}
                  maxFiles={50}
                  maxFileSize={500}
                  autoUpload={true}
                />
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Upload automatisé:</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Les images sont automatiquement watermarquées pour le marketplace</p>
                    <p>• Les fichiers originaux restent protégés et disponibles après achat</p>
                    <p>• Upload en lot supporté (glissez-déposez plusieurs fichiers à la fois)</p>
                    <p>• Publication automatique - plus besoin d'attendre la validation</p>
                  </div>
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