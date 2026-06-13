import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  CampaignStatus, CampaignOrigin, CampaignType, ExecutionSyncStatus, Recommendation,
} from './types';
import { ORIGIN_LABEL } from './types';

const STATUS_CLS: Record<CampaignStatus, string> = {
  Draft: 'bg-muted text-muted-foreground border-border',
  Approved: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  Scheduled: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  Live: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  Ended: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  Archived: 'bg-muted text-muted-foreground border-border opacity-70',
};

export const StatusBadge = ({ status }: { status: CampaignStatus }) => (
  <Badge variant="outline" className={cn('font-medium', STATUS_CLS[status])}>
    {status === 'Live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
    {status}
  </Badge>
);

const ORIGIN_CLS: Record<CampaignOrigin, string> = {
  growth_audit: 'border-emerald-500/40 text-emerald-600',
  manual_barpulse: 'border-indigo-500/40 text-indigo-600',
  manual_external: 'border-slate-400/50 text-slate-500',
};

const ORIGIN_DISPLAY: Record<CampaignOrigin, string> = {
  growth_audit: 'From Growth Audit',
  manual_barpulse: 'Manual',
  manual_external: 'From Asana',
};

export const OriginBadge = ({
  origin, subsource,
}: { origin: CampaignOrigin; subsource?: string | null }) => (
  <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide', ORIGIN_CLS[origin])}>
    {ORIGIN_DISPLAY[origin]}
    {subsource && <span className="ml-1 normal-case opacity-70">· via {subsource}</span>}
  </Badge>
);

export const TypeBadge = ({ type }: { type: CampaignType }) => (
  <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
    {type}
  </Badge>
);

const SYNC_CLS: Record<ExecutionSyncStatus, string> = {
  Synced: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10',
  Syncing: 'text-blue-600 border-blue-500/30 bg-blue-500/10',
  'Sync Failed': 'text-destructive border-destructive/40 bg-destructive/10',
  'Not Synced': 'text-muted-foreground border-border bg-muted/40',
};

export const SyncStatusBadge = ({ status }: { status: ExecutionSyncStatus }) => (
  <Badge variant="outline" className={cn('text-[10px]', SYNC_CLS[status])}>
    {status}
  </Badge>
);

const REC_CLS: Record<Recommendation, string> = {
  Repeat: 'text-emerald-600 border-emerald-500/30',
  Tweak: 'text-amber-700 border-amber-500/30',
  Retire: 'text-destructive border-destructive/40',
};

export const RecommendationBadge = ({ rec }: { rec: Recommendation }) => (
  <Badge variant="outline" className={cn('text-xs', REC_CLS[rec])}>{rec}</Badge>
);
