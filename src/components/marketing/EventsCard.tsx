import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Star, Check, X, Plus, Users } from 'lucide-react';
import { MarketingEvent, MarketingEventType } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventsCardProps {
  events: MarketingEvent[];
  onAddEvent?: () => void;
}

const getEventTypeBadgeStyle = (type: MarketingEventType) => {
  switch (type) {
    case 'Trivia':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Live Music':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'Sports':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Theme Night':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'Happy Hour':
      return 'bg-gold/20 text-gold border-gold/30';
    case 'Special':
      return 'bg-primary/20 text-primary border-primary/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3.5 h-3.5",
            star <= rating 
              ? "fill-gold text-gold" 
              : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
};

export const EventsCard = ({ events, onAddEvent }: EventsCardProps) => {
  return (
    <Card className="card-metric animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Events This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No events scheduled this week
            </p>
            {onAddEvent && (
              <Button variant="outline" size="sm" onClick={onAddEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div 
                key={event.id}
                className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{event.event_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {event.event_date ? format(parseISO(event.event_date), 'EEE, MMM d') : 'Date TBD'}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs shrink-0", getEventTypeBadgeStyle(event.event_type))}
                  >
                    {event.event_type}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {event.actual_attendance || '—'} / {event.expected_attendance}
                    </span>
                  </div>
                  <StarRating rating={event.performance_rating} />
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Content captured:</span>
                  {event.content_captured ? (
                    <span className="flex items-center gap-1 text-signal-green">
                      <Check className="w-3.5 h-3.5" />
                      Yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-destructive">
                      <X className="w-3.5 h-3.5" />
                      No
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {onAddEvent && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={onAddEvent}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
