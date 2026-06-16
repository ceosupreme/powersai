import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, X, Upload, CheckCircle, XCircle, Mail, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/auth';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ParsedUser {
  email: string;
  full_name: string;
  role: AppRole;
  bar_id: string | null;
  bar_name: string | null;
  isValid: boolean;
  error?: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  message: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface VenueAssignment {
  venue_id: string;
  is_primary: boolean;
}

interface UserWithDetails {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  assigned_bar_id: string | null;
  assigned_bar_name: string | null;
  assigned_bars: { id: string; name: string; is_primary: boolean }[];
  created_at: string | null;
}

interface Bar {
  id: string;
  name: string;
}

export const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [bars, setBars] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserWithDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteUserName, setDeleteUserName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Import state
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all bars
      const { data: barsData, error: barsError } = await supabase
        .from('venues')
        .select('id, name')
        .order('name');

      if (barsError) throw barsError;

      setBars(barsData || []);

      // Fetch venue_assignments
      const { data: venueAssignments, error: vaError } = await supabase
        .from('venue_assignments')
        .select('user_id, venue_id, is_primary');
      if (vaError) throw vaError;

      // Build map: userId -> assignments
      const vaMap = new Map<string, VenueAssignment[]>();
      (venueAssignments || []).forEach(va => {
        const existing = vaMap.get(va.user_id) || [];
        existing.push({ venue_id: va.venue_id, is_primary: va.is_primary });
        vaMap.set(va.user_id, existing);
      });

      const barsMap = new Map((barsData || []).map(b => [b.id, b.name]));

      // Merge data
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role as AppRole]));
      
      const usersWithDetails: UserWithDetails[] = (profiles || []).map(profile => {
        const assignments = vaMap.get(profile.id) || [];
        const assignedBars = assignments
          .map(a => ({ id: a.venue_id, name: barsMap.get(a.venue_id) || 'Unknown', is_primary: a.is_primary }))
          .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: rolesMap.get(profile.id) || 'staff',
          assigned_bar_id: profile.assigned_bar_id,
          assigned_bar_name: profile.assigned_bar_name,
          assigned_bars: assignedBars,
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startEditing = (user: UserWithDetails) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: deleteUserId }),
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('User deleted successfully');
        fetchData();
      } else {
        toast.error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
      setDeleteUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.full_name?.toLowerCase().includes(query) ||
      user.assigned_bar_name?.toLowerCase().includes(query)
    );
  });

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'owner':
      case 'gm':
        return 'default';
      case 'shift_lead':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // CSV Import functions
  const parseCSV = () => {
    setIsParsing(true);
    setImportResults([]);
    setShowResults(false);

    try {
      const lines = csvData.trim().split('\n');
      if (lines.length === 0) {
        toast.error('No data to parse');
        setIsParsing(false);
        return;
      }

      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes('email') ||
        firstLine.includes('name') ||
        firstLine.includes('role');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsed: ParsedUser[] = dataLines.map((line) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const [email, full_name, roleStr, barName] = parts;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(email || '');

        let role: AppRole = 'staff';
        if (roleStr) {
          const normalizedRole = roleStr.toLowerCase();
          if (normalizedRole === 'admin') role = 'admin';
          else if (normalizedRole === 'owner') role = 'owner';
          else if (normalizedRole === 'manager' || normalizedRole === 'gm') role = 'gm';
          else if (normalizedRole === 'shift_lead' || normalizedRole === 'shift lead') role = 'shift_lead';
        }

        let bar_id: string | null = null;
        let bar_name: string | null = null;
        if (barName) {
          const foundBar = bars.find(
            (b) => b.name.toLowerCase() === barName.toLowerCase()
          );
          if (foundBar) {
            bar_id = foundBar.id;
            bar_name = foundBar.name;
          }
        }

        return {
          email: email || '',
          full_name: full_name || '',
          role,
          bar_id,
          bar_name,
          isValid: isValidEmail && !!full_name,
          error: !isValidEmail
            ? 'Invalid email'
            : !full_name
            ? 'Name required'
            : undefined,
        };
      });

      setParsedUsers(parsed);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV data');
    } finally {
      setIsParsing(false);
    }
  };

  const updateParsedUser = (index: number, field: keyof ParsedUser, value: string) => {
    setParsedUsers((prev) => {
      const updated = [...prev];
      if (field === 'bar_id') {
        const bar = bars.find((b) => b.id === value);
        updated[index] = {
          ...updated[index],
          bar_id: value || null,
          bar_name: bar?.name || null,
        };
      } else if (field === 'role') {
        updated[index] = {
          ...updated[index],
          role: value as AppRole,
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(updated[index].email);
      updated[index].isValid = isValidEmail && !!updated[index].full_name;
      updated[index].error = !isValidEmail
        ? 'Invalid email'
        : !updated[index].full_name
        ? 'Name required'
        : undefined;

      return updated;
    });
  };

  const removeParsedUser = (index: number) => {
    setParsedUsers((prev) => prev.filter((_, i) => i !== index));
  };

  const sendInvites = async () => {
    const validUsers = parsedUsers.filter((u) => u.isValid);
    if (validUsers.length === 0) {
      toast.error('No valid users to import');
      return;
    }

    setIsImporting(true);
    const results: ImportResult[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to send invites');
        return;
      }

      for (const user of validUsers) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: user.email,
              full_name: user.full_name,
              role: user.role,
              bar_id: user.bar_id,
              bar_name: user.bar_name,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            results.push({
              email: user.email,
              success: true,
              message: 'Invite sent successfully',
            });
          } else {
            results.push({
              email: user.email,
              success: false,
              message: result.error || 'Failed to send invite',
            });
          }
        } catch (error) {
          results.push({
            email: user.email,
            success: false,
            message: 'Network error',
          });
        }
      }

      setImportResults(results);
      setShowResults(true);

      const successCount = results.filter((r) => r.success).length;
      if (successCount === validUsers.length) {
        toast.success(`Successfully sent ${successCount} invites`);
        setParsedUsers([]);
        setCsvData('');
        fetchData();
      } else {
        toast.warning(`Sent ${successCount}/${validUsers.length} invites. Check results for details.`);
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      toast.error('Failed to send invites');
    } finally {
      setIsImporting(false);
    }
  };

  const validImportCount = parsedUsers.filter((u) => u.isValid).length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col gap-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <CardTitle className="text-base sm:text-lg font-semibold">Users</CardTitle>
            <CreateUserDialog bars={bars} onUserCreated={fetchData} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(!showImport)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Users
              <ChevronDown className={cn("h-4 w-4 transition-transform", showImport && "rotate-180")} />
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border h-10"
            />
          </div>
        </div>

        <Collapsible open={showImport} onOpenChange={setShowImport}>
          <CollapsibleContent className="space-y-4">
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Import Users via CSV</h4>
                  <p className="text-xs text-muted-foreground">
                    Paste CSV data to bulk import users. Each user will receive an email invitation.
                  </p>
                </div>
                <Textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder={`email, name, role, project_name\njohn@example.com, John Smith, manager, Acme Website Redesign`}
                  className="min-h-[100px] bg-background border-border font-mono text-xs"
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button
                    onClick={parseCSV}
                    disabled={!csvData.trim() || isParsing}
                    variant="secondary"
                    size="sm"
                  >
                    {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Parse CSV
                  </Button>
                  {parsedUsers.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {validImportCount} of {parsedUsers.length} users valid
                    </span>
                  )}
                </div>
              </div>

              {parsedUsers.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Preview Import</h4>
                    <Button
                      onClick={sendInvites}
                      disabled={validImportCount === 0 || isImporting}
                      size="sm"
                      className="gap-2"
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                      Send {validImportCount} Invites
                    </Button>
                  </div>
                  <div className="rounded-md border border-border overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-muted-foreground text-xs w-[50px]">Status</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Email</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Name</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Role</TableHead>
                          <TableHead className="text-muted-foreground text-xs">Project</TableHead>
                          <TableHead className="text-muted-foreground text-xs w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedUsers.map((user, index) => (
                          <TableRow key={index} className="hover:bg-muted/20">
                            <TableCell className="py-2">
                              {user.isValid ? (
                                <CheckCircle className="h-4 w-4 text-signal-green" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              <input
                                type="text"
                                value={user.email}
                                onChange={(e) => updateParsedUser(index, 'email', e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-xs min-w-[100px]"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <input
                                type="text"
                                value={user.full_name}
                                onChange={(e) => updateParsedUser(index, 'full_name', e.target.value)}
                                className="bg-transparent border-none outline-none w-full text-xs min-w-[80px]"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <Select
                                value={user.role}
                                onValueChange={(value) => updateParsedUser(index, 'role', value)}
                              >
                                <SelectTrigger className="w-20 h-7 bg-background text-xs">
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
                            </TableCell>
                            <TableCell className="py-2">
                              <Select
                                value={user.bar_id || 'none'}
                                onValueChange={(value) =>
                                  updateParsedUser(index, 'bar_id', value === 'none' ? '' : value)
                                }
                              >
                                <SelectTrigger className="w-24 h-7 bg-background text-xs">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {bars.map((bar) => (
                                    <SelectItem key={bar.id} value={bar.id}>
                                      {bar.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeParsedUser(index)}
                                className="text-destructive hover:text-destructive h-7 w-7 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {showResults && importResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Import Results</h4>
                  {importResults.map((result, index) => (
                    <Alert
                      key={index}
                      variant={result.success ? 'default' : 'destructive'}
                      className={cn(
                        result.success && 'border-signal-green/30 bg-signal-green/10',
                        'py-2'
                      )}
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-signal-green" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription className="text-xs">
                        <strong>{result.email}</strong>: {result.message}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border border-border overflow-x-auto -mx-3 sm:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-muted-foreground text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm">Email</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm">Role</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm">Project</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-muted-foreground text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      {searchQuery ? 'No users match your search' : 'No users found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-xs sm:text-sm py-3">
                        {user.full_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm max-w-[120px] truncate">
                        {user.email || '—'}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 max-w-[140px]">
                        {user.assigned_bars.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[140px]">
                            {user.assigned_bars.map(bar => (
                              <Badge
                                key={bar.id}
                                variant={bar.is_primary ? 'default' : 'secondary'}
                                className="text-[10px] px-1.5 py-0 truncate max-w-[120px]"
                              >
                                {bar.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs sm:text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs sm:text-sm hidden md:table-cell">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(user)}
                            className="text-primary hover:text-primary h-8 px-2 sm:px-3 text-xs sm:text-sm"
                          >
                            Edit
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeleteUserId(user.id);
                                setDeleteUserName(user.full_name || user.email || 'this user');
                              }}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit User Dialog */}
        <EditUserDialog
          user={editingUser}
          bars={bars}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUserUpdated={fetchData}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleteUserName}</strong>? This action cannot be undone. All associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
