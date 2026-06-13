import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Clock, DollarSign, Receipt } from 'lucide-react';
import { Promotion, PromotionType } from '@/types/venue';
import { cn } from '@/lib/utils';

interface PromotionsCardProps {
  promotions: Promotion[];
}

const getPromoTypeBadgeStyle = (type: PromotionType) => {
  switch (type) {
    case 'Happy Hour':
      return 'bg-gold/20 text-gold border-gold/30';
    case 'BOGO':
      return 'bg-signal-green/20 text-signal-green border-signal-green/30';
    case 'Discount':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Event Special':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Loyalty':
      return 'bg-primary/20 text-primary border-primary/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const PromotionsCard = ({ promotions }: PromotionsCardProps) => {
  return (
    <Card className="card-metric animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Active Promotions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {promotions.length === 0 ? (
          <div className="text-center py-6">
            <Tag className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No active promotions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => (
              <div 
                key={promo.id}
                className="p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm flex-1 min-w-0 truncate">
                    {promo.promo_name}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs shrink-0", getPromoTypeBadgeStyle(promo.promo_type))}
                  >
                    {promo.promo_type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{promo.schedule || 'Schedule TBD'}</span>
                </div>
                
                <p className="text-xs text-foreground/80">
                  {promo.discount_description}
                </p>
                
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>
                      {promo.weekly_redemptions ?? '—'} redemptions
                    </span>
                  </div>
                  {promo.discount_given !== undefined && promo.discount_given > 0 && (
                    <div className="flex items-center gap-1 text-gold">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{promo.discount_given.toLocaleString()} given</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
