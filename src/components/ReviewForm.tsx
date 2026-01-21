import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReviewFormProps {
  onSubmit: (data: { rating: number; title?: string; content?: string }) => Promise<boolean>;
  initialRating?: number;
  initialTitle?: string;
  initialContent?: string;
  isEditing?: boolean;
  onCancel?: () => void;
}

export const ReviewForm = ({
  onSubmit,
  initialRating = 0,
  initialTitle = '',
  initialContent = '',
  isEditing = false,
  onCancel
}: ReviewFormProps) => {
  const { language } = useLanguage();
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);

  const labels = {
    en: {
      writeReview: 'Write a Review',
      editReview: 'Edit Your Review',
      rating: 'Rating',
      clickToRate: 'Click to rate',
      titleLabel: 'Title (optional)',
      titlePlaceholder: 'Sum up your review in a few words',
      reviewLabel: 'Your Review (optional)',
      reviewPlaceholder: 'What did you like or dislike about this content?',
      submit: 'Submit Review',
      update: 'Update Review',
      cancel: 'Cancel',
      ratingRequired: 'Please select a rating'
    },
    fr: {
      writeReview: 'Écrire un avis',
      editReview: 'Modifier votre avis',
      rating: 'Note',
      clickToRate: 'Cliquez pour noter',
      titleLabel: 'Titre (optionnel)',
      titlePlaceholder: 'Résumez votre avis en quelques mots',
      reviewLabel: 'Votre avis (optionnel)',
      reviewPlaceholder: 'Qu\'avez-vous aimé ou moins aimé de ce contenu ?',
      submit: 'Soumettre l\'avis',
      update: 'Mettre à jour',
      cancel: 'Annuler',
      ratingRequired: 'Veuillez sélectionner une note'
    }
  };

  const t = labels[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({ rating, title: title || undefined, content: content || undefined });
    setSubmitting(false);

    if (success && !isEditing) {
      setRating(0);
      setTitle('');
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <h3 className="font-semibold text-lg">
        {isEditing ? t.editReview : t.writeReview}
      </h3>

      <div>
        <Label className="mb-2 block">{t.rating}</Label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i + 1)}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  i < (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 ? `${rating}/5` : t.clickToRate}
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="review-title">{t.titleLabel}</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.titlePlaceholder}
          maxLength={100}
        />
      </div>

      <div>
        <Label htmlFor="review-content">{t.reviewLabel}</Label>
        <Textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t.reviewPlaceholder}
          rows={4}
          maxLength={1000}
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
        <Button type="submit" disabled={submitting || rating === 0}>
          {submitting ? '...' : isEditing ? t.update : t.submit}
        </Button>
      </div>
    </form>
  );
};
