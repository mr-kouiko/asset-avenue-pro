import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LikeState {
  [submissionId: string]: {
    count: number;
    userLiked: boolean;
  };
}

export const useLikes = () => {
  const { user } = useAuth();
  const [likeStates, setLikeStates] = useState<LikeState>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  // Fetch user's likes on mount
  useEffect(() => {
    const fetchUserLikes = async () => {
      if (!user) {
        setUserLikes(new Set());
        return;
      }

      try {
        const { data, error } = await supabase
          .from('content_likes')
          .select('submission_id')
          .eq('user_id', user.id);

        if (error) throw error;
        setUserLikes(new Set(data?.map(l => l.submission_id) || []));
      } catch (error) {
        console.error('Error fetching user likes:', error);
      }
    };

    fetchUserLikes();
  }, [user]);

  const getLikeCount = useCallback(async (submissionId: string): Promise<number> => {
    try {
      const { data, error } = await (supabase as any)
        .from('content_like_counts')
        .select('like_count')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (error) throw error;
      return Number(data?.like_count ?? 0);
    } catch (error) {
      console.error('Error getting like count:', error);
      return 0;
    }
  }, []);

  const hasUserLiked = useCallback((submissionId: string): boolean => {
    return userLikes.has(submissionId);
  }, [userLikes]);

  const toggleLike = useCallback(async (submissionId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to like content');
      return false;
    }

    const isCurrentlyLiked = userLikes.has(submissionId);

    // Optimistic update
    setUserLikes(prev => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('content_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('submission_id', submissionId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('content_likes')
          .insert({ user_id: user.id, submission_id: submissionId });

        if (error) throw error;
      }
      return true;
    } catch (error) {
      // Revert optimistic update on error
      setUserLikes(prev => {
        const next = new Set(prev);
        if (isCurrentlyLiked) {
          next.add(submissionId);
        } else {
          next.delete(submissionId);
        }
        return next;
      });
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      return false;
    }
  }, [user, userLikes]);

  return {
    hasUserLiked,
    toggleLike,
    getLikeCount,
    userLikes
  };
};
