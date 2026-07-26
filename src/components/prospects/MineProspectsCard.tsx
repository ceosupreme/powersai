import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Pickaxe } from 'lucide-react';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import { useProspectMutations } from '@/hooks/useProspects';
import { toast } from '@/hooks/use-toast';

export const MineProspectsCard = () => {
  const { data: types = [] } = useProjectTypes();
  const verticals = types.filter((t) => t.is_vertical);
  const { mine } = useProspectMutations();

  const [niche, setNiche] = useState<string>('');
  const [city, setCity] = useState('');
  const [maxResults, setMaxResults] = useState('20');
  const [progress, setProgress] = useState<string | null>(null);

  const run = () => {
    if (!niche || !city.trim()) {
      toast({ title: 'Pick a niche and a city', variant: 'destructive' });
      return;
    }
    setProgress('Starting…');
    mine.mutate(
      {
        niche,
        city: city.trim(),
        max_results: Number(maxResults),
        onProgress: setProgress,
      },
      {
        onSuccess: (r) => {
          setProgress(null);
          toast({
            title: `Mined ${r.kept} prospects`,
            description: `${r.found} found · ${r.kept} kept · ${r.checked} checked${r.errors.length ? ` · ${r.errors.length} failed` : ''}`,
          });
        },
        onError: (e: any) => {
          setProgress(null);
          toast({ title: 'Mining failed', description: e?.message, variant: 'destructive' });
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pickaxe className="w-4 h-4" /> Mine Prospects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Niche</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger><SelectValue placeholder="Select vertical" /></SelectTrigger>
              <SelectContent>
                {verticals.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Carlsbad" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max results</Label>
            <Select value={maxResults} onValueChange={setMaxResults}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={mine.isPending} className="w-full sm:w-auto">
            {mine.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Mine prospects
          </Button>
          {progress && <span className="text-xs text-muted-foreground">{progress}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Pulls operating businesses with 3+ Google reviews, then runs a cold checkup on each.
          Dollar figures are estimates built from public data and vertical defaults.
        </p>
      </CardContent>
    </Card>
  );
};