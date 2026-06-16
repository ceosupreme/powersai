// Hidden from Settings UI (Phase C). Preserved as reusable upload/ingest infrastructure — do not delete.
import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileSpreadsheet, Trash2, CheckCircle2, AlertCircle, Loader2,
  XCircle, Clock, Sparkles,
} from 'lucide-react';
import { useVenues } from '@/hooks/useVenueData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { SculptureSiteMappingPanel } from './SculptureSiteMappingPanel';
import { useIntegrationDisabled } from '@/hooks/useIntegrationDisabled';

// =====================================================================
// Smart Sculpture Upload — auto-detects report type, venue, and period.
// Routes the file to the correct parser. Handles many files at once.
// =====================================================================

type QueueStatus = 'detecting' | 'ready' | 'unsupported' | 'error' | 'uploading' | 'done';

interface DetectionResult {
  file_name: string;
  report_type: string;
  report_label: string;
  supported: boolean;
  not_supported_reason?: string;
  venue_id: string | null;
  venue_name: string | null;
  venue_token_from_filename: string | null;
  period_start: string | null;
  period_end: string | null;
  row_count: number;
  is_xlsx: boolean;
  sculpture_site_id?: string | null;
  site_id_hint?: string | null;
  snapshot_date?: string | null;
}

interface QueueItem {
  id: string;
  file: File;
  csvContent: string | null;
  status: QueueStatus;
  detection?: DetectionResult;
  venueId: string;
  periodStart: string;
  periodEnd: string;
  errorMessage?: string;
  rowsImported?: number;
}

const newId = () => Math.random().toString(36).slice(2, 10);

export const SculptureUploadTab = () => {
  const disabled = useIntegrationDisabled('sculpture');
  if (disabled) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Sculpture Hospitality integration is disabled. Coming soon.
      </div>
    );
  }
  const { data: venues = [] } = useVenues();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const detectFile = useCallback(async (item: QueueItem) => {
    try {
      const { data, error } = await supabase.functions.invoke('detect-sculpture-report', {
        body: {
          file_name: item.file.name,
          csv_content: item.csvContent,
        },
      });
      if (error) throw error;
      const det = data as DetectionResult;
      setQueue(q => q.map(x => x.id === item.id ? {
        ...x,
        detection: det,
        status: det.supported ? 'ready' : 'unsupported',
        venueId: det.venue_id ?? '',
        periodStart: det.period_start ?? '',
        periodEnd: det.period_end ?? '',
      } : x));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Detection failed';
      setQueue(q => q.map(x => x.id === item.id ? { ...x, status: 'error', errorMessage: msg } : x));
    }
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const items: QueueItem[] = [];
    for (const f of arr) {
      const isXlsx = /\.xlsx$/i.test(f.name);
      const csv = isXlsx ? null : await f.text();
      items.push({
        id: newId(),
        file: f,
        csvContent: csv,
        status: 'detecting',
        venueId: '',
        periodStart: '',
        periodEnd: '',
      });
    }
    setQueue(q => [...q, ...items]);
    items.forEach((it) => { void detectFile(it); });
  }, [detectFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void addFiles(e.target.files);
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) void addFiles(e.dataTransfer.files);
  };

  const removeItem = (id: string) => setQueue(q => q.filter(x => x.id !== id));

  const updateItem = (id: string, patch: Partial<QueueItem>) =>
    setQueue(q => q.map(x => x.id === id ? { ...x, ...patch } : x));

  const confirmItem = useCallback(async (item: QueueItem) => {
    if (!item.detection?.supported) return;
    if (!item.venueId || !item.periodStart || !item.periodEnd) {
      toast({ title: 'Missing info', description: 'Venue and date(s) required.', variant: 'destructive' });
      return;
    }
    updateItem(item.id, { status: 'uploading', errorMessage: undefined });

    const reportType = item.detection.report_type;
    try {
      let result: { rows_imported?: number; error?: string } = {};

      const commonCsvBody = {
        csv_content: item.csvContent,
        venue_id: item.venueId,
        period_start: item.periodStart,
        period_end: item.periodEnd,
        source_file: item.file.name,
      };

      if (reportType === 'drink_mix') {
        const { data, error } = await supabase.functions.invoke('parse-drink-mix-csv', { body: commonCsvBody });
        if (error) throw error;
        result = data as typeof result;
      } else if (reportType === 'detailed_variance') {
        const { data, error } = await supabase.functions.invoke('parse-inventory-csv', {
          body: { ...commonCsvBody, report_type: 'detailed' },
        });
        if (error) throw error;
        result = data as typeof result;
      } else if (reportType === 'summary_variance') {
        const { data, error } = await supabase.functions.invoke('parse-summary-variance-csv', { body: commonCsvBody });
        if (error) throw error;
        result = data as typeof result;
      } else if (reportType === 'intelipar') {
        const { data, error } = await supabase.functions.invoke('parse-intelipar-csv', { body: commonCsvBody });
        if (error) throw error;
        result = data as typeof result;
      } else if (reportType === 'cost_fluctuation') {
        const { data, error } = await supabase.functions.invoke('parse-cost-fluctuation-csv', { body: commonCsvBody });
        if (error) throw error;
        result = data as typeof result;
      } else if (reportType === 'inventory_csv') {
        const { data, error } = await supabase.functions.invoke('parse-inventory-csv-v2', { body: commonCsvBody });
        if (error) throw error;
        result = data as typeof result;
      } else {
        throw new Error(`No parser wired up for ${reportType}.`);
      }

      const rows = result.rows_imported ?? 0;
      updateItem(item.id, { status: 'done', rowsImported: rows });
      toast({ title: 'Upload complete', description: `${rows.toLocaleString()} rows from ${item.file.name}` });

      queryClient.invalidateQueries({ queryKey: ['inventory-reports'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-latest-report'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['drink-mix-summary'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary-variance'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-intelipar'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-cost-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-station-stock'] });
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Upload failed';
      const context = (err as { context?: { error?: string } } | null)?.context;
      if (context?.error) msg = context.error;
      updateItem(item.id, { status: 'error', errorMessage: msg });
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    }
  }, [queryClient, toast]);

  const confirmAllReady = () => {
    queue.filter(q => q.status === 'ready').forEach(q => { void confirmItem(q); });
  };

  const readyCount = queue.filter(q => q.status === 'ready').length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upload Sculpture Report
          </CardTitle>
          <CardDescription>
            Drop one or many CSV files exported from Sculpture Hospitality. We auto-detect the report type,
            venue, and date range — confirm to upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drop CSV files here, or click to choose
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Detailed Variance, Summary Variance, Drink Mix, InteliPar, Cost Fluctuation, Inventory (CSV) supported · multiple files OK
            </p>
          </div>

          {readyCount > 0 && (
            <div className="flex justify-end">
              <Button onClick={confirmAllReady} size="sm">
                Confirm All Ready ({readyCount})
              </Button>
            </div>
          )}

          {queue.length > 0 && (
            <div className="space-y-2">
              {queue.map(item => (
                <QueueRow
                  key={item.id}
                  item={item}
                  venues={venues}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onConfirm={() => confirmItem(item)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          )}

          {queue.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              No files queued yet.
            </p>
          )}
        </CardContent>
      </Card>

      <SculptureSiteMappingPanel />
    </div>
  );
};

interface QueueRowProps {
  item: QueueItem;
  venues: { id: string; name: string }[];
  onUpdate: (patch: Partial<QueueItem>) => void;
  onConfirm: () => void;
  onRemove: () => void;
}

const QueueRow = ({ item, venues, onUpdate, onConfirm, onRemove }: QueueRowProps) => {
  const det = item.detection;
  const sizeKb = (item.file.size / 1024).toFixed(1);
  const isInventoryCsv = det?.report_type === 'inventory_csv';

  return (
    <div className="border border-border/40 rounded-lg p-3 bg-muted/20 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <FileSpreadsheet className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {sizeKb} KB
              {det && det.row_count > 0 && <> · {det.row_count.toLocaleString()} rows</>}
              {det && <> · <Badge variant="outline" className="text-xs">{det.report_label}</Badge></>}
              {det?.sculpture_site_id && (
                <> · Site ID <span className="font-mono">{det.sculpture_site_id}</span>
                  {det.venue_name ? <> → {det.venue_name}</> : null}
                </>
              )}
              {isInventoryCsv && det?.snapshot_date && <> · Snapshot {det.snapshot_date}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={item.status} />
          {(item.status === 'done' || item.status === 'error' || item.status === 'unsupported' || item.status === 'ready') && (
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {item.status === 'unsupported' && det?.not_supported_reason && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-yellow-500/5 border border-yellow-500/20 rounded-md p-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-500" />
          <span>{det.not_supported_reason}</span>
        </div>
      )}
      {item.status === 'error' && item.errorMessage && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{item.errorMessage}</span>
        </div>
      )}
      {item.status === 'done' && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/5 border border-green-500/20 rounded-md p-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{(item.rowsImported ?? 0).toLocaleString()} rows imported.</span>
        </div>
      )}

      {isInventoryCsv && det?.site_id_hint && !item.venueId && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-yellow-500/5 border border-yellow-500/20 rounded-md p-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-yellow-500" />
          <span>{det.site_id_hint}</span>
        </div>
      )}

      {(item.status === 'ready' || item.status === 'uploading' || item.status === 'error') && det?.supported && (
        <div className={`grid grid-cols-1 ${isInventoryCsv ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-2`}>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Venue</label>
            <Select
              value={item.venueId}
              onValueChange={(v) => onUpdate({ venueId: v })}
              disabled={item.status === 'uploading'}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {det.venue_token_from_filename && !item.venueId && !isInventoryCsv && (
              <p className="text-[10px] text-muted-foreground">From filename: "{det.venue_token_from_filename}" — no match</p>
            )}
          </div>
          {isInventoryCsv ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Snapshot Date</label>
              <Input
                type="date"
                value={item.periodStart}
                onChange={e => onUpdate({ periodStart: e.target.value, periodEnd: e.target.value })}
                disabled={item.status === 'uploading'}
                className="h-9 text-sm"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Period Start</label>
                <Input
                  type="date"
                  value={item.periodStart}
                  onChange={e => onUpdate({ periodStart: e.target.value })}
                  disabled={item.status === 'uploading'}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Period End</label>
                <Input
                  type="date"
                  value={item.periodEnd}
                  onChange={e => onUpdate({ periodEnd: e.target.value })}
                  disabled={item.status === 'uploading'}
                  className="h-9 text-sm"
                />
              </div>
            </>
          )}
          <div className={`${isInventoryCsv ? 'md:col-span-2' : 'md:col-span-3'} flex justify-end`}>
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={item.status === 'uploading' || !item.venueId || !item.periodStart || !item.periodEnd}
            >
              {item.status === 'uploading' ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              ) : (
                <>Confirm &amp; Upload</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge = ({ status }: { status: QueueStatus }) => {
  switch (status) {
    case 'detecting':
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Detecting</Badge>;
    case 'ready':
      return <Badge variant="outline" className="gap-1 border-primary/40 text-primary"><Clock className="h-3 w-3" />Ready</Badge>;
    case 'unsupported':
      return <Badge variant="outline" className="gap-1 border-yellow-500/40 text-yellow-600"><AlertCircle className="h-3 w-3" />Not yet supported</Badge>;
    case 'uploading':
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Uploading</Badge>;
    case 'done':
      return <Badge variant="outline" className="gap-1 border-green-500/40 text-green-600"><CheckCircle2 className="h-3 w-3" />Done</Badge>;
    case 'error':
      return <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive"><XCircle className="h-3 w-3" />Error</Badge>;
  }
};
