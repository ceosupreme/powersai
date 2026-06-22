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
          <div className="flex-1 overflow-auto px-3 md:px-8 py-4 md:py-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
        <FloatingAskButton />
        {isMobile && <PortfolioBottomNav />}
      </div>
    </SidebarProvider>
  );
};
