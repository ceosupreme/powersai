import { ReactNode } from 'react';
import { PenSquare } from 'lucide-react';
import { hqSection } from '@/config/ownerNav';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { GlobalHeader } from './GlobalHeader';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { VenueLeadershipBottomNav } from './VenueLeadershipBottomNav';
import { useOwnerMode } from '@/hooks/useOwnerMode';
import { Button } from '@/components/ui/button';

interface VenueLeadershipLayoutProps {
  children: ReactNode;
}

export const VenueLeadershipLayout = ({ children }: VenueLeadershipLayoutProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mode = useOwnerMode();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        {!isMobile && <AppSidebar />}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <GlobalHeader showVenueSelector showDateSelector />
          <div data-hq-section={hqSection(pathname)} className="hq-page-content flex-1 overflow-auto px-3 md:px-6 py-4 md:py-6 pb-24 md:pb-8 mx-auto w-full">
            {children}
          </div>
        </main>
        {mode.showGMLogPrompts && !isMobile && (
          <Button
            onClick={() => navigate('/logs/new')}
            size="sm"
            variant="outline"
            className="fixed bottom-6 left-6 z-40 gap-2 shadow-lg"
          >
            <PenSquare className="h-4 w-4" />
            Daily Log
          </Button>
        )}
        <FloatingAskButton />
        {isMobile && <VenueLeadershipBottomNav />}
      </div>
    </SidebarProvider>
  );
};
