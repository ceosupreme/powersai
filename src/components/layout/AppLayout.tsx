import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/context/AuthContext';
import { usePreview } from '@/context/PreviewContext';
import { PortfolioLayout } from './PortfolioLayout';
import { VenueLeadershipLayout } from './VenueLeadershipLayout';
import { ShiftExecutionLayout } from './ShiftExecutionLayout';
import { ClientLayout } from './ClientLayout';
import { LoadingState } from '@/components/shared/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { layout, isLoading: roleLoading } = useRole();
  const { role: legacyRole } = useAuth();
  const { isPreview, previewRole, previewLayout, previewRoleLabel, setPreviewRole } = usePreview();

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  // Preview role overrides layout selection
  const effectiveLayout = (isPreview && previewLayout) ? previewLayout : (
    layout || (
      legacyRole === 'admin' || legacyRole === 'owner' ? 'portfolio' :
      legacyRole === 'gm' ? 'venue-leadership' :
      legacyRole === 'staff' || legacyRole === 'shift_lead' ? 'shift-execution' :
      'venue-leadership'
    )
  );

  const previewBanner = isPreview && (
    <div className="sticky top-0 z-[100] flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/90 text-amber-950 text-sm font-medium backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>Previewing as: <strong>{previewRoleLabel}</strong></span>
        <Badge variant="outline" className="bg-amber-600/20 text-amber-950 border-amber-700/30 text-xs">
          Temporary
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="h-7 text-amber-950 hover:bg-amber-600/30">
          <Link to="/" onClick={() => setPreviewRole(null)}>← Exit Preview</Link>
        </Button>
      </div>
    </div>
  );

  const wrappedChildren = (
    <>
      {previewBanner}
      {children}
    </>
  );

  switch (effectiveLayout) {
    case 'portfolio':
      return <PortfolioLayout>{wrappedChildren}</PortfolioLayout>;
    case 'venue-leadership':
      return <VenueLeadershipLayout>{wrappedChildren}</VenueLeadershipLayout>;
    case 'shift-execution':
      return <ShiftExecutionLayout>{wrappedChildren}</ShiftExecutionLayout>;
    case 'client':
      return <ClientLayout>{wrappedChildren}</ClientLayout>;
    default:
      return <VenueLeadershipLayout>{wrappedChildren}</VenueLeadershipLayout>;
  }
};
