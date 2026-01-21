import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Favorite {
  id: string;
  submission_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((submissionId: string) => {
    return favorites.some(f => f.submission_id === submissionId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (submissionId: string) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return false;
    }

    const isCurrentlyFavorite = isFavorite(submissionId);

    try {
      if (isCurrentlyFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('submission_id', submissionId);

        if (error) throw error;
        setFavorites(prev => prev.filter(f => f.submission_id !== submissionId));
        toast.success('Removed from favorites');
      } else {
        const { data, error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, submission_id: submissionId })
          .select()
          .single();

        if (error) throw error;
        setFavorites(prev => [...prev, data]);
        toast.success('Added to favorites');
      }
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
      return false;
    }
  }, [user, isFavorite]);

  const getFavoritesWithDetails = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          id,
          submission_id,
          created_at,
          content_submissions (
            id,
            title,
            description,
            price,
            slug,
            tags,
            creator_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching favorites with details:', error);
      return [];
    }
  }, [user]);

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    getFavoritesWithDetails,
    refetch: fetchFavorites
  };
};
