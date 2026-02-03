import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DraftProduct {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  category_id?: string;
  tags?: string[];
  files: DraftFile[];
}

export interface DraftFile {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  thumbnailUrl?: string;
  isWatermarked?: boolean;
  fileHash?: string;
}

export const useDraftManager = () => {
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);

  /**
   * Create a new draft submission BEFORE uploading any files.
   * This ensures files are always linked to a persistent draft ID.
   */
  const createDraft = useCallback(async (initialTitle?: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to create a draft');
        return null;
      }

      // Ensure user has creator role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingRole || (existingRole.role !== 'creator' && existingRole.role !== 'admin')) {
        // Promote to creator via Edge Function
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const resp = await fetch('https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/ensure-creator-role', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({})
        });
        if (!resp.ok) {
          console.error('Role upgrade failed');
          toast.error('Unable to create draft. Please contact support.');
          return null;
        }
      }

      // Create the draft submission
      const { data: draft, error } = await supabase
        .from('content_submissions')
        .insert({
          creator_id: user.id,
          title: initialTitle || 'Untitled Draft',
          description: '',
          status: 'draft',
          tags: []
        })
        .select()
        .single();

      if (error) {
        console.error('Create draft error:', error);
        toast.error('Failed to create draft');
        return null;
      }

      console.log('📝 Created draft submission:', draft.id);
      return draft.id;
    } catch (error) {
      console.error('Create draft error:', error);
      toast.error('Failed to create draft');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Link an uploaded file to an existing draft
   */
  const linkFileToDraft = useCallback(async (draftId: string, fileId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('uploaded_files')
        .update({ draft_id: draftId })
        .eq('id', fileId);

      if (error) {
        console.error('Link file error:', error);
        return false;
      }

      console.log('🔗 Linked file', fileId, 'to draft', draftId);
      return true;
    } catch (error) {
      console.error('Link file error:', error);
      return false;
    }
  }, []);

  /**
   * Load all drafts for the current user, including their linked files
   * @param options.skipStateUpdate - If true, returns data without calling setDrafts (prevents re-renders during uploads)
   */
  const loadDrafts = useCallback(async (options?: { skipStateUpdate?: boolean }): Promise<DraftProduct[]> => {
    if (!options?.skipStateUpdate) {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get all draft submissions for this user
      const { data: submissions, error: submissionsError } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('creator_id', user.id)
        .in('status', ['draft', 'pending'])
        .order('created_at', { ascending: false });

      if (submissionsError) {
        console.error('Load drafts error:', submissionsError);
        return [];
      }

      if (!submissions || submissions.length === 0) {
        if (!options?.skipStateUpdate) {
          setDrafts([]);
        }
        return [];
      }

      // Get files linked to these drafts via draft_id
      const draftIds = submissions.map(s => s.id);
      const { data: uploadedFiles } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .in('draft_id', draftIds);

      // Also get content_files for already-linked products
      const { data: contentFiles } = await supabase
        .from('content_files')
        .select('*')
        .in('submission_id', draftIds);

      // Build draft products with their files
      const draftsWithFiles: DraftProduct[] = submissions.map(submission => {
        // Files from uploaded_files (linked via draft_id)
        const linkedUploads = (uploadedFiles || [])
          .filter(f => f.draft_id === submission.id)
          .map(f => ({
            id: f.id,
            url: f.file_url,
            name: f.file_name,
            type: f.file_type,
            size: f.file_size,
            previewUrl: f.preview_url || undefined,
            thumbnailUrl: f.thumbnail_url || undefined,
            isWatermarked: f.is_watermarked || false,
            fileHash: f.file_hash || undefined
          }));

        // Files from content_files (already published/linked)
        const linkedContent = (contentFiles || [])
          .filter(f => f.submission_id === submission.id)
          .map(f => ({
            id: f.id,
            url: f.file_path,
            name: f.file_name,
            type: f.file_type,
            size: f.file_size,
            previewUrl: f.preview_path || undefined,
            thumbnailUrl: f.thumbnail_path || undefined,
            isWatermarked: (f.metadata as any)?.isWatermarked || false,
            fileHash: f.file_hash || undefined
          }));

        return {
          id: submission.id,
          title: submission.title,
          description: submission.description,
          status: submission.status,
          created_at: submission.created_at,
          category_id: submission.category_id || undefined,
          tags: submission.tags || [],
          files: [...linkedUploads, ...linkedContent]
        };
      });

      // Only update state if not skipped (prevents re-renders during active uploads)
      if (!options?.skipStateUpdate) {
        setDrafts(draftsWithFiles);
      }
      return draftsWithFiles;
    } catch (error) {
      console.error('Load drafts error:', error);
      return [];
    } finally {
      if (!options?.skipStateUpdate) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Load orphaned uploads (files without a draft_id) and auto-link them to new drafts
   */
  const recoverOrphanedUploads = useCallback(async (): Promise<DraftFile[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Find uploads from last 7 days without a draft_id and not linked to content_files
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: orphanedFiles, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('draft_id', null)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (error || !orphanedFiles || orphanedFiles.length === 0) {
        return [];
      }

      // Check which are NOT linked to content_files by path
      const { data: linkedFiles } = await supabase
        .from('content_files')
        .select('file_path')
        .in('file_path', orphanedFiles.map(f => f.file_url));

      const linkedPaths = new Set(linkedFiles?.map(f => f.file_path) || []);
      
      // ALSO exclude files whose size matches any approved content_files
      // This prevents recovering files that are actually duplicates of published products
      const { data: approvedFileSizes } = await supabase
        .from('content_files')
        .select('file_size')
        .in('submission_id', 
          (await supabase.from('content_submissions').select('id').eq('status', 'approved')).data?.map(s => s.id) || []
        );

      const publishedSizes = new Set(approvedFileSizes?.map(f => f.file_size) || []);
      
      // Filter: not linked by path AND size doesn't match any published content
      const trulyOrphaned = orphanedFiles.filter(f => 
        !linkedPaths.has(f.file_url) && !publishedSizes.has(f.file_size)
      );

      if (trulyOrphaned.length === 0) return [];

      console.log(`🔄 Found ${trulyOrphaned.length} orphaned uploads to recover`);

      // Create a draft for each orphaned file group (or one draft for all)
      const draftId = await createDraft('Recovered Uploads');
      if (!draftId) return [];

      // Link all orphaned files to this draft
      const { error: linkError } = await supabase
        .from('uploaded_files')
        .update({ draft_id: draftId })
        .in('id', trulyOrphaned.map(f => f.id));

      if (linkError) {
        console.error('Link orphaned files error:', linkError);
      }

      return trulyOrphaned.map(f => ({
        id: f.id,
        url: f.file_url,
        name: f.file_name,
        type: f.file_type,
        size: f.file_size,
        previewUrl: f.preview_url || undefined,
        thumbnailUrl: f.thumbnail_url || undefined,
        isWatermarked: f.is_watermarked || false,
        fileHash: f.file_hash || undefined
      }));
    } catch (error) {
      console.error('Recover orphaned uploads error:', error);
      return [];
    }
  }, [createDraft]);

  /**
   * Delete a draft and its linked files
   */
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      // The ON DELETE CASCADE will handle uploaded_files cleanup
      const { error } = await supabase
        .from('content_submissions')
        .delete()
        .eq('id', draftId);

      if (error) {
        console.error('Delete draft error:', error);
        toast.error('Failed to delete draft');
        return false;
      }

      setDrafts(prev => prev.filter(d => d.id !== draftId));
      toast.success('Draft deleted');
      return true;
    } catch (error) {
      console.error('Delete draft error:', error);
      return false;
    }
  }, []);

  /**
   * Get a specific draft by ID
   */
  const getDraft = useCallback(async (draftId: string): Promise<DraftProduct | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: submission, error } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('id', draftId)
        .eq('creator_id', user.id)
        .single();

      if (error || !submission) return null;

      // Get linked files
      const { data: uploadedFiles } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('draft_id', draftId);

      const { data: contentFiles } = await supabase
        .from('content_files')
        .select('*')
        .eq('submission_id', draftId);

      const files: DraftFile[] = [
        ...(uploadedFiles || []).map(f => ({
          id: f.id,
          url: f.file_url,
          name: f.file_name,
          type: f.file_type,
          size: f.file_size,
          previewUrl: f.preview_url || undefined,
          thumbnailUrl: f.thumbnail_url || undefined,
          isWatermarked: f.is_watermarked || false,
          fileHash: f.file_hash || undefined
        })),
        ...(contentFiles || []).map(f => ({
          id: f.id,
          url: f.file_path,
          name: f.file_name,
          type: f.file_type,
          size: f.file_size,
          previewUrl: f.preview_path || undefined,
          thumbnailUrl: f.thumbnail_path || undefined,
          isWatermarked: (f.metadata as any)?.isWatermarked || false,
          fileHash: f.file_hash || undefined
        }))
      ];

      return {
        id: submission.id,
        title: submission.title,
        description: submission.description,
        status: submission.status,
        created_at: submission.created_at,
        category_id: submission.category_id || undefined,
        tags: submission.tags || [],
        files
      };
    } catch (error) {
      console.error('Get draft error:', error);
      return null;
    }
  }, []);

  return {
    loading,
    drafts,
    createDraft,
    linkFileToDraft,
    loadDrafts,
    recoverOrphanedUploads,
    deleteDraft,
    getDraft
  };
};
