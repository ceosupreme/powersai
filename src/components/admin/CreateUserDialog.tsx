import { useState } from 'react';
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
import { Copy, Eye, EyeOff, Loader2, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/auth';
import { functionErrorMessage } from '@/lib/functionError';

/** A random temporary password, easy to read out or text: four groups of four, no look-alike characters. */
function makeTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (set: string) => {
    // Rejection sampling keeps every character equally likely.
    const limit = 256 - (256 % set.length);
    const byte = new Uint8Array(1);
    do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
    return set[byte[0] % set.length];
  };
  for (;;) {
    const chars = Array.from({ length: 16 }, () => pick(all)).join('');
    if (/[A-Z]/.test(chars) && /[a-z]/.test(chars) && /[0-9]/.test(chars)) {
      return chars.match(/.{4}/g)!.join('-');
    }
  }
}

/** The sign-in service's reasons, said the way the person creating the account needs to hear them. */
function plainCreateUserReason(reason: string): string {
  if (/known to be weak|easy to guess|pwned/i.test(reason)) {
    return 'That password has shown up in data leaks on other sites, so it can\'t be used. Pick a different one, or tap Generate.';
  }
  if (/already (been )?registered|already exists|email_exists/i.test(reason)) {
    return 'That email already has an account. Find the person in the list and tap Edit instead.';
  }
  return reason;
}

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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'staff' as AppRole,
    asana_gid: '',
  });
  const [selectedBarIds, setSelectedBarIds] = useState<string[]>([]);
  const [primaryBarId, setPrimaryBarId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setFormData({ email: '', password: '', full_name: '', role: 'staff', asana_gid: '' });
    setSelectedBarIds([]);
    setPrimaryBarId(null);
    setShowPassword(false);
  };

  const generatePassword = () => {
    setFormData(prev => ({ ...prev, password: makeTemporaryPassword() }));
    setShowPassword(true);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      toast.success('Password copied');
    } catch {
      toast.error('Couldn\'t copy it. Select the password and copy it instead.');
    }
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
    const email = formData.email.trim();
    const fullName = formData.full_name.trim();
    if (!email || !formData.password || !fullName) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Same minimum as the sign-up form.
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsCreating(true);
    try {
      const effectivePrimary = primaryBarId && selectedBarIds.includes(primaryBarId)
        ? primaryBarId
        : selectedBarIds.length > 0 ? selectedBarIds[0] : null;
      const primaryBar = bars.find(b => b.id === effectivePrimary);

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password: formData.password,
          full_name: fullName,
          role: formData.role,
          bar_id: effectivePrimary || undefined,
          bar_name: primaryBar?.name,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId = data?.user_id || data?.id;

      // Save asana_gid to profile if provided
      if (newUserId && formData.asana_gid.trim()) {
        await supabase.from('profiles').update({
          asana_gid: formData.asana_gid.trim(),
        } as any).eq('id', newUserId);
      }

      // Insert venue_assignments for all selected bars
      if (newUserId && selectedBarIds.length > 0) {
        const rows = selectedBarIds.map(barId => ({
          user_id: newUserId,
          venue_id: barId,
          role_at_venue: formData.role,
          is_primary: barId === effectivePrimary,
        }));
        await supabase.from('venue_assignments').insert(rows);

        // Sync user_bar_assignments for RLS
        const barAssignRows = selectedBarIds.map(barId => ({
          user_id: newUserId,
          bar_id: barId,
        }));
        await supabase.from('user_bar_assignments').insert(barAssignRows);
      }

      // Sync user_venue_roles so RoleContext stays consistent
      if (newUserId) {
        const venueRoleMap: Record<string, string> = {
          admin: 'owner', owner: 'owner', gm: 'gm', shift_lead: 'lead', staff: 'foh',
        };
        const mappedRole = venueRoleMap[formData.role] || 'foh';
        if (formData.role === 'admin' || formData.role === 'owner') {
          await supabase.from('user_venue_roles' as any).insert({
            user_id: newUserId, venue_id: null, role: mappedRole,
          });
        } else if (selectedBarIds.length > 0) {
          const venueRoleRows = selectedBarIds.map(vid => ({
            user_id: newUserId, venue_id: vid, role: mappedRole,
          }));
          await supabase.from('user_venue_roles' as any).insert(venueRoleRows);
        }
      }

      toast.success(`User ${email} created successfully`);
      setOpen(false);
      resetForm();
      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Couldn't create the user: ${plainCreateUserReason(await functionErrorMessage(error, 'Failed to create user'))}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
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
            Create a new user account with specified role and bar assignment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={generatePassword}>
                Generate
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <Button type="button" variant="outline" size="icon" className="shrink-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(s => !s)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="icon" className="shrink-0"
                aria-label="Copy password" disabled={!formData.password} onClick={copyPassword}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Passwords that have leaked from other sites are refused. Generate makes a fresh one you can copy and send.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
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
            <Label>Assigned Bars</Label>
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
                {selectedBarIds.length} bar{selectedBarIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>
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
