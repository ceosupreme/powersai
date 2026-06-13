import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORY_LABEL } from '../findings/mockFindings';
import type { DataSource, SourceStatus } from './mockDataSources';

const statusTone = (s: SourceStatus): string => {
  switch (s) {
    case 'Connected': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
    case 'Partial': return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    case 'Limited': return 'bg-orange-500/15 text-orange-600 border-orange-500/30';
    case 'Not Connected': return 'bg-muted text-muted-foreground border-border';
    case 'Coming Soon': return 'bg-muted text-muted-foreground border-dashed border-border';
  }
};

export const DataSourceCard = ({ src }: { src: DataSource }) => {
  const Icon = src.icon;
  const isStub = src.action === 'Coming Soon';

  const onAction = () => {
    if (isStub) return;
    toast.success(`${src.action} ${src.name}`, {
      description: 'Connection setup is a stub in this build — wiring lands in the next phase.',
    });
  };

  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-muted/50 ${src.iconTint ?? 'text-foreground'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{src.name}</h3>
              <Badge variant="outline" className={`text-[10px] ${statusTone(src.status)}`}>
                {src.status}
              </Badge>
            </div>
            <Button
              size="sm"
              variant={src.action === 'Configure' ? 'outline' : isStub ? 'ghost' : 'default'}
              disabled={isStub}
              onClick={onAction}
            >
              {src.action}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{src.description}</p>

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {src.feeds.map(k => (
              <Badge key={k} variant="outline" className="text-[10px] bg-muted/30">
                {CATEGORY_LABEL[k]}
              </Badge>
            ))}
          </div>

          {src.lastSync && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              Last sync: {src.lastSync}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
