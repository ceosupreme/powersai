import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORY_LABEL, type FindingCategoryKey } from '../findings/mockFindings';
import type { ReportConfig, ReportType } from './types';

const TYPE_OPTIONS: { value: ReportType; label: string; desc: string }[] = [
  { value: 'full', label: 'Full Report', desc: 'All 8 categories with full detail (~12 pages)' },
  { value: 'executive', label: 'Executive Summary', desc: 'Top findings + 30/60/90 plan (~3 pages)' },
  { value: 'category', label: 'Single Category Deep Dive', desc: 'One category, comprehensive' },
  { value: 'custom', label: 'Custom', desc: 'Choose categories to include' },
];

const ALL_CATS = Object.keys(CATEGORY_LABEL) as FindingCategoryKey[];

const todayPT = () => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return d.toISOString().split('T')[0];
};
const daysAgoPT = (n: number) => {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

export const ReportBuilderDialog = ({
  open, onOpenChange, onGenerate, defaultVenueName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onGenerate: (cfg: ReportConfig) => void;
  defaultVenueName: string;
}) => {
  const [type, setType] = useState<ReportType>('full');
  const [cats, setCats] = useState<FindingCategoryKey[]>(ALL_CATS);
  const [singleCat, setSingleCat] = useState<FindingCategoryKey>('revenue');
  const [start, setStart] = useState(daysAgoPT(30));
  const [end, setEnd] = useState(todayPT());
  const [venueName, setVenueName] = useState(defaultVenueName);
  const [preparedFor, setPreparedFor] = useState('');

  const toggleCat = (k: FindingCategoryKey) => {
    setCats(cs => cs.includes(k) ? cs.filter(c => c !== k) : [...cs, k]);
  };

  const submit = () => {
    let categories: FindingCategoryKey[];
    if (type === 'full') categories = ALL_CATS;
    else if (type === 'executive') categories = [];
    else if (type === 'category') categories = [singleCat];
    else categories = cats;

    onGenerate({
      type,
      categories,
      dateRange: { start, end },
      venueName: venueName.trim() || defaultVenueName,
      preparedFor: preparedFor.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Venue name</Label>
              <Input value={venueName} onChange={e => setVenueName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Prepared for (optional)</Label>
              <Input value={preparedFor} onChange={e => setPreparedFor(e.target.value)} placeholder="Owner / stakeholder" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Report type</Label>
            <RadioGroup value={type} onValueChange={v => setType(v as ReportType)} className="mt-2 grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(o => (
                <label key={o.value} className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${type === o.value ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-border hover:border-border'}`}>
                  <RadioGroupItem value={o.value} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{o.label}</div>
                    <div className="text-xs text-muted-foreground">{o.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {type === 'category' && (
            <div>
              <Label className="text-xs">Category</Label>
              <select
                value={singleCat}
                onChange={e => setSingleCat(e.target.value as FindingCategoryKey)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {ALL_CATS.map(k => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}
              </select>
            </div>
          )}

          {type === 'custom' && (
            <div>
              <Label className="text-xs">Categories to include</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ALL_CATS.map(k => (
                  <label key={k} className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer">
                    <Checkbox checked={cats.includes(k)} onCheckedChange={() => toggleCat(k)} />
                    <span className="text-sm text-foreground">{CATEGORY_LABEL[k]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date range — start</Label>
              <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Date range — end</Label>
              <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={type === 'custom' && cats.length === 0}>
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
