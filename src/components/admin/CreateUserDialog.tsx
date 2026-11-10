import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/auth';
import { createdUserId, workspaceRoleFor, checkedSetupWrite } from '@/lib/teamAccountSetup';

interface Bar {
  id: string;
  name: string;
}

interface CreateUserDialogProps {
  bars: Bar[];
  onUserCreated: () => void;
}

export const CreateUserDialog = ({ bars, onUserCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const creatingRef = useRef(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff' as AppRole,
    asana_gid: '',
  });
  const [selectedBarIds, setSelectedBarIds] = useState<string[]>([]);
  const [primaryBarId, setPrimaryBarId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ email: '', password: '', full_name: '', role: 'staff', asana_gid: '' });
    setSelectedBarIds([]);
    setPrimaryBarId(null);
  };

  const toggleBar = (barId: string) => {
    setSelectedBarIds(prev => {
      if (prev.includes(barId)) {
        const next = prev.filter(id => id !== barId);
        if (primaryBarId === barId) setPrimaryBarId(next.length > 0 ? next[0] : null);
        return next;
      } else {
        const next = [...prev, barId];
        if (next.length === 1) setPrimaryBarId(barId);
        return next;
      }
    });
  };

  const handleCreate = async () => {
    if (creatingRef.current) return;
    if (!formData.email.trim() || !formData.password || !formData.full_name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (formData.role !== 'admin' && selectedBarIds.length === 0) {
      toast.error('Assign at least one business or brand before creating a team account.');
      return;
    }
    creatingRef.current = true;
    setIsCreating(true);
    let createdAccountId: string | null = null;
    try {
      const effectivePrimary = primaryBarId && selectedBarIds.includes(primaryBarId)
        ? primaryBarId
        : selectedBarIds.length > 0 ? selectedBarIds[0] : null;
      const primaryBar = bars.find(b => b.id === effectivePrimary);

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name.trim(),
          role: formData.role,
          bar_id: effectivePrimary || undefined,
          bar_name: primaryBar?.name,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId = createdUserId(data);
      createdAccountId = newUserId;

      // Save asana_gid to profile if provided
      if (newUserId && formData.asana_gid.trim()) {
        await checkedSetupWrite(supabase.from('profiles').update({
          asana_gid: formData.asana_gid.trim(),
        } as any).eq('id', newUserId).select('id').single(), 'Profile update');
      }

      // Insert venue_assignments for all selected bars
      if (newUserId && selectedBarIds.length > 0) {
        const rows = selectedBarIds.map(barId => ({
          user_id: newUserId,
          venue_id: barId,
          role_at_venue: formData.role,
          is_primary: barId === effectivePrimary,
        }));
        await checkedSetupWrite(supabase.from('venue_assignments').insert(rows), 'Business assignments');

        // Sync user_bar_assignments for RLS
        const barAssignRows = selectedBarIds.map(barId => ({
          user_id: newUserId,
          bar_id: barId,
        }));
        // The server already upserts the primary project. Do not re-insert it.
        await checkedSetupWrite(supabase.from('user_bar_assignments')
          .upsert(barAssignRows, { onConflict: 'user_id,bar_id' }), 'Project access');
      }

      // Sync user_venue_roles so RoleContext stays consistent
      if (newUserId) {
        const mappedRole = workspaceRoleFor(formData.role);
        if (formData.role === 'admin' || formData.role === 'owner') {
          await checkedSetupWrite(supabase.from('user_venue_roles' as any).insert({
            user_id: newUserId, venue_id: null, role: mappedRole,
          }), 'Workspace role');
        } else if (selectedBarIds.length > 0) {
          const venueRoleRows = selectedBarIds.map(vid => ({
            user_id: newUserId, venue_id: vid, role: mappedRole,
          }));
          await checkedSetupWrite(supabase.from('user_venue_roles' as any).insert(venueRoleRows), 'Workspace roles');
        }
      }

      toast.success(`User ${formData.email} created successfully`);
      setOpen(false);
      resetForm();
      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(createdAccountId
        ? 'The account exists, but setup is incomplete. Open Users → Edit to repair its role and business assignments before sharing access.'
        : 'Account setup could not be confirmed. Check Users before trying again; a failed response can still leave an account.');
      // Account creation and browser-side assignment writes are not atomic.
      onUserCreated();
      setOpen(false);
      resetForm();
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (creatingRef.current) return;
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a separate login and assign the businesses or brands this person works on. System Admin is not a shortcut for team access.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={isCreating} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              placeholder="John Smith"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Temporary Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              disabled={isCreating}
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as AppRole }))}
            >
              <SelectTrigger>
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
            <Label htmlFor="asana_gid">Asana GID</Label>
            <Input
              id="asana_gid"
              placeholder="e.g. 16292902617627 (optional)"
              value={formData.asana_gid}
              onChange={(e) => setFormData(prev => ({ ...prev, asana_gid: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Assigned businesses and brands</Label>
            <div className="space-y-2 rounded-md border border-border p-3 max-h-[200px] overflow-y-auto">
              {bars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No businesses or brands available</p>
              ) : (
                bars.map(bar => {
                  const isChecked = selectedBarIds.includes(bar.id);
                  const isPrimary = primaryBarId === bar.id;
                  return (
                    <div key={bar.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`create-bar-${bar.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleBar(bar.id)}
                        />
                        <label
                          htmlFor={`create-bar-${bar.id}`}
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
            {selectedBarIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedBarIds.length} business/brand assignment{selectedBarIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
