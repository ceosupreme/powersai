import { hqSection } from '@/config/ownerNav';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { GlobalHeader } from './GlobalHeader';
import { FloatingAskButton } from '@/components/shared/FloatingAskButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { PortfolioBottomNav } from './PortfolioBottomNav';

interface PortfolioLayoutProps {
  children: ReactNode;
}

export const PortfolioLayout = ({ children }: PortfolioLayoutProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isPortfolioPage = location.pathname === '/portfolio';

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        {!isMobile && <AppSidebar />}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <GlobalHeader showVenueSelector={!isPortfolioPage} showDateSelector={true} forceHideVenueSelector={isPortfolioPage} />
          <div data-hq-section={hqSection(location.pathname)} className="hq-page-content flex-1 overflow-auto px-3 md:px-6 py-4 md:py-6 pb-24 md:pb-8 mx-auto w-full">
            {children}
          </div>
        </main>
        <FloatingAskButton />
        {isMobile && <PortfolioBottomNav />}
      </div>
    </SidebarProvider>
  );
};
