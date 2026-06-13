import { OnlineReviewSignal } from '@/types/venue';
import { cn } from '@/lib/utils';
import { Star, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

interface OnlineReviewsCardProps {
  reviews: OnlineReviewSignal[];
}

const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            iconSize,
            i < fullStars 
              ? 'text-gold fill-gold' 
              : i === fullStars && hasHalfStar 
                ? 'text-gold fill-gold/50'
                : 'text-muted-foreground'
          )}
        />
      ))}
      <span className={cn('font-mono ml-1', size === 'lg' ? 'text-xl font-bold' : 'text-sm')}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
};

const ReviewCard = ({ review }: { review: OnlineReviewSignal }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const positiveThemes = review.themes_positive?.split(',').map(t => t.trim()).filter(Boolean) || [];
  const negativeThemes = review.themes_negative?.split(',').map(t => t.trim()).filter(Boolean) || [];

  return (
    <div className="p-4 bg-muted/20 rounded-lg border border-border/50 space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {review.platform}
          </Badge>
          <StarRating rating={review.avg_rating} size="lg" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-signal-green font-medium">+{review.new_reviews_count} new</span>
          {review.responded && (
            <Badge variant="outline" className="text-xs bg-signal-green/10 text-signal-green border-signal-green/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Responded
            </Badge>
          )}
        </div>
      </div>

      {/* Themes */}
      {review.themes_top && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Top themes:</span> {review.themes_top}
        </p>
      )}

      {/* Theme Tags */}
      {(positiveThemes.length > 0 || negativeThemes.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {positiveThemes.map((theme, i) => (
            <Badge key={`pos-${i}`} className="text-xs bg-signal-green/15 text-signal-green border-0">
              {theme}
            </Badge>
          ))}
          {negativeThemes.map((theme, i) => (
            <Badge key={`neg-${i}`} className="text-xs bg-destructive/15 text-destructive border-0">
              {theme}
            </Badge>
          ))}
        </div>
      )}

      {/* Review Preview */}
      {review.review_preview && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground/90 line-clamp-2">"{review.review_preview}"</p>
              {review.review_date && (
                <p className="text-xs text-muted-foreground mt-1">{formatDate(review.review_date)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notable Quote Fallback */}
      {!review.review_preview && review.notable_quotes && (
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
          "{review.notable_quotes}"
        </blockquote>
      )}
    </div>
  );
};

export const OnlineReviewsCard = ({ reviews }: OnlineReviewsCardProps) => {
  const [activeTab, setActiveTab] = useState('all');

  if (!reviews.length) return null;

  const googleReviews = reviews.filter(r => r.platform === 'Google');
  const yelpReviews = reviews.filter(r => r.platform === 'Yelp');

  const getFilteredReviews = () => {
    switch (activeTab) {
      case 'google': return googleReviews;
      case 'yelp': return yelpReviews;
      default: return reviews;
    }
  };

  // Calculate totals
  const totalNewReviews = reviews.reduce((sum, r) => sum + r.new_reviews_count, 0);

  return (
    <div className="card-metric p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Online Reviews</h3>
        </div>
        <span className="text-sm text-signal-green font-medium">
          +{totalNewReviews} this week
        </span>
      </div>

      {/* Platform Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="all" className="text-sm">All ({reviews.length})</TabsTrigger>
          <TabsTrigger value="google" className="text-sm">Google ({googleReviews.length})</TabsTrigger>
          <TabsTrigger value="yelp" className="text-sm">Yelp ({yelpReviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {getFilteredReviews().map(review => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};
