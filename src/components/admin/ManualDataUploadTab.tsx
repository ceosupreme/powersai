import { useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, PenLine, Loader2, CheckCircle2, AlertCircle, History, RotateCcw, FileArchive, HardHat, Users, Timer } from 'lucide-react';
import { useVenues } from '@/hooks/useVenueData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { Label } from '@/components/ui/label';

// Helper to get Monday of a date's week
function getMonday(dateStr: string): string {
  const dt = new Date(dateStr + 'T00:00:00Z');
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

// Helper to get all Monday starts between two dates
function getAffectedWeeks(startDate: string, endDate: string): string[] {
  const weeks = new Set<string>();
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current <= end) {
    weeks.add(getMonday(current.toISOString().slice(0, 10)));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return [...weeks].sort().reverse(); // newest first — ensures recent weeks are always processed
}

export const ManualDataUploadTab = () => {
  const { data: venues = [] } = useVenues();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Mode toggle — persisted in URL
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as 'manual' | 'toast_zip' | 'labor_zip' | 'engage_csv' | 'kds_csv') || 'toast_zip';
  const setMode = (value: 'manual' | 'toast_zip' | 'labor_zip' | 'engage_csv' | 'kds_csv') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('mode', value);
      return next;
    });
  };

  // Toast ZIP state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipVenue, setZipVenue] = useState<string>('');
  const [zipConflictMode, setZipConflictMode] = useState<string>('overwrite');
  const [zipUploading, setZipUploading] = useState(false);
  const [zipPreview, setZipPreview] = useState<any | null>(null);
  const [zipResult, setZipResult] = useState<any | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Labor ZIP state
  const [laborZipFile, setLaborZipFile] = useState<File | null>(null);
  const [laborZipVenue, setLaborZipVenue] = useState<string>('');
  const [laborZipConflictMode, setLaborZipConflictMode] = useState<string>('overwrite');
  const [laborZipUploading, setLaborZipUploading] = useState(false);
  const [laborZipPreview, setLaborZipPreview] = useState<any | null>(null);
  const [laborZipResult, setLaborZipResult] = useState<any | null>(null);
  const laborZipInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [manualVenue, setManualVenue] = useState<string>('');
  const [manualDate, setManualDate] = useState('');
  const [manualType, setManualType] = useState<string>('labor');
  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Engage CSV state
  const [engageFile, setEngageFile] = useState<File | null>(null);
  const [engageWeekStart, setEngageWeekStart] = useState('');
  const [engageUploading, setEngageUploading] = useState(false);
  const [engagePreview, setEngagePreview] = useState<any[] | null>(null);
  const [engageResult, setEngageResult] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const engageInputRef = useRef<HTMLInputElement>(null);

  // KDS CSV state
  const [kdsFile, setKdsFile] = useState<File | null>(null);
  const [kdsVenue, setKdsVenue] = useState<string>('');
  const [kdsWeekStart, setKdsWeekStart] = useState<string>(() => {
    // Default to current Monday in Pacific Time
    const nowPT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const day = nowPT.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    nowPT.setDate(nowPT.getDate() + diff);
    return `${nowPT.getFullYear()}-${String(nowPT.getMonth() + 1).padStart(2, '0')}-${String(nowPT.getDate()).padStart(2, '0')}`;
  });
  const [kdsUploading, setKdsUploading] = useState(false);
  const [kdsPreview, setKdsPreview] = useState<any | null>(null);
  const [kdsResult, setKdsResult] = useState<any | null>(null);
  const kdsInputRef = useRef<HTMLInputElement>(null);

  // Upload history
  const { data: uploadHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['manual-upload-history'],
    queryFn: async () => {
      const { data } = await supabase
        .from('manual_upload_history')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const selectedVenueBarCode = useCallback((venueId: string) => {
    const v = venues.find(v => v.id === venueId);
    return v?.bar_code || '';
  }, [venues]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // === Toast ZIP handlers ===
  const handleZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setZipFile(f);
      setZipPreview(null);
      setZipResult(null);
    }
  };

  const handleZipPreview = async () => {
    if (!zipFile || !zipVenue) return;
    setZipUploading(true);
    setZipPreview(null);
    try {
      const b64 = await fileToBase64(zipFile);
      const { data, error } = await supabase.functions.invoke('parse-toast-zip', {
        body: { zip_base64: b64, venue_id: zipVenue, confirm: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setZipPreview(data);
    } catch (err) {
      toast({ title: 'Preview failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setZipUploading(false);
    }
  };

  const handleZipCommit = async () => {
    if (!zipFile || !zipVenue) return;
    setZipUploading(true);
    setZipResult(null);
    try {
      const b64 = await fileToBase64(zipFile);
      const { data, error } = await supabase.functions.invoke('parse-toast-zip', {
        body: {
          zip_base64: b64,
          venue_id: zipVenue,
          conflict_mode: zipConflictMode,
          confirm: true,
          file_name: zipFile.name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setZipResult(data);
      setZipPreview(null);
      setZipFile(null);
      setZipVenue('');
      if (zipInputRef.current) zipInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['daily-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-scores'] });
      refetchHistory();

      // Recompute weekly scores for affected weeks (newest first, capped at 16)
      let recomputedCount = 0;
      let totalWeeks = 0;
      try {
        const dateStart = data.date_range_start;
        const dateEnd = data.date_range_end;
        if (dateStart && dateEnd) {
          const allWeeks = getAffectedWeeks(dateStart, dateEnd);
          totalWeeks = allWeeks.length;
          const weeks = allWeeks.slice(0, 16);
          console.log(`Recomputing scores for ${weeks.length}/${totalWeeks} weeks:`, weeks);
          for (const ws of weeks) {
            await supabase.functions.invoke('compute-weekly-scores', {
              body: { bar_id: zipVenue, week_start: ws },
            });
            recomputedCount++;
          }
        }
      } catch (e) {
        console.error('Score recompute error:', e);
      }

      const extra = totalWeeks > 16 ? ` (${totalWeeks - 16} older weeks skipped — use Sync tab to recompute)` : '';
      toast({ title: 'Upload complete', description: `${data.upserted} daily records imported. ${recomputedCount} weeks recomputed.${extra}` });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setZipUploading(false);
    }
  };

  // === Labor ZIP handlers ===
  const handleLaborZipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setLaborZipFile(f);
      setLaborZipPreview(null);
      setLaborZipResult(null);
    }
  };

  const handleLaborZipPreview = async () => {
    if (!laborZipFile || !laborZipVenue) return;
    setLaborZipUploading(true);
    setLaborZipPreview(null);
    try {
      const b64 = await fileToBase64(laborZipFile);
      const { data, error } = await supabase.functions.invoke('parse-labor-zip', {
        body: { zip_base64: b64, venue_id: laborZipVenue, confirm: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLaborZipPreview(data);
    } catch (err) {
      toast({ title: 'Preview failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setLaborZipUploading(false);
    }
  };

  const handleLaborZipCommit = async () => {
    if (!laborZipFile || !laborZipVenue) return;
    setLaborZipUploading(true);
    setLaborZipResult(null);
    try {
      const b64 = await fileToBase64(laborZipFile);
      const { data, error } = await supabase.functions.invoke('parse-labor-zip', {
        body: {
          zip_base64: b64,
          venue_id: laborZipVenue,
          conflict_mode: laborZipConflictMode,
          confirm: true,
          file_name: laborZipFile.name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLaborZipResult(data);
      setLaborZipPreview(null);
      setLaborZipFile(null);
      setLaborZipVenue('');
      if (laborZipInputRef.current) laborZipInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['daily-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-scores'] });
      refetchHistory();

      // Recompute weekly scores for affected weeks (newest first, capped at 16)
      let recomputedCount = 0;
      let totalWeeks = 0;
      try {
        const dateStart = data.date_range_start;
        const dateEnd = data.date_range_end;
        if (dateStart && dateEnd) {
          const allWeeks = getAffectedWeeks(dateStart, dateEnd);
          totalWeeks = allWeeks.length;
          const weeks = allWeeks.slice(0, 16);
          console.log(`Recomputing labor scores for ${weeks.length}/${totalWeeks} weeks:`, weeks);
          for (const ws of weeks) {
            await supabase.functions.invoke('compute-weekly-scores', {
              body: { bar_id: laborZipVenue, week_start: ws },
            });
            recomputedCount++;
          }
        }
      } catch (e) {
        console.error('Score recompute error:', e);
      }

      const extra = totalWeeks > 16 ? ` (${totalWeeks - 16} older weeks skipped — use Sync tab to recompute)` : '';
      toast({ title: 'Upload complete', description: `${data.upserted} labor records imported. ${recomputedCount} weeks recomputed.${extra}` });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setLaborZipUploading(false);
    }
  };

  // === Manual entry handlers ===
  const handleManualSave = async () => {
    if (!manualVenue || !manualDate) {
      toast({ title: 'Missing fields', description: 'Please select venue and date.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      const barCode = selectedVenueBarCode(manualVenue);
      const payload: Record<string, unknown> = {
        bar_id: barCode,
        date: manualDate,
        venue_id: manualVenue,
        source: 'manual_entry',
      };

      const numFields = ['labor_hours', 'labor_cost', 'labor_pct', 'splh', 'tips', 'overtime_hours',
        'net_sales', 'gross_sales', 'orders_count', 'guests', 'avg_check', 'discounts', 'comps', 'voids', 'refunds'];
      
      for (const key of numFields) {
        const val = manualFields[key];
        if (val && val.trim() !== '') {
          payload[key] = parseFloat(val.replace(/[$,%\s]/g, ''));
        }
      }

      const { data: existing } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('bar_id', barCode)
        .eq('date', manualDate)
        .maybeSingle();

      const { error } = await supabase
        .from('daily_metrics')
        .upsert(payload as any, { onConflict: 'bar_id,date' });

      if (error) throw error;

      await supabase.from('manual_upload_history').insert({
        uploaded_by: session?.user?.id || null,
        venue_id: manualVenue,
        bar_id: barCode,
        date_range_start: manualDate,
        date_range_end: manualDate,
        data_type: manualType,
        method: 'manual_entry',
        record_count: 1,
        previous_values: existing ? [existing] : null,
      });

      try {
        await supabase.functions.invoke('compute-weekly-scores', {
          body: { venue_id: manualVenue, bar_id: barCode },
        });
      } catch { /* non-fatal */ }

      queryClient.invalidateQueries({ queryKey: ['daily-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-scores'] });
      refetchHistory();
      toast({ title: 'Saved', description: `Data for ${manualDate} updated.` });
      setManualFields({});
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleManualDateVenueChange = useCallback(async (venueId: string, date: string) => {
    if (!venueId || !date) return;
    const barCode = venues.find(v => v.id === venueId)?.bar_code;
    if (!barCode) return;
    const { data } = await supabase
      .from('daily_metrics')
      .select('labor_hours, labor_cost, labor_pct, splh, tips, overtime_hours, net_sales, gross_sales, orders_count, guests, avg_check, discounts, comps, voids, refunds')
      .eq('bar_id', barCode)
      .eq('date', date)
      .maybeSingle();
    if (data) {
      const fields: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) fields[k] = String(v);
      }
      setManualFields(fields);
    } else {
      setManualFields({});
    }
  }, [venues]);

  const handleRevert = async (historyId: string) => {
    try {
      const { data: entry } = await supabase
        .from('manual_upload_history')
        .select('previous_values, bar_id, venue_id')
        .eq('id', historyId)
        .single();

      if (!entry?.previous_values) {
        toast({ title: 'Cannot revert', description: 'No previous values stored.', variant: 'destructive' });
        return;
      }

      const rows = entry.previous_values as any[];
      for (const row of rows) {
        const { id, ...rest } = row;
        await supabase
          .from('daily_metrics')
          .upsert({ ...rest } as any, { onConflict: 'bar_id,date' });
      }

      await supabase
        .from('manual_upload_history')
        .update({ reverted_at: new Date().toISOString() } as any)
        .eq('id', historyId);

      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['daily-metrics'] });
      toast({ title: 'Reverted', description: `${rows.length} records restored.` });
    } catch (err) {
      toast({ title: 'Revert failed', variant: 'destructive' });
    }
  };

  const LaborFields = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { key: 'labor_hours', label: 'Labor Hours' },
        { key: 'labor_cost', label: 'Labor Cost ($)' },
        { key: 'labor_pct', label: 'Labor %' },
        { key: 'splh', label: 'SPLH' },
        { key: 'tips', label: 'Tips ($)' },
        { key: 'overtime_hours', label: 'Overtime Hours' },
      ].map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input
            type="number"
            step="any"
            value={manualFields[f.key] || ''}
            onChange={e => setManualFields(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder="—"
          />
        </div>
      ))}
    </div>
  );

  const SalesFields = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { key: 'net_sales', label: 'Net Sales ($)' },
        { key: 'gross_sales', label: 'Gross Sales ($)' },
        { key: 'orders_count', label: 'Transactions' },
        { key: 'guests', label: 'Guest Count' },
        { key: 'avg_check', label: 'Avg Check ($)' },
        { key: 'discounts', label: 'Discounts ($)' },
        { key: 'comps', label: 'Comps ($)' },
        { key: 'voids', label: 'Voids ($)' },
        { key: 'refunds', label: 'Refunds ($)' },
      ].map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs">{f.label}</Label>
          <Input
            type="number"
            step="any"
            value={manualFields[f.key] || ''}
            onChange={e => setManualFields(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder="—"
          />
        </div>
      ))}
    </div>
  );

  const methodLabel = (method: string) => {
    switch (method) {
      case 'csv_upload': return 'CSV';
      case 'manual_entry': return 'Manual';
      case 'toast_zip_upload': return 'Toast ZIP';
      case 'labor_zip_upload': return 'Labor ZIP';
      case 'engage_csv_upload': return 'Engage CSV';
      case 'kds_csv_upload': return 'KDS CSV';
      default: return method;
    }
  };

  // === Engage CSV handlers ===
  const handleEngageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setEngageFile(f);
      setEngagePreview(null);
      setEngageResult(null);
    }
  };

  const parseEngageCsv = (text: string) => {
    const lines = text.trim().replace(/^\uFEFF/, '').split('\n');
    if (lines.length < 2) return [];
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = line.split(',');
      return {
        location: cols[1]?.trim() || '',
        lates: parseFloat((cols[2] || '').replace('%', '')) || 0,
        no_shows: parseFloat((cols[3] || '').replace('%', '')) || 0,
        dropped_shifts: parseFloat((cols[4] || '').replace('%', '')) || 0,
        shift_bids: parseInt(cols[5] || '0') || 0,
        avg_shift_score: parseFloat(cols[6] || '0') || 0,
        avg_tenure: parseInt((cols[7] || '').replace(/\s*days/i, '')) || 0,
      };
    });
  };

  const handleEngagePreview = () => {
    if (!engageFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseEngageCsv(reader.result as string);
      const mapped = rows.map(r => {
        const venue = venues.find(v => {
          const vName = v.name.toLowerCase();
          const csvName = r.location.toLowerCase();
          return vName === csvName || csvName.includes(vName) || vName.includes(csvName);
        });
        return { ...r, venue, matched: !!venue };
      });
      setEngagePreview(mapped);
    };
    reader.readAsText(engageFile);
  };

  const handleEngageCommit = async () => {
    if (!engagePreview || !engageWeekStart) return;
    setEngageUploading(true);
    setEngageResult(null);
    try {
      const matched = engagePreview.filter(r => r.matched);
      const unmatched = engagePreview.filter(r => !r.matched).map(r => r.location);

      for (const row of matched) {
        const venue = row.venue!;
        const barId = venue.id; // UUID, not bar_code

        // Find existing week row by UUID bar_id + week_start
        const { data: weekRow } = await supabase
          .from('weeks')
          .select('id')
          .eq('bar_id', barId)
          .eq('week_start', engageWeekStart)
          .limit(1)
          .single();

        if (!weekRow) continue; // skip if no week exists for this venue/date

        // Update engage columns using correct UUIDs (update instead of upsert to avoid ambiguous constraint)
        const { error: updateErr } = await supabase.from('weekly_core')
          .update({
            engage_lates: row.lates,
            engage_no_shows: row.no_shows,
            engage_dropped_shifts: row.dropped_shifts,
            engage_shift_bids: row.shift_bids,
            engage_avg_shift_score: row.avg_shift_score,
            engage_avg_tenure: row.avg_tenure,
          } as any)
          .eq('week_id', weekRow.id)
          .eq('bar_id', barId);

        if (updateErr) throw updateErr;
      }

      // Record upload history
      await supabase.from('manual_upload_history').insert({
        uploaded_by: session?.user?.id || null,
        date_range_start: engageWeekStart,
        date_range_end: engageWeekStart,
        data_type: 'engage',
        method: 'engage_csv_upload',
        record_count: matched.length,
        file_name: engageFile?.name || 'engage.csv',
      } as any);

      queryClient.invalidateQueries({ queryKey: ['weekly-scores'] });
      refetchHistory();

      setEngageResult({ matched: matched.length, unmatched });
      setEngagePreview(null);
      setEngageFile(null);
      if (engageInputRef.current) engageInputRef.current.value = '';

      toast({
        title: 'Engage data uploaded',
        description: `${matched.length} venues updated${unmatched.length > 0 ? `, ${unmatched.length} unmatched` : ''}.`,
      });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setEngageUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'manual' | 'toast_zip' | 'labor_zip')}>
        <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 overflow-x-auto">
          <TabsTrigger value="toast_zip" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <FileArchive className="h-4 w-4" /> Toast ZIP
          </TabsTrigger>
          <TabsTrigger value="labor_zip" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <HardHat className="h-4 w-4" /> Labor ZIP
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <PenLine className="h-4 w-4" /> Manual Entry
          </TabsTrigger>
          <TabsTrigger value="engage_csv" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" /> Engage CSV
          </TabsTrigger>
          <TabsTrigger value="kds_csv" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Timer className="h-4 w-4" /> KDS CSV
          </TabsTrigger>
        </TabsList>

        {/* === Toast ZIP Upload === */}
        <TabsContent value="toast_zip">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5 text-primary" />
                Upload Toast Sales ZIP
              </CardTitle>
              <CardDescription>
                Upload the ZIP file exported from Toast's Sales Summary report. Contains daily sales, tips, voids, discounts, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Venue (required)</Label>
                  <Select value={zipVenue} onValueChange={setZipVenue}>
                    <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                    <SelectContent>
                      {venues.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>If Data Exists</Label>
                  <Select value={zipConflictMode} onValueChange={setZipConflictMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overwrite">Overwrite</SelectItem>
                      <SelectItem value="skip">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => zipInputRef.current?.click()}
              >
                <input ref={zipInputRef} type="file" accept=".zip" onChange={handleZipFileChange} className="hidden" />
                <FileArchive className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {zipFile ? (
                  <p className="text-sm font-medium text-foreground">{zipFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to select a Toast Sales ZIP file</p>
                )}
              </div>

              <Button onClick={handleZipPreview} disabled={zipUploading || !zipFile || !zipVenue} className="w-full">
                {zipUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing ZIP...</> : 'Preview Data'}
              </Button>

              {/* ZIP Preview */}
              {zipPreview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {zipPreview.row_count} days: {zipPreview.date_range?.start} → {zipPreview.date_range?.end}
                    </p>
                    <Badge variant="secondary">{venues.find(v => v.id === zipVenue)?.name}</Badge>
                  </div>

                  {zipPreview.warnings?.length > 0 && (
                    <div className="text-xs text-amber-500 space-y-0.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      {zipPreview.warnings.map((w: string, i: number) => <p key={i}>⚠ {w}</p>)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Gross Sales', val: zipPreview.weekly_summary?.gross_sales, fmt: '$' },
                      { label: 'Net Sales', val: zipPreview.weekly_summary?.net_sales_weekly, fmt: '$' },
                      { label: 'Tips', val: zipPreview.weekly_summary?.tips, fmt: '$' },
                      { label: 'Discounts', val: zipPreview.weekly_summary?.discounts != null ? Math.abs(zipPreview.weekly_summary.discounts) : null, fmt: '$' },
                      { label: 'Refunds', val: zipPreview.weekly_summary?.refunds != null ? Math.abs(zipPreview.weekly_summary.refunds) : null, fmt: '$' },
                      { label: 'Voids', val: zipPreview.weekly_summary?.voids_amount, fmt: '$' },
                      { label: 'Void %', val: zipPreview.weekly_summary?.void_pct, fmt: '%' },
                      { label: 'Turn Time', val: zipPreview.weekly_summary?.turn_time_mins, fmt: ' min' },
                      { label: 'Food Sales', val: zipPreview.weekly_summary?.food_sales, fmt: '$' },
                      { label: 'Bev Sales', val: zipPreview.weekly_summary?.bev_sales, fmt: '$' },
                      { label: 'Guests', val: zipPreview.weekly_summary?.total_guests, fmt: '' },
                      { label: 'Avg/Guest', val: zipPreview.weekly_summary?.avg_per_guest, fmt: '$' },
                    ].map((item, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {item.val !== null && item.val !== undefined
                            ? item.fmt === '$'
                              ? `$${Number(item.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : `${Number(item.val).toLocaleString()}${item.fmt}`
                            : '—'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto max-h-72 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Net Sales</TableHead>
                          <TableHead className="text-xs">Orders</TableHead>
                          <TableHead className="text-xs">Guests</TableHead>
                          <TableHead className="text-xs">Avg Check</TableHead>
                          <TableHead className="text-xs">Tips</TableHead>
                          <TableHead className="text-xs">Voids</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(zipPreview.daily_rows || []).map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{r.date}</TableCell>
                            <TableCell className="text-xs">{r.net_sales != null ? `$${Number(r.net_sales).toLocaleString()}` : '—'}</TableCell>
                            <TableCell className="text-xs">{r.orders_count ?? '—'}</TableCell>
                            <TableCell className="text-xs">{r.guests ?? '—'}</TableCell>
                            <TableCell className="text-xs">{r.avg_check != null ? `$${r.avg_check}` : '—'}</TableCell>
                            <TableCell className="text-xs">{r.tips != null ? `$${Number(r.tips).toLocaleString()}` : '—'}</TableCell>
                            <TableCell className="text-xs">{r.voids != null ? `$${Number(r.voids).toLocaleString()}` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button onClick={handleZipCommit} disabled={zipUploading} className="w-full">
                    {zipUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : `Import ${zipPreview.row_count} Daily Records`}
                  </Button>
                </div>
              )}

              {zipResult && (
                <Card className={zipResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {zipResult.success ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
                      <span className="font-medium text-foreground">
                        {zipResult.success ? `${zipResult.upserted} records imported · Scores recomputed` : 'Import Failed'}
                      </span>
                    </div>
                    {zipResult.skipped > 0 && <p className="text-xs text-muted-foreground">{zipResult.skipped} skipped (already exist)</p>}
                    {zipResult.warnings?.length > 0 && (
                      <div className="text-xs text-amber-500 space-y-0.5">
                        {zipResult.warnings.map((w: string, i: number) => <p key={i}>⚠ {w}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Labor ZIP Upload === */}
        <TabsContent value="labor_zip">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-primary" />
                Upload Toast Labor ZIP
              </CardTitle>
              <CardDescription>
                Upload the ZIP file exported from Toast's Labor Breakdown report. Updates labor hours, cost, labor %, SPLH, and overtime only — will not overwrite sales data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Venue (required)</Label>
                  <Select value={laborZipVenue} onValueChange={setLaborZipVenue}>
                    <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                    <SelectContent>
                      {venues.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>If Data Exists</Label>
                  <Select value={laborZipConflictMode} onValueChange={setLaborZipConflictMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overwrite">Overwrite</SelectItem>
                      <SelectItem value="skip">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => laborZipInputRef.current?.click()}
              >
                <input ref={laborZipInputRef} type="file" accept=".zip" onChange={handleLaborZipFileChange} className="hidden" />
                <HardHat className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {laborZipFile ? (
                  <p className="text-sm font-medium text-foreground">{laborZipFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to select a Toast Labor ZIP file</p>
                )}
              </div>

              <Button onClick={handleLaborZipPreview} disabled={laborZipUploading || !laborZipFile || !laborZipVenue} className="w-full">
                {laborZipUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing ZIP...</> : 'Preview Data'}
              </Button>

              {/* Labor ZIP Preview */}
              {laborZipPreview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {laborZipPreview.summary?.row_count} days: {laborZipPreview.summary?.date_range?.start} → {laborZipPreview.summary?.date_range?.end}
                    </p>
                    <Badge variant="secondary">{laborZipPreview.venue_name}</Badge>
                  </div>

                  {laborZipPreview.warnings?.length > 0 && (
                    <div className="text-xs text-amber-500 space-y-0.5 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      {laborZipPreview.warnings.map((w: string, i: number) => <p key={i}>⚠ {w}</p>)}
                    </div>
                  )}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: 'Total Hours', val: laborZipPreview.summary?.total_hours, fmt: '' },
                      { label: 'Total Cost', val: laborZipPreview.summary?.total_cost, fmt: '$' },
                      { label: 'OT Hours', val: laborZipPreview.summary?.total_ot_hours, fmt: '' },
                      { label: 'Avg Labor %', val: laborZipPreview.summary?.avg_labor_pct, fmt: '%' },
                      { label: 'Avg SPLH', val: laborZipPreview.summary?.avg_splh, fmt: '$' },
                      { label: 'Days', val: laborZipPreview.summary?.row_count, fmt: '' },
                    ].map((item, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {item.val !== null && item.val !== undefined
                            ? item.fmt === '$'
                              ? `$${Number(item.val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : item.fmt === '%'
                                ? `${Number(item.val).toFixed(1)}%`
                                : Number(item.val).toLocaleString(undefined, { maximumFractionDigits: 1 })
                            : '—'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Daily Table */}
                  <div className="overflow-x-auto max-h-72 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Hours</TableHead>
                          <TableHead className="text-xs">OT</TableHead>
                          <TableHead className="text-xs">Cost</TableHead>
                          <TableHead className="text-xs">Labor %</TableHead>
                          <TableHead className="text-xs">SPLH</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(laborZipPreview.daily_rows || []).map((r: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{r.date}</TableCell>
                            <TableCell className="text-xs">{r.total_hours ?? '—'}</TableCell>
                            <TableCell className="text-xs">{r.overtime_hours ?? '—'}</TableCell>
                            <TableCell className="text-xs">{r.total_cost != null ? `$${Number(r.total_cost).toLocaleString()}` : '—'}</TableCell>
                            <TableCell className="text-xs">{r.labor_pct != null ? `${r.labor_pct}%` : '—'}</TableCell>
                            <TableCell className="text-xs">{r.splh != null ? `$${r.splh}` : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button onClick={handleLaborZipCommit} disabled={laborZipUploading} className="w-full">
                    {laborZipUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : `Import ${laborZipPreview.summary?.row_count} Labor Records`}
                  </Button>
                </div>
              )}

              {/* Labor ZIP Commit Result */}
              {laborZipResult && (
                <Card className={laborZipResult.success ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {laborZipResult.success ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
                      <span className="font-medium text-foreground">
                        {laborZipResult.success ? `${laborZipResult.upserted} labor records imported · Scores recomputed` : 'Import Failed'}
                      </span>
                    </div>
                    {laborZipResult.skipped > 0 && <p className="text-xs text-muted-foreground">{laborZipResult.skipped} skipped (already exist)</p>}
                    {laborZipResult.warnings?.length > 0 && (
                      <div className="text-xs text-amber-500 space-y-0.5">
                        {laborZipResult.warnings.map((w: string, i: number) => <p key={i}>⚠ {w}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Manual Entry === */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" />
                Manual Data Entry
              </CardTitle>
              <CardDescription>Enter or correct data for a single venue and date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Venue</Label>
                  <Select value={manualVenue} onValueChange={(v) => {
                    setManualVenue(v);
                    handleManualDateVenueChange(v, manualDate);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select venue" /></SelectTrigger>
                    <SelectContent>
                      {venues.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={manualDate} onChange={(e) => {
                    setManualDate(e.target.value);
                    handleManualDateVenueChange(manualVenue, e.target.value);
                  }} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data Type</Label>
                  <Select value={manualType} onValueChange={setManualType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="sales">Revenue</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(manualType === 'labor' || manualType === 'both') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Labor Metrics</h4>
                  <LaborFields />
                </div>
              )}

              {(manualType === 'sales' || manualType === 'both') && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Sales Metrics</h4>
                  <SalesFields />
                </div>
              )}

              <Button onClick={handleManualSave} disabled={saving || !manualVenue || !manualDate} className="w-full">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Data'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Engage CSV Upload === */}
        <TabsContent value="engage_csv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Upload Engage CSV
              </CardTitle>
              <CardDescription>
                Upload the 7shifts Enterprise Engage report CSV. Updates all venues at once for the selected week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Week Start (Monday)</Label>
                <Input
                  type="date"
                  value={engageWeekStart}
                  onChange={e => {
                    const val = e.target.value;
                    const dt = new Date(val + 'T00:00:00Z');
                    if (dt.getUTCDay() !== 1) {
                      toast({ title: 'Must be a Monday', variant: 'destructive' });
                      return;
                    }
                    setEngageWeekStart(val);
                  }}
                />
              </div>

              <div
                className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => engageInputRef.current?.click()}
              >
                <input ref={engageInputRef} type="file" accept=".csv" onChange={handleEngageFileChange} className="hidden" />
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {engageFile ? (
                  <p className="text-sm font-medium text-foreground">{engageFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Click to select the Engage CSV file</p>
                )}
              </div>

              <Button onClick={handleEngagePreview} disabled={!engageFile} className="w-full">
                Preview Data
              </Button>

              {engagePreview && (
                <div className="space-y-4">
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Location</TableHead>
                          <TableHead className="text-xs">Matched</TableHead>
                          <TableHead className="text-xs">Lates</TableHead>
                          <TableHead className="text-xs">No Shows</TableHead>
                          <TableHead className="text-xs">Dropped</TableHead>
                          <TableHead className="text-xs">Bids</TableHead>
                          <TableHead className="text-xs">Score</TableHead>
                          <TableHead className="text-xs">Tenure</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {engagePreview.map((r: any, i: number) => (
                          <TableRow key={i} className={r.matched ? '' : 'opacity-50'}>
                            <TableCell className="text-xs font-medium">{r.location}</TableCell>
                            <TableCell className="text-xs">
                              {r.matched
                                ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                                : <AlertCircle className="h-4 w-4 text-destructive" />}
                            </TableCell>
                            <TableCell className="text-xs">{r.lates}%</TableCell>
                            <TableCell className="text-xs">{r.no_shows}%</TableCell>
                            <TableCell className="text-xs">{r.dropped_shifts}%</TableCell>
                            <TableCell className="text-xs">{r.shift_bids}</TableCell>
                            <TableCell className="text-xs">{r.avg_shift_score}</TableCell>
                            <TableCell className="text-xs">{r.avg_tenure} days</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {engagePreview.some((r: any) => !r.matched) && (
                    <div className="text-xs text-amber-500 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      ⚠ Unmatched locations will be skipped. Check venue names in Settings.
                    </div>
                  )}

                  <Button
                    onClick={handleEngageCommit}
                    disabled={engageUploading || !engageWeekStart || !engagePreview.some((r: any) => r.matched)}
                    className="w-full"
                  >
                    {engageUploading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                      : `Import ${engagePreview.filter((r: any) => r.matched).length} Venues`}
                  </Button>
                </div>
              )}

              {engageResult && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-foreground">
                        {engageResult.matched} venues updated
                      </span>
                    </div>
                    {engageResult.unmatched.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Unmatched: {engageResult.unmatched.join(', ')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === KDS CSV Upload === */}
        <TabsContent value="kds_csv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Upload KDS Kitchen Details CSV
              </CardTitle>
              <CardDescription>
                Upload the "Kitchen Details" CSV from Toast to populate KDS (G5) ticket times. Used as a fallback when the Toast API doesn't expose fulfillment data for a venue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Venue (optional — auto-detected from CSV)</Label>
                  <Select value={kdsVenue} onValueChange={setKdsVenue}>
                    <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect from CSV</SelectItem>
                      {venues.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Week start (Monday)</Label>
                  <input
                    type="date"
                    value={kdsWeekStart}
                    onChange={(e) => setKdsWeekStart(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Tickets outside this 7-day window will be dropped.</p>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => kdsInputRef.current?.click()}
              >
                <input
                  ref={kdsInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setKdsFile(f); setKdsPreview(null); setKdsResult(null); }
                  }}
                />
                {kdsFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                    <Upload className="h-4 w-4" />
                    {kdsFile.name}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="h-5 w-5 mx-auto mb-1" />
                    Click to select Kitchen Details CSV
                  </div>
                )}
              </div>

              <Button
                onClick={async () => {
                  if (!kdsFile) return;
                  setKdsUploading(true);
                  setKdsPreview(null);
                  try {
                    const text = await kdsFile.text();
                    const { data, error } = await supabase.functions.invoke('parse-kds-csv', {
                      body: {
                        csv_content: text,
                        venue_id: kdsVenue && kdsVenue !== 'auto' ? kdsVenue : undefined,
                        week_start: kdsWeekStart,
                        confirm: false,
                      },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    setKdsPreview(data);
                  } catch (err) {
                    toast({ title: 'Preview failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
                  } finally {
                    setKdsUploading(false);
                  }
                }}
                disabled={!kdsFile || !kdsWeekStart || kdsUploading}
                variant="outline"
                className="w-full"
              >
                {kdsUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : 'Preview KDS Data'}
              </Button>

              {kdsPreview && (
                <div className="space-y-3">
                  <div className="text-sm space-y-1 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <p><strong>Project:</strong> {kdsPreview.venue?.name || <span className="text-amber-500">Not detected — please select above</span>}</p>
                    <p><strong>Total Tickets:</strong> {kdsPreview.total_tickets}</p>
                    <p><strong>Days:</strong> {kdsPreview.days?.length || 0}</p>
                    {kdsPreview.detected_location && (
                      <p className="text-xs text-muted-foreground">Location from CSV: {kdsPreview.detected_location}</p>
                    )}
                  </div>

                  {kdsPreview.days && kdsPreview.days.length > 0 && (
                    <div className="overflow-x-auto border border-border/30 rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Avg KDS (min)</TableHead>
                            <TableHead className="text-xs">Tickets</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kdsPreview.days.map((d: any) => (
                            <TableRow key={d.date}>
                              <TableCell className="text-xs font-medium">{d.date}</TableCell>
                              <TableCell className="text-xs">{d.avg_kds_mins.toFixed(1)} min</TableCell>
                              <TableCell className="text-xs">{d.ticket_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {kdsPreview.warnings?.length > 0 && (
                    <div className="text-xs text-amber-500 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      ⚠ {kdsPreview.warnings.length} warnings — {kdsPreview.warnings.slice(0, 3).join('; ')}
                    </div>
                  )}

                  <Button
                    onClick={async () => {
                      setKdsUploading(true);
                      setKdsResult(null);
                      try {
                        const text = await kdsFile!.text();
                        const { data, error } = await supabase.functions.invoke('parse-kds-csv', {
                          body: {
                            csv_content: text,
                            venue_id: kdsVenue && kdsVenue !== 'auto' ? kdsVenue : (kdsPreview.venue?.id || undefined),
                            week_start: kdsWeekStart,
                            confirm: true,
                            file_name: kdsFile!.name,
                          },
                        });
                        if (error) throw error;
                        if (data?.error) throw new Error(data.error);
                        setKdsResult(data);
                        setKdsPreview(null);
                        setKdsFile(null);
                        if (kdsInputRef.current) kdsInputRef.current.value = '';
                        queryClient.invalidateQueries({ queryKey: ['daily-metrics'] });
                        queryClient.invalidateQueries({ queryKey: ['weekly-scores'] });
                        refetchHistory();
                        toast({ title: 'KDS data uploaded', description: `${data.upserted} days of KDS data imported. Weekly scores recomputed.` });
                      } catch (err) {
                        toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
                      } finally {
                        setKdsUploading(false);
                      }
                    }}
                    disabled={kdsUploading || !kdsPreview.venue}
                    className="w-full"
                  >
                    {kdsUploading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                      : `Import ${kdsPreview.days?.length || 0} Days of KDS Data`}
                  </Button>
                </div>
              )}

              {kdsResult && (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-foreground">
                        {kdsResult.upserted} days of KDS data imported
                      </span>
                    </div>
                    {kdsResult.warnings?.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {kdsResult.warnings.length} warnings
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Upload History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No manual uploads yet.</p>
          ) : (
            <div className="space-y-2">
              {uploadHistory.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="text-sm space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{methodLabel(h.method)}</Badge>
                      <Badge variant="secondary" className="text-xs">{h.data_type}</Badge>
                      {h.reverted_at && <Badge variant="destructive" className="text-xs">Reverted</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {h.date_range_start} → {h.date_range_end} · {h.record_count} records
                      {h.file_name && ` · ${h.file_name}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(h.uploaded_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {h.previous_values && !h.reverted_at && (
                    <Button variant="ghost" size="sm" onClick={() => handleRevert(h.id)} className="text-xs gap-1">
                      <RotateCcw className="h-3 w-3" /> Revert
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
