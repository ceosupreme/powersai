import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePreview } from '@/context/PreviewContext';
import { UserRole, roleToHomeRoute, ROLE_LABELS } from '@/types/roles';
import { LoadingState } from '@/components/shared/LoadingState';

const ROLE_SLUGS: Record<string, UserRole> = {
  owner: 'owner',
  gm: 'gm',
  lead: 'lead',
  foh: 'foh',
  boh: 'boh',
};

const RolePreview = () => {
  const { role: roleParam } = useParams<{ role: string }>();
  const { isAdmin } = useAuth();
  const { setPreviewRole } = usePreview();
  const navigate = useNavigate();

  const targetRole = roleParam ? ROLE_SLUGS[roleParam] : null;

  useEffect(() => {
    if (!isAdmin || !targetRole) return;
    
    setPreviewRole(targetRole);
    const homeRoute = roleToHomeRoute[targetRole];
    navigate(homeRoute, { replace: true });
  }, [targetRole, isAdmin, setPreviewRole, navigate]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!targetRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingState message={`Loading ${ROLE_LABELS[targetRole]} preview...`} />
    </div>
  );
};

export default RolePreview;
