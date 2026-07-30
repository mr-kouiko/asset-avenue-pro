import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Plus, X, Save, Eye, Upload, Play, Image, Music, Video, FileText, Trash2, RefreshCw, Gift, ChevronLeft, ChevronRight, Layers, Bot } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSellerDashboard } from "@/hooks/useSellerDashboard";
import { useProductManager } from "@/hooks/useProductManager";
import { useDraftManager, DraftProduct } from "@/hooks/useDraftManager";
import { supabase } from '@/integrations/supabase/client';
import { MediaPlayer } from "@/components/media/MediaPlayer";
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { EbookForm } from "@/components/EbookForm";
import { VFXPreviewUpload } from "@/components/VFXPreviewUpload";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";

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
  detectedCategory?: 'photo' | 'video' | 'audio' | 'ebook' | 'vfx' | 'vector' | 'other';
  detectedTags?: string[];
  submissionId?: string; // Track which draft/submission this file belongs to
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
  previewImageUrl?: string;
  previewMediaType?: 'image' | 'video';
  isAiGenerated?: boolean;
  isFreeContent?: boolean;
  aiDeclaration?: 'fully_ai_generated' | 'ai_assisted' | 'no_ai_used';
}

const ProductManagement = () => {
  useSEO({ title: "Manage Products", description: "Manage your VisuStock product listings.", noindex: true });
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null); // Track current draft
  const [allDrafts, setAllDrafts] = useState<DraftProduct[]>([]); // All available drafts for navigation
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0); // Current position in drafts list
  
  const { loadDrafts } = useDraftManager();
  
  const hasInitializedRef = useRef(false);

  // Load all drafts for navigation
  const loadAllDraftsForNavigation = useCallback(async () => {
    const drafts = await loadDrafts();
    const draftsWithFiles = drafts.filter(d => d.files.length > 0);
    setAllDrafts(draftsWithFiles);
    
    // Find current draft index
    if (currentDraftId) {
      const idx = draftsWithFiles.findIndex(d => d.id === currentDraftId);
      if (idx !== -1) {
        setCurrentDraftIndex(idx);
      }
    }
    
    return draftsWithFiles;
  }, [loadDrafts, currentDraftId]);

  // Switch to a different draft
  const switchToDraft = useCallback((draft: DraftProduct) => {
    // Save current draft ID
    setCurrentDraftId(draft.id);
    sessionStorage.setItem('currentDraftId', draft.id);
    
    // Convert draft files to UploadedFileData format - include submissionId for each file
    const files = draft.files.map(f => ({
      id: f.id,
      url: f.url,
      name: f.name,
      type: f.type,
      size: f.size,
      previewUrl: f.previewUrl,
      thumbnailUrl: f.thumbnailUrl,
      isWatermarked: f.isWatermarked,
      submissionId: draft.id // Track which draft this file belongs to
    }));
    
    setUploadedFiles(files);
    sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(files));
    
    // Store editing data
    sessionStorage.setItem('editingSubmission', JSON.stringify({
      submissionId: draft.id,
      title: draft.title,
      description: draft.description,
      category: draft.category_id,
      tags: draft.tags,
      status: draft.status
    }));
    
    setIsEditMode(true);
    setEditingSubmissionId(draft.id);
    
    // Initialize product data for the new draft
    const initialData: Record<string, ProductData> = {};
    files.forEach((file) => {
      initialData[file.id] = {
        fileId: file.id,
        title: draft.title || file.name.replace(/\.[^/.]+$/, ''),
        description: draft.description || '',
        category: draft.category_id || '',
        tags: draft.tags || [],
        currentTag: '',
        status: (draft.status as 'draft' | 'published' | 'pending') || 'draft',
        isAiGenerated: false
      };
    });
    
    setProductsData(initialData);
    
    if (files.length > 0) {
      setSelectedFileId(files[0].id);
    }
    
    // Update current draft index
    const idx = allDrafts.findIndex(d => d.id === draft.id);
    if (idx !== -1) {
      setCurrentDraftIndex(idx);
    }
    
    toast.info(t('sd.pm.toast.switched').replace('{title}', draft.title));
  }, [allDrafts]);

  // Navigate to previous draft
  const goToPreviousDraft = useCallback(() => {
    if (currentDraftIndex > 0 && allDrafts.length > 0) {
      switchToDraft(allDrafts[currentDraftIndex - 1]);
    }
  }, [currentDraftIndex, allDrafts, switchToDraft]);

  // Navigate to next draft
  const goToNextDraft = useCallback(() => {
    if (currentDraftIndex < allDrafts.length - 1 && allDrafts.length > 0) {
      switchToDraft(allDrafts[currentDraftIndex + 1]);
    }
  }, [currentDraftIndex, allDrafts, switchToDraft]);

  // Set document title
  useEffect(() => {
    document.title = 'Product Management | VisuStock';
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    
    // Check if we're in edit mode or have a draft ID
    const editingData = sessionStorage.getItem('editingSubmission');
    const editData = editingData ? JSON.parse(editingData) : null;
    const storedDraftId = sessionStorage.getItem('currentDraftId');
    const storedFiles = sessionStorage.getItem('pendingUploadedFiles');
    
    if (!storedFiles) {
      toast.error(t('sd.pm.toast.noFiles'));
      navigate('/file-upload');
      return;
    }
    
    // Mark as initialized immediately to prevent re-runs
    hasInitializedRef.current = true;
    
    // Set draft ID for later use in publishing
    if (storedDraftId) {
      setCurrentDraftId(storedDraftId);
      console.log('📝 Using draft ID:', storedDraftId);
    }
    
    if (editData) {
      setIsEditMode(true);
      setEditingSubmissionId(editData.submissionId);
      // Use the editing submission ID as the draft ID
      setCurrentDraftId(editData.submissionId);
    }

    const rawFiles = JSON.parse(storedFiles) as UploadedFileData[];
    // Normalize: ensure every file carries its parent submissionId.
    // This prevents stale sessionStorage (e.g. after switching accounts) from falling back to a wrong submission ID.
    const normalizedFiles: UploadedFileData[] = rawFiles.map((f) => ({
      ...f,
      submissionId: f.submissionId || editData?.submissionId || storedDraftId || undefined,
    }));

    setUploadedFiles(normalizedFiles);
    // Persist normalized version so subsequent actions don't rely on fallbacks.
    sessionStorage.setItem('pendingUploadedFiles', JSON.stringify(normalizedFiles));
    
    // Initialize products data
    const initialData: Record<string, ProductData> = {};
    
    // If in edit mode, load existing data
    if (editData) {
      normalizedFiles.forEach((file: UploadedFileData) => {
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
      normalizedFiles.forEach((file: UploadedFileData) => {
        let autoCategory = '';
        
        // PRIORITY 1: Use detected category from upload process (illustration detection)
        if (file.detectedCategory) {
          console.log(`🎨 [AUTO-CATEGORY] Using detected category for ${file.name}: ${file.detectedCategory}`);
          
          switch (file.detectedCategory) {
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
            case 'vfx':
              const vfxCat = categories.find(cat => 
                cat.name.toLowerCase().includes('visual') || cat.name.toLowerCase().includes('vfx')
              );
              autoCategory = vfxCat?.id || '';
              break;
            case 'vector':
              const vectorCat = categories.find(cat =>
                cat.name.toLowerCase().includes('vector')
              );
              autoCategory = vectorCat?.id || '';
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
          // RAR files -> VFX category
          else if (fileType.includes('rar') || fileName.endsWith('.rar')) {
            const vfxCategory = categories.find(cat => 
              cat.name.toLowerCase().includes('visual') || cat.name.toLowerCase().includes('vfx')
            );
            autoCategory = vfxCategory?.id || '';
          }
        }
        
        initialData[file.id] = {
          fileId: file.id,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: '',
          category: autoCategory, // Auto-detected category
          tags: file.detectedTags || [], // Auto-suggested tags from detector
          currentTag: '',
          status: 'draft',
          isAiGenerated: file.isAiGenerated || false,
          isFreeContent: false
        };
      });
    }
    
    setProductsData(initialData);
    
    // Select first file by default
    if (normalizedFiles.length > 0) {
      setSelectedFileId(normalizedFiles[0].id);
    }
    // Load all drafts for navigation after initialization
    loadAllDraftsForNavigation();
    
    // Don't clear sessionStorage here - keep it until save/cancel
  }, [navigate]);

  // Reload drafts list when currentDraftId changes
  useEffect(() => {
    if (hasInitializedRef.current && currentDraftId) {
      loadAllDraftsForNavigation();
    }
  }, [currentDraftId]);

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
      toast.error(t('sd.pm.toast.titleRequired'));
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



  // Draft submissions already consumed by a publish in this page session.
  // A draft row can only back ONE published product — reusing it would overwrite
  // the previously published submission and its content_files row.
  const consumedDraftIdsRef = useRef<Set<string>>(new Set());

  const resolveOwnedSubmissionIdForUser = async (
    userId: string,
    candidateIds: Array<string | undefined | null>,
    fileId?: string,
    options?: { forPublish?: boolean }
  ): Promise<string | null> => {
    const consumed = consumedDraftIdsRef.current;
    const ordered = (candidateIds.filter(Boolean) as string[])
      .filter((id, idx, arr) => arr.indexOf(id) === idx)
      .filter((id) => !(options?.forPublish && consumed.has(id)));
    
    console.log('🔍 [RESOLVE] Checking candidate IDs:', ordered, 'for user:', userId);
    
    // If we have candidate IDs, check if user owns them
    if (ordered.length > 0) {
      const { data, error } = await supabase
        .from('content_submissions')
        .select('id, status')
        .in('id', ordered)
        .eq('creator_id', userId);

      if (error) {
        console.error('❌ Failed to resolve owned submission id:', error);
      } else if (data && data.length > 0) {
        // When publishing, never reuse a submission that is already published —
        // that would silently replace an existing marketplace product.
        const usable = new Map(
          data
            .filter((r) => !options?.forPublish || r.status === 'draft' || r.status === 'pending')
            .map((r) => [r.id, r])
        );
        const match = ordered.find((id) => usable.has(id));
        if (match) {
          console.log('✅ [RESOLVE] Found owned submission:', match);
          return match;
        }
      }
    }
    
    // Fallback: reuse one of the user's own unpublished drafts (excluding ones
    // already consumed by an earlier publish in this session).
    console.log('🔄 [RESOLVE] Fallback - checking user drafts...');
    const { data: userDrafts, error: draftsError } = await supabase
      .from('content_submissions')
      .select('id')
      .eq('creator_id', userId)
      .in('status', ['draft', 'pending']);
    
    if (draftsError) {
      console.error('❌ Failed to fetch user drafts:', draftsError);
      return null;
    }
    
    const available = (userDrafts || []).filter(
      (d) => !(options?.forPublish && consumed.has(d.id))
    );
    if (available.length > 0) {
      console.log('📋 [RESOLVE] User has', available.length, 'available draft(s)');
      return available[0].id;
    }
    
    console.log('❌ [RESOLVE] No owned drafts found for user');
    return null;
  };



  const handlePublish = async (fileId: string) => {
    const productData = productsData[fileId];
    const file = uploadedFiles.find(f => f.id === fileId);
    
    if (!productData || !file) return;

    // If we're editing an already published product, publish should behave like "update".
    // But if we're editing a draft, publish should actually publish.
    const isDraftLikeStatus = productData.status === 'draft' || productData.status === 'pending';
    if (isEditMode && editingSubmissionId && !isDraftLikeStatus) {
      await handleUpdateSubmission(fileId);
      return;
    }

    // Resolve a draft id that is actually owned by the current user (protects against stale sessionStorage)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t('sd.pm.toast.loginRequired'));
      return;
    }

    const ownedDraftId = await resolveOwnedSubmissionIdForUser(user.id, [
      file.submissionId,
      currentDraftId,
      editingSubmissionId
    ], fileId);

    console.log('📝 [PUBLISH] Resolved draft ID:', ownedDraftId);
    console.log('📁 [PUBLISH] File submissionId:', file.submissionId);
    console.log('🗂️ [PUBLISH] currentDraftId:', currentDraftId);
    console.log('✏️ [PUBLISH] editingSubmissionId:', editingSubmissionId);

    if (!ownedDraftId) {
      sessionStorage.removeItem('editingSubmission');
      sessionStorage.removeItem('pendingUploadedFiles');
      sessionStorage.removeItem('currentDraftId');
      toast.error(t('sd.pm.toast.noDraftPublish'));
      navigate('/file-upload');
      return;
    }

    if (!productData.title.trim() || !productData.description.trim()) {
      toast.error(t('sd.pm.toast.titleDescRequired'));
      return;
    }

    if (!productData.aiDeclaration) {
      toast.error(t('sd.pm.toast.aiRequired'));
      return;
    }

    // For ebooks, check if cover is present
    const isPDF = file.type === 'application/pdf';
    if (isPDF && !productData.coverUrl) {
      toast.error(t('sd.pm.toast.coverRequired'));
      return;
    }

    // For VFX/archive products, check if preview image is present
    const isArchive = file.type.includes('rar') || file.type.includes('zip') || 
                      file.name.toLowerCase().endsWith('.rar') || file.name.toLowerCase().endsWith('.zip');
    if (isArchive && !productData.previewImageUrl) {
      toast.error(t('sd.pm.toast.vfxPreviewRequired'));
      return;
    }

    // Use the category selected by the user - no auto-override
    const finalCategoryId = productData.category;

    const success = await publishProduct({
      file: {
        ...file,
        // For ebooks, use cover as thumbnail; for archives, use preview image
        thumbnailUrl: isPDF ? productData.coverUrl : (isArchive ? productData.previewImageUrl : file.thumbnailUrl),
        previewUrl: isArchive ? productData.previewImageUrl : file.previewUrl,
        isAiGenerated: productData.isAiGenerated || false
      },
      productData: {
        title: productData.title,
        description: productData.description,
        category_id: finalCategoryId || undefined,
        tags: productData.tags,
        isFreeContent: productData.isFreeContent || false
      },
      draftId: ownedDraftId // Always use a draft that belongs to the current user
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
        sessionStorage.removeItem('currentDraftId');
        toast.success(t('sd.pm.toast.allPublished'));
        setTimeout(() => navigate('/portfolio'), 1500);
      } else {
        // Select the first remaining file
        setSelectedFileId(updatedFiles[0].id);
      }
    }
  };

  const handleUpdateSubmission = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId);
    
    
    try {
      const productData = productsData[fileId];
      if (!productData) {
        toast.error(t('sd.pm.toast.noProductData'));
        return;
      }

      if (!productData.title.trim() || !productData.description.trim()) {
        toast.error(t('sd.pm.toast.titleDescReq'));
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('sd.pm.toast.loginRequired'));
        return;
      }

      const targetSubmissionId = await resolveOwnedSubmissionIdForUser(user.id, [
        file?.submissionId,
        currentDraftId,
        editingSubmissionId
      ], fileId);

      if (!targetSubmissionId) {
        sessionStorage.removeItem('editingSubmission');
        sessionStorage.removeItem('pendingUploadedFiles');
        sessionStorage.removeItem('currentDraftId');
        toast.error(t('sd.pm.toast.noDraftUpdate'));
        navigate('/dashboard');
        return;
      }

      console.log('🔄 Updating submission:', targetSubmissionId);
      console.log('📁 File submissionId:', file?.submissionId, '| Global editingSubmissionId:', editingSubmissionId);
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
        .eq('id', targetSubmissionId)
        .eq('creator_id', user.id) // Security: ensure user owns this submission
        .select()
        .single();

      if (error) {
        console.error('❌ Update error:', error);
        if (error.code === 'PGRST116') {
          toast.error(t('sd.pm.toast.notFoundOrNoPerm'));
        } else {
          toast.error(`Error: ${error.message}`);
        }
        return;
      }

      console.log('✅ Submission updated successfully:', data);
      toast.success(t('sd.pm.toast.updated'));
      sessionStorage.removeItem('editingSubmission');
      sessionStorage.removeItem('pendingUploadedFiles');
      navigate('/dashboard');
    } catch (error) {
      console.error('💥 Error updating submission:', error);
      toast.error(t('sd.pm.toast.updateError'));
    }
  };

  const handlePublishAll = async () => {
    const validProducts = Object.values(productsData).filter(p => 
      p.title.trim() && p.description.trim()
    );
    
    if (validProducts.length === 0) {
      toast.error(t('sd.pm.toast.nonePublishable'));
      return;
    }

    let successCount = 0;
    const publishedFileIds: string[] = [];
    let sharedDraftUsed = false; // Only the first published file may reuse the shared draft submission
    
    for (const productData of validProducts) {
      const file = uploadedFiles.find(f => f.id === productData.fileId);
      if (file) {
      const isPDF = file.type === 'application/pdf';
        const isArchive = file.type.includes('rar') || file.type.includes('zip') || 
                          file.name.toLowerCase().endsWith('.rar') || file.name.toLowerCase().endsWith('.zip');
        
        // Skip ebooks without cover
        if (isPDF && !productData.coverUrl) {
          console.log(`Skipping ebook ${file.name} - no cover image`);
          continue;
        }
        
        // Skip archives without preview
        if (isArchive && !productData.previewImageUrl) {
          console.log(`Skipping VFX ${file.name} - no preview image`);
          continue;
        }
        
        // Per-file submissionId always wins. Otherwise reuse the shared draft only once —
        // subsequent files must create their own submission or they overwrite the same row.
        const perFileSubmissionId = file.submissionId;
        const sharedDraft = currentDraftId || editingSubmissionId || undefined;
        let effectiveDraftId: string | undefined = perFileSubmissionId;
        if (!effectiveDraftId && sharedDraft && !sharedDraftUsed) {
          effectiveDraftId = sharedDraft;
          sharedDraftUsed = true;
        }

        const success = await publishProduct({
          file: {
            ...file,
            // For ebooks, use cover as thumbnail; for archives, use preview image
            thumbnailUrl: isPDF ? productData.coverUrl : (isArchive ? productData.previewImageUrl : file.thumbnailUrl),
            previewUrl: isArchive ? productData.previewImageUrl : file.previewUrl,
            isAiGenerated: productData.isAiGenerated || false,
            // For VFX archives, pass the preview media type (image or video)
            previewMediaType: isArchive ? productData.previewMediaType : undefined
          },
          productData: {
            title: productData.title,
            description: productData.description,
            category_id: productData.category || undefined,
            tags: productData.tags,
            isFreeContent: productData.isFreeContent || false
          },
          draftId: effectiveDraftId
        });


        if (success) {
          successCount++;
          publishedFileIds.push(productData.fileId);
        }
      }
    }

    if (successCount > 0) {
      toast.success(t('sd.pm.toast.publishedCount').replace('{n}', String(successCount)));
      
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
        sessionStorage.removeItem('currentDraftId');
        toast.success(t('sd.pm.toast.allPublished'));
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
            toast.error(t('sd.pm.toast.previewUrlErr'));
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
      toast.success(t('sd.pm.toast.allRemoved'));
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
      
      toast.success(t('sd.pm.toast.fileRemoved'));
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
      fallbackMessage={t('sd.pm.forbiddenSellers')}
    >
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container py-8 max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Link 
                to="/file-upload" 
                className="flex items-center space-x-1 hover:text-primary transition-colors"
              >
                <span className="px-3 py-1 rounded-full bg-muted">1</span>
                <span>{t('sd.upload.step1')}</span>
              </Link>
              <ArrowRight className="h-4 w-4" />
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">2</span>
              <span>{t('sd.upload.step2')}</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-2">{t('sd.pm.title')}</h1>
            <p className="text-muted-foreground">
              Configure each product individually with its metadata. 
              {t('sd.pm.progress').replace('{done}', String(completedProducts)).replace('{total}', String(uploadedFiles.length))}
            </p>
          </div>

          {/* Draft Navigation Bar */}
          {allDrafts.length > 1 && (
            <Card className="p-3 mb-6 bg-muted/50 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {t('sd.pm.draftNav').replace('{i}', String(currentDraftIndex + 1)).replace('{n}', String(allDrafts.length))}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t('sd.pm.draftNavHint')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousDraft}
                    disabled={currentDraftIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('sd.pm.previous')}
                  </Button>
                  <Select
                    value={currentDraftId || ''}
                    onValueChange={(value) => {
                      const draft = allDrafts.find(d => d.id === value);
                      if (draft) switchToDraft(draft);
                    }}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder={t('sd.pm.selectDraft')} />
                    </SelectTrigger>
                    <SelectContent>
                      {allDrafts.map((draft, idx) => (
                        <SelectItem key={draft.id} value={draft.id}>
                          {idx + 1}. {draft.title.substring(0, 30)}{draft.title.length > 30 ? '...' : ''} ({draft.files.length} file{draft.files.length > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextDraft}
                    disabled={currentDraftIndex === allDrafts.length - 1}
                  >
                    {t('sd.pm.next')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - File List */}
            <Card className="lg:col-span-1 p-4">
              <h3 className="font-semibold mb-4">
                {t('sd.pm.uploadedFiles')} ({uploadedFiles.length})
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
                             title={t('sd.pm.preview')}
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
                             title={t('sd.pm.deleteFile')}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                           
                            <div className="flex flex-col items-end space-y-1">
                              {productData?.status === 'published' && (
                                <Badge className="text-xs">{t('sd.status.published')}</Badge>
                              )}
                              {productData?.status === 'draft' && productData.title && (
                                <Badge variant="outline" className="text-xs">{t('sd.status.draft')}</Badge>
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
                            {t('sd.pm.productConfig')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedFile.name} • {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>

                      {/* VFX/Archive Preview Media Upload (Image or Video) */}
                      {(selectedFile.type.includes('rar') || selectedFile.type.includes('zip') ||
                        selectedFile.name.toLowerCase().endsWith('.rar') || selectedFile.name.toLowerCase().endsWith('.zip')) && (
                        <VFXPreviewUpload
                          previewImageUrl={selectedProductData.previewImageUrl}
                          previewMediaType={selectedProductData.previewMediaType}
                          onPreviewChange={(url, mediaType) => updateProductData(selectedFileId!, { 
                            previewImageUrl: url,
                            previewMediaType: mediaType
                          })}
                          disabled={loading}
                        />
                      )}

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="title">{t('sd.pm.field.title')} *</Label>
                          <Input
                            id="title"
                            value={selectedProductData.title}
                            onChange={(e) => updateProductData(selectedFileId!, { title: e.target.value })}
                            placeholder={t('sd.pm.field.title.placeholder')}
                            required
                          />
                        </div>
                       
                        <div className="space-y-2">
                          <Label htmlFor="category">{t('sd.pm.field.category')}</Label>
                          <Select
                            value={selectedProductData.category || ''}
                            onValueChange={(value) => updateProductData(selectedFileId!, { category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('sd.pm.field.category.placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories
                                .filter((category) => category.name.toLowerCase() !== 'illustration')
                                .map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {selectedProductData.category && (
                            <p className="text-xs text-muted-foreground">
                              {isEditMode ? t('sd.pm.field.category.hint.edit') : t('sd.pm.field.category.hint.auto')}
                            </p>
                          )}
                        </div>
                        
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="description">{t('sd.pm.field.description')} *</Label>
                          <Textarea 
                            id="description"
                            value={selectedProductData.description}
                            onChange={(e) => updateProductData(selectedFileId!, { description: e.target.value })}
                            placeholder={t('sd.pm.field.description.placeholder')}
                            rows={4}
                            required
                          />
                        </div>
                       
                        <div className="md:col-span-2">
                          <Label>{t('sd.pm.field.tags')}</Label>
                          <div className="flex space-x-2">
                            <Input 
                              value={selectedProductData.currentTag}
                              onChange={(e) => handleTagInputChange(selectedFileId!, e.target.value)}
                              placeholder={t('sd.pm.field.tags.placeholder')}
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

                        {/* AI Declaration - Mandatory */}
                        <div className="md:col-span-2">
                          <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                            <div className="flex items-center gap-2">
                              <Bot className="h-5 w-5 text-primary" />
                              <div>
                                <Label className="text-sm font-medium">{t('sd.pm.ai.title')} *</Label>
                                <p className="text-xs text-muted-foreground">
                                  {t('sd.pm.ai.desc')}
                                </p>
                              </div>
                            </div>
                            <Select
                              value={selectedProductData.aiDeclaration || ''}
                              onValueChange={(value) => updateProductData(selectedFileId!, { 
                                aiDeclaration: value as ProductData['aiDeclaration'],
                                isAiGenerated: value === 'fully_ai_generated'
                              })}
                            >
                              <SelectTrigger className={!selectedProductData.aiDeclaration ? 'border-destructive' : ''}>
                                <SelectValue placeholder={t('sd.pm.ai.placeholder')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no_ai_used">
                                  <span className="flex items-center gap-2">{t('sd.pm.ai.none')}</span>
                                </SelectItem>
                                <SelectItem value="ai_assisted">
                                  <span className="flex items-center gap-2">{t('sd.pm.ai.assisted')}</span>
                                </SelectItem>
                                <SelectItem value="fully_ai_generated">
                                  <span className="flex items-center gap-2">{t('sd.pm.ai.full')}</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {!selectedProductData.aiDeclaration && (
                              <p className="text-xs text-destructive">{t('sd.pm.ai.required')}</p>
                            )}
                            {selectedProductData.aiDeclaration && (
                              <p className="text-xs text-muted-foreground">
                                {t('sd.pm.ai.notice')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* {t('sd.pm.free.title')} Toggle */}
                        <div className="md:col-span-2">
                          <div className={`flex items-center justify-between p-4 rounded-lg border ${
                            selectedProductData.isFreeContent 
                              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                              : 'bg-muted/50 border-muted'
                          }`}>
                            <div className="flex items-center space-x-3">
                              <Gift className={`h-5 w-5 ${selectedProductData.isFreeContent ? 'text-green-600' : 'text-muted-foreground'}`} />
                              <div>
                                <div className="text-sm font-medium">
                                  Free Content
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t('sd.pm.free.desc')}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={selectedProductData.isFreeContent || false}
                              onCheckedChange={(checked) => updateProductData(selectedFileId!, { isFreeContent: checked })}
                            />
                          </div>
                          {selectedProductData.isFreeContent && (
                            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                              <Gift className="h-3 w-3" />
                              {t('sd.pm.free.notice')}
                            </p>
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
                          {t('sd.pm.saveDraft')}
                        </Button>
                        
                        <Button 
                          onClick={() => handlePublish(selectedFileId!)}
                          disabled={
                            loading || 
                            !selectedProductData.title.trim() || 
                            !selectedProductData.description.trim() ||
                            // Disable for VFX without preview image
                            ((selectedFile.type.includes('rar') || selectedFile.type.includes('zip') ||
                              selectedFile.name.toLowerCase().endsWith('.rar') || selectedFile.name.toLowerCase().endsWith('.zip')) && 
                              !selectedProductData.previewImageUrl)
                          }
                        >
                          {isEditMode ? (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {t('sd.pm.update')}
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('sd.pm.publish')}
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
                    {t('sd.pm.selectFile')}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Bottom Actions */}
          <Card className="mt-6 p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold">{t('sd.pm.global')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('sd.pm.ready').replace('{n}', String(readyToPublish))}
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
                  {isEditMode ? t('sd.pm.cancelChanges') : t('sd.pm.back')}
                </Button>
                
                {!isEditMode && (
                  <Button 
                    onClick={handlePublishAll}
                    disabled={loading || readyToPublish === 0}
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('sd.pm.publishAll')} ({readyToPublish})
                  </Button>
                )}
                
                <Button variant="outline" asChild>
                  <Link to="/seller-dashboard">{t('sd.pm.goDashboard')}</Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Modal */}
        {isPreviewOpen && previewFile && createPortal(
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-2 sm:p-4"
            onClick={closePreview}
          >
            <div 
              className="bg-background rounded-lg p-3 sm:p-4 w-full max-w-[95vw] h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] max-h-[95dvh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3 flex-shrink-0">
                <h3 className="text-lg font-semibold truncate pr-4">{t('sd.pm.previewTitle')} - {previewFile.name}</h3>
                <Button variant="ghost" size="sm" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="relative flex justify-center items-center flex-1 min-h-0 min-w-0 overflow-hidden">
                {previewFile.type.startsWith('image/') && (
                  <div className="w-full h-full flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden [&_img]:max-h-full [&_img]:max-w-full [&_img]:w-full [&_img]:h-full [&_img]:object-contain">
                    <img
                      src={previewFile.url}
                      alt={previewFile.name}
                      decoding="async"
                      className="block rounded-lg min-h-0"
                    />
                  </div>
                )}
                
                {previewFile.type.startsWith('video/') && (
                  <div className="w-full h-full flex-1 min-h-0 flex items-center justify-center overflow-hidden [&_video]:max-h-full [&_video]:max-w-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain">
                    <MediaPlayer 
                      src={(() => {
                        const url = previewFile.url;
                        if (url && url.includes('cdn.visustock.com')) {
                          return `https://visustock.com/api/proxy-video?url=${encodeURIComponent(url)}`;
                        }
                        return url;
                      })()}
                      type="video"
                      title={previewFile.name}
                      controls={true}
                      watermarkSize="normal"
                      fitToContainer
                      className="w-auto h-auto max-w-full max-h-full min-h-0"
                    />
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
              
              <div className="mt-3 p-3 bg-muted rounded-lg flex-shrink-0">
                <p className="text-sm text-muted-foreground">
                  {t('sd.pm.previewSizeType').replace('{size}', formatFileSize(previewFile.size)).replace('{type}', previewFile.type)}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>
    </ProtectedRoute>
  );
};

export default ProductManagement;