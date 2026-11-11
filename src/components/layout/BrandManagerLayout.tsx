import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarCheck, ClipboardList, Film, FolderOpen, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  { label: 'Today', to: '/workspace', tab: 'today', icon: CalendarCheck },
  { label: 'My plan', to: '/workspace?tab=plan', tab: 'plan', icon: ClipboardList },
  { label: 'Posts and videos', to: '/workspace?tab=posts', tab: 'posts', icon: Film },
  { label: 'Files', to: '/workspace?tab=files', tab: 'files', icon: FolderOpen },
] as const;

/** Brand operators use one focused navigation, without changing client/staff layouts.
 * Authorization remains enforced by database RLS, not by this component.
 */
export function BrandManagerLayout({ children }: { children: ReactNode }) {
  const { accessibleBars, selectedBar, setSelectedBar } = useApp();
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const tab = new URLSearchParams(location.search).get('tab') || 'today';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link to="/workspace" className="font-semibold text-lg">Supreme Team HQ</Link>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.full_name || 'Your brand workspace'}
            </p>
          </div>
          {accessibleBars.length > 1 ? (
            <label className="min-w-0 max-w-[48%] text-xs text-muted-foreground">
              <span className="sr-only">Active brand</span>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground"
                value={selectedBar?.id || ''}
                onChange={(e) => {
                  const chosen = accessibleBars.find((bar) => bar.id === e.target.value);
                  if (chosen) setSelectedBar(chosen);
                }}
              >
                <option value="" disabled>Choose a brand</option>
                {accessibleBars.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.bar_name}</option>
                ))}
              </select>
            </label>
          ) : (
            <span className="text-sm text-muted-foreground truncate max-w-[43%]">
              {selectedBar?.bar_name || 'No brand selected'}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl md:grid md:grid-cols-[205px_minmax(0,1fr)] md:gap-6 px-4 pb-24 md:pb-8">
        <nav className="hidden md:flex flex-col gap-1 pt-6" aria-label="Your brand workspace">
          {SECTIONS.map(({ label, to, tab: target, icon: Icon }) => (
            <Link key={to} to={to}
              className={cn('flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium',
                tab === target ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
              aria-current={tab === target ? 'page' : undefined}
            ><Icon className="w-5 h-5" />{label}</Link>
          ))}
        </nav>
        <main className="min-w-0 pt-5 md:pt-6">{children}</main>
      </div>
      <nav className="md:hidden fixed z-50 bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur"
        aria-label="Your brand workspace">
        <div className="grid grid-cols-4">
          {SECTIONS.map(({ label, to, tab: target, icon: Icon }) => (
            <Link key={to} to={to} className={cn(
              'flex flex-col items-center justify-center gap-1 min-h-16 px-1 py-2 text-[11px]',
              tab === target ? 'text-primary font-semibold' : 'text-muted-foreground'
            )} aria-current={tab === target ? 'page' : undefined}>
              <Icon className="w-5 h-5" /><span className="text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
