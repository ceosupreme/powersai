import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/auth';

interface Bar {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  assigned_bar_id: string | null;
  assigned_bar_name: string | null;
}

interface EditUserDialogProps {
  user: UserData | null;
  bars: Bar[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({
  user,
  bars,
  open,
  onOpenChange,
  onUserUpdated,
}: EditUserDialogProps) => {
  const [editedRole, setEditedRole] = useState<AppRole>('staff');
  const [selectedBarIds, setSelectedBarIds] = useState<string[]>([]);
  const [primaryBarId, setPrimaryBarId] = useState<string | null>(null);
  const [asanaGid, setAsanaGid] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  useEffect(() => {
    if (user && open) {
      setEditedRole(user.role);
      loadVenueAssignments(user.id);
      loadAsanaGid(user.id);
    }
  }, [user, open]);

  const loadAsanaGid = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('asana_gid')
      .eq('id', userId)
      .maybeSingle();
    setAsanaGid((data as any)?.asana_gid || '');
  };

  const loadVenueAssignments = async (userId: string) => {
    setIsLoadingAssignments(true);
    try {
      const { data, error } = await supabase
        .from('venue_assignments')
        .select('venue_id, is_primary')
        .eq('user_id', userId);

      if (error) throw error;

      const venueIds = (data || []).map(d => d.venue_id);
      const primary = data?.find(d => d.is_primary)?.venue_id || null;

      setSelectedBarIds(venueIds);
      setPrimaryBarId(primary || (venueIds.length === 1 ? venueIds[0] : null));
    } catch (error) {
      console.error('Error loading venue assignments:', error);
      // Fallback to profile data
      if (user) {
        setSelectedBarIds(user.assigned_bar_id ? [user.assigned_bar_id] : []);
        setPrimaryBarId(user.assigned_bar_id);
      }
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const toggleBar = (barId: string) => {
    setSelectedBarIds(prev => {
      if (prev.includes(barId)) {
        const next = prev.filter(id => id !== barId);
        if (primaryBarId === barId) {
          setPrimaryBarId(next.length > 0 ? next[0] : null);
        }
        return next;
      } else {
        const next = [...prev, barId];
        if (next.length === 1) setPrimaryBarId(barId);
        return next;
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // 1. Update role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: editedRole })
        .eq('user_id', user.id);
      if (roleError) throw roleError;

      // 2. Delete old venue_assignments
      await supabase.from('venue_assignments').delete().eq('user_id', user.id);

      // 3. Insert new venue_assignments
      if (selectedBarIds.length > 0) {
        const effectivePrimary = primaryBarId && selectedBarIds.includes(primaryBarId)
          ? primaryBarId
          : selectedBarIds[0];

        const rows = selectedBarIds.map(barId => ({
          user_id: user.id,
          venue_id: barId,
          role_at_venue: editedRole,
          is_primary: barId === effectivePrimary,
        }));
        const { error: vaError } = await supabase.from('venue_assignments').insert(rows);
        if (vaError) throw vaError;

      // 4. Update profile backward compat + asana_gid
        const primaryBar = bars.find(b => b.id === effectivePrimary);
        await supabase.from('profiles').update({
          assigned_bar_id: effectivePrimary,
          assigned_bar_name: primaryBar?.name || null,
          asana_gid: asanaGid.trim() || null,
        } as any).eq('id', user.id);

        // 5. Sync user_bar_assignments for RLS
        await supabase.from('user_bar_assignments').delete().eq('user_id', user.id);
        const barAssignRows = selectedBarIds.map(barId => ({
          user_id: user.id,
          bar_id: barId,
        }));
        await supabase.from('user_bar_assignments').insert(barAssignRows);
      } else {
        // No bars selected
        await supabase.from('profiles').update({
          assigned_bar_id: null,
          assigned_bar_name: null,
          asana_gid: asanaGid.trim() || null,
        } as any).eq('id', user.id);
        await supabase.from('user_bar_assignments').delete().eq('user_id', user.id);
      }

      // 6. Sync user_venue_roles so RoleContext stays consistent
      await supabase.from('user_venue_roles' as any).delete().eq('user_id', user.id);
      const venueRoleMap: Record<string, string> = {
        admin: 'owner', owner: 'owner', gm: 'gm', shift_lead: 'lead', staff: 'foh',
      };
      const mappedRole = venueRoleMap[editedRole] || 'foh';
      if (editedRole === 'admin' || editedRole === 'owner') {
        // Portfolio-level owner role (venue_id = null)
        await supabase.from('user_venue_roles' as any).insert({
          user_id: user.id, venue_id: null, role: mappedRole,
        });
      } else if (selectedBarIds.length > 0) {
        const venueRoleRows = selectedBarIds.map(vid => ({
          user_id: user.id, venue_id: vid, role: mappedRole,
        }));
        await supabase.from('user_venue_roles' as any).insert(venueRoleRows);
      }

      toast.success('User updated successfully');
      onOpenChange(false);
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            {user.full_name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editedRole}
                onValueChange={(value) => setEditedRole(value as AppRole)}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="gm">GM</SelectItem>
                  <SelectItem value="shift_lead">Shift Lead</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-asana-gid">Asana GID</Label>
              <Input
                id="edit-asana-gid"
                placeholder="e.g. 16292902617627"
                value={asanaGid}
                onChange={(e) => setAsanaGid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional. Links this user to their Asana account for task assignment.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Assigned Bars</Label>
              {isLoadingAssignments ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading assignments...</span>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border border-border p-3 max-h-[200px] overflow-y-auto">
                  {bars.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bars available</p>
                  ) : (
                    bars.map(bar => {
                      const isChecked = selectedBarIds.includes(bar.id);
                      const isPrimary = primaryBarId === bar.id;
                      return (
                        <div key={bar.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`bar-${bar.id}`}
                              checked={isChecked}
                              onCheckedChange={() => toggleBar(bar.id)}
                            />
                            <label
                              htmlFor={`bar-${bar.id}`}
                              className="text-sm cursor-pointer select-none"
                            >
                              {bar.name}
                            </label>
                          </div>
                          {isChecked && selectedBarIds.length > 1 && (
                            <Button
                              type="button"
                              variant={isPrimary ? 'default' : 'ghost'}
                              size="sm"
                              className="h-6 px-2 text-xs gap-1"
                              onClick={() => setPrimaryBarId(bar.id)}
                            >
                              <Star className={`h-3 w-3 ${isPrimary ? 'fill-current' : ''}`} />
                              {isPrimary ? 'Primary' : 'Set primary'}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {selectedBarIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedBarIds.length} bar{selectedBarIds.length !== 1 ? 's' : ''} selected
                  {primaryBarId && selectedBarIds.length > 1 && (
                    <> · Primary: {bars.find(b => b.id === primaryBarId)?.name}</>
                  )}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Page access is controlled per role in the Permissions tab.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
