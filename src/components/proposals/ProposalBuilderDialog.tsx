import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLatestLeakStackRun } from '@/hooks/useLeakStack';
import { useServicePackages } from '@/hooks/useServicePackages';
import { useProposalFootprint, FOOTPRINT_SOURCE_LABEL } from '@/hooks/useProposalFootprint';
import { useProposalMutations } from '@/hooks/useProposals';
import { enginesForFootprint, preselectPackageId } from './engineDefaults';
import {
  ENGINE_LABEL,
  FOOTPRINT_LABEL,
  type EngineKey,
  type FootprintKey,
  type ManualLeak,
  type ProposalContent,
  type ProposalRow,
  type SelectedLeak,
} from './types';
import { formatDollars } from '@/lib/leakStackFormat';

const ALL_ENGINES: EngineKey[] = ['acquisition', 'retention', 'command_center', 'delivery'];
const ALL_FOOTPRINTS: FootprintKey[] = ['solo_owner', 'small_crew_2_5', 'crew_6_plus', 'multi_location'];

export function ProposalBuilderDialog({
  open,
  onOpenChange,
  companyId,
  venueId,
  defaultProspectName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string | null;
  venueId: string | null;
  defaultProspectName: string;
  onCreated?: (row: ProposalRow) => void;
}) {
  const runQ = useLatestLeakStackRun(venueId);
  const footprintQ = useProposalFootprint(companyId, venueId);
  const { data: packages = [] } = useServicePackages({ activeOnly: true });
  const { create } = useProposalMutations();

  const run = runQ.data ?? null;

  const [prospectName, setProspectName] = useState(defaultProspectName);
  const [introLine, setIntroLine] = useState(
    "After running your numbers, here's what we found — and what it's costing you.",
  );
  const [nextStepLine, setNextStepLine] = useState(
    "Reply to this proposal and I'll open a 20-minute install kickoff.",
  );
  const [footprint, setFootprint] = useState<FootprintKey | null>(null);
  const [footprintTouched, setFootprintTouched] = useState(false);
  const [engines, setEngines] = useState<EngineKey[]>(['acquisition']);
  const [selectedLeaks, setSelectedLeaks] = useState<SelectedLeak[]>([]);
  const [manualLeaks, setManualLeaks] = useState<ManualLeak[]>([]);
  const [packageId, setPackageId] = useState<string>('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync prospect name to prop
  useEffect(() => {
    if (open) {
      setProspectName(defaultProspectName);
      setSubmitError(null);
    }
  }, [open, defaultProspectName]);

  // Resolve footprint → default engines
  useEffect(() => {
    if (!footprintTouched && footprintQ.data?.value) {
      setFootprint(footprintQ.data.value);
      setEngines(enginesForFootprint(footprintQ.data.value));
    }
  }, [footprintQ.data, footprintTouched]);

  // Preload ALL rows from the run. Default checked when monthly_dollars > 0; unchecked at 0/null.
  // Sort: headline first, then $ desc — avoided_loss included in the sort.
  useEffect(() => {
    if (!run || selectedLeaks.length > 0) return;
    const preselected = run.results
      .filter((r) => (r.monthly_dollars ?? 0) > 0)
      .map<SelectedLeak>((r) => ({ name: r.name, risk_type: r.risk_type }));
    setSelectedLeaks(preselected);
  }, [run, selectedLeaks.length]);

  // Preselect package by footprint
  useEffect(() => {
    if (packageId || packages.length === 0) return;
    const id = preselectPackageId(packages, footprint);
    if (id) {
      setPackageId(id);
      const pkg = packages.find((p) => p.id === id);
      if (pkg && !priceDisplay) {
        setPriceDisplay(pkg.one_time_price ? `$${Number(pkg.one_time_price).toLocaleString()}` : pkg.name);
      }
    }
  }, [footprint, packages, packageId, priceDisplay]);

  const toggleEngine = (e: EngineKey) =>
    setEngines((cur) => (cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]));

  const isLeakSelected = (name: string) => selectedLeaks.some((l) => l.name === name);
  const toggleLeak = (name: string, risk_type: 'captured_revenue' | 'avoided_loss') =>
    setSelectedLeaks((cur) =>
      cur.some((l) => l.name === name)
        ? cur.filter((l) => l.name !== name)
        : [...cur, { name, risk_type }],
    );

  const addManual = () =>
    setManualLeaks((cur) => [...cur, { name: '', monthly_dollars: null, manual: true }]);

  const patchManual = (i: number, patch: Partial<ManualLeak>) =>
    setManualLeaks((cur) => cur.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const removeManual = (i: number) =>
    setManualLeaks((cur) => cur.filter((_, idx) => idx !== i));

  const chosenPackage = useMemo(() => packages.find((p) => p.id === packageId) ?? null, [packages, packageId]);

  const submit = async () => {
    setSubmitError(null);
    const content: ProposalContent = {
      intro_line: introLine.trim(),
      prospect_name: prospectName.trim() || defaultProspectName,
      selected_leaks: selectedLeaks,
      manual_leaks: manualLeaks.filter((m) => m.name.trim().length > 0),
      engines_included: engines,
      package_id: packageId || null,
      price_display: priceDisplay.trim() || (chosenPackage?.name ?? ''),
      footprint,
      next_step_line: nextStepLine.trim(),
    };
    try {
      const row = await create.mutateAsync({
        company_id: companyId,
        venue_id: venueId,
        leak_stack_run_id: run?.id ?? null,
        title: `Proposal — ${content.prospect_name}`,
        content,
      });
      toast.success('Proposal drafted');
      onCreated?.(row);
      onOpenChange(false);
    } catch (e: any) {
      // Persistent inline error; keep dialog open, preserve all state.
      const code = e?.code as string | undefined;
      let msg: string;
      if (code === 'no_session') {
        msg = 'Your session expired. Sign in again, then save.';
      } else if (code === '42501') {
        msg = "You don't have permission to save proposals here. This action requires an admin role.";
      } else {
        msg = `Save failed: ${e?.message ?? 'Unknown error'}`;
      }
      setSubmitError(msg);
    }
  };

  const allRows = run?.results ?? [];
  const capturedRows = allRows.filter((r) => r.risk_type !== 'avoided_loss');
  const avoidedRows = allRows.filter((r) => r.risk_type === 'avoided_loss');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> New proposal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prospect name (on document)</Label>
              <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Operation footprint</Label>
              <Select
                value={footprint ?? '__none'}
                onValueChange={(v) => {
                  setFootprintTouched(true);
                  const val = v === '__none' ? null : (v as FootprintKey);
                  setFootprint(val);
                  setEngines(enginesForFootprint(val));
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Set manually…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Not set</SelectItem>
                  {ALL_FOOTPRINTS.map((k) => (
                    <SelectItem key={k} value={k}>{FOOTPRINT_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {footprintQ.data?.source && footprintQ.data.source !== 'none' && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  Source: {FOOTPRINT_SOURCE_LABEL[footprintQ.data.source]}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Intro line</Label>
            <Textarea
              rows={2}
              value={introLine}
              onChange={(e) => setIntroLine(e.target.value)}
              placeholder="One sentence framing why you built this for them."
              className="mt-1"
            />
          </div>

          {/* Engines */}
          <div>
            <Label className="text-xs">Engines to install</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ALL_ENGINES.map((e) => (
                <label key={e} className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer">
                  <Checkbox checked={engines.includes(e)} onCheckedChange={() => toggleEngine(e)} />
                  <span className="text-sm">{ENGINE_LABEL[e]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Leaks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Leaks from latest run</Label>
              {run && (
                <Badge variant="outline" className="text-[10px]">
                  Run {new Date(run.computed_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
            {runQ.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading run…
              </div>
            ) : !run ? (
              <div className="text-xs p-3 rounded-md border border-amber-500/40 bg-amber-500/5">
                No leak stack run for this project yet — using manual leaks only. Run a leak stack computation first for real numbers.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Recoverable revenue
                  </div>
                  <div className="space-y-1">
                    {capturedRows.length === 0 && (
                      <div className="text-[11px] italic text-muted-foreground px-1">
                        No recoverable-revenue rows in this run.
                      </div>
                    )}
                    {capturedRows.map((r) => (
                      <label key={r.name} className="flex items-center justify-between gap-2 p-2 rounded border border-border cursor-pointer">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={isLeakSelected(r.name)}
                            onCheckedChange={() => toggleLeak(r.name, 'captured_revenue')}
                          />
                          <span className="text-sm truncate">{r.name}</span>
                          {r.severity === 'headline' && <Badge variant="destructive" className="text-[9px]">headline</Badge>}
                        </div>
                        <span className="text-xs font-mono tabular-nums">{formatDollars(r.monthly_dollars)}/mo</span>
                      </label>
                    ))}
                  </div>
                </div>
                {avoidedRows.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Risk exposure — losses you can avoid
                    </div>
                    <div className="space-y-1">
                      {avoidedRows.map((r) => (
                        <label key={r.name} className="flex items-center justify-between gap-2 p-2 rounded border border-border cursor-pointer">
                          <div className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={isLeakSelected(r.name)}
                              onCheckedChange={() => toggleLeak(r.name, 'avoided_loss')}
                            />
                            <span className="text-sm truncate">{r.name}</span>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            >
                              risk
                            </Badge>
                            {r.severity === 'headline' && <Badge variant="destructive" className="text-[9px]">headline</Badge>}
                          </div>
                          <span className="text-xs font-mono tabular-nums">{formatDollars(r.monthly_dollars)}/mo</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Manual leaks</Label>
                <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={addManual}>
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
              {manualLeaks.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Leak name"
                    value={m.name}
                    onChange={(e) => patchManual(i, { name: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    placeholder="$/mo"
                    value={m.monthly_dollars ?? ''}
                    onChange={(e) => patchManual(i, { monthly_dollars: e.target.value ? Number(e.target.value) : null })}
                    className="h-8 text-xs w-28"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeManual(i)} className="h-8 w-8 shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Package */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Package</Label>
              <Select
                value={packageId || '__none'}
                onValueChange={(v) => {
                  if (v === '__none') {
                    setPackageId('');
                    return;
                  }
                  setPackageId(v);
                  const pkg = packages.find((p) => p.id === v);
                  if (pkg && !priceDisplay) {
                    setPriceDisplay(pkg.one_time_price ? `$${Number(pkg.one_time_price).toLocaleString()}` : pkg.name);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a package…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No package</SelectItem>
                  {packages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.tier ? `${p.tier} · ` : ''}{p.name}
                      {p.one_time_price ? ` — $${p.one_time_price}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Price display (editable)</Label>
              <Input
                value={priceDisplay}
                onChange={(e) => setPriceDisplay(e.target.value)}
                placeholder="$4,500 install + $1,200/mo"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Next step</Label>
            <Textarea
              rows={2}
              value={nextStepLine}
              onChange={(e) => setNextStepLine(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}