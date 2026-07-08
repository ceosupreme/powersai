// Dismissible amber banner listing missing external-data setup for a venue.
// Auto-resolves when all 4 sources are configured. Dismissal is per-user.

import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useVenueOnboarding, useDismissOnboarding } from './useVenueOnboarding';

export const OnboardingChecklist = ({ venueId }: { venueId: string | null }) => {
  const navigate = useNavigate();
  const state = useVenueOnboarding(venueId);
  const dismiss = useDismissOnboarding(venueId);

  if (!venueId || !state.visible) return null;

  const goTo = (hash: string) => {
    navigate(`/growth-audit?subtab=data-sources#${hash}`);
  };

  return (
    <Card className="p-4 border-amber-500/40 bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-600 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-foreground">
              Finish project setup ({state.missing.length} {state.missing.length === 1 ? 'item' : 'items'} left)
            </div>
            <Button
              size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={() => dismiss.mutate()}
              title="Dismiss until something changes"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Adding the missing data sources unlocks more findings and raises Data Confidence.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {state.missing.map((m) => (
              <Button
                key={m.key}
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                onClick={() => goTo(m.hash)}
              >
                {m.label} <ArrowRight className="w-3 h-3" />
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
