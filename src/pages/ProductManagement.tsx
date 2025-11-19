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
import { ArrowLeft, ArrowRight, Plus, X, Save, Eye, Upload, Play, Image, Music, Video, Sparkles, Zap, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useProductManager } from "@/hooks/useProductManager";
import { useAIMetadata } from "@/hooks/useAIMetadata";
import { supabase } from '@/integrations/supabase/client';
import { MediaPlayer } from "@/components/media/MediaPlayer";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { EbookForm } from "@/components/EbookForm";

interface UploadedFileData {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  isWatermarked?: boolean;
  thumbnailUrl?: string;
  previewUrl?: string;
}

interface ProductData {
  fileId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  currentTag: string;
  status: 'draft' | 'published' | 'pending';
  coverUrl?: string;
}

const ProductManagement = () => {
  const navigate = useNavigate();
  const { categories } = useSellerDashboard();
  const { 
    saveProductDraft, 
    publishProduct, 
    generateProductMetadata,
    loading 
  } = useProductManager();
  const { generateBatchMetadata, loading: batchAILoading } = useAIMetadata();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [productsData, setProductsData] = useState<Record<string, ProductData>>({});
  const [previewFile, setPreviewFile] = useState<UploadedFileData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [aiAutoGenerate, setAiAutoGenerate] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if we're in edit mode
    const editingData = sessionStorage.getItem('editingSubmission');
    const storedFiles = sessionStorage.getItem('pendingUploadedFiles');
    
    if (editingData) {
      const editData = JSON.parse(editingData);
      setIsEditMode(true);
      setEditingSubmissionId(editData.submissionId);
      console.log('📝 Edit mode activated for submission:', editData.submissionId);
    }
    
    if (storedFiles) {
      const files = JSON.parse(storedFiles);
      setUploadedFiles(files);
      console.log('📂 Loaded files:', files.length);
      
      // Initialize products data
      const initialData: Record<string, ProductData> = {};
      
      // If in edit mode, load existing data
      if (editingData) {
        const editData = JSON.parse(editingData);
        files.forEach((file: UploadedFileData) => {
          initialData[file.id] = {
            fileId: file.id,
            title: editData.title || '',
            description: editData.description || '',
            category: editData.category || '',
            tags: editData.tags || [],
            currentTag: '',
            status: editData.status || 'draft',
            coverUrl: file.thumbnailUrl
          };
        });
        console.log('✅ Loaded existing product data:', initialData);
      } else {
        // Auto-detect category for new uploads
        files.forEach((file: UploadedFileData) => {
          // Auto-detect category based on file type
          let autoCategory = '';
          const fileType = file.type?.toLowerCase() || '';
          const fileName = file.name?.toLowerCase() || '';
          
          console.log(`🔍 Auto-detecting category for ${file.name}:`, { fileType, fileName });
          
          if (fileType.startsWith('video/') || 
              fileName.includes('.mp4') || 
              fileName.includes('.mov') || 
              fileName.includes('.avi') || 
              fileName.includes('.webm') || 
              fileName.includes('.mkv')) {
            // Find video category ID from available categories
            const videoCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('video') || 
              cat.name.toLowerCase().includes('vidéo')
            );
            autoCategory = videoCategory?.id || '';
            console.log('✅ Video category detected:', autoCategory);
          }
          else if (fileType.startsWith('image/')) {
            // Find photo category ID from available categories
            const photoCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('photo') ||
              cat.name.toLowerCase().includes('image')
            );
            autoCategory = photoCategory?.id || '';
            console.log('✅ Photo category detected:', autoCategory);
          }
          else if (fileType.startsWith('audio/')) {
            // Find audio category ID from available categories
            const audioCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('audio') ||
              cat.name.toLowerCase().includes('son') ||
              cat.name.toLowerCase().includes('musique')
            );
            autoCategory = audioCategory?.id || '';
            console.log('✅ Audio category detected:', autoCategory);
          }
          else if (fileType === 'application/pdf' || fileName.includes('.pdf')) {
            // Find ebook/document category ID from available categories
            const ebookCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('ebook') ||
              cat.name.toLowerCase().includes('document') ||
              cat.name.toLowerCase().includes('livre')
            );
            autoCategory = ebookCategory?.id || '';
            console.log('✅ Ebook category detected:', autoCategory);
          }
          else {
            // Find illustration category for other files
            const illustrationCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('illustration')
            );
            autoCategory = illustrationCategory?.id || '';
            console.log('✅ Illustration category detected (fallback):', autoCategory);
          }
          
          initialData[file.id] = {
            fileId: file.id,
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            description: '',
            category: autoCategory, // Auto-detected category
            tags: [],
            currentTag: '',
            status: 'draft'
          };
        });
      }
      
      setProductsData(initialData);
      
      // Auto-generate AI metadata if enabled (only for new uploads, not edits)
      if (!editingData && aiAutoGenerate && files.length > 0) {
        // Check if AI auto-generation is enabled globally
        setTimeout(async () => {
          try {
            const { data: platformSettings } = await supabase
              .from('platform_settings')
              .select('ai_auto_generate_enabled')
              .single();

            if (platformSettings?.ai_auto_generate_enabled) {
              const requests = files.map((file: UploadedFileData) => ({
                fileName: file.name,
                fileType: file.type,
                language: 'fr' as const
              }));

              const results = await generateBatchMetadata(requests);
              
              results.forEach((metadata, index) => {
                if (metadata) {
                  const file = files[index];
                  setProductsData(prev => ({
                    ...prev,
                    [file.id]: {
                      ...prev[file.id],
                      title: metadata.title,
                      description: metadata.description,
                      tags: metadata.tags
                    }
                  }));
                }
              });
            }
          } catch (error) {
            console.error('Error checking AI settings:', error);
          }
        }, 1000); // Small delay to let UI render first
      }
      
      // Select first file by default
      if (files.length > 0) {
        setSelectedFileId(files[0].id);
      }
      
      // Clear session storage
      sessionStorage.removeItem('pendingUploadedFiles');
    } else {
      // No files found, redirect to upload page
      toast.error("Aucun fichier trouvé. Veuillez d'abord uploader vos fichiers.");
      navigate('/file-upload');
    }
  }, [categories, navigate, aiAutoGenerate, generateBatchMetadata]);

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

  const handleGenerateAIMetadata = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    const currentData = productsData[fileId];
    
    if (!file) return;

    const metadata = await generateProductMetadata(file, currentData?.description);
    
    if (metadata) {
      updateProductData(fileId, {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags
      });
    }
  };

  const handleBatchGenerateAI = async () => {
    const requests = uploadedFiles.map(file => ({
      fileName: file.name,
      fileType: file.type,
      sellerDescription: productsData[file.id]?.description,
      language: 'fr' as const
    }));

    const results = await generateBatchMetadata(requests);
    
    results.forEach((metadata, index) => {
      if (metadata) {
        const file = uploadedFiles[index];
        updateProductData(file.id, {
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags
        });
      }
    });
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
    // If in edit mode, update the submission instead
    if (isEditMode && editingSubmissionId) {
      await handleUpdateSubmission(fileId);
      return;
    }
    
    // Original publish logic for new submissions
    const productData = productsData[fileId];
    const file = uploadedFiles.find(f => f.id === fileId);
    
    if (!productData || !file) return;

    if (!productData.title.trim() || !productData.description.trim()) {
      toast.error("Le titre et la description sont obligatoires pour publier");
      return;
    }

    // For ebooks, check if cover is present
    const isPDF = file.type === 'application/pdf';
    if (isPDF && !productData.coverUrl) {
      toast.error("Une image de couverture est obligatoire pour publier un ebook");
      return;
    }

    const success = await publishProduct({
      file: {
        ...file,
        // For ebooks, use cover as thumbnail
        thumbnailUrl: isPDF ? productData.coverUrl : file.thumbnailUrl
      },
      productData: {
        title: productData.title,
        description: productData.description,
        category_id: productData.category || undefined,
        tags: productData.tags
      }
    });

    if (success) {
      // Remove the published file from the list
      const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
      setUploadedFiles(updatedFiles);
      
      // Update sessionStorage
      sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(updatedFiles));
      
      // Remove product data
      const updatedProductsData = { ...productsData };
      delete updatedProductsData[fileId];
      setProductsData(updatedProductsData);
      
      // If no more files, redirect to portfolio
      if (updatedFiles.length === 0) {
        toast.success("Tous les produits ont été publiés! Redirection vers votre portfolio...");
        setTimeout(() => navigate('/portfolio'), 1500);
      } else {
        // Select the first remaining file
        setSelectedFileId(updatedFiles[0].id);
      }
    }
  };

  const handleUpdateSubmission = async (fileId: string) => {
    if (!editingSubmissionId) return;
    
    try {
      const productData = productsData[fileId];
      if (!productData) {
        toast.error('Aucune donnée de produit à sauvegarder');
        return;
      }

      if (!productData.title.trim() || !productData.description.trim()) {
        toast.error("Le titre et la description sont obligatoires");
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      console.log('🔄 Updating submission:', editingSubmissionId);
      console.log('👤 User ID:', user.id);
      console.log('📝 Updates:', { title: productData.title, category: productData.category, tags: productData.tags });

      const { data, error } = await supabase
        .from('content_submissions')
        .update({
          title: productData.title,
          description: productData.description,
          category_id: productData.category || null,
          tags: productData.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSubmissionId)
        .eq('creator_id', user.id) // Security: ensure user owns this submission
        .select()
        .single();

      if (error) {
        console.error('❌ Update error:', error);
        if (error.code === 'PGRST116') {
          toast.error('Produit non trouvé ou vous n\'avez pas les droits pour le modifier');
        } else {
          toast.error(`Erreur: ${error.message}`);
        }
        return;
      }

      console.log('✅ Submission updated successfully:', data);
      toast.success('Produit mis à jour avec succès');
      sessionStorage.removeItem('editingSubmission');
      sessionStorage.removeItem('pendingUploadedFiles');
      navigate('/dashboard');
    } catch (error) {
      console.error('💥 Error updating submission:', error);
      toast.error('Erreur lors de la mise à jour du produit');
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
    const publishedFileIds: string[] = [];
    
    for (const productData of validProducts) {
      const file = uploadedFiles.find(f => f.id === productData.fileId);
      if (file) {
        const isPDF = file.type === 'application/pdf';
        
        // Skip ebooks without cover
        if (isPDF && !productData.coverUrl) {
          console.log(`Skipping ebook ${file.name} - no cover image`);
          continue;
        }
        
        const success = await publishProduct({
          file: {
            ...file,
            // For ebooks, use cover as thumbnail
            thumbnailUrl: isPDF ? productData.coverUrl : file.thumbnailUrl
          },
          productData: {
            title: productData.title,
            description: productData.description,
            category_id: productData.category || undefined,
            tags: productData.tags
          }
        });

        if (success) {
          successCount++;
          publishedFileIds.push(productData.fileId);
        }
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} produit(s) publié(s) avec succès !`);
      
      // Remove all published files from the list
      const updatedFiles = uploadedFiles.filter(f => !publishedFileIds.includes(f.id));
      setUploadedFiles(updatedFiles);
      
      // Update sessionStorage
      sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(updatedFiles));
      
      // Remove published products data
      const updatedProductsData = { ...productsData };
      publishedFileIds.forEach(fileId => {
        delete updatedProductsData[fileId];
      });
      setProductsData(updatedProductsData);
      
      // If no more files, redirect to portfolio
      if (updatedFiles.length === 0) {
        toast.success("Tous les produits ont été publiés! Redirection vers votre portfolio...");
        setTimeout(() => navigate('/portfolio'), 1500);
      } else {
        // Select the first remaining file
        setSelectedFileId(updatedFiles[0].id);
      }
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

  const openPreview = async (file: UploadedFileData) => {
    // For audio files, generate a signed URL if the file is from storage
    if (file.type.startsWith('audio/') && file.url.includes('supabase.co/storage')) {
      try {
        const urlParts = file.url.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const [bucket, ...pathParts] = urlParts[1].split('/');
          const filePath = pathParts.join('/');
          
          console.log('🔐 Generating signed URL for audio:', { bucket, filePath });
          
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          if (error) {
            console.error('Error generating signed URL:', error);
            toast.error('Erreur lors de la génération de l\'URL d\'aperçu');
          } else if (data?.signedUrl) {
            console.log('✅ Signed URL generated:', data.signedUrl);
            setPreviewFile({ ...file, previewUrl: data.signedUrl });
            setIsPreviewOpen(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error processing audio URL:', error);
      }
    }
    
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
    if (type === 'application/pdf') return FileText;
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
                              {file.type === 'application/pdf' && <FileText className="h-2.5 w-2.5 text-red-600" />}
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
                <>
                  {/* Formulaire spécifique pour les PDFs/Ebooks */}
                  {selectedFile.type === 'application/pdf' ? (
                    <EbookForm
                      fileData={selectedFile}
                      productData={selectedProductData}
                      categories={categories}
                      onUpdateProductData={(updates) => updateProductData(selectedFileId!, updates)}
                      onGenerateAI={() => handleGenerateAIMetadata(selectedFileId!)}
                      onSaveDraft={() => handleSaveDraft(selectedFileId!)}
                      onPublish={() => handlePublish(selectedFileId!)}
                      loading={loading || batchAILoading}
                    />
                  ) : (
                    /* Formulaire standard pour les autres types de fichiers */
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
                            {(() => {
                              const IconComponent = getFileIcon(selectedFile.type);
                              return <IconComponent className="h-8 w-8 text-primary" />;
                            })()}
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
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="title">Titre *</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateAIMetadata(selectedFileId!)}
                              disabled={loading || batchAILoading}
                              className="h-6 px-2 text-xs"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              IA
                            </Button>
                          </div>
                          <Input 
                            id="title"
                            value={selectedProductData.title}
                            onChange={(e) => updateProductData(selectedFileId!, { title: e.target.value })}
                            placeholder="Titre de votre création"
                            required
                          />
                        </div>
                       
                        <div>
                          <Label>Catégorie</Label>
                          <div className="flex items-center space-x-2 h-10 px-3 border rounded-md bg-muted/50">
                            <Badge variant="secondary">
                              {categories.find(c => c.id === selectedProductData.category)?.name || 'Détectée automatiquement'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              (Basée sur le type de fichier)
                            </span>
                          </div>
                        </div>
                        
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="description">Description *</Label>
                          <Textarea 
                            id="description"
                            value={selectedProductData.description}
                            onChange={(e) => updateProductData(selectedFileId!, { description: e.target.value })}
                            placeholder="Décrivez votre création..."
                            rows={4}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            💡 Conseil: Une description détaillée améliore la génération IA des métadonnées
                          </p>
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
                          {isEditMode ? (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Mettre à jour le produit
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Publier ce produit
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
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
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="ai-auto-generate"
                    checked={aiAutoGenerate}
                    onChange={(e) => setAiAutoGenerate(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="ai-auto-generate" className="text-sm">
                    Génération IA automatique
                  </Label>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    sessionStorage.removeItem('editingSubmission');
                    navigate('/dashboard');
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Annuler les modifications' : 'Retour aux uploads'}
                </Button>
                
                <Button 
                  onClick={handleBatchGenerateAI}
                  disabled={loading || batchAILoading || uploadedFiles.length === 0}
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Générer tout avec IA
                </Button>
                
                {!isEditMode && (
                  <Button 
                    onClick={handlePublishAll}
                    disabled={loading || readyToPublish === 0}
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Publier tous les produits prêts ({readyToPublish})
                  </Button>
                )}
                
                <Button variant="outline" asChild>
                  <Link to="/seller-dashboard">Aller au tableau de bord</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Modal */}
        {isPreviewOpen && previewFile && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closePreview}
          >
            <div 
              className="bg-background rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Aperçu - {previewFile.name}</h3>
                <Button variant="ghost" size="sm" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex justify-center">
                {previewFile.type.startsWith('image/') && (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                )}
                
                {previewFile.type.startsWith('video/') && (
                  <div className="max-w-full max-h-[60vh] bg-black rounded-lg overflow-hidden">
                    <MediaPlayer 
                      src={previewFile.url}
                      type="video"
                      title={previewFile.name}
                      controls={true}
                      watermarkSize="normal"
                    />
                    <div className="p-2 text-xs text-gray-400 break-all">
                      URL: {previewFile.url}
                    </div>
                  </div>
                )}
                
                {previewFile.type.startsWith('audio/') && (
                  <div className="flex flex-col items-center space-y-4 w-full max-w-2xl">
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
                )}
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Taille: {formatFileSize(previewFile.size)} • Type: {previewFile.type}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ProductManagement;