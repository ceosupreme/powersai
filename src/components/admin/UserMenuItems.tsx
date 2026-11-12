import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { OWNER_NAV_GROUPS } from '@/config/ownerNav';
import { menuSwitchGroups, applyUserOverrides } from '@/lib/pageAccess';
import { PAGE_CONFIG } from '@/types/permissions';
import { useRoleDefaultPages, useUserPagePermissions, useSaveUserPagePermissions, useResetUserPagePermissions } from '@/hooks/usePagePermissions';

const GROUPS = menuSwitchGroups(OWNER_NAV_GROUPS);
const INNER = { label: 'Pages opened from inside HQ', rows: [{ pageKey: 'project_home', labels: ['Brand and project pages'], adminOnly: false, alwaysOn: false }] };
const KNOWN = PAGE_CONFIG.map(p => p.key);
const SWITCHABLE = [...new Set([...GROUPS, INNER].flatMap(g => g.rows).filter(r => !r.adminOnly).map(r => r.pageKey))];

/** Per-person side-menu switches, built from the side menu itself so the list never drifts. */
export function UserMenuItems({ userId, role, savedRole }: { userId: string; role: string; savedRole: string }) {
  const defaults = useRoleDefaultPages(role);
  const overrides = useUserPagePermissions(userId);
  const save = useSaveUserPagePermissions();
  const reset = useResetUserPagePermissions();
  const [desired, setDesired] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (!defaults.data || !overrides.data) return;
    const effective = new Set<string>(applyUserOverrides([...defaults.data] as any, overrides.data, KNOWN));
    setDesired(Object.fromEntries(SWITCHABLE.map(k => [k, k === 'dashboard' ? true : effective.has(k)])));
  }, [defaults.data, overrides.data]);

  const changedCount = useMemo(() => desired && defaults.data ? SWITCHABLE.filter(k => desired[k] !== defaults.data!.has(k)).length : 0, [desired, defaults.data]);

  if (role === 'admin') return <section className="space-y-1 rounded-md border border-border p-3">
    <h3 className="text-sm font-semibold">Menu items this person sees</h3>
    <p className="text-sm text-muted-foreground">Admins see every menu item.</p>
  </section>;

  const failed = defaults.isError || overrides.isError;
  const busy = save.isPending || reset.isPending;
  const onSave = async () => {
    if (!desired || !defaults.data) return;
    try { await save.mutateAsync({ userId, desired, roleDefaults: defaults.data }); toast.success('Menu items saved'); }
    catch (e: any) { toast.error(e?.message ? `Menu items not saved: ${e.message}` : 'Menu items not saved.'); }
  };
  const onReset = async () => {
    try { await reset.mutateAsync(userId); toast.success('Menu items reset to role defaults'); }
    catch (e: any) { toast.error(e?.message ? `Could not reset: ${e.message}` : 'Could not reset.'); }
  };

  const renderRow = (row: { pageKey: string; labels: string[]; adminOnly: boolean; alwaysOn: boolean }) => {
    const label = row.labels.join(', ');
    const id = `menu-${row.pageKey}-${row.labels[0]}`;
    const checked = row.adminOnly ? false : desired?.[row.pageKey] ?? false;
    const changed = !row.adminOnly && !row.alwaysOn && defaults.data && desired && desired[row.pageKey] !== defaults.data.has(row.pageKey);
    return <div key={id} className="flex min-h-11 items-center justify-between gap-3 py-1">
      <label htmlFor={id} className="text-sm">
        <span className={row.adminOnly ? 'text-muted-foreground' : ''}>{label}</span>
        {row.adminOnly && <span className="block text-xs text-muted-foreground">Admins only</span>}
        {row.alwaysOn && <span className="block text-xs text-muted-foreground">Always on</span>}
        {changed && <span className="block text-xs text-primary">Changed for this person</span>}
      </label>
      <Switch id={id} checked={row.alwaysOn || checked} disabled={row.adminOnly || row.alwaysOn || busy}
        onCheckedChange={v => setDesired(d => d ? { ...d, [row.pageKey]: v } : d)} />
    </div>;
  };

  return <section className="space-y-3 rounded-md border border-border p-3">
    <div className="space-y-1">
      <h3 className="text-sm font-semibold">Menu items this person sees</h3>
      <p className="text-xs text-muted-foreground">On shows the item in this person's menu and lets them open it. Off hides it. Role defaults are set in Admin Panel &gt; Permissions.</p>
      {role !== savedRole && <p className="text-xs text-muted-foreground">Switches compare against the newly chosen role. Save the role change first so the person's menu matches.</p>}
    </div>
    {failed ? <p role="alert" className="text-sm text-destructive">Could not load this person's menu items.</p>
      : !desired ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading menu items…</div>
      : <div className="space-y-4">
        {[...GROUPS, INNER].map(g => <div key={g.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
          <div className="divide-y divide-border/50">{g.rows.map(renderRow)}</div>
        </div>)}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" onClick={onSave} disabled={busy}>{save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save menu items</Button>
          <Button type="button" variant="outline" className="min-h-11" onClick={onReset} disabled={busy || (!changedCount && !(overrides.data?.length))}>Reset to role defaults</Button>
        </div>
      </div>}
  </section>;
}
