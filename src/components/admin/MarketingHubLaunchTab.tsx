import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VenueAdapterConfig } from './VenueAdapterConfig';

export const MarketingHubLaunchTab = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <Card className="p-6 border-l-4 border-l-indigo-500/70">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-500">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Marketing Hub</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Plan, schedule, and measure every campaign — Growth-Audit-driven, manually created in BarPulse,
              or pulled in from external execution systems. Lives at its own dedicated page; this tab is just the launch point.
            </p>
            <Button onClick={() => navigate('/marketing-hub')} className="mt-4 gap-2">
              Open Marketing Hub
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <VenueAdapterConfig />
    </div>
  );
};
