import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Pencil, Trash2, CheckCircle2, XCircle, Plug } from 'lucide-react';
import { toast } from 'sonner';

interface Bar {
  id: string;
  name: string;
  address: string | null;
  created_at: string;
  asana_project_gid: string | null;
  asana_gm_log_task_gid: string | null;
  asana_lead_log_task_gid: string | null;
  asana_score_section_gid: string | null;
  asana_score_assignee_gid: string | null;
  asana_write_project_gid: string | null;
  asana_write_section_gid: string | null;
  seven_shifts_location_id: string | null;
  toast_restaurant_guid: string | null;
  user_count?: number;
}

export const BarsTab = () => {
  const [bars, setBars] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBar, setEditingBar] = useState<Bar | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    asana_project_gid: '',
    asana_gm_log_task_gid: '',
    asana_lead_log_task_gid: '',
    asana_score_section_gid: '',
    asana_score_assignee_gid: '',
    asana_write_project_gid: '',
    asana_write_section_gid: '',
    seven_shifts_location_id: '',
    toast_restaurant_guid: '',
    toast_client_id: '',
    toast_client_secret: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [testingProject, setTestingProject] = useState(false);
  const [testingGm, setTestingGm] = useState(false);
  const [testingLead, setTestingLead] = useState(false);
  const [projectTestResult, setProjectTestResult] = useState<{ success: boolean; name?: string; error?: string } | null>(null);
  const [gmTestResult, setGmTestResult] = useState<{ success: boolean; name?: string; error?: string } | null>(null);
  const [leadTestResult, setLeadTestResult] = useState<{ success: boolean; name?: string; error?: string } | null>(null);

  const fetchBars = async () => {
    setIsLoading(true);
    try {
      const { data: barsData, error: barsError } = await supabase
        .from('venues')
        .select('*')
        .order('name');
      if (barsError) throw barsError;

      const { data: venueAssignments, error: vaError } = await supabase
        .from('venue_assignments')
        .select('venue_id');
      if (vaError) throw vaError;

      const barUserCounts = new Map<string, number>();
      venueAssignments?.forEach((va) => {
        barUserCounts.set(va.venue_id, (barUserCounts.get(va.venue_id) || 0) + 1);
      });

      setBars((barsData || []).map((bar) => ({
        ...bar,
        user_count: barUserCounts.get(bar.id) || 0,
      })));
    } catch (error) {
      console.error('Error fetching bars:', error);
      toast.error('Failed to load bars');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBars(); }, []);

  const openAddDialog = () => {
    setEditingBar(null);
    setFormData({ name: '', address: '', asana_project_gid: '', asana_gm_log_task_gid: '', asana_lead_log_task_gid: '', asana_score_section_gid: '', asana_score_assignee_gid: '', asana_write_project_gid: '', asana_write_section_gid: '', seven_shifts_location_id: '', toast_restaurant_guid: '', toast_client_id: '', toast_client_secret: '' });
    setProjectTestResult(null);
    setGmTestResult(null);
    setLeadTestResult(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (bar: Bar) => {
    setEditingBar(bar);
    setFormData({
      name: bar.name,
      address: bar.address || '',
      asana_project_gid: bar.asana_project_gid || '',
      asana_gm_log_task_gid: bar.asana_gm_log_task_gid || '',
      asana_lead_log_task_gid: bar.asana_lead_log_task_gid || '',
      asana_score_section_gid: (bar as any).asana_score_section_gid || '',
      asana_score_assignee_gid: (bar as any).asana_score_assignee_gid || '',
      asana_write_project_gid: (bar as any).asana_write_project_gid || '',
      asana_write_section_gid: (bar as any).asana_write_section_gid || '',
      seven_shifts_location_id: bar.seven_shifts_location_id || '',
      toast_restaurant_guid: bar.toast_restaurant_guid || '',
      toast_client_id: (bar as any).toast_client_id || '',
      toast_client_secret: (bar as any).toast_client_secret || '',
    });
    setProjectTestResult(null);
    setGmTestResult(null);
    setLeadTestResult(null);
    setIsDialogOpen(true);
  };

  const testConnection = async (type: 'project' | 'gm' | 'lead') => {
    if (type === 'project') {
      const gid = formData.asana_project_gid.trim();
      if (!gid) { toast.error('Enter a Project GID first'); return; }
      setTestingProject(true);
      setProjectTestResult(null);
      try {
        const { data, error } = await supabase.functions.invoke('test-asana-connection', {
          body: { type: 'project', gid },
        });
        if (error) throw error;
        setProjectTestResult(data);
      } catch {
        setProjectTestResult({ success: false, error: 'Connection failed' });
      } finally {
        setTestingProject(false);
      }
      return;
    }

    const gid = type === 'gm' ? formData.asana_gm_log_task_gid : formData.asana_lead_log_task_gid;
    if (!gid.trim()) {
      toast.error('Enter a Task GID first');
      return;
    }
    const setTesting = type === 'gm' ? setTestingGm : setTestingLead;
    const setResult = type === 'gm' ? setGmTestResult : setLeadTestResult;
    setTesting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-asana-connection', {
        body: { task_gid: gid.trim() },
      });
      if (error) throw error;
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Bar name is required');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        asana_project_gid: formData.asana_project_gid.trim() || null,
        asana_gm_log_task_gid: formData.asana_gm_log_task_gid.trim() || null,
        asana_lead_log_task_gid: formData.asana_lead_log_task_gid.trim() || null,
        asana_score_section_gid: formData.asana_score_section_gid.trim() || null,
        asana_score_assignee_gid: formData.asana_score_assignee_gid.trim() || null,
        asana_write_project_gid: formData.asana_write_project_gid.trim() || null,
        asana_write_section_gid: formData.asana_write_section_gid.trim() || null,
        seven_shifts_location_id: formData.seven_shifts_location_id.trim() || null,
        toast_restaurant_guid: formData.toast_restaurant_guid.trim() || null,
        toast_client_id: formData.toast_client_id.trim() || null,
        toast_client_secret: formData.toast_client_secret.trim() || null,
      };

      if (editingBar) {
        const { error } = await supabase.from('venues').update(payload).eq('id', editingBar.id);
        if (error) throw error;
        await supabase.from('profiles').update({ assigned_bar_name: payload.name }).eq('assigned_bar_id', editingBar.id);
        toast.success('Bar updated successfully');
      } else {
        const { error } = await supabase.from('venues').insert(payload);
        if (error) throw error;
        toast.success('Bar created successfully');
      }
      setIsDialogOpen(false);
      fetchBars();
    } catch (error) {
      console.error('Error saving bar:', error);
      toast.error('Failed to save bar');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBar = async (bar: Bar) => {
    if (!confirm(`Are you sure you want to delete "${bar.name}"? This cannot be undone.`)) return;
    try {
      await supabase.from('profiles').update({ assigned_bar_id: null, assigned_bar_name: null }).eq('assigned_bar_id', bar.id);
      const { error } = await supabase.from('venues').delete().eq('id', bar.id);
      if (error) throw error;
      toast.success('Bar deleted successfully');
      fetchBars();
    } catch (error) {
      console.error('Error deleting bar:', error);
      toast.error('Failed to delete bar');
    }
  };

  const renderTestResult = (result: { success: boolean; name?: string; error?: string } | null) => {
    if (!result) return null;
    const taskName = result.name || (result as any).task_name;
    return result.success ? (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="truncate">Connected: {taskName}</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
        <XCircle className="h-3.5 w-3.5" />
        <span>{result.error}</span>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <CardTitle className="text-base sm:text-lg font-semibold">Bars / Locations</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Bar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border mx-4 sm:mx-auto max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBar ? 'Edit Bar' : 'Add New Bar'}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editingBar ? 'Update the bar details below.' : 'Enter the details for the new bar location.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Enter bar name" className="bg-background border-border h-10" />
                </div>
                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} placeholder="Enter address (optional)" className="bg-background border-border h-10" />
                </div>

                {/* Asana Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Asana Log Integration</span>
                  </div>

                  {/* Asana Project GID (full project sync) */}
                  <div className="space-y-2">
                    <Label htmlFor="project_gid">Asana Project GID (syncs entire project)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="project_gid"
                        value={formData.asana_project_gid}
                        onChange={(e) => { setFormData((p) => ({ ...p, asana_project_gid: e.target.value })); setProjectTestResult(null); }}
                        placeholder="e.g. 1234567890123456"
                        className="bg-background border-border h-10 font-mono text-xs"
                      />
                      <Button type="button" variant="outline" size="sm" className="h-10 px-3 shrink-0" onClick={() => testConnection('project')} disabled={testingProject}>
                        {testingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                      </Button>
                    </div>
                    {renderTestResult(projectTestResult)}
                    <p className="text-xs text-muted-foreground">Syncs all sections/tasks from this project. Skips GM/Lead tasks below to avoid duplicates.</p>
                  </div>

                  {/* GM Log Task GID */}
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="gm_gid">GM Log Task GID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="gm_gid"
                        value={formData.asana_gm_log_task_gid}
                        onChange={(e) => { setFormData((p) => ({ ...p, asana_gm_log_task_gid: e.target.value })); setGmTestResult(null); }}
                        placeholder="e.g. 1234567890123456"
                        className="bg-background border-border h-10 font-mono text-xs"
                      />
                      <Button type="button" variant="outline" size="sm" className="h-10 px-3 shrink-0" onClick={() => testConnection('gm')} disabled={testingGm}>
                        {testingGm ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                      </Button>
                    </div>
                    {renderTestResult(gmTestResult)}
                  </div>

                  {/* Lead Log Task GID */}
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="lead_gid">Lead Log Task GID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="lead_gid"
                        value={formData.asana_lead_log_task_gid}
                        onChange={(e) => { setFormData((p) => ({ ...p, asana_lead_log_task_gid: e.target.value })); setLeadTestResult(null); }}
                        placeholder="e.g. 1234567890123456"
                        className="bg-background border-border h-10 font-mono text-xs"
                      />
                      <Button type="button" variant="outline" size="sm" className="h-10 px-3 shrink-0" onClick={() => testConnection('lead')} disabled={testingLead}>
                        {testingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                      </Button>
                    </div>
                    {renderTestResult(leadTestResult)}
                    <p className="text-xs text-muted-foreground mt-1">⚠️ Lead Log Task GID needs to be updated monthly when a new task is created</p>
                  </div>
                </div>

                {/* Asana Task Routing Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Asana Task Routing</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="score_section_gid">Score Section GID</Label>
                    <Input
                      id="score_section_gid"
                      value={formData.asana_score_section_gid}
                      onChange={(e) => setFormData((p) => ({ ...p, asana_score_section_gid: e.target.value }))}
                      placeholder="e.g. 1234567890123456"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Only count tasks in this section for the weekly task completion score. Leave blank to count all project tasks.</p>
                  </div>

                  <div className="space-y-2 mt-3">
                    <Label htmlFor="score_assignee_gid">Score Assignee GID</Label>
                    <Input
                      id="score_assignee_gid"
                      value={formData.asana_score_assignee_gid}
                      onChange={(e) => setFormData((p) => ({ ...p, asana_score_assignee_gid: e.target.value }))}
                      placeholder="e.g. 1234567890123456"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Only count this person's tasks for the weekly score. Leave blank to count all.</p>
                  </div>

                  <div className="space-y-2 mt-3">
                    <Label htmlFor="write_project_gid">Write Project GID</Label>
                    <Input
                      id="write_project_gid"
                      value={formData.asana_write_project_gid}
                      onChange={(e) => setFormData((p) => ({ ...p, asana_write_project_gid: e.target.value }))}
                      placeholder="e.g. 1234567890123456"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Asana project to create action items in for this venue. Falls back to the Project GID above if blank.</p>
                  </div>

                  <div className="space-y-2 mt-3">
                    <Label htmlFor="write_section_gid">Write Section GID</Label>
                    <Input
                      id="write_section_gid"
                      value={formData.asana_write_section_gid}
                      onChange={(e) => setFormData((p) => ({ ...p, asana_write_section_gid: e.target.value }))}
                      placeholder="e.g. 1234567890123456"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Section within the write project to place new tasks.</p>
                  </div>
                </div>

                {/* Toast POS Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Toast POS Integration</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toast_restaurant_guid">Restaurant GUID</Label>
                    <Input
                      id="toast_restaurant_guid"
                      value={formData.toast_restaurant_guid}
                      onChange={(e) => setFormData((p) => ({ ...p, toast_restaurant_guid: e.target.value }))}
                      placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">The Restaurant GUID from Toast POS for this venue. Find it in Toast Admin → Restaurant Info.</p>
                  </div>

                  {/* Per-venue Toast Credentials (optional override) */}
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="toast_client_id">Client ID (optional override)</Label>
                    <Input
                      id="toast_client_id"
                      value={formData.toast_client_id}
                      onChange={(e) => setFormData((p) => ({ ...p, toast_client_id: e.target.value }))}
                      placeholder="Leave blank to use global credentials"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="toast_client_secret">Client Secret (optional override)</Label>
                    <Input
                      id="toast_client_secret"
                      type="password"
                      value={formData.toast_client_secret}
                      onChange={(e) => setFormData((p) => ({ ...p, toast_client_secret: e.target.value }))}
                      placeholder="Leave blank to use global credentials"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Only set these if this venue uses different Toast API credentials than the global default.</p>
                  </div>
                </div>

                {/* 7shifts Section */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Plug className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">7shifts Integration</span>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seven_shifts_location_id">Location ID</Label>
                    <Input
                      id="seven_shifts_location_id"
                      value={formData.seven_shifts_location_id}
                      onChange={(e) => setFormData((p) => ({ ...p, seven_shifts_location_id: e.target.value }))}
                      placeholder="e.g. 280312"
                      className="bg-background border-border h-10 font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">The numeric location ID from 7shifts for this venue</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingBar ? 'Save Changes' : 'Add Bar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-x-auto -mx-3 sm:mx-0">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">Address</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm">Users</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      No bars created yet. Add your first bar to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  bars.map((bar) => (
                    <TableRow key={bar.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-xs sm:text-sm py-3">{bar.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">{bar.address || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm py-3">{bar.user_count || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">{new Date(bar.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(bar)} className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteBar(bar)} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};