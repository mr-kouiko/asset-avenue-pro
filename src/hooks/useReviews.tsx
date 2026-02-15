import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Review {
  id: string;
  user_id: string;
  submission_id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user_display_name?: string;
  user_avatar?: string;
}

interface ReviewInput {
  submission_id: string;
  rating: number;
  title?: string;
  content?: string;
}

export const useReviews = (submissionId?: string) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  const fetchReviews = useCallback(async (contentId?: string) => {
    const targetId = contentId || submissionId;
    if (!targetId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('submission_id', targetId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for reviews
      const userIds = [...new Set(data?.map(r => r.user_id) || [])];
      let profiles: Record<string, { display_name: string; avatar_url: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .rpc('get_safe_profile_info', { p_user_ids: userIds });

        profiles = (profileData || []).reduce((acc, p) => {
          acc[p.user_id] = { display_name: p.display_name || 'Anonymous', avatar_url: p.avatar_url || '' };
          return acc;
        }, {} as Record<string, { display_name: string; avatar_url: string }>);
      }

      const reviewsWithProfiles = (data || []).map(review => ({
        ...review,
        user_display_name: profiles[review.user_id]?.display_name || 'Anonymous',
        user_avatar: profiles[review.user_id]?.avatar_url || ''
      }));

      setReviews(reviewsWithProfiles);

      // Calculate stats
      if (reviewsWithProfiles.length > 0) {
        const avg = reviewsWithProfiles.reduce((sum, r) => sum + r.rating, 0) / reviewsWithProfiles.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setReviewCount(reviewsWithProfiles.length);
      } else {
        setAverageRating(0);
        setReviewCount(0);
      }

      // Check if current user has reviewed
      if (user) {
        const userRev = reviewsWithProfiles.find(r => r.user_id === user.id);
        setUserReview(userRev || null);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [submissionId, user]);

  const createReview = useCallback(async (input: ReviewInput): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to leave a review');
      return false;
    }

    try {
      // Check if user has purchased this content
      const { data: downloads } = await supabase
        .from('downloads')
        .select('id')
        .eq('user_id', user.id)
        .eq('submission_id', input.submission_id)
        .limit(1);

      const isVerified = (downloads?.length || 0) > 0;

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          submission_id: input.submission_id,
          rating: input.rating,
          title: input.title || null,
          content: input.content || null,
          is_verified_purchase: isVerified
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already reviewed this content');
          return false;
        }
        throw error;
      }

      toast.success('Review submitted successfully');
      await fetchReviews(input.submission_id);
      return true;
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Failed to submit review');
      return false;
    }
  }, [user, fetchReviews]);

  const updateReview = useCallback(async (reviewId: string, input: Partial<ReviewInput>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          rating: input.rating,
          title: input.title,
          content: input.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Review updated');
      await fetchReviews();
      return true;
    } catch (error) {
      console.error('Error updating review:', error);
      toast.error('Failed to update review');
      return false;
    }
  }, [user, fetchReviews]);

  const deleteReview = useCallback(async (reviewId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Review deleted');
      await fetchReviews();
      return true;
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
      return false;
    }
  }, [user, fetchReviews]);

  const markHelpful = useCallback(async (reviewId: string): Promise<boolean> => {
    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) return false;

      const { error } = await supabase
        .from('reviews')
        .update({ helpful_count: review.helpful_count + 1 })
        .eq('id', reviewId);

      if (error) throw error;

      setReviews(prev => prev.map(r => 
        r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
      ));
      return true;
    } catch (error) {
      console.error('Error marking review helpful:', error);
      return false;
    }
  }, [reviews]);

  return {
    reviews,
    loading,
    userReview,
    averageRating,
    reviewCount,
    fetchReviews,
    createReview,
    updateReview,
    deleteReview,
    markHelpful
  };
};
