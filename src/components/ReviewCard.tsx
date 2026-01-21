import { Star, ThumbsUp, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReviewCardProps {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  userName: string;
  userAvatar?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  onMarkHelpful?: (id: string) => void;
  isOwnReview?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ReviewCard = ({
  id,
  rating,
  title,
  content,
  userName,
  userAvatar,
  isVerifiedPurchase,
  helpfulCount,
  createdAt,
  onMarkHelpful,
  isOwnReview,
  onEdit,
  onDelete
}: ReviewCardProps) => {
  const { language } = useLanguage();
  
  const labels = {
    en: {
      verified: 'Verified Purchase',
      helpful: 'Helpful',
      peopleFound: 'people found this helpful',
      edit: 'Edit',
      delete: 'Delete'
    },
    fr: {
      verified: 'Achat vérifié',
      helpful: 'Utile',
      peopleFound: 'personnes ont trouvé cet avis utile',
      edit: 'Modifier',
      delete: 'Supprimer'
    }
  };
  
  const t = labels[language];

  return (
    <div className="border-b border-border py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar} alt={userName} />
          <AvatarFallback>{userName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{userName}</span>
            {isVerifiedPurchase && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                {t.verified}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
          
          {title && (
            <h4 className="font-medium mt-2">{title}</h4>
          )}
          
          {content && (
            <p className="text-muted-foreground mt-1 text-sm">{content}</p>
          )}
          
          <div className="flex items-center gap-4 mt-3">
            {!isOwnReview && onMarkHelpful && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkHelpful(id)}
                className="text-xs gap-1"
              >
                <ThumbsUp className="h-3 w-3" />
                {t.helpful}
              </Button>
            )}
            
            {helpfulCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {helpfulCount} {t.peopleFound}
              </span>
            )}
            
            {isOwnReview && (
              <div className="flex gap-2 ml-auto">
                {onEdit && (
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    {t.edit}
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive">
                    {t.delete}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
