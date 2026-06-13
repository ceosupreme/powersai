import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EditBarDialog } from './EditBarDialog';

interface Bar {
  id: string;
  name: string;
  bar_code: string | null;
  address: string | null;
  timezone: string | null;
  is_active: boolean | null;
  toast_restaurant_guid: string | null;
  asana_gm_log_task_gid: string | null;
  asana_lead_log_task_gid: string | null;
  google_place_id: string | null;
  task_source: string | null;
  created_at: string;
  user_count?: number;
  last_sync?: string | null;
}

const TIMEZONES_LABEL: Record<string, string> = {
  'America/New_York': 'Eastern',
  'America/Chicago': 'Central',
  'America/Denver': 'Mountain',
  'America/Los_Angeles': 'Pacific',
  'America/Phoenix': 'Arizona',
  'Pacific/Honolulu': 'Hawaii',
};

export const SettingsBarsTab = () => {
  const [bars, setBars] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBar, setEditingBar] = useState<Bar | null>(null);

  const fetchBars = async () => {
    setIsLoading(true);
    try {
      const [{ data: barsData, error: barsErr }, { data: profiles, error: profErr }] = await Promise.all([
        supabase.from('venues').select('*').order('name'),
        supabase.from('profiles').select('assigned_bar_id'),
      ]);
      if (barsErr) throw barsErr;
      if (profErr) throw profErr;

      const barIds = (barsData || []).map(b => b.id);
      const syncMap = new Map<string, string>();
      if (barIds.length > 0) {
        const { data: syncData } = await supabase
          .from('sync_runs')
          .select('bar_id, completed_at')
          .in('bar_id', barIds)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });
        syncData?.forEach(s => {
          if (!syncMap.has(s.bar_id)) syncMap.set(s.bar_id, s.completed_at!);
        });
      }

      const countMap = new Map<string, number>();
      profiles?.forEach(p => {
        if (p.assigned_bar_id) countMap.set(p.assigned_bar_id, (countMap.get(p.assigned_bar_id) || 0) + 1);
      });

      setBars((barsData || []).map(bar => ({
        ...bar,
        user_count: countMap.get(bar.id) || 0,
        last_sync: syncMap.get(bar.id) || null,
      })));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load venues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBars(); }, []);

  const openDialog = (bar?: Bar) => {
    setEditingBar(bar || null);
    setIsDialogOpen(true);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold">Venues</CardTitle>
        <Button onClick={() => openDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Add Project
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="rounded-md border border-border overflow-x-auto -mx-3 sm:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground text-xs">Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs hidden md:table-cell">Code</TableHead>
                  <TableHead className="text-muted-foreground text-xs">Status</TableHead>
                  <TableHead className="text-muted-foreground text-xs hidden lg:table-cell">Timezone</TableHead>
                  <TableHead className="text-muted-foreground text-xs hidden md:table-cell">Last Sync</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bars.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No venues yet.</TableCell></TableRow>
                ) : bars.map(bar => (
                  <TableRow key={bar.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-sm py-3">
                      {bar.name}
                      <span className="text-muted-foreground text-xs ml-2">({bar.user_count} users)</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono hidden md:table-cell">{bar.bar_code || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={bar.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                        {bar.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                      {TIMEZONES_LABEL[bar.timezone || ''] || bar.timezone || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                      {bar.last_sync ? formatDistanceToNow(new Date(bar.last_sync), { addSuffix: true }) : 'Never'}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <Button size="sm" variant="ghost" onClick={() => openDialog(bar)} className="h-8 px-3 gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <EditBarDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingBar={editingBar}
        onSaved={fetchBars}
        onDeleted={fetchBars}
      />
    </Card>
  );
};
