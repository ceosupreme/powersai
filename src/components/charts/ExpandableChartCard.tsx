import { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ExpandableChartCardProps {
  title: string;
  miniChart: ReactNode;
  fullChart: ReactNode;
}

export const ExpandableChartCard = ({ title, miniChart, fullChart }: ExpandableChartCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="card-metric p-3 cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
      >
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          {title}
        </h3>
        {miniChart}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-6">
          <VisuallyHidden>
            <DialogTitle>{title} — Expanded View</DialogTitle>
          </VisuallyHidden>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            {title}
          </h3>
          {fullChart}
        </DialogContent>
      </Dialog>
    </>
  );
};
