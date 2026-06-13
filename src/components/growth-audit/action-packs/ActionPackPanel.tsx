// Per-finding Action Pack panel — drops into Finding Detail in place of the
// blueprint preview once a pack exists. Provides the Generate button and
// AI/mock generation-mode toggle.

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCcw, Cpu, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import type { Finding } from '../findings/mockFindings';
import { ASSET_KIND_LABEL } from '../findings/actionPackBlueprints';
import { FINDING_TYPE_TEMPLATES } from '../findings/findingTypes';
import { AssetRow } from './AssetRow';
import { generateActionPack, regenerateAsset, getGenerationMode, setGenerationMode, fromFinding } from './generateActionPack';
import {
  upsertPack,
  selectPackForFinding,
  useActionPacksStore,
  useActionPacksLoader,
  replaceAsset,
  editAsset,
  approveAssets,
  rejectAsset,
} from './useActionPacks';
import type { GenerationMode, VenueContext } from './types';

type Props = {
  finding: Finding;
  venueContext: VenueContext;
  blocked: boolean;
  blockedReason?: string;
};

export const ActionPackPanel = ({ finding, venueContext, blocked, blockedReason }: Props) => {
  useActionPacksStore();
  useActionPacksLoader(venueContext.venueId);
  const { toast } = useToast();
  const tmpl = FINDING_TYPE_TEMPLATES[finding.type];
  const pack = selectPackForFinding(finding.id);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<GenerationMode>(getGenerationMode());

  const flipMode = (m: GenerationMode) => {
    setMode(m);
    setGenerationMode(m);
  };

  const generate = async () => {
    setBusy(true);
    try {
      const next = await generateActionPack(fromFinding(finding), venueContext, mode);
      upsertPack(next);
      toast({
        title: 'Action Pack generated',
        description: `${next.assets.length} draft asset${next.assets.length === 1 ? '' : 's'} • ${next.source === 'ai' ? 'AI' : 'Mock'}`,
      });
    } catch (e) {
      console.error('[GROWTH-AUDIT] generate failed', e);
      toast({ title: 'Generation failed', description: 'Try mock mode for predictable output.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const handleRegenAsset = async (assetId: string, refinement?: string) => {
    const a = pack?.assets.find(x => x.id === assetId);
    if (!a) return;
    const next = await regenerateAsset(a, fromFinding(finding), venueContext, refinement, mode);
    replaceAsset(assetId, next);
  };

  // ---- No pack yet: blueprint preview + Generate button ----
  if (!pack) {
    const isOps = finding.type === 'operational_readiness_blocker';
    return (
      <Card className="p-4 bg-card/30 border-dashed space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground">{tmpl.actionPackBlueprint.summary}</div>
          <ModeToggle mode={mode} onChange={flipMode} />
        </div>
        <div className="space-y-1.5">
          {tmpl.actionPackBlueprint.assets.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] shrink-0">{ASSET_KIND_LABEL[a.kind]}</Badge>
              <span className="text-foreground/80 leading-snug">{a.title}</span>
            </div>
          ))}
        </div>
        <Button onClick={generate} disabled={busy} className="w-full gap-2">
          <Sparkles className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
          {busy
            ? 'Generating…'
            : isOps
            ? 'Generate Ops Fix Brief'
            : `Generate Action Pack (${mode === 'ai' ? 'AI' : 'Mock'})`}
        </Button>
        {isOps && (
          <div className="text-[11px] text-amber-700 dark:text-amber-500">
            No traffic-driving assets are produced for this finding type — fix capacity first.
          </div>
        )}
      </Card>
    );
  }

  // ---- Pack exists: list assets ----
  return (
    <Card className="p-4 bg-card/30 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] text-muted-foreground">
          {pack.assets.length} draft asset{pack.assets.length === 1 ? '' : 's'} • Generated {format(parseISO(pack.generatedAt), 'MMM d, h:mm a')} • Source: {pack.source.toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={flipMode} />
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={generate} disabled={busy}>
            <RefreshCcw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> Regenerate full pack
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {pack.assets.map(a => (
          <AssetRow
            key={a.id}
            asset={a}
            blocked={blocked}
            blockedReason={blockedReason}
            onRegenerate={(r) => handleRegenAsset(a.id, r)}
            onEdit={(body) => editAsset(a.id, body)}
            onApprove={(payload) => {
              approveAssets([a.id], payload);
              toast({ title: 'Approved', description: 'Asset moved to In Use.' });
            }}
            onReject={() => {
              rejectAsset(a.id);
              toast({ title: 'Rejected' });
            }}
          />
        ))}
      </div>
    </Card>
  );
};

const ModeToggle = ({ mode, onChange }: { mode: GenerationMode; onChange: (m: GenerationMode) => void }) => (
  <div className="inline-flex rounded-md border border-border bg-card overflow-hidden text-[10px]">
    <button
      onClick={() => onChange('ai')}
      className={`px-2 py-1 flex items-center gap-1 ${mode === 'ai' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      title="AI generation via the Lovable AI Gateway"
    >
      <Cpu className="w-3 h-3" /> AI
    </button>
    <button
      onClick={() => onChange('mock')}
      className={`px-2 py-1 flex items-center gap-1 border-l border-border ${mode === 'mock' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
      title="Deterministic local mock generator (dev/demo)"
    >
      <FlaskConical className="w-3 h-3" /> Mock
    </button>
  </div>
);
