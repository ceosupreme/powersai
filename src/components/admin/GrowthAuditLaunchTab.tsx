import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GbpPlaceMappingPanel } from './GbpPlaceMappingPanel';
import { WebsiteMappingPanel } from './WebsiteMappingPanel';
import { MapPackKeywordsPanel } from './MapPackKeywordsPanel';
import { AISearchQueriesPanel } from './AISearchQueriesPanel';
import { VenueProgrammingContextPanel } from './VenueProgrammingContextPanel';

export const GrowthAuditLaunchTab = () => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <Card className="p-6 border-l-4 border-l-emerald-500/70">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-500">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Growth Audit</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Find growth opportunities per project and turn them into ready-to-execute campaigns.
              Lives at its own dedicated page; this tab is just the launch point.
            </p>
            <Button onClick={() => navigate('/growth-audit')} className="mt-4 gap-2">
              Open Growth Audit
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <GbpPlaceMappingPanel />
      <WebsiteMappingPanel />
      <MapPackKeywordsPanel />
      <AISearchQueriesPanel />
      <VenueProgrammingContextPanel />
    </div>
  );
};
