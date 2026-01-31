import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SellerStats {
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingSubmissions: number;
  rejectedSubmissions: number;
  totalDownloads: number;
  totalRevenue: number;
}

interface ContentSubmission {
  id: string;
  title: string;
  description: string;
  status: string; // Keep as string to handle all possible values
  category_id: string | null;
  price: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  admin_notes?: string;
  content_files?: ContentFile[]; // Match the actual Supabase query
}

interface ContentFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_preview: boolean;
  is_original: boolean;
  thumbnail_path?: string;
  preview_path?: string;
  created_at: string;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  thumbnail_url?: string;
  preview_url?: string;
  is_watermarked?: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export const useSellerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SellerStats>({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
    totalDownloads: 0,
    totalRevenue: 0
  });
  const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [unsubmittedFiles, setUnsubmittedFiles] = useState<UploadedFile[]>([]);
  const [draftFiles, setDraftFiles] = useState<{
    url: string; 
    name: string; 
    type: string; 
    bucket?: string; 
    size?: number;
    previewUrl?: string;
    thumbnailUrl?: string;
    isWatermarked?: boolean;
  }[]>([]);

  // Fetch seller statistics with REAL data from transactions and downloads
  const fetchStats = async () => {
    if (!user) return;

    try {
      // 1. Get submissions stats
      const { data: submissions, error: submissionsError } = await supabase
        .from('content_submissions')
        .select('id, status, price')
        .eq('creator_id', user.id);

      if (submissionsError) throw submissionsError;

      const submissionIds = submissions?.map(s => s.id) || [];

      // 2. Get REAL revenue from completed transactions where this user is the seller
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount_seller, status')
        .eq('seller_id', user.id)
        .eq('status', 'completed');

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      }

      // Calculate real revenue (amount_seller is in cents, convert to euros)
      const realRevenue = (transactions || []).reduce((sum, t) => sum + (t.amount_seller || 0), 0) / 100;

      // 3. Get REAL downloads count for seller's content
      let totalDownloads = 0;
      if (submissionIds.length > 0) {
        const { count, error: downloadsError } = await supabase
          .from('downloads')
          .select('*', { count: 'exact', head: true })
          .in('submission_id', submissionIds);

        if (downloadsError) {
          console.error('Error fetching downloads:', downloadsError);
        } else {
          totalDownloads = count || 0;
        }
      }

      if (submissions) {
        const calculatedStats = {
          totalSubmissions: submissions.length,
          approvedSubmissions: submissions.filter(s => s.status === 'approved').length,
          pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
          rejectedSubmissions: submissions.filter(s => s.status === 'rejected').length,
          totalDownloads: totalDownloads,
          totalRevenue: realRevenue
        };
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Error loading statistics');
    }
  };

  // Fetch seller submissions - internal function, doesn't manage loading state
  const fetchSubmissions = async (skipUnsubmitted = false) => {
    if (!user) {
      console.log('❌ [SELLER-DASHBOARD] No user found, cannot fetch submissions');
      return;
    }

    console.log('🔍 [SELLER-DASHBOARD] Starting fetchSubmissions...');

    try {
      const startTime = Date.now();
      
      // First query: Fetch submissions (with cache busting to ensure fresh data)
      console.log('📊 [SELLER-DASHBOARD] Querying content_submissions for creator_id:', user.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000); // Add limit to prevent potential caching

      const queryTime1 = Date.now() - startTime;
      console.log(`📦 [SELLER-DASHBOARD] Submissions query completed in ${queryTime1}ms`);
      console.log('📦 [SELLER-DASHBOARD] Submissions result:', { 
        count: submissions?.length || 0, 
        error: submissionsError,
        sample: submissions?.[0] || null
      });

      if (submissionsError) {
        console.error('❌ [SELLER-DASHBOARD] RLS ERROR on content_submissions:', submissionsError);
        throw submissionsError;
      }

      if (!submissions || submissions.length === 0) {
        console.log('⚠️ [SELLER-DASHBOARD] No submissions found for user');
        setSubmissions([]);
        return;
      }

      // Second query: Fetch files for these submissions from content_files
      const submissionIds = submissions.map(s => s.id);
      console.log('🔍 [SELLER-DASHBOARD] Fetching files for submission IDs:', submissionIds);

      const startTime2 = Date.now();
      const { data: files, error: filesError } = await supabase
        .from('content_files')
        .select('*')
        .in('submission_id', submissionIds);

      const queryTime2 = Date.now() - startTime2;
      console.log(`📁 [SELLER-DASHBOARD] Files query completed in ${queryTime2}ms`);
      console.log('📁 [SELLER-DASHBOARD] Files result:', { 
        count: files?.length || 0, 
        error: filesError,
        sample: files?.[0] || null
      });

      if (filesError) {
        console.error('❌ [SELLER-DASHBOARD] RLS ERROR on content_files:', filesError);
      }

      // Third query: Also fetch files from uploaded_files (for recovered drafts)
      console.log('🔍 [SELLER-DASHBOARD] Fetching uploaded_files for draft IDs...');
      const { data: uploadedFiles, error: uploadedFilesError } = await supabase
        .from('uploaded_files')
        .select('*')
        .in('draft_id', submissionIds);

      if (uploadedFilesError) {
        console.error('❌ [SELLER-DASHBOARD] RLS ERROR on uploaded_files:', uploadedFilesError);
      } else {
        console.log(`📁 [SELLER-DASHBOARD] Uploaded files result: ${uploadedFiles?.length || 0} files`);
      }

      // Map files to submissions (combining both sources)
      const submissionsWithFiles = submissions.map(submission => {
        // First check content_files
        const contentFilesForSubmission = files?.filter(f => f.submission_id === submission.id) || [];
        
        // Then check uploaded_files (for recovered drafts)
        const uploadedFilesForSubmission = uploadedFiles?.filter(f => f.draft_id === submission.id) || [];
        
        // Convert uploaded_files to content_files format if needed
        const convertedUploadedFiles: ContentFile[] = uploadedFilesForSubmission.map(uf => ({
          id: uf.id,
          file_name: uf.file_name,
          file_path: uf.file_url,
          file_type: uf.file_type,
          file_size: uf.file_size,
          is_preview: false,
          is_original: true,
          thumbnail_path: uf.thumbnail_url || undefined,
          preview_path: uf.preview_url || undefined,
          created_at: uf.created_at
        }));
        
        // Combine files from both sources
        const allFiles = [...contentFilesForSubmission, ...convertedUploadedFiles];
        
        console.log(`📋 [SELLER-DASHBOARD] Submission "${submission.title}" (${submission.id}) has ${allFiles.length} files (${contentFilesForSubmission.length} from content_files, ${uploadedFilesForSubmission.length} from uploaded_files)`);
        allFiles.forEach(file => {
          console.log(`  📄 [SELLER-DASHBOARD] File: ${file.file_name} | Path: ${file.file_path}`);
        });
        return {
          ...submission,
          content_files: allFiles
        };
      });

      const totalTime = Date.now() - startTime;
      console.log(`✅ [SELLER-DASHBOARD] Total fetch time: ${totalTime}ms`);
      console.log('✅ [SELLER-DASHBOARD] Final submissions with files:', submissionsWithFiles.length);
      setSubmissions(submissionsWithFiles);

      // Only fetch unsubmitted files if not skipped (prevents cascading calls)
      if (!skipUnsubmitted) {
        await fetchUnsubmittedFiles();
      }
    } catch (error) {
      console.error('❌ [SELLER-DASHBOARD] Critical error in fetchSubmissions:', error);
      toast.error("Erreur lors du chargement des soumissions");
    }
  };

  // Fetch files that haven't been submitted yet
  const fetchUnsubmittedFiles = async () => {
    if (!user) return;

    try {
      console.log('📂 [SELLER-DASHBOARD] Fetching unsubmitted files...');
      
      // Get all uploaded_files for this user
      const { data: uploadedFiles, error: uploadedError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (uploadedError) {
        console.error('❌ [SELLER-DASHBOARD] Error fetching uploaded_files:', uploadedError);
        return;
      }

      if (!uploadedFiles || uploadedFiles.length === 0) {
        console.log('📂 [SELLER-DASHBOARD] No uploaded files found');
        setUnsubmittedFiles([]);
        return;
      }

      // Get ALL content_files to check which uploaded files have been submitted
      // Query all content_files (RLS will limit based on user's permissions)
      const { data: allContentFiles, error: contentError } = await supabase
        .from('content_files')
        .select('file_path, file_name');

      if (contentError) {
        console.error('❌ [SELLER-DASHBOARD] Error checking content_files:', contentError);
        // On error, show all files as unsubmitted (safer fallback)
        setUnsubmittedFiles(uploadedFiles);
        return;
      }

      // Create sets for efficient lookup
      const submittedFilePaths = new Set(allContentFiles?.map(cf => cf.file_path) || []);
      const submittedFileNames = new Set(allContentFiles?.map(cf => cf.file_name.toLowerCase()) || []);

      console.log('📂 [SELLER-DASHBOARD] All content_files count:', allContentFiles?.length || 0);
      console.log('📂 [SELLER-DASHBOARD] Unique file paths:', submittedFilePaths.size);
      console.log('📂 [SELLER-DASHBOARD] Unique file names:', submittedFileNames.size);

      // Filter out files that are already linked to any submission
      const unsubmitted = uploadedFiles.filter(file => {
        const isSubmittedByPath = submittedFilePaths.has(file.file_url);
        const isSubmittedByName = submittedFileNames.has(file.file_name.toLowerCase());
        
        // File is unsubmitted only if it's NOT in either set
        const isUnsubmitted = !isSubmittedByPath && !isSubmittedByName;
        
        if (!isUnsubmitted) {
          console.log(`📂 [SELLER-DASHBOARD] File "${file.file_name}" is submitted (path: ${isSubmittedByPath}, name: ${isSubmittedByName})`);
        }
        
        return isUnsubmitted;
      });

      console.log('📂 [SELLER-DASHBOARD] Total uploaded files:', uploadedFiles.length);
      console.log('📂 [SELLER-DASHBOARD] Unsubmitted files after filter:', unsubmitted.length);
      setUnsubmittedFiles(unsubmitted);
    } catch (error) {
      console.error('❌ [SELLER-DASHBOARD] Error in fetchUnsubmittedFiles:', error);
    }
  };

  // DEPRECATED - Original code for reference
  const fetchSubmissions_OLD = async () => {
    if (!user) return;

    try {
      console.log('🔍 fetchSubmissions_OLD: Fetching for user:', user.id);
      
      const { data, error } = await supabase
        .from('content_submissions')
        .select(`
          *,
          content_files (*)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      console.log('📦 fetchSubmissions_OLD: Data received:', data);
      console.log('❌ fetchSubmissions_OLD: Error:', error);

      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map(submission => ({
        ...submission,
        // Keep both properties for compatibility
        files: submission.content_files || [],
        content_files: submission.content_files || []
      }));

      console.log('✅ fetchSubmissions: Transformed data count:', transformedData.length);
      setSubmissions(transformedData);
    } catch (error) {
      console.error('💥 Error fetching submissions:', error);
      toast.error('Error loading content');
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Store draft files for creation
  const addDraftFiles = (files: {
    url: string; 
    name: string; 
    type: string; 
    bucket: string; 
    size: number;
    previewUrl?: string;
    thumbnailUrl?: string;
    isWatermarked?: boolean;
  }[]) => {
    setDraftFiles(prev => [...prev, ...files.map(file => ({
      url: file.url,
      name: file.name,
      type: file.type,
      bucket: file.bucket,
      size: file.size,
      previewUrl: file.previewUrl,
      thumbnailUrl: file.thumbnailUrl,
      isWatermarked: file.isWatermarked
    }))]);
  };

  const clearDraftFiles = () => {
    setDraftFiles([]);
  };

  // Create a new submission with files
  const createSubmission = async (submissionData: {
    title: string;
    description: string;
    category_id?: string;
    price?: number;
    tags?: string[];
  }) => {
    console.log('createSubmission called with:', submissionData);
    console.log('Current draftFiles:', draftFiles);
    
    try {
      if (!user) {
        console.log('No user authenticated');
        throw new Error('User not authenticated');
      }

      console.log('User authenticated:', user.id);

      // Create the submission with auto-approval
      const { data: submission, error: submissionError } = await supabase
        .from('content_submissions')
        .insert({
          creator_id: user.id,
          title: submissionData.title,
          description: submissionData.description,
          category_id: submissionData.category_id,
          price: submissionData.price,
          tags: submissionData.tags || [],
          status: 'approved', // Auto-approve all submissions
          approved_at: new Date().toISOString(),
          approved_by: user.id // Self-approved for auto-publishing
        })
        .select()
        .single();

      console.log('Submission insert result:', { submission, submissionError });

      if (submissionError) throw submissionError;

      // Add draft files to the submission if any
      if (draftFiles.length > 0) {
        console.log('Adding draft files to submission');
        const fileInserts = draftFiles.map(file => ({
          submission_id: submission.id,
          file_name: file.name,
          file_path: file.url,
          file_type: file.type,
          file_format: file.name.split('.').pop() || '',
          file_size: file.size || 0,
          is_preview: false,
          is_original: true, // This is the original file
          preview_path: file.previewUrl || null,
          thumbnail_path: file.thumbnailUrl || null,
          metadata: { 
            bucket: file.bucket || 'original-files',
            isWatermarked: file.isWatermarked || false,
            hasPreview: !!file.previewUrl,
            hasThumbnail: !!file.thumbnailUrl
          }
        }));

        console.log('File inserts:', fileInserts);

        const { error: filesError } = await supabase
          .from('content_files')
          .insert(fileInserts);

        if (filesError) {
          console.error('Error adding files:', filesError);
          toast.error('Content created but error adding files');
        } else {
          console.log('Files added successfully');
        }
      }

      const watermarkedCount = draftFiles.filter(f => f.isWatermarked).length;
      toast.success(`Content published successfully! ${draftFiles.length > 0 ? `${draftFiles.length} file(s) uploaded` : ''}${watermarkedCount > 0 ? ` (${watermarkedCount} with watermark)` : ''}`);
      clearDraftFiles();
      await fetchSubmissions();
      await fetchStats();
      return submission;
    } catch (error) {
      console.error('Error creating submission:', error);
      toast.error('Error creating content');
      return null;
    }
  };

  // Update submission
  const updateSubmission = async (id: string, updates: Partial<ContentSubmission>) => {
    try {
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      console.log('🔄 Updating submission:', id);
      console.log('👤 User ID:', user.id);
      console.log('📝 Updates:', updates);

      const { data, error } = await supabase
        .from('content_submissions')
        .update(updates)
        .eq('id', id)
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
        return false;
      }

      console.log('✅ Submission updated successfully:', data);
      toast.success('Content updated');
      await fetchSubmissions();
      return true;
    } catch (error) {
      console.error('💥 Error updating submission:', error);
      toast.error('Error updating content');
      return false;
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!user || !id) {
      toast.error('Erreur: utilisateur non connecté ou ID manquant');
      return false;
    }

    try {
      console.log('Starting deletion for submission:', id);
      
      // Verify ownership before deletion
      const { data: submission, error: checkError } = await supabase
        .from('content_submissions')
        .select('id, creator_id, title')
        .eq('id', id)
        .eq('creator_id', user.id)
        .single();

      if (checkError || !submission) {
        console.error('Submission not found or access denied:', checkError);
        toast.error('Content not found or access denied');
        return false;
      }

      console.log('Verified ownership, proceeding with deletion');

      // Remove from UI immediately for better UX
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      
      // Step 1: Delete all related data in correct order
      // First get content file IDs for secure downloads cleanup
      const { data: contentFiles } = await supabase
        .from('content_files')
        .select('id')
        .eq('submission_id', id);

      // Delete secure downloads if any content files exist
      if (contentFiles && contentFiles.length > 0) {
        const fileIds = contentFiles.map(f => f.id);
        const { error: secureDownloadsError } = await supabase
          .from('secure_downloads')
          .delete()
          .in('content_file_id', fileIds);

        if (secureDownloadsError) {
          console.error('Error deleting secure downloads:', secureDownloadsError);
          // Continue anyway as this is not critical
        }
      }

      // Delete downloads
      const { error: downloadsError } = await supabase
        .from('downloads')
        .delete()
        .eq('submission_id', id);

      if (downloadsError) {
        console.error('Error deleting downloads:', downloadsError);
        // Continue anyway as this is not critical
      }

      // Delete content files
      const { error: filesError } = await supabase
        .from('content_files')
        .delete()
        .eq('submission_id', id);

      if (filesError) {
        console.error('Error deleting content files:', filesError);
        toast.error('Erreur lors de la suppression des fichiers associés');
        // Restore UI if deletion failed
        await fetchSubmissions();
        return false;
      }

      console.log('Files deleted successfully');

      // Step 2: Delete the main submission
      const { error: submissionError } = await supabase
        .from('content_submissions')
        .delete()
        .eq('id', id)
        .eq('creator_id', user.id); // Double-check ownership

      if (submissionError) {
        console.error('❌ [DELETE] Error deleting submission:', submissionError.message, submissionError.details, submissionError.hint);
        toast.error('Error deleting content: ' + submissionError.message);
        // Restore UI if deletion failed
        await fetchSubmissions();
        return false;
      }

      console.log('✅ [DELETE] Submission deleted successfully:', id);

      // Step 3: Update stats and trigger refresh events
      toast.success(`Content "${submission.title}" permanently deleted`);
      
      // Update stats and submissions list immediately - force fresh fetch
      await Promise.all([
        fetchStats(),
        fetchSubmissions()
      ]);

      // Wait a moment to ensure database transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger global refresh events for other components
      try {
        console.log('🔄 Dispatching marketplace refresh event after deletion');
        // Refresh marketplace
        const marketplaceRefreshEvent = new CustomEvent('refreshMarketplace');
        window.dispatchEvent(marketplaceRefreshEvent);
        
        // Refresh content stats
        const statsRefreshEvent = new CustomEvent('refreshContentStats');
        window.dispatchEvent(statsRefreshEvent);
        
        // Force page refresh for Portfolio and other views
        const globalRefreshEvent = new CustomEvent('globalContentRefresh');
        window.dispatchEvent(globalRefreshEvent);
      } catch (e) {
        console.log('Could not dispatch refresh events - continuing with normal flow');
      }

      console.log('✅ Deletion completed successfully and refresh events dispatched');
      return true;
    } catch (error) {
      console.error('Unexpected error during deletion:', error);
      toast.error('Erreur inattendue lors de la suppression');
      
      // Force refresh to ensure UI is in sync with database
      await fetchSubmissions();
      await fetchStats();
      
      return false;
    }
  };

  // Add files to submission
  const addFilesToSubmission = async (
    submissionId: string, 
    files: { url: string; name: string; type: string }[]
  ) => {
    try {
      const fileRecords = files.map(file => ({
        submission_id: submissionId,
        file_name: file.name,
        file_path: file.url,
        file_type: file.type,
        file_format: file.name.split('.').pop() || '',
        file_size: 0, // We'd need to calculate this from the actual file
        is_preview: file.type.startsWith('image/'),
        is_original: true
      }));

      const { error } = await supabase
        .from('content_files')
        .insert(fileRecords);

      if (error) throw error;

      toast.success('Files added to content');
      await fetchSubmissions();
      return true;
    } catch (error) {
      console.error('Error adding files:', error);
      toast.error('Error adding files');
      return false;
    }
  };

  // Delete an uploaded file from the database (for unsubmitted files)
  const deleteUploadedFile = async (fileId: string): Promise<boolean> => {
    if (!user || !fileId) {
      toast.error('Error: User not logged in or file ID missing');
      return false;
    }

    try {
      console.log('🗑️ [DELETE-FILE] Deleting uploaded file:', fileId);
      
      // First get the file to verify ownership and get file URL for storage cleanup
      const { data: file, error: fetchError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !file) {
        console.error('❌ [DELETE-FILE] File not found or access denied:', fetchError);
        toast.error('File not found or access denied');
        return false;
      }

      console.log('📄 [DELETE-FILE] Found file:', file.file_name);

      // Delete from database first
      const { error: deleteError } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ [DELETE-FILE] Error deleting from database:', deleteError);
        toast.error('Error deleting file');
        return false;
      }

      console.log('✅ [DELETE-FILE] File deleted from database');

      // Update local state immediately
      setUnsubmittedFiles(prev => prev.filter(f => f.id !== fileId));

      // Optionally try to delete from storage (file_url contains the full URL)
      // Extract path from URL if it's a Supabase storage URL
      try {
        if (file.file_url && file.file_url.includes('supabase.co/storage')) {
          const urlParts = file.file_url.split('/storage/v1/object/public/');
          if (urlParts.length === 2) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const filePath = pathParts.join('/');
            console.log('🗑️ [DELETE-FILE] Attempting storage cleanup:', { bucket, filePath });
            
            await supabase.storage.from(bucket).remove([filePath]);
            console.log('✅ [DELETE-FILE] Storage file removed');
          }
        }
        
        // Also cleanup thumbnail if exists
        if (file.thumbnail_url && file.thumbnail_url.includes('supabase.co/storage')) {
          const urlParts = file.thumbnail_url.split('/storage/v1/object/public/');
          if (urlParts.length === 2) {
            const [bucket, ...pathParts] = urlParts[1].split('/');
            const filePath = pathParts.join('/');
            await supabase.storage.from(bucket).remove([filePath]);
            console.log('✅ [DELETE-FILE] Thumbnail removed');
          }
        }
      } catch (storageError) {
        // Storage cleanup is optional, don't fail the operation
        console.warn('⚠️ [DELETE-FILE] Storage cleanup failed (non-critical):', storageError);
      }

      toast.success(`File "${file.file_name}" deleted`);
      return true;
    } catch (error) {
      console.error('💥 [DELETE-FILE] Unexpected error:', error);
      toast.error('Unexpected error during deletion');
      return false;
    }
  };

  // Initialize data - ONLY on mount, no dependencies that change frequently
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Parallel fetch all data, skip nested unsubmitted call
        await Promise.all([
          fetchStats(),
          fetchSubmissions(true), // Skip nested fetchUnsubmittedFiles
          fetchCategories(),
          fetchUnsubmittedFiles() // Fetch separately in parallel
        ]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    // Cleanup to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user?.id]); // Only depend on user.id, not the whole user object

  return {
    loading,
    stats,
    submissions,
    categories,
    draftFiles,
    unsubmittedFiles,
    createSubmission,
    updateSubmission,
    deleteSubmission,
    deleteUploadedFile,
    addFilesToSubmission,
    addDraftFiles,
    clearDraftFiles,
    fetchUnsubmittedFiles,
    refreshData: async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchStats(),
          fetchSubmissions(true),
          fetchCategories(),
          fetchUnsubmittedFiles()
        ]);
      } finally {
        setLoading(false);
      }
    }
  };
};