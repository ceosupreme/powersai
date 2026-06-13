import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { MetricDetailContent } from './MetricDetailContent';
import type { MetricStats } from '@/lib/metricStats';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pillar: string;
  pillarLabel: string;
  metricLabel: string;
  scoreKey: string;
  score: number | null;
  weekStart?: string | null;
  weekRange?: string | null;
  venueName?: string | null;
  gmName?: string | null;
  barId?: string | null;
  weekId?: string | null;
  stats: MetricStats;
  notApplicable?: boolean;
}

export function MetricDetailDrawer(props: Props) {
  const { open, onOpenChange, metricLabel, pillarLabel } = props;
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-card max-h-[85vh]">
          <DrawerTitle className="sr-only">{metricLabel}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {pillarLabel} metric detail
          </DrawerDescription>
          <div className="overflow-y-auto pb-4">
            <MetricDetailContent {...props} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-[480px] p-0 max-h-[85vh] overflow-hidden flex flex-col gap-0">
        <DialogTitle className="sr-only">{metricLabel}</DialogTitle>
        <DialogDescription className="sr-only">
          {pillarLabel} metric detail
        </DialogDescription>
        <div className="overflow-y-auto">
          <MetricDetailContent {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
