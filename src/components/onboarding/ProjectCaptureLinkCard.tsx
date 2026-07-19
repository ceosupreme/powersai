import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectType } from '@/lib/effectivePillars';

interface Props {
  venueId: string;
  /** Optional preloaded values — if omitted, the component fetches them. */
  venueSlug?: string | null;
  projectType?: ProjectType | null;
  /** Render as a plain block (no outer Card chrome) — used inside the wizard accordion. */
  bare?: boolean;
}

interface Meta {
  slug: string | null;
  project_type: ProjectType | null;
}

function LinkRow({
  label,
  url,
  primary,
  note,
}: {
  label: string;
  url: string;
  primary?: boolean;
  note?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error("Couldn't copy — select the URL manually.");
    }
  };
  return (
    <div className={`rounded-md border p-3 ${primary ? 'bg-primary/5 border-primary/40' : 'bg-muted/30'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {primary && <Badge className="text-[10px]">Primary</Badge>}
      </div>
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        <code className="text-xs sm:text-sm break-all font-mono text-foreground flex-1 min-w-0">{url}</code>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="outline" onClick={copy} className="h-8">
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            className="h-8"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
          </Button>
        </div>
      </div>
      {note && <p className="text-xs text-muted-foreground mt-1.5">{note}</p>}
    </div>
  );
}

export function ProjectCaptureLinkCard({
  venueId,
  venueSlug,
  projectType,
  bare = false,
}: Props) {
  const preloaded = venueSlug !== undefined && projectType !== undefined;
  const [meta, setMeta] = useState<Meta | null>(
    preloaded ? { slug: venueSlug ?? null, project_type: projectType ?? null } : null,
  );
  const [verticalSlug, setVerticalSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!preloaded) {
      supabase
        .from('venues')
        .select('slug,project_type')
        .eq('id', venueId)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          setMeta((data as Meta) ?? { slug: null, project_type: null });
        });
    }
    return () => { cancelled = true; };
  }, [venueId, preloaded]);

  useEffect(() => {
    let cancelled = false;
    const pt = meta?.project_type;
    if (!pt) { setVerticalSlug(null); return; }
    (supabase as any)
      .from('project_types')
      .select('slug')
      .eq('id', pt)
      .maybeSingle()
      .then(({ data }: { data: { slug: string | null } | null }) => {
        if (cancelled) return;
        setVerticalSlug(data?.slug ?? null);
      });
    return () => { cancelled = true; };
  }, [meta?.project_type]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const projectUrl = meta?.slug ? `${origin}/q/${meta.slug}` : null;
  const verticalUrl = verticalSlug ? `${origin}/qualify/${verticalSlug}` : null;

  const body = (
    <div className="space-y-2">
      {projectUrl ? (
        <LinkRow
          label="Project capture link"
          url={projectUrl}
          primary
          note="Leads submitted here attribute to this project and trigger its follow-up sequence."
        />
      ) : (
        <div className="rounded-md border p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            No project capture link yet — this project has no slug configured.
          </p>
        </div>
      )}
      {verticalUrl && (
        <LinkRow
          label="Vertical / cold link"
          url={verticalUrl}
          note="Leads submitted here land in your shared inbound queue and are NOT attributed to this project."
        />
      )}
      {!projectUrl && !verticalUrl && (
        <p className="text-xs text-muted-foreground">
          No capture link is configured. Set a slug on the project, or publish a project type with a matching vertical slug.
        </p>
      )}
    </div>
  );

  if (bare) return body;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Capture link</h3>
      </div>
      {body}
    </div>
  );
}