import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  preview_url?: string;
  thumbnail_url?: string;
  is_watermarked?: boolean;
  status: 'draft' | 'validated';
  created_at: string;
  updated_at: string;
}

export const useUploadedFiles = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all uploaded files (drafts and validated)
  const loadFiles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles((data || []) as UploadedFile[]);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Erreur lors du chargement des fichiers');
    } finally {
      setLoading(false);
    }
  };

  // Load only draft files
  const loadDraftFiles = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles((data || []) as UploadedFile[]);
    } catch (error) {
      console.error('Error loading draft files:', error);
      toast.error('Erreur lors du chargement des brouillons');
    } finally {
      setLoading(false);
    }
  };

  // Save a new uploaded file
  const saveFile = async (file: Omit<UploadedFile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('uploaded_files')
        .insert({
          user_id: user.id,
          ...file
        })
        .select()
        .single();

      if (error) throw error;

      setFiles(prev => [data as UploadedFile, ...prev]);
      return data;
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('Erreur lors de la sauvegarde du fichier');
      return null;
    }
  };

  // Update file status
  const updateFileStatus = async (fileId: string, status: 'draft' | 'validated') => {
    try {
      const { error } = await supabase
        .from('uploaded_files')
        .update({ status })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => 
        prev.map(f => f.id === fileId ? { ...f, status } : f)
      );
      
      return true;
    } catch (error) {
      console.error('Error updating file status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
      return false;
    }
  };

  // Delete a file
  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('Fichier supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  // Delete multiple files
  const deleteFiles = async (fileIds: string[]) => {
    try {
      const { error } = await supabase
        .from('uploaded_files')
        .delete()
        .in('id', fileIds);

      if (error) throw error;

      setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
      toast.success(`${fileIds.length} fichier(s) supprimé(s)`);
      return true;
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  return {
    files,
    loading,
    loadFiles,
    loadDraftFiles,
    saveFile,
    updateFileStatus,
    deleteFile,
    deleteFiles
  };
};
