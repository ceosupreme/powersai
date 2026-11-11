import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, ClipboardList, Film, FolderOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const NAV = [
  { key: 'today', label: 'Today', icon: CalendarDays },
  { key: 'plan', label: 'My plan', icon: ClipboardList },
  { key: 'posts', label: 'Posts & videos', icon: Film },
  { key: 'files', label: 'Files', icon: FolderOpen },
] as const;

export function BrandManagerLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const view = location.pathname === '/workspace' ? (params.get('view') ?? 'today') : '';
  const brandId = params.get('brand');
  const href = (key: string) => {
    const search = new URLSearchParams({ view: key });
    if (brandId) search.set('brand', brandId);
    return `/workspace?${search.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-widest uppercase text-muted-foreground">Supreme Team HQ</p>
            <p className="text-lg font-semibold">Your brand workspace</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            onClick={async () => {
              try { await signOut(); navigate('/auth', { replace: true }); }
              catch { /* The account session is already cleared locally by signOut. */ }
            }}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
        <nav aria-label="Brand manager navigation" className="mx-auto max-w-5xl px-4 flex flex-wrap gap-1 pb-2">
          {NAV.map(({ key, label, icon: Icon }) => (
            <Link key={key} to={href(key)}
              aria-current={view === key ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                view === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
              )}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6 pb-24">
        {children}
      </main>
    </div>
  );
}
