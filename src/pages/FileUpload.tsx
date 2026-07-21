import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimpleFileUpload } from "@/components/SimpleFileUpload";
import { Check, ArrowRight, Upload as UploadIcon, FileEdit, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDraftManager, DraftProduct, DraftFile } from "@/hooks/useDraftManager";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

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
  detectedCategory?: 'photo' | 'video' | 'audio' | 'ebook' | 'vfx' | 'vector' | 'other';
  detectedTags?: string[];
  fileHash?: string;
}

const FileUpload = () => {
  useSEO({ title: "Upload Files", description: "Upload your creative assets to VisuStock.", noindex: true });
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  
  // Guard: ensure initialization only runs once per mount
  const hasInitialized = useRef(false);
  
  // CRITICAL: Track if uploads are in progress to prevent state updates that cause re-renders
  const isUploadingRef = useRef(false);
  
  // CRITICAL: Mutex to prevent concurrent draft creation (race condition fix)
  const draftCreationPromiseRef = useRef<Promise<string | null> | null>(null);
  
  // Ref to track draft ID without stale closure issues
  const currentDraftIdRef = useRef<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    currentDraftIdRef.current = currentDraftId;
  }, [currentDraftId]);

  // Initialize: load existing drafts and recover orphaned uploads
  useEffect(() => {
    // Prevent re-runs from callback recreation or parent re-renders
    // Also skip if uploads are in progress to prevent disruption
    if (hasInitialized.current || isUploadingRef.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Load existing drafts
        let existingDrafts = await loadDrafts();
        
        // Recover any orphaned uploads (creates a draft for them automatically)
        const recoveredFiles = await recoverOrphanedUploads();
        
        if (recoveredFiles.length > 0) {
          toast.info(t('sd.upload.recovered').replace('{n}', String(recoveredFiles.length)));
          // Reload drafts to include the newly created recovery draft
          existingDrafts = await loadDrafts();
        }

        // If there are existing drafts with files, show them
        if (existingDrafts.some(d => d.files.length > 0)) {
          setShowExistingDrafts(true);
          
          // Hydrate uploadedFiles from the most recent draft so the UI shows them
          const mostRecentDraft = existingDrafts.find(d => d.files.length > 0);
          if (mostRecentDraft) {
            setCurrentDraftId(mostRecentDraft.id);
            currentDraftIdRef.current = mostRecentDraft.id;
            setUploadedFiles(mostRecentDraft.files.map(f => ({
              id: f.id,
              url: f.url,
              name: f.name,
              type: f.type,
              size: f.size,
              previewUrl: f.previewUrl,
              thumbnailUrl: f.thumbnailUrl,
              isWatermarked: f.isWatermarked,
              fileHash: f.fileHash,
            })));
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []); // Empty deps - runs once, guard prevents re-runs

  // Create a draft when user starts uploading (if not already created)
  // Uses a mutex + ref to prevent concurrent creation and stale closures
  const ensureDraftExists = useCallback(async (): Promise<string | null> => {
    // Use ref to avoid stale closure — state updates may not be visible in callbacks
    if (currentDraftIdRef.current) return currentDraftIdRef.current;
    
    // If another call is already creating a draft, wait for it
    if (draftCreationPromiseRef.current) {
      return draftCreationPromiseRef.current;
    }
    
    // Create the promise and store it so concurrent calls reuse it
    const promise = (async () => {
      const newDraftId = await createDraft('New Upload');
      if (newDraftId) {
        currentDraftIdRef.current = newDraftId; // Update ref immediately
        setCurrentDraftId(newDraftId);
        console.log('📝 Created new draft for upload session:', newDraftId);
      }
      return newDraftId;
    })();
    
    draftCreationPromiseRef.current = promise;
    
    try {
      const result = await promise;
      return result;
    } finally {
      draftCreationPromiseRef.current = null;
    }
  }, [createDraft]);

  // STABILIZED callback - uses refs to track upload state without causing re-renders
  const handleFilesUploaded = useCallback(async (files: UploadedFileData[]) => {
    console.log('📥 handleFilesUploaded called with files:', files);
    
    // Mark that uploads are in progress - prevents initialization from re-running
    isUploadingRef.current = true;
    
    try {
      // CRITICAL: Ensure draft exists BEFORE processing files
      const draftId = await ensureDraftExists();
      if (!draftId) {
        toast.error(t('sd.upload.linkFailed'));
        return;
      }
      
      // Update state first so the UI shows progress
      setUploadedFiles(prev => [...prev, ...files]);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.warning(t('sd.upload.notLinked'));
        return;
      }

      // Files are already saved to uploaded_files table by SimpleFileUpload
      // Now we just need to LINK them to the draft by updating draft_id
      const fileIds = files.map(f => f.id);
      
      console.log('🔗 Linking files to draft:', draftId, 'File IDs:', fileIds);

      const { error: linkError } = await supabase
        .from('uploaded_files')
        .update({ draft_id: draftId })
        .in('id', fileIds);

      if (linkError) {
        console.error('Error linking files to draft:', linkError);
        // Try individual updates as fallback (in case some IDs are client-side)
        for (const file of files) {
          await supabase
            .from('uploaded_files')
            .update({ draft_id: draftId })
            .eq('file_url', file.url);
        }
      }

      console.log('✅ Files linked to draft:', draftId);
      toast.success(t('sd.upload.linkedSuccess').replace('{n}', String(files.length)));
    } catch (error) {
      console.error('Error in handleFilesUploaded:', error);
      toast.warning(t('sd.upload.canContinue'));
    } finally {
      // Allow state updates again once upload handling is complete
      isUploadingRef.current = false;
    }
  }, [ensureDraftExists]);

  const handleContinueToProducts = () => {
    if (uploadedFiles.length === 0 && !currentDraftId) {
      toast.error(t('sd.upload.mustUpload'));
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
    if (window.confirm(t('sd.upload.confirmDeleteDraft'))) {
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
      fallbackMessage={t('sd.upload.forbiddenSellers')}
    >
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container py-8 max-w-4xl">
          {isLoading || draftLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('sd.upload.loadingDrafts')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">1</span>
                  <span>{t('sd.upload.step1')}</span>
                  <ArrowRight className="h-4 w-4" />
                  <span className="px-3 py-1 rounded-full bg-muted">2</span>
                  <span>{t('sd.upload.step2')}</span>
                </div>
                
                <h1 className="text-3xl font-bold mb-2">{t('sd.upload.title')}</h1>
                <p className="text-muted-foreground">
                  {t('sd.upload.descDraft')}
                </p>
              </div>

              {/* Existing Drafts Section */}
              {draftsWithFiles.length > 0 && (
                <Card className="p-6 mb-6 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                      {t('sd.upload.pendingDrafts').replace('{n}', String(draftsWithFiles.length))}
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
                            {t('sd.recent.files').replace('{n}', String(draft.files.length))} • {new Date(draft.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditDraft(draft)}
                          >
                            <FileEdit className="h-4 w-4 mr-1" />
                            {t('sd.upload.continueDraft')}
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
                      <h2 className="text-xl font-semibold">{t('sd.upload.zone')}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('sd.upload.zoneDescDraft')}{' '}
                      <strong className="text-foreground">{t('sd.upload.filesSaved')}</strong>
                    </p>
                  </div>
                  
                  <SimpleFileUpload 
                    key="simple-file-upload-stable"
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
                        {t('sd.upload.uploaded')} ({uploadedFiles.length})
                      </h3>
                      {currentDraftId && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          {t('sd.upload.draftSaved')}
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
                            {t('sd.upload.moreFiles').replace('{n}', String(uploadedFiles.length - 6))}
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
                      {t('sd.upload.continue')}
                    </Button>
                  </Card>
                )}

                {/* Instructions */}
                <Card className="p-6 bg-muted/50">
                  <h3 className="font-semibold mb-2">✨ {t('sd.upload.draftSystem')}</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t('sd.upload.draft.saved')}</li>
                    <li>• {t('sd.upload.draft.leave')}</li>
                    <li>• {t('sd.upload.draft.continue')}</li>
                    <li>• {t('sd.upload.draft.publish')}</li>
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
