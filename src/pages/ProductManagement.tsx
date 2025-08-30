import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, X, Save, Eye, Upload, Play, Image, Music, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useProductManager } from "@/hooks/useProductManager";

interface UploadedFileData {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  isWatermarked?: boolean;
}

interface ProductData {
  fileId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  currentTag: string;
  status: 'draft' | 'published' | 'pending';
}

const ProductManagement = () => {
  const navigate = useNavigate();
  const { categories } = useSellerDashboard();
  const { 
    saveProductDraft, 
    publishProduct, 
    loading 
  } = useProductManager();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [productsData, setProductsData] = useState<Record<string, ProductData>>({});
  const [previewFile, setPreviewFile] = useState<UploadedFileData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  useEffect(() => {
    // Load files from session storage
    const storedFiles = sessionStorage.getItem('pendingUploadedFiles');
    if (storedFiles) {
      const files = JSON.parse(storedFiles);
      setUploadedFiles(files);
      
      // Initialize products data
      const initialData: Record<string, ProductData> = {};
      files.forEach((file: UploadedFileData) => {
        initialData[file.id] = {
          fileId: file.id,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          category: '',
          tags: [],
          currentTag: '',
          status: 'draft'
        };
      });
      setProductsData(initialData);
      
      // Select first file by default
      if (files.length > 0) {
        setSelectedFileId(files[0].id);
      }
    } else {
      // No files found, redirect to upload page
      toast.error("Aucun fichier trouvé. Veuillez d'abord uploader vos fichiers.");
      navigate('/file-upload');
    }
  }, [navigate]);

  const selectedFile = uploadedFiles.find(f => f.id === selectedFileId);
  const selectedProductData = selectedFileId ? productsData[selectedFileId] : null;

  const updateProductData = (fileId: string, updates: Partial<ProductData>) => {
    setProductsData(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], ...updates }
    }));
  };

  const handleAddTag = (fileId: string) => {
    const productData = productsData[fileId];
    if (productData?.currentTag) {
      // Split by comma, semicolon, or newline and clean up tags
      const newTags = productData.currentTag
        .split(/[,;;\n]/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && !productData.tags.includes(tag));
      
      if (newTags.length > 0) {
        updateProductData(fileId, {
          tags: [...productData.tags, ...newTags],
          currentTag: ''
        });
      }
    }
  };

  const handleTagInputChange = (fileId: string, value: string) => {
    // Check if the user typed a separator (comma or semicolon)
    if (value.includes(',') || value.includes(';')) {
      const currentValue = value.replace(/[,;]$/, ''); // Remove trailing separator
      updateProductData(fileId, { currentTag: currentValue });
      handleAddTag(fileId);
    } else {
      updateProductData(fileId, { currentTag: value });
    }
  };

  const handleRemoveTag = (fileId: string, tag: string) => {
    const productData = productsData[fileId];
    if (productData) {
      updateProductData(fileId, {
        tags: productData.tags.filter(t => t !== tag)
      });
    }
  };

  const handleSaveDraft = async (fileId: string) => {
    const productData = productsData[fileId];
    const file = uploadedFiles.find(f => f.id === fileId);
    
    if (!productData || !file) return;

    if (!productData.title.trim()) {
      toast.error("Le titre est obligatoire pour sauvegarder");
      return;
    }

    const success = await saveProductDraft({
      file,
      productData: {
        title: productData.title,
        description: productData.description,
        category_id: productData.category || undefined,
        tags: productData.tags
      }
    });

    if (success) {
      updateProductData(fileId, { status: 'draft' });
    }
  };

  const handlePublish = async (fileId: string) => {
    const productData = productsData[fileId];
    const file = uploadedFiles.find(f => f.id === fileId);
    
    if (!productData || !file) return;

    if (!productData.title.trim() || !productData.description.trim()) {
      toast.error("Le titre et la description sont obligatoires pour publier");
      return;
    }

    const success = await publishProduct({
      file,
      productData: {
        title: productData.title,
        description: productData.description,
        category_id: productData.category || undefined,
        tags: productData.tags
      }
    });

    if (success) {
      updateProductData(fileId, { status: 'published' });
    }
  };

  const handlePublishAll = async () => {
    const validProducts = Object.values(productsData).filter(p => 
      p.title.trim() && p.description.trim()
    );
    
    if (validProducts.length === 0) {
      toast.error("Aucun produit prêt à publier. Vérifiez les titres et descriptions.");
      return;
    }

    let successCount = 0;
    for (const productData of validProducts) {
      const file = uploadedFiles.find(f => f.id === productData.fileId);
      if (file) {
        const success = await publishProduct({
          file,
          productData: {
            title: productData.title,
            description: productData.description,
            category_id: productData.category || undefined,
            tags: productData.tags
          }
        });
        
        if (success) {
          successCount++;
          updateProductData(productData.fileId, { status: 'published' });
        }
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} produit(s) publié(s) avec succès!`);
      
      // Clear session storage and redirect after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('pendingUploadedFiles');
        navigate('/seller-dashboard');
      }, 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const completedProducts = Object.values(productsData).filter(p => p.status !== 'draft').length;
  const readyToPublish = Object.values(productsData).filter(p => 
    p.title.trim() && p.description.trim() && p.status === 'draft'
  ).length;

  const openPreview = (file: UploadedFileData) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.startsWith('image/')) return Image;
    return Upload;
  };

  return (
    <ProtectedRoute 
      allowedRoles={['creator', 'admin']}
      fallbackMessage="Cette page est réservée aux vendeurs."
    >
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-8 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Link 
                to="/file-upload" 
                className="flex items-center space-x-1 hover:text-primary transition-colors"
              >
                <span className="px-3 py-1 rounded-full bg-muted">1</span>
                <span>Upload des fichiers</span>
              </Link>
              <ArrowRight className="h-4 w-4" />
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">2</span>
              <span>Gestion des produits</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Gérer vos produits</h1>
            <p className="text-muted-foreground">
              Configurez individuellement chaque produit avec ses métadonnées. 
              Progression: {completedProducts}/{uploadedFiles.length} produits configurés
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - File List */}
            <Card className="lg:col-span-1 p-4">
              <h3 className="font-semibold mb-4">
                Fichiers uploadés ({uploadedFiles.length})
              </h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadedFiles.map((file) => {
                  const productData = productsData[file.id];
                  const isSelected = selectedFileId === file.id;
                  
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFileId(file.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-primary/10 border border-primary' : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                       <div className="flex items-center space-x-3">
                         {/* Miniature améliorée */}
                           <div className="relative">
                            {file.type.startsWith('image/') ? (
                              <img 
                                src={file.url} 
                                alt={file.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            ) : (
                             <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                               {(() => {
                                 const IconComponent = getFileIcon(file.type);
                                 return <IconComponent className="h-5 w-5 text-primary" />;
                               })()}
                             </div>
                           )}
                           {/* Indicateur de type de fichier */}
                           <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-background border border-border rounded-full flex items-center justify-center">
                             {file.type.startsWith('video/') && <Play className="h-2.5 w-2.5 text-primary" />}
                             {file.type.startsWith('audio/') && <Music className="h-2.5 w-2.5 text-primary" />}
                             {file.type.startsWith('image/') && <Image className="h-2.5 w-2.5 text-primary" />}
                           </div>
                         </div>
                         
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-medium truncate">
                             {productData?.title || file.name}
                           </p>
                           <div className="flex items-center space-x-2">
                             <p className="text-xs text-muted-foreground">
                               {formatFileSize(file.size)}
                             </p>
                             <span className="text-xs text-muted-foreground">•</span>
                             <p className="text-xs text-muted-foreground">
                               {file.type.split('/')[0]}
                             </p>
                           </div>
                         </div>
                         
                         <div className="flex items-center space-x-2">
                           {/* Bouton prévisualiser */}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               openPreview(file);
                             }}
                             className="h-8 w-8 p-0 hover:bg-primary/10"
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           
                           <div className="flex flex-col items-end space-y-1">
                             {productData?.status === 'published' && (
                               <Badge className="text-xs">Publié</Badge>
                             )}
                             {productData?.status === 'draft' && productData.title && (
                               <Badge variant="outline" className="text-xs">Brouillon</Badge>
                             )}
                           </div>
                         </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Right Panel - Product Form */}
            <Card className="lg:col-span-2 p-6">
              {selectedFile && selectedProductData ? (
                <div className="space-y-6">
                   <div className="flex items-center space-x-4 pb-4 border-b">
                    {selectedFile.type.startsWith('image/') ? (
                      <img 
                        src={selectedFile.url} 
                        alt={selectedFile.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold">
                        Configuration du produit
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile.name} • {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="title">Titre *</Label>
                      <Input 
                        id="title"
                        value={selectedProductData.title}
                        onChange={(e) => updateProductData(selectedFileId!, { title: e.target.value })}
                        placeholder="Titre de votre création"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="category">Catégorie</Label>
                      <Select 
                        value={selectedProductData.category}
                        onValueChange={(value) => updateProductData(selectedFileId!, { category: value })}
                      >
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
                    
                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea 
                        id="description"
                        value={selectedProductData.description}
                        onChange={(e) => updateProductData(selectedFileId!, { description: e.target.value })}
                        placeholder="Décrivez votre création..."
                        rows={4}
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Tags</Label>
                      <div className="flex space-x-2">
                        <Input 
                          value={selectedProductData.currentTag}
                          onChange={(e) => handleTagInputChange(selectedFileId!, e.target.value)}
                          placeholder="Séparez les tags par virgule, point-virgule ou Entrée"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag(selectedFileId!))}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => handleAddTag(selectedFileId!)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {selectedProductData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedProductData.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <X 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => handleRemoveTag(selectedFileId!, tag)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Actions */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <Button 
                      onClick={() => handleSaveDraft(selectedFileId!)}
                      variant="outline"
                      disabled={loading}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Sauvegarder brouillon
                    </Button>
                    
                    <Button 
                      onClick={() => handlePublish(selectedFileId!)}
                      disabled={loading || !selectedProductData.title.trim() || !selectedProductData.description.trim()}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Publier ce produit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Sélectionnez un fichier pour configurer le produit
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Bottom Actions */}
          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">Actions globales</h3>
                <p className="text-sm text-muted-foreground">
                  {readyToPublish} produit(s) prêt(s) à publier
                </p>
              </div>
              
              <div className="flex space-x-4">
                <Button variant="outline" asChild>
                  <Link to="/file-upload">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour aux uploads
                  </Link>
                </Button>
                
                <Button 
                  onClick={handlePublishAll}
                  disabled={loading || readyToPublish === 0}
                  size="lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Publier tous les produits prêts ({readyToPublish})
                </Button>
                
                <Button variant="outline" asChild>
                  <Link to="/seller-dashboard">Aller au tableau de bord</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview modal functionality removed */}
      </div>
    </ProtectedRoute>
  );
};

export default ProductManagement;