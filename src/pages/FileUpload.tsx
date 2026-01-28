import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import { Check, ArrowRight, Upload as UploadIcon, FileEdit, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDraftManager, DraftProduct, DraftFile } from "@/hooks/useDraftManager";

interface UploadedFileData {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  isWatermarked?: boolean;
  isAiGenerated?: boolean;
  detectedCategory?: 'photo' | 'video' | 'audio' | 'ebook';
  fileHash?: string;
}

const FileUpload = () => {
  const navigate = useNavigate();
  const { 
    loading: draftLoading, 
    drafts, 
    createDraft, 
    linkFileToDraft, 
    loadDrafts, 
    recoverOrphanedUploads,
    deleteDraft 
  } = useDraftManager();
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showExistingDrafts, setShowExistingDrafts] = useState(false);

  // Initialize: load existing drafts and recover orphaned uploads
  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Load existing drafts
        const existingDrafts = await loadDrafts();
        
        // Recover any orphaned uploads (creates a draft for them automatically)
        const recoveredFiles = await recoverOrphanedUploads();
        
        if (recoveredFiles.length > 0) {
          toast.info(`🔄 Recovered ${recoveredFiles.length} file(s) from previous session`);
          // Reload drafts to include the newly created recovery draft
          await loadDrafts();
        }

        // If there are existing drafts with files, show them
        if (existingDrafts.some(d => d.files.length > 0)) {
          setShowExistingDrafts(true);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [loadDrafts, recoverOrphanedUploads]);

  // Create a draft when user starts uploading (if not already created)
  const ensureDraftExists = useCallback(async (): Promise<string | null> => {
    if (currentDraftId) return currentDraftId;
    
    const newDraftId = await createDraft('New Upload');
    if (newDraftId) {
      setCurrentDraftId(newDraftId);
      console.log('📝 Created new draft for upload session:', newDraftId);
    }
    return newDraftId;
  }, [currentDraftId, createDraft]);

  const handleFilesUploaded = async (files: UploadedFileData[]) => {
    console.log('📥 handleFilesUploaded called with files:', files);
    
    // CRITICAL: Ensure draft exists BEFORE processing files
    const draftId = await ensureDraftExists();
    if (!draftId) {
      toast.error("Failed to create draft. Please try again.");
      return;
    }
    
    // Update state first so the UI shows progress
    setUploadedFiles(prev => [...prev, ...files]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.warning("Files uploaded but not saved - please login");
        return;
      }

      // Save files to uploaded_files table WITH draft_id
      const filesToInsert = files.map(file => ({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_url: file.url,
        file_size: file.size,
        preview_url: file.previewUrl,
        thumbnail_url: file.thumbnailUrl,
        is_watermarked: file.isWatermarked || false,
        file_hash: file.fileHash || null,
        draft_id: draftId, // CRITICAL: Link to draft immediately
        status: 'completed'
      }));

      console.log('💾 Saving files with draft_id:', draftId);

      const { data: insertedFiles, error } = await supabase
        .from('uploaded_files')
        .insert(filesToInsert)
        .select();

      if (error) {
        console.error('Error saving files to database:', error);
        toast.warning("Files ready but database save failed - you can still continue");
        return;
      }

      console.log('✅ Files saved with draft_id:', insertedFiles);
      
      // Update state with database IDs
      if (insertedFiles && insertedFiles.length > 0) {
        setUploadedFiles(prev => prev.map(file => {
          const dbFile = insertedFiles.find(df => df.file_url === file.url);
          if (dbFile) {
            return { ...file, id: dbFile.id };
          }
          return file;
        }));
      }

      toast.success(`${files.length} file(s) uploaded and linked to draft`);
    } catch (error) {
      console.error('Error in handleFilesUploaded:', error);
      toast.warning("Files ready - you can continue despite the error");
    }
  };

  const handleContinueToProducts = () => {
    if (uploadedFiles.length === 0 && !currentDraftId) {
      toast.error("Please upload at least one file before continuing");
      return;
    }

    // Store draft ID for ProductManagement page
    if (currentDraftId) {
      sessionStorage.setItem('currentDraftId', currentDraftId);
    }
    
    // Also store files for backward compatibility
    sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(uploadedFiles));
    
    navigate('/product-management');
  };

  const handleEditDraft = (draft: DraftProduct) => {
    // Store draft ID and files, navigate to management
    sessionStorage.setItem('currentDraftId', draft.id);
    sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(draft.files));
    sessionStorage.setItem('editingSubmission', JSON.stringify({
      submissionId: draft.id,
      title: draft.title,
      description: draft.description,
      category: draft.category_id,
      tags: draft.tags,
      status: draft.status
    }));
    navigate('/product-management');
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (window.confirm('Are you sure you want to delete this draft and all its files?')) {
      await deleteDraft(draftId);
      await loadDrafts();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter drafts with files to show
  const draftsWithFiles = drafts.filter(d => d.files.length > 0);

  return (
    <ProtectedRoute 
      allowedRoles={['creator', 'admin']}
      fallbackMessage="This page is reserved for sellers. Only creators can upload content."
    >
      <div className="min-h-screen bg-background">
        <Header />
        <Navigation />
        
        <div className="container py-8 max-w-4xl">
          {isLoading || draftLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your drafts...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">1</span>
                  <span>File Upload</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="px-3 py-1 rounded-full bg-muted">2</span>
                  <span>Product Management</span>
                </div>
                
                <h1 className="text-3xl font-bold mb-2">Upload Your Files</h1>
                <p className="text-muted-foreground">
                  Start by uploading all your digital files. Your uploads are automatically saved as drafts.
                </p>
              </div>

              {/* Existing Drafts Section */}
              {draftsWithFiles.length > 0 && (
                <Card className="p-6 mb-6 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                      You have {draftsWithFiles.length} draft(s) with pending files
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {draftsWithFiles.map(draft => (
                      <div 
                        key={draft.id} 
                        className="flex items-center justify-between p-3 bg-background rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{draft.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {draft.files.length} file(s) • Created {new Date(draft.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditDraft(draft)}
                          >
                            <FileEdit className="h-4 w-4 mr-1" />
                            Continue
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDraft(draft.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="space-y-6">
                {/* File Upload Section */}
                <Card className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <UploadIcon className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">Upload Zone</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Drop or select your files. Images will be automatically watermarked. 
                      <strong className="text-foreground"> Files are saved instantly as drafts.</strong>
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
                        Uploaded Files ({uploadedFiles.length})
                      </h3>
                      {currentDraftId && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Draft saved
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {uploadedFiles.slice(0, 6).map((file, index) => (
                        <div key={file.id || index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                          {file.type.startsWith('image/') && file.previewUrl ? (
                            <img 
                              src={file.previewUrl} 
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : file.type.startsWith('video/') && (file.url || file.previewUrl) ? (
                            <video 
                              src={file.url || file.previewUrl} 
                              className="w-12 h-12 object-cover rounded"
                              muted
                              playsInline
                            />
                          ) : (
                            <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                              <UploadIcon className="h-5 w-5 text-primary" />
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
                            +{uploadedFiles.length - 6} more files
                          </p>
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={handleContinueToProducts}
                      size="lg"
                      className="w-full"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Continue to Product Management
                    </Button>
                  </Card>
                )}

                {/* Instructions */}
                <Card className="p-6 bg-muted/50">
                  <h3 className="font-semibold mb-2">✨ Draft-First System</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your files are saved as drafts <strong>immediately</strong> after upload</li>
                    <li>• If you refresh or leave, your uploads will be waiting for you</li>
                    <li>• Continue from any draft at any time</li>
                    <li>• Complete product details when you're ready to publish</li>
                  </ul>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default FileUpload;
