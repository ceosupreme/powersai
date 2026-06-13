import { ReactNode, useRef, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/context/RoleContext';
import { usePreview } from '@/context/PreviewContext';
import { UserRole, roleToHomeRoute } from '@/types/roles';
import { getAllowedRoles } from '@/config/routes';
import { LoadingState } from '@/components/shared/LoadingState';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const { isPreview } = usePreview();
  const location = useLocation();
  const toastShownRef = useRef<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading || roleLoading) {
      setTimedOut(false);
      const timer = setTimeout(() => setTimedOut(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, roleLoading]);

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

  // Redirect to role-appropriate home on root/login
  if (currentRole && (location.pathname === '/' || location.pathname === '/login')) {
    const homeRoute = roleToHomeRoute[currentRole];
    if (homeRoute && homeRoute !== location.pathname) {
      return <Navigate to={homeRoute} replace />;
    }
  }

  // Admin users bypass all role-gating
  if (isAdmin) {
    return <>{children}</>;
  }

  const effectiveRoles = allowedRoles || getAllowedRoles(location.pathname);

  // Block users with no assigned role from role-gated routes
  // Redirect to /dashboard instead of /auth to avoid infinite loop
  if (!currentRole && effectiveRoles) {
    return <Navigate to="/dashboard" replace />;
  }

  if (currentRole && effectiveRoles && !effectiveRoles.includes(currentRole)) {
    // Show toast only once per denied path
    if (toastShownRef.current !== location.pathname) {
      toastShownRef.current = location.pathname;
      toast.error("You don't have access to this page");
    }
    return <Navigate to={roleToHomeRoute[currentRole]} replace />;
  }

  return <>{children}</>;
};
