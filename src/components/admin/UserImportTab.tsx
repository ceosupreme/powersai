import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Upload, Loader2, CheckCircle, XCircle, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ParsedUser {
  email: string;
  full_name: string;
  role: AppRole;
  bar_id: string | null;
  bar_name: string | null;
  isValid: boolean;
  error?: string;
}

interface Bar {
  id: string;
  name: string;
}

interface ImportResult {
  email: string;
  success: boolean;
  message: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const UserImportTab = () => {
  const [csvData, setCsvData] = useState('');
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [bars, setBars] = useState<Bar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const fetchBars = async () => {
      const { data } = await supabase.from('venues').select('id, name').order('name');
      setBars(data || []);
    };
    fetchBars();
  }, []);

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

      // Check if first line is a header
      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes('email') ||
        firstLine.includes('name') ||
        firstLine.includes('role');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const parsed: ParsedUser[] = dataLines.map((line) => {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const [email, full_name, roleStr, barName] = parts;

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(email || '');

        // Parse role
        let role: AppRole = 'staff';
        if (roleStr) {
          const normalizedRole = roleStr.toLowerCase();
          if (normalizedRole === 'admin') role = 'admin';
          else if (normalizedRole === 'owner') role = 'owner';
          else if (normalizedRole === 'manager' || normalizedRole === 'gm') role = 'gm';
          else if (normalizedRole === 'shift_lead' || normalizedRole === 'shift lead') role = 'shift_lead';
        }

        // Find bar
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

      // Revalidate
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

    setIsLoading(true);
    const results: ImportResult[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to send invites');
        return;
      }

      for (const user of validUsers) {
        try {
          // Call edge function to invite user
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
      } else {
        toast.warning(`Sent ${successCount}/${validUsers.length} invites. Check results for details.`);
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      toast.error('Failed to send invites');
    } finally {
      setIsLoading(false);
    }
  };

  const validCount = parsedUsers.filter((u) => u.isValid).length;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg font-semibold">Import Users</CardTitle>
          <CardDescription className="text-muted-foreground text-xs sm:text-sm">
            Paste CSV data to bulk import users. Each user will receive an email invitation
            to set their password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              CSV Data
            </label>
            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder={`Paste CSV data here. Format:
email, name, role, bar_name

Example:
john@example.com, John Smith, manager, Downtown Bar
jane@example.com, Jane Doe, staff, Uptown Lounge`}
              className="min-h-[120px] sm:min-h-[150px] bg-background border-border font-mono text-xs sm:text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Button
              onClick={parseCSV}
              disabled={!csvData.trim() || isParsing}
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Parse CSV
            </Button>
            {parsedUsers.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {validCount} of {parsedUsers.length} users valid
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedUsers.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <CardTitle className="text-base sm:text-lg font-semibold">Preview Import</CardTitle>
            <Button
              onClick={sendInvites}
              disabled={validCount === 0 || isLoading}
              className="gap-2 w-full sm:w-auto"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send {validCount} Invites
            </Button>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="rounded-md border border-border overflow-x-auto -mx-3 sm:mx-0">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-muted-foreground text-xs sm:text-sm w-[60px]">Status</TableHead>
                    <TableHead className="text-muted-foreground text-xs sm:text-sm">Email</TableHead>
                    <TableHead className="text-muted-foreground text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-muted-foreground text-xs sm:text-sm">Role</TableHead>
                    <TableHead className="text-muted-foreground text-xs sm:text-sm">Bar</TableHead>
                    <TableHead className="text-muted-foreground text-xs sm:text-sm text-right w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedUsers.map((user, index) => (
                    <TableRow key={index} className="hover:bg-muted/20">
                      <TableCell className="py-2">
                        {user.isValid ? (
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-signal-green" />
                        ) : (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <input
                          type="text"
                          value={user.email}
                          onChange={(e) => updateParsedUser(index, 'email', e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-xs sm:text-sm min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <input
                          type="text"
                          value={user.full_name}
                          onChange={(e) => updateParsedUser(index, 'full_name', e.target.value)}
                          className="bg-transparent border-none outline-none w-full text-xs sm:text-sm min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Select
                          value={user.role}
                          onValueChange={(value) => updateParsedUser(index, 'role', value)}
                        >
                          <SelectTrigger className="w-20 sm:w-24 h-7 sm:h-8 bg-background text-xs sm:text-sm">
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
                          <SelectTrigger className="w-24 sm:w-32 h-7 sm:h-8 bg-background text-xs sm:text-sm">
                            <SelectValue placeholder="Select bar" />
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
                      <TableCell className="text-right py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeParsedUser(index)}
                          className="text-destructive hover:text-destructive h-7 sm:h-8 px-2 text-xs"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {showResults && importResults.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-semibold">Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 sm:px-6">
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
                <AlertDescription className="text-xs sm:text-sm">
                  <strong className="break-all">{result.email}</strong>: {result.message}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
