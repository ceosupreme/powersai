import { ReactNode, useRef, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { usePreview } from '@/context/PreviewContext';
import { UserRole, getRoleHome } from '@/types/roles';
import { getAllowedRoles } from '@/config/routes';
import { LoadingState } from '@/components/shared/LoadingState';
import { toast } from 'sonner';
import { PageKey } from '@/types/permissions';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  pageKey?: PageKey;
}

export const ProtectedRoute = ({ children, allowedRoles, pageKey }: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin, canAccessPage, signOut } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const { isPreview } = usePreview();
  const location = useLocation();
  const toastShownRef = useRef<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [roleSettleTimedOut, setRoleSettleTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading || roleLoading) {
      setTimedOut(false);
      const timer = setTimeout(() => setTimedOut(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, roleLoading]);

  // Once auth+role loaders report done but currentRole is still null (fresh
  // invite/session race between auth.users and user_roles), give the role a
  // short settle window before treating "no role" as terminal.
  useEffect(() => {
    if (!isLoading && !roleLoading && user && !currentRole) {
      setRoleSettleTimedOut(false);
      const timer = setTimeout(() => setRoleSettleTimedOut(true), 1500);
      return () => clearTimeout(timer);
    }
    setRoleSettleTimedOut(false);
  }, [isLoading, roleLoading, user, currentRole]);

  if ((isLoading || roleLoading) && !timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  if (timedOut && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // User is present but role hasn't populated yet — hold the loading state
  // through the short settle window instead of racing to a hardcoded fallback.
  if (!currentRole && !roleSettleTimedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  // Redirect to role-appropriate home on root/login
  if (currentRole && (location.pathname === '/' || location.pathname === '/login')) {
    const homeRoute = getRoleHome(currentRole);
    if (homeRoute && homeRoute !== location.pathname) {
      return <Navigate to={homeRoute} replace />;
    }
  }

  // Admin users bypass all role-gating
  if (isAdmin) {
    return <>{children}</>;
  }

  const effectiveRoles = allowedRoles || getAllowedRoles(location.pathname);

  // Settle window elapsed and still no role — render a terminal screen with
  // a single Sign out action. Do NOT toast (was causing a re-fire storm) and
  // do NOT redirect to /auth (which loops signed-in users right back here).
  if (!currentRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">No role assigned to this account</h1>
          <p className="text-sm text-muted-foreground">
            Your account is signed in but has no access role. Ask your admin to grant
            you access, then sign in again.
          </p>
          <Button
            onClick={async () => {
              await signOut();
              window.location.assign('/auth');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  if (currentRole && effectiveRoles && !effectiveRoles.includes(currentRole)) {
    // Show toast only once per denied path
    if (toastShownRef.current !== location.pathname) {
      toastShownRef.current = location.pathname;
      toast.error("You don't have access to this page");
    }
    return <Navigate to={getRoleHome(currentRole)} replace />;
  }

  // Per-page permission gate (admin already returned above)
  if (pageKey && !canAccessPage(pageKey)) {
    if (toastShownRef.current !== location.pathname) {
      toastShownRef.current = location.pathname;
      toast.error("You don't have access to this page");
    }
    return <Navigate to={getRoleHome(currentRole)} replace />;
  }

  return <>{children}</>;
};
