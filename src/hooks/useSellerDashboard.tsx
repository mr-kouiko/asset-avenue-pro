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
  const [draftFiles, setDraftFiles] = useState<{url: string, name: string, type: string}[]>([]);

  // Fetch seller statistics
  const fetchStats = async () => {
    if (!user) return;

    try {
      // Calculate stats manually from submissions for now
      const { data: submissions, error } = await supabase
        .from('content_submissions')
        .select('*')
        .eq('creator_id', user.id);

      if (error) throw error;

      if (submissions) {
        const calculatedStats = {
          totalSubmissions: submissions.length,
          approvedSubmissions: submissions.filter(s => s.status === 'approved').length,
          pendingSubmissions: submissions.filter(s => s.status === 'pending').length,
          rejectedSubmissions: submissions.filter(s => s.status === 'rejected').length,
          totalDownloads: 0, // Would need to join with downloads table
          totalRevenue: submissions
            .filter(s => s.status === 'approved')
            .reduce((sum, s) => sum + (s.price || 0), 0)
        };
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    }
  };

  // Fetch seller submissions
  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('content_submissions')
        .select(`
          *,
          content_files (*)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map(submission => ({
        ...submission,
        // Keep both properties for compatibility
        files: submission.content_files || [],
        content_files: submission.content_files || []
      }));

      setSubmissions(transformedData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Erreur lors du chargement du contenu');
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
  const addDraftFiles = (files: {url: string, name: string, type: string}[]) => {
    setDraftFiles(prev => [...prev, ...files]);
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

      // Create the submission first
      const { data: submission, error: submissionError } = await supabase
        .from('content_submissions')
        .insert({
          creator_id: user.id,
          title: submissionData.title,
          description: submissionData.description,
          category_id: submissionData.category_id,
          price: submissionData.price,
          tags: submissionData.tags || [],
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
          file_size: 0, // We don't have size info from the upload
          is_original: true,
          metadata: {}
        }));

        console.log('File inserts:', fileInserts);

        const { error: filesError } = await supabase
          .from('content_files')
          .insert(fileInserts);

        if (filesError) {
          console.error('Error adding files:', filesError);
          toast.error('Contenu créé mais erreur lors de l\'ajout des fichiers');
        } else {
          console.log('Files added successfully');
        }
      }

      toast.success(`Contenu créé avec succès${draftFiles.length > 0 ? ` avec ${draftFiles.length} fichier(s)` : ''}`);
      clearDraftFiles();
      await fetchSubmissions();
      await fetchStats();
      return submission;
    } catch (error) {
      console.error('Error creating submission:', error);
      toast.error('Erreur lors de la création du contenu');
      return null;
    }
  };

  // Update submission
  const updateSubmission = async (id: string, updates: Partial<ContentSubmission>) => {
    try {
      const { error } = await supabase
        .from('content_submissions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Contenu mis à jour');
      await fetchSubmissions();
      return true;
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  };

  // Delete submission
  const deleteSubmission = async (id: string) => {
    try {
      // First delete associated files
      const { error: filesError } = await supabase
        .from('content_files')
        .delete()
        .eq('submission_id', id);

      if (filesError) throw filesError;

      // Then delete the submission
      const { error } = await supabase
        .from('content_submissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Contenu supprimé');
      await fetchSubmissions();
      await fetchStats();
      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Erreur lors de la suppression');
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

      toast.success('Fichiers ajoutés au contenu');
      await fetchSubmissions();
      return true;
    } catch (error) {
      console.error('Error adding files:', error);
      toast.error('Erreur lors de l\'ajout des fichiers');
      return false;
    }
  };

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchSubmissions(),
        fetchCategories()
      ]);
      setLoading(false);
    };

    loadData();
  }, [user]);

  return {
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
    refreshData: () => {
      fetchStats();
      fetchSubmissions();
      fetchCategories();
    }
  };
};