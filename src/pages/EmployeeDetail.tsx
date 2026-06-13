import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useEmployeeDetail, useVenuesByIds } from '@/hooks/useEmployeeDetail';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeCompliance } from '@/hooks/useEmployeeCompliance';
import { useEmployeeTimeEntries } from '@/hooks/useEmployeeTimeEntries';
import { useEmployeeSentimentEvents } from '@/hooks/useEmployeeSentimentEvents';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OverviewTab } from '@/components/employees/tabs/OverviewTab';
import { ComplianceTab } from '@/components/employees/tabs/ComplianceTab';
import { PerformanceTab } from '@/components/employees/tabs/PerformanceTab';
import { ActivityTab } from '@/components/employees/tabs/ActivityTab';

const TABS = ['overview', 'compliance', 'performance', 'activity'] as const;
type TabKey = typeof TABS[number];

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedBar } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as TabKey) || 'overview';
  const tab: TabKey = TABS.includes(tabParam) ? tabParam : 'overview';

  const { data: profile, isLoading: loadingProfile } = useEmployeeDetail(id);

  // Choose which venue context to use. Default = profile.venue_id (the
  // employee's primary). If user is currently scoped to a different venue
  // and the employee lists it in additional_venues, we still default to
  // primary for stability.
  const venueOptions = useMemo(() => {
    if (!profile) return [] as string[];
    const all: string[] = [profile.venue_id];
    for (const v of profile.additional_venues || []) if (!all.includes(v)) all.push(v);
    return all;
  }, [profile]);

  const [activeVenue, setActiveVenue] = useState<string | null>(null);
  useEffect(() => {
    if (profile && !activeVenue) {
      // Prefer current selectedBar if employee has access there.
      if (selectedBar?.id && venueOptions.includes(selectedBar.id)) {
        setActiveVenue(selectedBar.id);
      } else {
        setActiveVenue(profile.venue_id);
      }
    }
  }, [profile, selectedBar, venueOptions, activeVenue]);

  const { data: venues = [] } = useVenuesByIds(venueOptions);
  const { data: compliance = [] } = useEmployeeCompliance(id, activeVenue, 180);

  const [activityWindow, setActivityWindow] = useState(90);
  const { data: timeEntries = [], isFetching: loadingTE } = useEmployeeTimeEntries(id, activeVenue, activityWindow);
  const { data: sentimentEvents = [] } = useEmployeeSentimentEvents(id, 90);

  // Pull aggregated row from list for tenure/hours/sd. Run for the active venue.
  const { data: list = [] } = useEmployees(activeVenue);
  const row = useMemo(() => list.find(r => r.id === id) ?? null, [list, id]);

  if (loadingProfile) {
    return <div className="container mx-auto px-4 py-6 text-muted-foreground">Loading…</div>;
  }
  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="mt-4 text-muted-foreground">Person not found.</div>
      </div>
    );
  }

  const showVenueSwitcher = venueOptions.length > 1;

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-8 space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
        <ArrowLeft className="w-4 h-4 mr-1" /> All employees
      </Button>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{profile.display_name}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {profile.role_primary || '—'}
              {profile.role_secondary ? ` · ${profile.role_secondary}` : ''}
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {profile.is_active ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
              {row?.tenure_days !== null && row?.tenure_days !== undefined && (
                <span className="text-xs text-muted-foreground">{row.tenure_days} days tenure</span>
              )}
            </div>
          </div>

          {showVenueSwitcher && activeVenue && (
            <div className="min-w-[200px]">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">Venue context</div>
              <Select value={activeVenue} onValueChange={setActiveVenue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {venueOptions.map(vid => {
                    const v = venues.find(x => x.id === vid);
                    return <SelectItem key={vid} value={vid}>{v?.name || vid.slice(0, 8)}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const params = new URLSearchParams(searchParams);
          params.set('tab', v);
          setSearchParams(params, { replace: true });
        }}
      >
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab profile={profile} row={row} compliance={compliance} />
        </TabsContent>
        <TabsContent value="compliance" className="mt-4">
          <ComplianceTab compliance={compliance} profile={profile} timeEntries={timeEntries} />
        </TabsContent>
        <TabsContent value="performance" className="mt-4">
          <PerformanceTab profile={profile} row={row} compliance={compliance} />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTab
            profile={profile}
            timeEntries={timeEntries}
            compliance={compliance}
            sentimentEvents={sentimentEvents}
            windowDays={activityWindow}
            onLoadMore={() => setActivityWindow(w => w + 90)}
            loading={loadingTE}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;
