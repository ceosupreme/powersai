import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Building2, Plug, UserPlus, Settings as SettingsIcon, Loader2, Search,
  Plus, Trash2, Star, Zap, Info, BookUser, Phone, Mail, StickyNote, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { AsanaLogSourcesEditor } from './AsanaLogSourcesEditor';
import { ProjectPillarOverridesPanel } from './ProjectPillarOverridesPanel';
import type { ProjectType } from '@/lib/effectivePillars';

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
  project_type?: ProjectType | null;
  created_at: string;
  user_count?: number;
  last_sync?: string | null;
}

interface FormData {
  name: string;
  bar_code: string;
  address: string;
  timezone: string;
  is_active: boolean;
  toast_restaurant_guid: string;
  asana_project_gid: string;
  asana_score_section_gid: string;
  asana_score_assignee_gid: string;
  asana_write_project_gid: string;
  asana_write_section_gid: string;
  google_place_id: string;
  task_source: string;
  project_type: ProjectType;
}

interface VenueLeader {
  id: string;
  venue_id: string;
  display_name: string;
  role_type: string;
  asana_gid: string;
  profile_id: string | null;
  is_primary: boolean;
  is_active: boolean;
}

interface VenueContact {
  id: string;
  venue_id: string;
  name: string;
  role_label: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
}

const CONTACT_ROLE_SUGGESTIONS = [
  'Plumber', 'Electrician', 'Maintenance', 'HVAC', 'Beverage Rep',
  'Marketing', 'Pest Control', 'Police (non-emergency)', 'General Contractor', 'Other',
];

interface PlaceSearchResult {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  rating: number | null;
  user_ratings_total: number | null;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (New York)' },
  { value: 'America/Chicago', label: 'Central (Chicago)' },
  { value: 'America/Denver', label: 'Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Phoenix', label: 'Arizona (Phoenix)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
];

const defaultForm: FormData = {
  name: '',
  bar_code: '',
  address: '',
  timezone: 'America/Los_Angeles',
  is_active: true,
  toast_restaurant_guid: '',
  asana_project_gid: '',
  asana_score_section_gid: '',
  asana_score_assignee_gid: '',
  asana_write_project_gid: '',
  asana_write_section_gid: '',
  google_place_id: '',
  task_source: 'none',
  project_type: 'client',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBar: Bar | null;
  onSaved: () => void;
  onDeleted?: () => void;
}

export const EditBarDialog = ({ open, onOpenChange, editingBar, onSaved, onDeleted }: Props) => {
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [venueLeaders, setVenueLeaders] = useState<VenueLeader[]>([]);
  const [newLeaderName, setNewLeaderName] = useState('');
  const [newLeaderRole, setNewLeaderRole] = useState<string>('lead_staff');
  const [newLeaderAsanaGid, setNewLeaderAsanaGid] = useState('');

  const [venueContacts, setVenueContacts] = useState<VenueContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactNote, setNewContactNote] = useState('');

  const [searchingPlace, setSearchingPlace] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([]);

  const set = (key: keyof FormData, val: any) => setFormData(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (!open) return;
    setActiveTab('basic');
    setFormData(editingBar ? {
      name: editingBar.name,
      bar_code: editingBar.bar_code || '',
      address: editingBar.address || '',
      timezone: editingBar.timezone || 'America/Los_Angeles',
      is_active: editingBar.is_active !== false,
      toast_restaurant_guid: editingBar.toast_restaurant_guid || '',
      asana_project_gid: (editingBar as any).asana_project_gid || '',
      asana_score_section_gid: (editingBar as any).asana_score_section_gid || '',
      asana_score_assignee_gid: (editingBar as any).asana_score_assignee_gid || '',
      asana_write_project_gid: (editingBar as any).asana_write_project_gid || '',
      asana_write_section_gid: (editingBar as any).asana_write_section_gid || '',
      google_place_id: editingBar.google_place_id || '',
      task_source: editingBar.task_source || 'none',
      project_type: (editingBar.project_type as ProjectType) || 'client',
    } : defaultForm);
    setPlaceResults([]);
    setVenueLeaders([]);
    setNewLeaderName('');
    setNewLeaderRole('lead_staff');
    setNewLeaderAsanaGid('');
    setVenueContacts([]);
    setNewContactName('');
    setNewContactRole('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactNote('');
    if (editingBar) {
      fetchVenueLeaders(editingBar.id);
      fetchVenueContacts(editingBar.id);
    }
  }, [open, editingBar]);

  const fetchVenueLeaders = async (venueId: string) => {
    const { data } = await supabase
      .from('venue_leadership_contacts')
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });
    setVenueLeaders((data || []) as VenueLeader[]);
  };

  const addVenueLeader = async () => {
    if (!editingBar || !newLeaderName.trim()) return;
    const { error } = await supabase.from('venue_leadership_contacts').insert({
      venue_id: editingBar.id,
      display_name: newLeaderName.trim(),
      role_type: newLeaderRole,
      asana_gid: newLeaderAsanaGid.trim() || null,
    });
    if (error) { toast.error('Failed to add leader'); return; }
    toast.success('Leader added');
    setNewLeaderName('');
    setNewLeaderAsanaGid('');
    fetchVenueLeaders(editingBar.id);
  };

  const removeVenueLeader = async (leaderId: string) => {
    const { error } = await supabase.from('venue_leadership_contacts').update({ is_active: false }).eq('id', leaderId);
    if (error) { toast.error('Failed to remove leader'); return; }
    setVenueLeaders(prev => prev.filter(l => l.id !== leaderId));
  };

  const fetchVenueContacts = async (venueId: string) => {
    const { data, error } = await supabase
      .from('venue_contacts' as any)
      .select('*')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) { console.error('[venue_contacts] fetch', error); return; }
    setVenueContacts((data || []) as unknown as VenueContact[]);
  };

  const addVenueContact = async () => {
    if (!editingBar) return;
    const name = newContactName.trim();
    const role = newContactRole.trim();
    const phone = newContactPhone.trim();
    const email = newContactEmail.trim();
    const note = newContactNote.trim();
    if (!name || !role) { toast.error('Name and role are required'); return; }
    if (!phone && !email) { toast.error('Provide a phone or email'); return; }
    const { error } = await supabase.from('venue_contacts' as any).insert({
      venue_id: editingBar.id,
      name,
      role_label: role,
      phone: phone || null,
      email: email || null,
      note: note || null,
    });
    if (error) { toast.error('Failed to add contact'); return; }
    toast.success('Contact added');
    setNewContactName('');
    setNewContactRole('');
    setNewContactPhone('');
    setNewContactEmail('');
    setNewContactNote('');
    fetchVenueContacts(editingBar.id);
  };

  const removeVenueContact = async (contactId: string) => {
    const { error } = await supabase.from('venue_contacts' as any).update({ is_active: false }).eq('id', contactId);
    if (error) { toast.error('Failed to remove contact'); return; }
    setVenueContacts(prev => prev.filter(c => c.id !== contactId));
  };

  const searchGooglePlace = async () => {
    const query = [formData.name, formData.address].filter(Boolean).join(' ');
    if (!query.trim()) { toast.error('Enter a venue name or address first'); return; }
    setSearchingPlace(true);
    setPlaceResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('search-google-place', { body: { query: query.trim() } });
      if (error) throw error;
      if (data.error && (!data.results || data.results.length === 0)) {
        toast.error(data.error);
        return;
      }
      setPlaceResults(data.results || []);
      if (data.results?.length === 0) toast.info('No results found');
    } catch {
      toast.error('Place search failed');
    } finally {
      setSearchingPlace(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.bar_code.trim()) {
      toast.error('Name and bar code are required');
      setActiveTab('basic');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        bar_code: formData.bar_code.trim(),
        address: formData.address.trim() || null,
        timezone: formData.timezone,
        is_active: formData.is_active,
        toast_restaurant_guid: formData.toast_restaurant_guid.trim() || null,
        asana_project_gid: formData.asana_project_gid.trim() || null,
        asana_score_section_gid: formData.asana_score_section_gid.trim() || null,
        asana_score_assignee_gid: formData.asana_score_assignee_gid.trim() || null,
        asana_write_project_gid: formData.asana_write_project_gid.trim() || null,
        asana_write_section_gid: formData.asana_write_section_gid.trim() || null,
        google_place_id: formData.google_place_id.trim() || null,
        task_source: formData.task_source,
        project_type: formData.project_type,
      };
      if (editingBar) {
        const { error } = await supabase.from('venues').update(payload).eq('id', editingBar.id);
        if (error) throw error;
        await supabase.from('profiles').update({ assigned_bar_name: payload.name }).eq('assigned_bar_id', editingBar.id);
        toast.success('Venue updated');
      } else {
        const { error } = await supabase.from('venues').insert(payload);
        if (error) throw error;
        toast.success('Venue created');
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save venue');
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!editingBar) return;
    if (!confirm(`Delete "${editingBar.name}"? This cannot be undone.`)) return;
    try {
      await supabase.from('profiles').update({ assigned_bar_id: null, assigned_bar_name: null }).eq('assigned_bar_id', editingBar.id);
      const { error } = await supabase.from('venues').delete().eq('id', editingBar.id);
      if (error) throw error;
      toast.success('Venue deleted');
      onOpenChange(false);
      onDeleted?.();
    } catch { toast.error('Failed to delete venue'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border mx-4 sm:mx-auto max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {editingBar ? `Edit ${editingBar.name}` : 'Add New Venue'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editingBar ? 'Update venue details, integrations, and leadership.' : 'Configure a new venue location.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 border-b border-border">
              <TabsList className="bg-muted/40 grid grid-cols-6 w-full">
                <TabsTrigger value="basic" className="gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5" /> Basic
                </TabsTrigger>
                <TabsTrigger value="integrations" className="gap-1.5 text-xs">
                  <Plug className="h-3.5 w-3.5" /> Integrations
                </TabsTrigger>
                <TabsTrigger value="leadership" className="gap-1.5 text-xs" disabled={!editingBar}>
                  <UserPlus className="h-3.5 w-3.5" /> Leadership
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-1.5 text-xs" disabled={!editingBar}>
                  <BookUser className="h-3.5 w-3.5" /> Contacts
                </TabsTrigger>
                <TabsTrigger value="pillars" className="gap-1.5 text-xs" disabled={!editingBar}>
                  <Layers className="h-3.5 w-3.5" /> Pillars
                </TabsTrigger>
                <TabsTrigger value="advanced" className="gap-1.5 text-xs">
                  <SettingsIcon className="h-3.5 w-3.5" /> Advanced
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ── BASIC ───────────────────────────────────────── */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" /> Venue Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Venue Name <span className="text-destructive">*</span></Label>
                      <Input id="name" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Club Marina" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="bar_code">Bar Code <span className="text-destructive">*</span></Label>
                        <Input id="bar_code" value={formData.bar_code} onChange={e => set('bar_code', e.target.value)} placeholder="e.g. CM" className="font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-background">
                          <Switch checked={formData.is_active} onCheckedChange={v => set('is_active', v)} />
                          <span className="text-sm">{formData.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" value={formData.address} onChange={e => set('address', e.target.value)} placeholder="Street, City, State" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Timezone</Label>
                      <Select value={formData.timezone} onValueChange={v => set('timezone', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Project Type</Label>
                      <Select
                        value={formData.project_type}
                        onValueChange={(v) => set('project_type', v as ProjectType)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="content_channel">Content Channel</SelectItem>
                          <SelectItem value="internal_brand">Internal Brand</SelectItem>
                          <SelectItem value="app_build">App Build</SelectItem>
                          <SelectItem value="service_offer">Service Offer</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Drives which pillar template this project inherits. Changing this does not delete existing data.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── INTEGRATIONS ───────────────────────────────── */}
              <TabsContent value="integrations" className="mt-0 space-y-4">
                {/* Task Source */}
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Task Completion Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={formData.task_source} onValueChange={v => set('task_source', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="7shifts">7shifts</SelectItem>
                        <SelectItem value="asana">Asana</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">Which system provides task completion data for scoring this venue.</p>
                  </CardContent>
                </Card>

                {/* Toast */}
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" /> Toast POS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      <Label htmlFor="toast_guid">Restaurant GUID</Label>
                      <Input
                        id="toast_guid"
                        value={formData.toast_restaurant_guid}
                        onChange={e => set('toast_restaurant_guid', e.target.value)}
                        placeholder="From Toast setup"
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">Required for sales, KDS, and labor data sync.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Google */}
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" /> Google
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="google_place_id">Google Place ID</Label>
                      <div className="flex gap-2">
                        <Input
                          id="google_place_id"
                          value={formData.google_place_id}
                          onChange={e => { set('google_place_id', e.target.value); setPlaceResults([]); }}
                          placeholder="e.g. ChIJ..."
                          className="font-mono text-xs"
                        />
                        <Button type="button" variant="outline" size="sm" className="h-10 px-3 shrink-0 gap-1.5" onClick={searchGooglePlace} disabled={searchingPlace}>
                          {searchingPlace ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          Find
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Required for automatic Google rating sync. Auto-search uses venue name + address.</p>
                    </div>
                    {placeResults.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Search Results — click to use:</p>
                        {placeResults.map((r) => (
                          <button
                            key={r.place_id}
                            type="button"
                            onClick={() => { set('google_place_id', r.place_id); setPlaceResults([]); toast.success(`Place ID set: ${r.name}`); }}
                            className="w-full text-left p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{r.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.formatted_address}</p>
                              </div>
                              {r.rating && (
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-semibold">⭐ {r.rating}</p>
                                  <p className="text-xs text-muted-foreground">{r.user_ratings_total?.toLocaleString()} reviews</p>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">{r.place_id}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Asana — Log Sources */}
                {editingBar ? (
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Plug className="h-4 w-4 text-muted-foreground" /> Asana — Log Sources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AsanaLogSourcesEditor venueId={editingBar.id} />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-muted/20 border-dashed border-border">
                    <CardContent className="py-4 text-xs text-muted-foreground text-center">
                      Save the venue first to configure Asana log sources.
                    </CardContent>
                  </Card>
                )}

                {/* Asana — Task Routing */}
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Plug className="h-4 w-4 text-muted-foreground" /> Asana — Task Routing (Scoring)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="asana_project_gid">Task Project GID</Label>
                      <Input id="asana_project_gid" value={formData.asana_project_gid}
                        onChange={e => set('asana_project_gid', e.target.value)}
                        placeholder="e.g. 1234567890123456" className="font-mono text-xs" />
                      <p className="text-xs text-muted-foreground">Asana project used for task completion scoring.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="asana_score_section_gid">Task Section GID (optional)</Label>
                      <Input id="asana_score_section_gid" value={formData.asana_score_section_gid}
                        onChange={e => set('asana_score_section_gid', e.target.value)}
                        placeholder="e.g. 1234567890123456" className="font-mono text-xs" />
                      <p className="text-xs text-muted-foreground">Optional section within the project.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="asana_score_assignee_gid">Task Assignee GID (optional)</Label>
                      <Input id="asana_score_assignee_gid" value={formData.asana_score_assignee_gid}
                        onChange={e => set('asana_score_assignee_gid', e.target.value)}
                        placeholder="e.g. 1234567890123456" className="font-mono text-xs" />
                      <p className="text-xs text-muted-foreground">Only count this person's tasks. Leave blank for all.</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Asana — Approved Action Destination */}
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Plug className="h-4 w-4 text-muted-foreground" /> Asana — Approved Action Destination
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Where approved insight actions land in Asana.</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="asana_write_project_gid">Destination Project GID</Label>
                      <Input id="asana_write_project_gid" value={formData.asana_write_project_gid}
                        onChange={e => set('asana_write_project_gid', e.target.value)}
                        placeholder="e.g. 1234567890123456" className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="asana_write_section_gid">Destination Section GID</Label>
                      <Input id="asana_write_section_gid" value={formData.asana_write_section_gid}
                        onChange={e => set('asana_write_section_gid', e.target.value)}
                        placeholder="e.g. 1234567890123456" className="font-mono text-xs" />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>To find an Asana GID: open the task/section/project in Asana and copy the number from the URL after <code className="font-mono">/0/</code>.</span>
                </div>
              </TabsContent>

              {/* ── LEADERSHIP ─────────────────────────────────── */}
              <TabsContent value="leadership" className="mt-0 space-y-4">
                {editingBar ? (
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-muted-foreground" /> Venue Leadership
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">GMs and lead staff for this venue. These appear in insight assignment dropdowns.</p>
                      {venueLeaders.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {venueLeaders.map((leader) => (
                            <div key={leader.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{leader.display_name}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {leader.role_type === 'gm' ? 'GM' : 'Lead Staff'}
                                </Badge>
                                {leader.asana_gid && (
                                  <span className="text-[10px] text-muted-foreground font-mono">{leader.asana_gid}</span>
                                )}
                              </div>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeVenueLeader(leader.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={newLeaderName}
                            onChange={e => setNewLeaderName(e.target.value)}
                            placeholder="Name"
                            className="text-sm"
                          />
                          <Select value={newLeaderRole} onValueChange={setNewLeaderRole}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gm">GM</SelectItem>
                              <SelectItem value="lead_staff">Lead Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={newLeaderAsanaGid}
                            onChange={e => setNewLeaderAsanaGid(e.target.value)}
                            placeholder="Asana GID (optional)"
                            className="font-mono text-xs"
                          />
                          <Button type="button" variant="outline" size="sm" className="shrink-0 h-10" onClick={addVenueLeader} disabled={!newLeaderName.trim()}>
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-muted/20 border-dashed border-border">
                    <CardContent className="py-4 text-xs text-muted-foreground text-center">
                      Save the venue first to add leadership contacts.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── CONTACTS ───────────────────────────────────── */}
              <TabsContent value="contacts" className="mt-0 space-y-4">
                {editingBar ? (
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <BookUser className="h-4 w-4 text-muted-foreground" /> Venue Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        External vendors and service contacts this venue relies on — plumber, electrician, beverage rep, non-emergency lines, etc.
                      </p>

                      {venueContacts.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {venueContacts.map((c) => (
                            <div key={c.id} className="flex items-start justify-between gap-2 p-2 rounded-lg border border-border bg-muted/30">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{c.name}</span>
                                  <Badge variant="secondary" className="text-[10px]">{c.role_label}</Badge>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                                  {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                                  {c.note && <span className="flex items-center gap-1"><StickyNote className="h-3 w-3" />{c.note}</span>}
                                </div>
                              </div>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive shrink-0" onClick={() => removeVenueContact(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={newContactName}
                            onChange={e => setNewContactName(e.target.value)}
                            placeholder="Name *"
                            className="text-sm"
                          />
                          <Input
                            value={newContactRole}
                            onChange={e => setNewContactRole(e.target.value)}
                            placeholder="Role / label *"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {CONTACT_ROLE_SUGGESTIONS.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setNewContactRole(s)}
                              className="px-2 py-0.5 text-[10px] rounded-full border border-border bg-background hover:bg-muted transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={newContactPhone}
                            onChange={e => setNewContactPhone(e.target.value)}
                            placeholder="Phone"
                            className="text-sm"
                          />
                          <Input
                            value={newContactEmail}
                            onChange={e => setNewContactEmail(e.target.value)}
                            placeholder="Email"
                            className="text-sm"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground -mt-1">Provide a phone or email (at least one).</p>
                        <div className="flex gap-2">
                          <Input
                            value={newContactNote}
                            onChange={e => setNewContactNote(e.target.value)}
                            placeholder="Note (optional)"
                            className="text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-10"
                            onClick={addVenueContact}
                            disabled={
                              !newContactName.trim() ||
                              !newContactRole.trim() ||
                              (!newContactPhone.trim() && !newContactEmail.trim())
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-muted/20 border-dashed border-border">
                    <CardContent className="py-4 text-xs text-muted-foreground text-center">
                      Save the venue first to add contacts.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── ADVANCED ───────────────────────────────────── */}
              <TabsContent value="advanced" className="mt-0 space-y-4">
                {editingBar && (
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <SettingsIcon className="h-4 w-4 text-muted-foreground" /> Diagnostics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last sync</span>
                        <span>{editingBar.last_sync ? formatDistanceToNow(new Date(editingBar.last_sync), { addSuffix: true }) : 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assigned users</span>
                        <span>{editingBar.user_count ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Venue ID</span>
                        <span className="font-mono">{editingBar.id}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {editingBar && (
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" /> Legacy Asana Fields
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        These fields have been migrated to the new <strong>Log Sources</strong> editor under Integrations.
                        They remain as a read-only fallback for backwards compatibility.
                      </p>
                      <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                        <div>GM Log Task: {(editingBar as any).asana_gm_log_task_gid || '—'}</div>
                        <div>Lead Log Task: {(editingBar as any).asana_lead_log_task_gid || '—'}</div>
                        <div>GM Log Section: {(editingBar as any).asana_gm_log_section_gid || '—'}</div>
                        <div>Log Project: {(editingBar as any).asana_log_project_gid || '—'}</div>
                        <div>Log Section: {(editingBar as any).asana_log_section_gid || '—'}</div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">Migrated to Log Sources</Badge>
                    </CardContent>
                  </Card>
                )}

                {editingBar && (
                  <Card className="bg-destructive/5 border-destructive/40">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-destructive">Danger Zone</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">Permanently delete this venue and unassign all users. This cannot be undone.</p>
                      <Button type="button" variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                        <Trash2 className="h-4 w-4" /> Delete Venue
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 px-6 py-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBar ? 'Save Changes' : 'Add Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
