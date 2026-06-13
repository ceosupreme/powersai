import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Megaphone, LayoutGrid, CalendarDays, ListChecks, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { OverviewView } from '@/components/marketing-hub/OverviewView';
import { CampaignsView } from '@/components/marketing-hub/CampaignsView';
import { CampaignDetail } from '@/components/marketing-hub/CampaignDetail';
import { CalendarPlaceholder, ResultsPlaceholder } from '@/components/marketing-hub/Placeholders';

const SUBVIEWS = [
  { value: 'overview', label: 'Overview', icon: LayoutGrid },
  { value: 'calendar', label: 'Calendar', icon: CalendarDays },
  { value: 'campaigns', label: 'Campaigns', icon: ListChecks },
  { value: 'results', label: 'Results', icon: BarChart3 },
];

const MarketingHub = () => {
  const { isAdmin, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('subtab') || 'overview';
  const setSubTab = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('subtab', v);
    setSearchParams(next);
  };

  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  const openCampaign = (id: string) => setOpenCampaignId(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 animate-fade-in-up border-l-4 border-l-indigo-500/70 pl-4">
        <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-500">
          <Megaphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Marketing Hub</h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-indigo-500/40 text-indigo-600">
              Mock data
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Plan, schedule, and measure every campaign — no matter where it originated.
          </p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4 animate-fade-in-up stagger-1">
        <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 flex-wrap h-auto">
          {SUBVIEWS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value} value={value}
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><OverviewView onOpen={openCampaign} /></TabsContent>
        <TabsContent value="calendar"><CalendarPlaceholder /></TabsContent>
        <TabsContent value="campaigns"><CampaignsView onOpen={openCampaign} /></TabsContent>
        <TabsContent value="results"><ResultsPlaceholder /></TabsContent>
      </Tabs>

      <CampaignDetail
        campaignId={openCampaignId}
        open={!!openCampaignId}
        onOpenChange={(v) => !v && setOpenCampaignId(null)}
      />
    </div>
  );
};

export default MarketingHub;
