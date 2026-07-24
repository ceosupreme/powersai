import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, HelpCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import { useClientProjects } from '@/hooks/useClientProjects';
import { useApprovalsExplainer } from '@/hooks/useApprovalsExplainer';
import { ApprovalsExplainer } from '@/components/approvals/ApprovalsExplainer';

export const ClientLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { data: projects = [] } = useClientProjects();
  const explainer = useApprovalsExplainer(user?.id ?? null);
  const projectName = projects[0]?.name ?? 'Approvals';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{projectName}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                Message approvals — nothing sends without your OK.
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!explainer.open && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={explainer.reopen}
                >
                  <HelpCircle className="mr-1 h-3.5 w-3.5" />
                  How this works
                </Button>
              )}
              {user?.email && (
                <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
                  {user.email}
                </span>
              )}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supabase.auth.signOut()}
                aria-label={user?.email ? `Sign out ${user.email}` : 'Sign out'}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
        {explainer.open && <ApprovalsExplainer onDismiss={explainer.dismiss} />}
        {children}
      </main>
    </div>
  );
};