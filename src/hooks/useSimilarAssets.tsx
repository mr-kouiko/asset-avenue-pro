import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SimilarAsset {
  id: string;
  title: string | null;
  slug: string | null;
  price: number | null;
  thumbnail_path: string | null;
  file_type: string | null;
  similarity: number | null;
}

export const useSimilarAssets = (submissionId?: string, enabled = true) => {
  const query = useQuery({
    queryKey: ['similar-assets', submissionId],
    enabled: !!submissionId && enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<SimilarAsset[]> => {
      const { data, error } = await supabase.functions.invoke('similar-assets', {
        body: { submissionId, limit: 12 },
      });
      if (error) {
        console.error('similar-assets error', error);
        return [];
      }
      return (data?.items || []) as SimilarAsset[];
    },
  });

  return { similar: query.data || [], loading: query.isLoading };
};
