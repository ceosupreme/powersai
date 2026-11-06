import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AppRole } from '@/types/auth';
import { PageKey, PAGE_CONFIG, ROLE_LABELS } from '@/types/permissions';
import { permissionEnabled } from '@/lib/teamAccountSetup';

const EDITABLE_ROLES: AppRole[] = ['owner', 'gm', 'shift_lead', 'staff'];

interface RolePageDefault {
  role: AppRole;
  page_key: PageKey;
  enabled: boolean;
}

export const RolePageDefaults = () => {
  const [defaults, setDefaults] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchDefaults();
  }, []);

  const fetchDefaults = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from('role_page_defaults')
        .select('role, page_key, enabled');

      if (error) throw error;

      const map: Record<string, boolean> = {};
      (data || []).forEach((row: any) => {
        map[`${row.role}:${row.page_key}`] = row.enabled === true;
      });
      setDefaults(map);
    } catch (error) {
      console.error('Error fetching role page defaults:', error);
      setDefaults({});
      setLoadError(true);
      toast.error('Permissions could not be loaded. Saving is disabled until you retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (role: AppRole, pageKey: PageKey) => {
    if (isLoading || loadError || isSaving) return;
    const key = `${role}:${pageKey}`;
    setDefaults(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (isLoading || loadError || isSaving) return;
    setIsSaving(true);
    try {
      // Build upsert rows from current state
      const rows = EDITABLE_ROLES.flatMap(role =>
        PAGE_CONFIG.map(page => ({
          role,
          page_key: page.key,
          enabled: permissionEnabled(defaults, `${role}:${page.key}`),
        }))
      );

      const { error } = await supabase
        .from('role_page_defaults')
        .upsert(
          rows.map(r => ({
            role: r.role,
            page_key: r.page_key,
            enabled: r.enabled,
          })),
          { onConflict: 'role,page_key' }
        );

      if (error) throw error;
      toast.success('Role page defaults saved');
    } catch (error) {
      console.error('Error saving role page defaults:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Role Page Access</CardTitle>
          <CardDescription>Control which pages each role can access by default.</CardDescription>
        </div>
        <Button onClick={handleSave} disabled={isSaving || loadError} size="sm" className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </CardHeader>
      <CardContent>
        {loadError && <div role="alert" className="mb-4 rounded-md border border-destructive p-4 space-y-2">
          <p>Permissions could not be loaded. No changes can be saved until access is verified.</p>
          <Button variant="outline" onClick={fetchDefaults}>Try again</Button>
        </div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-muted-foreground font-medium">Page</th>
                {EDITABLE_ROLES.map(role => (
                  <th key={role} className="text-center py-3 px-2 text-muted-foreground font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PAGE_CONFIG.map(page => (
                <tr key={page.key} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-2 text-foreground">{page.label}</td>
                  {EDITABLE_ROLES.map(role => {
                    const key = `${role}:${page.key}`;
                    const enabled = permissionEnabled(defaults, key);
                    return (
                      <td key={role} className="text-center py-3 px-2">
                        <Switch
                          checked={enabled}
                          disabled={loadError || isSaving}
                          onCheckedChange={() => togglePermission(role, page.key)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Missing settings are off. Admin always has full access. Changes apply to everyone with that role; page switches do not replace business-level database permissions.
        </p>
      </CardContent>
    </Card>
  );
};
