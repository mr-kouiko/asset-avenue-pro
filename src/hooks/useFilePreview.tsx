import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseFilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export const useFilePreview = ({ fileUrl, fileName, fileType }: UseFilePreviewProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileUrl) return;

    const generatePreviewUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // Essayer de déterminer le bucket et le path depuis l'URL
        let bucket = 'uploads'; // bucket par défaut
        let path = fileUrl;

        // Si l'URL contient déjà un domaine Supabase, extraire le bucket et le path
        const supabaseMatch = fileUrl.match(/storage\/v1\/object\/(public|sign)\/([^\/]+)\/(.+)/);
        if (supabaseMatch) {
          bucket = supabaseMatch[2];
          path = supabaseMatch[3];
        } else if (fileUrl.startsWith('seller-content/') || fileUrl.startsWith('uploads/')) {
          // Si l'URL est déjà un path relatif
          path = fileUrl;
          bucket = fileUrl.startsWith('seller-content/') ? 'seller-content' : 'uploads';
        }

        // Vérifier d'abord si le bucket est public
        const { data: bucketInfo } = await supabase.storage.getBucket(bucket);
        
        if (bucketInfo?.public) {
          // Bucket public - utiliser getPublicUrl
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          if (data?.publicUrl) {
            setPreviewUrl(data.publicUrl);
          } else {
            throw new Error('Impossible de générer l\'URL publique');
          }
        } else {
          // Bucket privé - utiliser createSignedUrl
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600); // URL valide 1h

          if (error) {
            throw error;
          }

          if (data?.signedUrl) {
            setPreviewUrl(data.signedUrl);
          } else {
            throw new Error('Impossible de générer l\'URL signée');
          }
        }
      } catch (err: any) {
        console.error('Erreur lors de la génération de l\'URL de prévisualisation:', err);
        let errorMessage = 'Impossible de charger le fichier';
        
        if (err.message?.includes('Bucket not found')) {
          errorMessage = 'Bucket de stockage introuvable';
        } else if (err.message?.includes('Object not found')) {
          errorMessage = 'Fichier introuvable dans le stockage';
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    generatePreviewUrl();
  }, [fileUrl, fileName, fileType]);

  return { previewUrl, error, loading };
};