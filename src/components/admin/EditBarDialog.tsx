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
  Plus, Trash2, Star, Zap, Info, BookUser, Phone, Mail, StickyNote, Layers, Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { AsanaLogSourcesEditor } from './AsanaLogSourcesEditor';
import { ProjectPillarOverridesPanel } from './ProjectPillarOverridesPanel';
import { ProjectLeakVectorOverridesPanel } from './ProjectLeakVectorOverridesPanel';
import { ProjectQualifierOverridesPanel } from './ProjectQualifierOverridesPanel';
import type { ProjectType } from '@/lib/effectivePillars';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import type { ProjectSetupProposal } from '@/hooks/useLeadProposal';

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

/** Derive a default bar_code from a venue name (uppercase initials, fallback prefix). */
function deriveBarCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.slice(0, 4).map((w) => w[0]).join('').toUpperCase();
}

/**
 * Derive a URL-safe slug from a venue name for the public /q/:venueSlug
 * qualifier page. Auto-stamped on save when the venue has no slug yet so
 * every client gets a usable intake URL without a separate admin step.
 */
function deriveVenueSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Pick a slug that doesn't collide with an existing venue. Appends -2, -3 …
 * until a free one is found. Bounded loop — never blocks save indefinitely.
 */
async function pickUniqueSlug(base: string, ignoreId?: string): Promise<string | null> {
  if (!base) return null;
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await supabase
      .from('venues')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data || (ignoreId && (data as any).id === ignoreId)) return candidate;
  }
  return null;
}

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
  onSaved: (newVenueId?: string) => void;
  onDeleted?: () => void;
  /** When creating a new venue, optionally pre-fill from a lead proposal. */
  initialProposal?: ProjectSetupProposal | null;
  /** Stamped onto `venues.source_lead_id` for the new venue. */
  sourceLeadId?: string | null;
}

export const EditBarDialog = ({ open, onOpenChange, editingBar, onSaved, onDeleted, initialProposal, sourceLeadId }: Props) => {
  const [formData, setFormData] = useState<FormData>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const { data: projectTypes = [] } = useProjectTypes();

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
    if (editingBar) {
      setFormData({
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
      });
    } else if (initialProposal) {
      const d = initialProposal.direct;
      const seededName = (d.name || '').trim();
      const proposedType = d.project_type ?? '';
      const typeIsValid = projectTypes.length === 0
        ? !!proposedType
        : projectTypes.some((pt) => pt.id === proposedType);
      setFormData({
        ...defaultForm,
        name: seededName,
        bar_code: deriveBarCode(seededName),
        address: d.address || '',
        timezone: d.timezone || defaultForm.timezone,
        project_type: (typeIsValid ? proposedType : defaultForm.project_type) as ProjectType,
      });
    } else {
      setFormData(defaultForm);
    }
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
  }, [open, editingBar, initialProposal, projectTypes]);

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
    if (!query.trim()) { toast.error('Enter a project name or address first'); return; }
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
      toast.error('Name and project code are required');
      setActiveTab('basic');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
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
      let newId: string | undefined;
      if (editingBar) {
        // Backfill a slug if the existing venue doesn't have one yet so its
        // /q/:venueSlug intake URL becomes usable without an extra step.
        const existingSlug = (editingBar as any).slug as string | null | undefined;
        if (!existingSlug) {
          const base = deriveVenueSlug(payload.name);
          const unique = await pickUniqueSlug(base, editingBar.id);
          if (unique) payload.slug = unique;
        }
        const { error } = await supabase.from('venues').update(payload).eq('id', editingBar.id);
        if (error) throw error;
        await supabase.from('profiles').update({ assigned_bar_name: payload.name }).eq('assigned_bar_id', editingBar.id);
        toast.success('Project updated');
      } else {
        // Carry the originating lead forward so the new client record references it.
        if (sourceLeadId) payload.source_lead_id = sourceLeadId;
        // Stamp a unique public slug at creation so /q/:venueSlug works
        // immediately for follow-up auto-fire.
        const base = deriveVenueSlug(payload.name);
        const unique = await pickUniqueSlug(base);
        if (unique) payload.slug = unique;
        const { data: inserted, error } = await supabase
          .from('venues')
          .insert(payload as any)
          .select('id')
          .single();
        if (error) throw error;
        newId = (inserted as any)?.id as string | undefined;
        // Post-create wiring for lead-sourced creations: leadership contact + bridge stamps.
        if (newId && initialProposal && sourceLeadId) {
          const c = initialProposal.contact;
          if (c && (c.display_name || c.email || c.phone)) {
            const role = (c.role_label || '').toLowerCase();
            const role_type =
              role.includes('owner') ? 'owner'
              : role.includes('gm') || role.includes('general manager') ? 'gm'
              : 'lead_staff';
            await supabase.from('venue_leadership_contacts').insert({
              venue_id: newId,
              display_name: c.display_name || c.email || c.phone || 'Lead Contact',
              role_type,
              is_primary: true,
              is_active: true,
            });
          }
          if (c && (c.display_name || c.email || c.phone)) {
            await supabase.from('venue_contacts' as any).insert({
              venue_id: newId,
              name: c.display_name || c.email || c.phone || 'Lead Contact',
              role_label: c.role_label || 'Primary contact',
              phone: c.phone || null,
              email: c.email || null,
              note: 'Imported from inbound lead',
            });
          }
          await supabase
            .from('inbound_leads')
            .update({ status: 'promoted', promoted_venue_id: newId })
            .eq('id', sourceLeadId);
        }
        toast.success('Project created');
      }
      onOpenChange(false);
      onSaved(newId);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to save project');
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!editingBar) return;
    if (!confirm(`Delete "${editingBar.name}"? This cannot be undone.`)) return;
    try {
      await supabase.from('profiles').update({ assigned_bar_id: null, assigned_bar_name: null }).eq('assigned_bar_id', editingBar.id);
      const { error } = await supabase.from('venues').delete().eq('id', editingBar.id);
      if (error) throw error;
      toast.success('Project deleted');
      onOpenChange(false);
      onDeleted?.();
    } catch { toast.error('Failed to delete project'); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border mx-4 sm:mx-auto max-w-2xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {editingBar ? `Edit ${editingBar.name}` : 'Add New Project'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editingBar ? 'Update project details, integrations, and leadership.' : 'Configure a new project.'}
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
                {!editingBar && initialProposal && (
                  <Card className="border-primary/40 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-primary" /> From inbound lead
                        <Badge variant="outline" className="ml-1 text-[10px]">Pre-filled · confirm or edit</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {initialProposal.contact && (
                        <div className="rounded-md border border-border bg-background/60 p-2">
                          <div className="font-medium text-sm">{initialProposal.contact.display_name ?? '—'}</div>
                          <div className="text-muted-foreground">
                            {[initialProposal.contact.email, initialProposal.contact.phone, initialProposal.contact.role_label].filter(Boolean).join(' · ') || '—'}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">Saved as a leadership contact on create.</p>
                        </div>
                      )}
                      {Object.keys(initialProposal.suggestions).length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="font-medium text-xs flex items-center gap-1.5">
                            <Info className="h-3 w-3" /> Suggestions to review in the wizard
                          </div>
                          {initialProposal.suggestions.goals_summary && (
                            <div className="text-muted-foreground"><span className="font-medium text-foreground">Goals:</span> {initialProposal.suggestions.goals_summary}</div>
                          )}
                          {initialProposal.suggestions.primary_channel && (
                            <div className="text-muted-foreground"><span className="font-medium text-foreground">Channel:</span> {initialProposal.suggestions.primary_channel.value} <span className="italic">— {initialProposal.suggestions.primary_channel.rationale}</span></div>
                          )}
                          {initialProposal.suggestions.pillar_focus && (
                            <div className="text-muted-foreground"><span className="font-medium text-foreground">Pillars:</span> {initialProposal.suggestions.pillar_focus.keys.join(', ')} <span className="italic">— {initialProposal.suggestions.pillar_focus.rationale}</span></div>
                          )}
                          {initialProposal.suggestions.leak_vector_focus && (
                            <div className="text-muted-foreground"><span className="font-medium text-foreground">Leak vectors:</span> {initialProposal.suggestions.leak_vector_focus.keys.join(', ')} <span className="italic">— {initialProposal.suggestions.leak_vector_focus.rationale}</span></div>
                          )}
                          {initialProposal.suggestions.not_ready_reason && (
                            <div className="text-muted-foreground"><span className="font-medium text-foreground">Not-ready reason:</span> {initialProposal.suggestions.not_ready_reason}</div>
                          )}
                        </div>
                      )}
                      {initialProposal.ai_status === 'failed' && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">AI suggestions unavailable — direct fields still pre-filled.</p>
                      )}
                    </CardContent>
                  </Card>
                )}
                <Card className="bg-muted/20 border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" /> Project Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
                      <Input id="name" value={formData.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Club Marina" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="bar_code">Project code <span className="text-destructive">*</span></Label>
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
                          {projectTypes.map((pt) => (
                            <SelectItem key={pt.id} value={pt.id}>
                              {pt.label}{pt.is_vertical ? ' · vertical' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Drives which pillar template this project inherits. Changing this does not delete existing data.
                        {editingBar && ' New type applies from the next leak stack run — past runs stay as computed.'}
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
                      <p className="text-xs text-muted-foreground">Required for automatic Google rating sync. Auto-search uses project name + address.</p>
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
                      Save the project first to configure Asana log sources.
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
                        <UserPlus className="h-4 w-4 text-muted-foreground" /> Project Leadership
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">GMs and lead staff for this project. These appear in insight assignment dropdowns.</p>
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
                      Save the project first to add leadership contacts.
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
                        <BookUser className="h-4 w-4 text-muted-foreground" /> Project Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-3">
                        External vendors and service contacts this project relies on — plumber, electrician, beverage rep, non-emergency lines, etc.
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
                      Save the project first to add contacts.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── PILLARS ────────────────────────────────────── */}
              <TabsContent value="pillars" className="mt-0 space-y-4">
                {editingBar ? (
                  <div className="space-y-4">
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" /> Project Pillars
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProjectPillarOverridesPanel
                        projectId={editingBar.id}
                        projectType={formData.project_type}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" /> Leak Vectors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProjectLeakVectorOverridesPanel
                        projectId={editingBar.id}
                        projectType={formData.project_type}
                      />
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20 border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" /> Qualifier Fields
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProjectQualifierOverridesPanel
                        projectId={editingBar.id}
                        projectType={formData.project_type}
                      />
                    </CardContent>
                  </Card>
                  </div>
                ) : (
                  <Card className="bg-muted/20 border-dashed border-border">
                    <CardContent className="py-4 text-xs text-muted-foreground text-center">
                      Save the project first to configure pillars.
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
                        <span className="text-muted-foreground">Project ID</span>
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
                      <p className="text-xs text-muted-foreground mb-3">Permanently delete this project and unassign all users. This cannot be undone.</p>
                      <Button type="button" variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                        <Trash2 className="h-4 w-4" /> Delete Project
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
