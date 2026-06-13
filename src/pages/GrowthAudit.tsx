import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, LayoutGrid, ListChecks, Lightbulb, Inbox, FileBarChart, History, Database, CalendarRange } from 'lucide-react';
import { OverviewView } from '@/components/growth-audit/OverviewView';
import { PlaceholderView } from '@/components/growth-audit/PlaceholderView';
import { FindingsView } from '@/components/growth-audit/findings/FindingsView';
import { ActionCenterView } from '@/components/growth-audit/action-packs/ActionCenterView';
import { ReportsView } from '@/components/growth-audit/reports/ReportsView';
import { DataSourcesView } from '@/components/growth-audit/data-sources/DataSourcesView';
import { HistoryView } from '@/components/growth-audit/history/HistoryView';
import ContextCalendarView from '@/components/growth-audit/context/ContextCalendarView';

const SUBVIEWS = [
  { value: 'overview', label: 'Overview', icon: LayoutGrid },
  { value: 'categories', label: 'Categories', icon: ListChecks },
  { value: 'findings', label: 'Findings', icon: Lightbulb },
  { value: 'context-calendar', label: 'Context Calendar', icon: CalendarRange },
  { value: 'action-center', label: 'Action Center', icon: Inbox },
  { value: 'reports', label: 'Reports', icon: FileBarChart },
  { value: 'history', label: 'History', icon: History },
  { value: 'data-sources', label: 'Data Sources', icon: Database },
];

const GrowthAudit = () => {
  const { isAdmin, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('subtab') || 'overview';
  const setSubTab = (v: string) => setSearchParams({ subtab: v });

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
      <div className="flex items-center gap-3 animate-fade-in-up border-l-4 border-l-emerald-500/70 pl-4">
        <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Growth Audit</h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-emerald-500/40 text-emerald-600">
              Mock data
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Find growth opportunities and turn them into ready-to-execute campaigns.
          </p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4 animate-fade-in-up stagger-1">
        <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 flex-wrap h-auto overflow-x-auto">
          {SUBVIEWS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><OverviewView /></TabsContent>
        <TabsContent value="findings"><FindingsView /></TabsContent>
        <TabsContent value="context-calendar"><ContextCalendarView /></TabsContent>
        <TabsContent value="action-center"><ActionCenterView /></TabsContent>
        <TabsContent value="reports"><ReportsView /></TabsContent>
        <TabsContent value="data-sources"><DataSourcesView /></TabsContent>
        <TabsContent value="history"><HistoryView /></TabsContent>
        {SUBVIEWS.filter(s => !['overview', 'findings', 'context-calendar', 'action-center', 'reports', 'data-sources', 'history'].includes(s.value)).map(s => (
          <TabsContent key={s.value} value={s.value}>
            <PlaceholderView title={s.label} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default GrowthAudit;
