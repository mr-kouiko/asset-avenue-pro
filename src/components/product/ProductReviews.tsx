import { useState, useEffect } from "react";
import { useReviews } from "@/hooks/useReviews";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewForm } from "@/components/ReviewForm";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProductReviewsProps {
  submissionId: string;
  productTitle: string;
}

export const ProductReviews = ({ submissionId, productTitle }: ProductReviewsProps) => {
  const { user } = useAuth();
  const { reviews, averageRating, reviewCount, loading, createReview, markHelpful, fetchReviews } = useReviews(submissionId);
  const [showForm, setShowForm] = useState(false);

  // Fetch reviews on mount
  useEffect(() => {
    if (submissionId) {
      fetchReviews(submissionId);
    }
  }, [submissionId, fetchReviews]);

  const handleSubmitReview = async (data: { rating: number; title?: string; content?: string }) => {
    const success = await createReview({
      submission_id: submissionId,
      rating: data.rating,
      title: data.title,
      content: data.content
    });
    if (success) {
      setShowForm(false);
    }
    return success;
  };

  // Check if user has already reviewed
  const userHasReviewed = reviews.some(review => review.user_id === user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(averageRating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
          <span className="text-muted-foreground">
            {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {user && !userHasReviewed && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Write a Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <ReviewForm
          onSubmit={handleSubmitReview}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              id={review.id}
              rating={review.rating}
              title={review.title}
              content={review.content}
              userName={review.user_display_name || 'Anonymous'}
              userAvatar={review.user_avatar}
              isVerifiedPurchase={review.is_verified_purchase}
              helpfulCount={review.helpful_count}
              createdAt={review.created_at}
              onMarkHelpful={() => markHelpful(review.id)}
              isOwnReview={review.user_id === user?.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No reviews yet. Be the first to review this content!</p>
        </div>
      )}
    </div>
  );
};
