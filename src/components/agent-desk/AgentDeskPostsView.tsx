import { ExternalLink, Share2, CheckCircle2, Clock } from 'lucide-react';
import { DriveLink } from '@/components/drive/DrivePreview';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  agentLabel, getProofLinks, getPublishedLinks, isPostLate, postDateOf,
  socialPostState, todayPacificISO, type AgentHandoffRow,
} from '@/lib/agentDesk';

interface Props {
  posts: AgentHandoffRow[];
  brandNames: Map<string, string>;
  isAdmin: boolean;
  onSelect: (row: AgentHandoffRow, action?: 'posted') => void;
}

export function AgentDeskPostsView({ posts, brandNames, isAdmin, onSelect }: Props) {
  const todayPT = todayPacificISO();
  const madeNotPosted = posts.filter((p) => socialPostState(p) === 'made_not_posted');
  const posted = posts.filter((p) => socialPostState(p) === 'posted');
  const inProgress = posts.filter((p) => socialPostState(p) === 'not_made' && p.status !== 'cancelled');

  // Group by post_date (earliest late/upcoming first, undated last)
  const groups = new Map<string, AgentHandoffRow[]>();
  const ordered = [...madeNotPosted, ...inProgress, ...posted].sort((a, b) => {
    const da = postDateOf(a) ?? '9999-99-99';
    const db = postDateOf(b) ?? '9999-99-99';
    return da.localeCompare(db);
  });
  for (const p of ordered) {
    const key = postDateOf(p) ?? 'No post date';
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Made, not posted</p><p className="text-2xl font-bold text-foreground">{madeNotPosted.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Posted</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{posted.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Still being made</p><p className="text-2xl font-bold text-muted-foreground">{inProgress.length}</p></CardContent></Card>
      </div>

      {groups.size === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No social posts match your filters.</CardContent></Card>
      ) : (
        Array.from(groups.entries()).map(([date, list]) => (
          <div key={date} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {date === 'No post date' ? date : `Post date: ${date}`}
            </h3>
            <div className="space-y-2">
              {list.map((row) => {
                const state = socialPostState(row);
                const late = isPostLate(row, todayPT);
                const proofs = getProofLinks(row);
                const pub = getPublishedLinks(row);
                const brand = (row.brand_ids ?? []).map((id) => brandNames.get(id)).filter(Boolean).join(', ') || 'No brand';
                return (
                  <Card key={row.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button type="button" onClick={() => onSelect(row)} className="text-left min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={state === 'posted' ? 'secondary' : late ? 'destructive' : 'default'} className="text-xs">
                            {state === 'posted' ? <><CheckCircle2 className="h-3 w-3 mr-1" />Posted</> : state === 'made_not_posted' ? (late ? <><Clock className="h-3 w-3 mr-1" />Late — not posted</> : 'Made, not posted') : row.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{brand}</Badge>
                          <span className="text-xs text-muted-foreground">{agentLabel(row.to_agent)}</span>
                        </div>
                        <p className="font-medium text-sm text-foreground truncate">{row.title}</p>
                      </button>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {proofs[0] && (
                          <DriveLink href={proofs[0].url}>Drive folder</DriveLink>
                        )}
                        {pub[0] && (
                          <Button size="sm" variant="secondary" asChild>
                            <a href={pub[0].url} target="_blank" rel="noreferrer">Live ({pub[0].platform})<ExternalLink className="h-3.5 w-3.5 ml-1.5" /></a>
                          </Button>
                        )}
                        {isAdmin && state !== 'posted' && row.status !== 'cancelled' && (
                          <Button size="sm" onClick={() => onSelect(row, 'posted')}>
                            <Share2 className="h-3.5 w-3.5 mr-1.5" />Mark posted
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}