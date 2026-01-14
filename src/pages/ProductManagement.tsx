import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Plus, X, Save, Eye, Upload, Play, Image, Music, Video, FileText, Trash2, RefreshCw, Palette } from "lucide-react";
import { useAIImageDetection } from "@/hooks/useAIImageDetection";
import { useAIVideoDetection } from "@/hooks/useAIVideoDetection";
import { useIllustrationDetection } from "@/hooks/useIllustrationDetection";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useProductManager } from "@/hooks/useProductManager";
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
  isAiGenerated?: boolean;
  detectedCategory?: 'photo' | 'illustration' | 'video' | 'audio' | 'ebook';
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
  isAiGenerated?: boolean;
}

const ProductManagement = () => {
  const navigate = useNavigate();
  const { categories } = useSellerDashboard();
  const { 
    saveProductDraft, 
    publishProduct, 
    loading 
  } = useProductManager();
  const { detectImage, isDetecting: isDetectingImage } = useAIImageDetection();
  const { detectVideo, isDetecting: isDetectingVideo } = useAIVideoDetection();
  const { detectIllustration, isDetecting: isDetectingCategory } = useIllustrationDetection();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [productsData, setProductsData] = useState<Record<string, ProductData>>({});
  const [previewFile, setPreviewFile] = useState<UploadedFileData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isRecategorizingId, setIsRecategorizingId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitializedRef.current) return;
    
    // Check if we're in edit mode
    const editingData = sessionStorage.getItem('editingSubmission');
    const storedFiles = sessionStorage.getItem('pendingUploadedFiles');
    
    if (!storedFiles) {
      // No files found, redirect to upload page
      toast.error("No files found. Please upload your files first.");
      navigate('/file-upload');
      return;
    }
    
    // Mark as initialized immediately to prevent re-runs
    hasInitializedRef.current = true;
    
    if (editingData) {
      const editData = JSON.parse(editingData);
      setIsEditMode(true);
      setEditingSubmissionId(editData.submissionId);
    }
    
    const files = JSON.parse(storedFiles);
    setUploadedFiles(files);
    
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
          coverUrl: file.thumbnailUrl,
          isAiGenerated: editData.isAiGenerated || false
        };
      });
    } else {
      // Auto-detect category for new uploads
      files.forEach((file: UploadedFileData) => {
        let autoCategory = '';
        
        // PRIORITY 1: Use detected category from upload process (illustration detection)
        if (file.detectedCategory) {
          console.log(`🎨 [AUTO-CATEGORY] Using detected category for ${file.name}: ${file.detectedCategory}`);
          
          switch (file.detectedCategory) {
            case 'illustration':
              const illustrationCat = categories.find(cat => 
                cat.name.toLowerCase().includes('illustration')
              );
              autoCategory = illustrationCat?.id || '';
              break;
            case 'photo':
              const photoCat = categories.find(cat => 
                cat.name.toLowerCase().includes('photo')
              );
              autoCategory = photoCat?.id || '';
              break;
            case 'video':
              const videoCat = categories.find(cat => 
                cat.name.toLowerCase().includes('video')
              );
              autoCategory = videoCat?.id || '';
              break;
            case 'audio':
              const audioCat = categories.find(cat => 
                cat.name.toLowerCase().includes('audio')
              );
              autoCategory = audioCat?.id || '';
              break;
            case 'ebook':
              const ebookCat = categories.find(cat => 
                cat.name.toLowerCase().includes('ebook')
              );
              autoCategory = ebookCat?.id || '';
              break;
          }
        }
        
        // PRIORITY 2: Fallback to MIME type detection if no detected category
        if (!autoCategory) {
          const fileType = file.type?.toLowerCase() || '';
          const fileName = file.name?.toLowerCase() || '';
          
          if (fileType.startsWith('video/') ||
              fileName.includes('.mp4') || 
              fileName.includes('.mov') || 
              fileName.includes('.avi') || 
              fileName.includes('.webm') || 
              fileName.includes('.mkv')) {
            const videoCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('video')
            );
            autoCategory = videoCategory?.id || '';
          }
          else if (fileType.startsWith('image/')) {
            const photoCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('photo')
            );
            autoCategory = photoCategory?.id || '';
          }
          else if (fileType.startsWith('audio/')) {
            const audioCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('audio')
            );
            autoCategory = audioCategory?.id || '';
          }
          else if (fileType === 'application/pdf' || fileName.includes('.pdf')) {
            const ebookCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('ebook')
            );
            autoCategory = ebookCategory?.id || '';
          }
        }
        
        initialData[file.id] = {
          fileId: file.id,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          category: autoCategory, // Auto-detected category
          tags: [],
          currentTag: '',
          status: 'draft',
          isAiGenerated: file.isAiGenerated || false
        };
      });
    }
    
    setProductsData(initialData);
    
    // Select first file by default
    if (files.length > 0) {
      setSelectedFileId(files[0].id);
    }
    
    // Don't clear sessionStorage here - keep it until save/cancel
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
      toast.error("Title is required to save");
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

  // Re-analyze AI detection for a file
  const handleReanalyzeAI = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('AI detection only works for images and videos');
      return;
    }

    setIsReanalyzing(true);
    toast.info('Re-analyzing content for AI detection...');

    try {
      let isAiGenerated = false;
      let confidence = 0;

      if (isImage) {
        const result = await detectImage(file.url);
        if (result) {
          isAiGenerated = result.isAiGenerated;
          confidence = result.confidence;
        }
      } else if (isVideo) {
        const result = await detectVideo(file.url);
        if (result) {
          isAiGenerated = result.isAiGenerated;
          confidence = result.confidence;
        }
      }

      // Update the file's AI detection status
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, isAiGenerated } : f
      ));

      // Update the product data
      updateProductData(fileId, { isAiGenerated });

      // Update sessionStorage
      const updatedFiles = uploadedFiles.map(f => 
        f.id === fileId ? { ...f, isAiGenerated } : f
      );
      sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(updatedFiles));

      if (isAiGenerated) {
        toast.success(`AI content detected (${Math.round(confidence * 100)}% confidence)`);
      } else {
        toast.success('Content appears authentic (no AI markers detected)');
      }
    } catch (error) {
      console.error('Re-analyze error:', error);
      toast.error('Failed to re-analyze content');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Re-detect illustration category based on title, description, and tags
  const handleRecategorize = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    const productData = productsData[fileId];
    if (!file || !productData) return;

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      toast.error('Category re-detection only works for images');
      return;
    }

    setIsRecategorizingId(fileId);
    toast.info('Re-analyzing content type based on title and tags...');

    try {
      const result = await detectIllustration(file.url, {
        fileName: file.name,
        title: productData.title,
        description: productData.description,
        tags: productData.tags
      });

      if (result) {
        const newCategory = result.isIllustration ? 'illustration' : 'photo';
        
        // Update file's detected category
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, detectedCategory: newCategory } : f
        ));

        // Find the matching category in the database
        const matchingCat = categories.find(cat => 
          cat.name.toLowerCase().includes(newCategory)
        );
        
        if (matchingCat) {
          updateProductData(fileId, { category: matchingCat.id });
        }

        // Update sessionStorage
        const updatedFiles = uploadedFiles.map(f => 
          f.id === fileId ? { ...f, detectedCategory: newCategory } : f
        );
        sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(updatedFiles));

        if (result.isIllustration) {
          toast.success(`🎨 Detected as Illustration (${Math.round(result.confidence * 100)}% confidence)`);
          console.log('🎨 [RECATEGORIZE] Indicators:', result.indicators);
        } else {
          toast.success(`📷 Detected as Photo (${Math.round((1 - result.confidence) * 100)}% confidence)`);
        }
      }
    } catch (error) {
      console.error('Recategorize error:', error);
      toast.error('Failed to re-detect category');
    } finally {
      setIsRecategorizingId(null);
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
      toast.error("Title and description are required to publish");
      return;
    }

    // For ebooks, check if cover is present
    const isPDF = file.type === 'application/pdf';
    if (isPDF && !productData.coverUrl) {
      toast.error("A cover image is required to publish an ebook");
      return;
    }

    // Use the category selected by the user - no auto-override
    const finalCategoryId = productData.category;

    const success = await publishProduct({
      file: {
        ...file,
        // For ebooks, use cover as thumbnail
        thumbnailUrl: isPDF ? productData.coverUrl : file.thumbnailUrl,
        isAiGenerated: productData.isAiGenerated || false
      },
      productData: {
        title: productData.title,
        description: productData.description,
        category_id: finalCategoryId || undefined,
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
        sessionStorage.removeItem('pendingUploadedFiles');
        sessionStorage.removeItem('editingSubmission');
        toast.success("All products have been published! Redirecting to your portfolio...");
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
        toast.error('No product data to save');
        return;
      }

      if (!productData.title.trim() || !productData.description.trim()) {
        toast.error("Title and description are required");
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
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
          toast.error('Product not found or you do not have permission to edit it');
        } else {
          toast.error(`Error: ${error.message}`);
        }
        return;
      }

      console.log('✅ Submission updated successfully:', data);
      toast.success('Product updated successfully');
      sessionStorage.removeItem('editingSubmission');
      sessionStorage.removeItem('pendingUploadedFiles');
      navigate('/dashboard');
    } catch (error) {
      console.error('💥 Error updating submission:', error);
      toast.error('Error updating product');
    }
  };

  const handlePublishAll = async () => {
    const validProducts = Object.values(productsData).filter(p => 
      p.title.trim() && p.description.trim()
    );
    
    if (validProducts.length === 0) {
      toast.error("No products ready to publish. Check titles and descriptions.");
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
            thumbnailUrl: isPDF ? productData.coverUrl : file.thumbnailUrl,
            isAiGenerated: productData.isAiGenerated || false
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
      toast.success(`${successCount} product(s) published successfully!`);
      
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
        sessionStorage.removeItem('pendingUploadedFiles');
        sessionStorage.removeItem('editingSubmission');
        toast.success("All products have been published! Redirecting to your portfolio...");
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
            toast.error('Error generating preview URL');
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

  const handleDeleteFile = async (fileId: string) => {
    // First, try to delete from database (for files that came from uploaded_files table)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Delete from uploaded_files table
        const { error } = await supabase
          .from('uploaded_files')
          .delete()
          .eq('id', fileId)
          .eq('user_id', user.id);
        
        if (error) {
          console.warn('File not found in uploaded_files or already deleted:', error);
        } else {
          console.log('✅ File deleted from uploaded_files table:', fileId);
        }
      }
    } catch (dbError) {
      console.warn('Error deleting from database (non-critical):', dbError);
    }

    // Remove from uploadedFiles state
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    
    // Update sessionStorage
    if (updatedFiles.length === 0) {
      sessionStorage.removeItem('pendingUploadedFiles');
      toast.success("All files have been removed");
      navigate('/file-upload');
    } else {
      sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(updatedFiles));
      
      // Remove product data for this file
      const updatedProductsData = { ...productsData };
      delete updatedProductsData[fileId];
      setProductsData(updatedProductsData);
      
      // If the deleted file was selected, select the first remaining file
      if (selectedFileId === fileId) {
        setSelectedFileId(updatedFiles[0].id);
      }
      
      toast.success("File removed permanently");
    }
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
      fallbackMessage="This page is reserved for sellers."
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
                <span>File Upload</span>
              </Link>
              <ArrowRight className="h-4 w-4" />
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">2</span>
              <span>Product Management</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Manage your products</h1>
            <p className="text-muted-foreground">
              Configure each product individually with its metadata. 
              Progress: {completedProducts}/{uploadedFiles.length} products configured
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - File List */}
            <Card className="lg:col-span-1 p-4">
              <h3 className="font-semibold mb-4">
                Uploaded Files ({uploadedFiles.length})
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
                             title="Preview"
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           
                           {/* Bouton supprimer */}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDeleteFile(file.id);
                             }}
                             className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive hover:text-destructive"
                             title="Delete file"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                           
                            <div className="flex flex-col items-end space-y-1">
                              {productData?.status === 'published' && (
                                <Badge className="text-xs">Published</Badge>
                              )}
                              {productData?.status === 'draft' && productData.title && (
                                <Badge variant="outline" className="text-xs">Draft</Badge>
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
                      onSaveDraft={() => handleSaveDraft(selectedFileId!)}
                      onPublish={() => handlePublish(selectedFileId!)}
                      loading={loading}
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
                            Product Configuration
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedFile.name} • {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="title">Title *</Label>
                          <Input
                            id="title"
                            value={selectedProductData.title}
                            onChange={(e) => updateProductData(selectedFileId!, { title: e.target.value })}
                            placeholder="Title of your creation"
                            required
                          />
                        </div>
                       
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={selectedProductData.category || ''}
                            onValueChange={(value) => updateProductData(selectedFileId!, { category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedProductData.category && (
                            <p className="text-xs text-muted-foreground">
                              {isEditMode ? 'You can change the category' : 'Auto-detected from file type'}
                            </p>
                          )}
                        </div>
                        
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="description">Description *</Label>
                          <Textarea 
                            id="description"
                            value={selectedProductData.description}
                            onChange={(e) => updateProductData(selectedFileId!, { description: e.target.value })}
                            placeholder="Describe your creation..."
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
                              placeholder="Separate tags by comma, semicolon or Enter"
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

                        {/* AI Detection Status - Read-only (Automatically detected) */}
                        <div className="md:col-span-2">
                          <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                            selectedProductData.isAiGenerated 
                              ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800' 
                              : 'bg-muted/50 border-muted'
                          }`}>
                            <div className={`h-5 w-5 rounded flex items-center justify-center ${
                              selectedProductData.isAiGenerated 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-muted-foreground/20'
                            }`}>
                              {selectedProductData.isAiGenerated && (
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium flex items-center gap-2">
                                {selectedProductData.isAiGenerated ? (
                                  <>
                                    <Badge className="bg-purple-500 text-white text-xs">AI</Badge>
                                    AI content detected automatically
                                  </>
                                ) : (
                                  <>
                                    <Badge variant="outline" className="text-xs">Non-AI</Badge>
                                    Authentic content
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                🤖 Automatic detection by SightEngine - {selectedProductData.isAiGenerated ? 'This content was identified as AI-generated' : 'No AI markers detected'}
                              </p>
                            </div>
                            {/* Re-analyze button for images and videos */}
                            {(selectedFile?.type.startsWith('image/') || selectedFile?.type.startsWith('video/')) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReanalyzeAI(selectedFileId!)}
                                disabled={isReanalyzing || isDetectingImage || isDetectingVideo}
                                className="shrink-0"
                              >
                                <RefreshCw className={`h-4 w-4 mr-1 ${isReanalyzing ? 'animate-spin' : ''}`} />
                                {isReanalyzing ? 'Analyzing...' : 'Re-analyze'}
                              </Button>
                            )}
                          </div>
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
                          Save draft
                        </Button>
                        
                        <Button 
                          onClick={() => handlePublish(selectedFileId!)}
                          disabled={loading || !selectedProductData.title.trim() || !selectedProductData.description.trim()}
                        >
                          {isEditMode ? (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Update product
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Publish this product
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
                    Select a file to configure the product
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Bottom Actions */}
          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">Global Actions</h3>
                <p className="text-sm text-muted-foreground">
                  {readyToPublish} product(s) ready to publish
                </p>
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
                  {isEditMode ? 'Cancel changes' : 'Back to uploads'}
                </Button>
                
                {!isEditMode && (
                  <Button 
                    onClick={handlePublishAll}
                    disabled={loading || readyToPublish === 0}
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Publish all ready products ({readyToPublish})
                  </Button>
                )}
                
                <Button variant="outline" asChild>
                  <Link to="/seller-dashboard">Go to dashboard</Link>
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
                <h3 className="text-lg font-semibold">Preview - {previewFile.name}</h3>
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
                  Size: {formatFileSize(previewFile.size)} • Type: {previewFile.type}
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