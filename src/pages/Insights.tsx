import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Lightbulb, Loader2, Square, CheckSquare, Search, X } from 'lucide-react';
import { parseISO, compareDesc } from 'date-fns';
import { useLocation } from 'react-router-dom';

import { useApp } from '@/context/AppContext';
import { useActionItems, ActionCardWithWeek } from '@/hooks/useActionItems';
import { useAutoApproveConfig } from '@/hooks/useAutoApproveConfig';

import { updateActionItemApproval, updateInsightStatus } from '@/services/supabaseData';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useInsightApproval } from '@/hooks/useInsightApproval';

import { InsightsSummaryDashboard } from '@/components/insights/InsightsSummaryDashboard';
import { TopPriorities } from '@/components/insights/TopPriorities';
import { InsightFilters, PillarFilter, TimeFilter, SortBy } from '@/components/insights/InsightFilters';
import { ExpandableActionCard } from '@/components/shared/ExpandableActionCard';
import { InsightSection } from '@/components/insights/InsightSection';
import { ApprovedTasksModule } from '@/components/shared/ApprovedTasksModule';
import { RejectedTasksModule } from '@/components/shared/RejectedTasksModule';
import { BatchActionBar } from '@/components/insights/BatchActionBar';
import { InsightSearchResults } from '@/components/insights/InsightSearchResults';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useInsightSearch } from '@/hooks/useInsightSearch';


const PRIORITY_SECTIONS = [
  { key: 'Critical', title: 'Critical', icon: '🔴', colorClass: 'text-destructive', borderColorClass: 'border-destructive/30', defaultExpanded: false },
  { key: 'High', title: 'High', icon: '🟠', colorClass: 'text-orange', borderColorClass: 'border-orange/30', defaultExpanded: false },
  { key: 'Medium', title: 'Medium', icon: '🟡', colorClass: 'text-gold', borderColorClass: 'border-gold/30', defaultExpanded: false },
  { key: 'Low', title: 'Low', icon: '🟢', colorClass: 'text-signal-green', borderColorClass: 'border-signal-green/30', defaultExpanded: false },
] as const;

const ITEMS_PER_PAGE = 10;

const Insights = () => {
  const { selectedBar, setSelectedBar, isLoading: appLoading, accessibleBars } = useApp();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const showVenueFilter = isAdmin || accessibleBars.length > 1;

  const { processingIds, handleApprove, handleReject } = useInsightApproval();
  const location = useLocation();
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string[]>(['Critical', 'High', 'Medium', 'Low']);
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('thisWeek');
  const [sortBy, setSortBy] = useState<SortBy>('priority');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  // "All Venues" mode for owners/admins. When false, the filter is synced to the
  // global header's selectedBar so the two selectors never disagree.
  const [allVenuesMode, setAllVenuesMode] = useState<boolean>(false);
  const venueFilter: string = allVenuesMode ? 'all' : (selectedBar?.id ?? 'all');
  const setVenueFilter = useCallback((value: string) => {
    if (value === 'all') {
      setAllVenuesMode(true);
      return;
    }
    const bar = accessibleBars.find(b => b.id === value);
    if (bar) setSelectedBar(bar);
    setAllVenuesMode(false);
  }, [accessibleBars, setSelectedBar]);

  // Map UI TimeFilter to service's InsightTimeFilter. 'thisWeek' now means
  // rolling 7-day window (label: "Last 7 Days"); the state key stays
  // 'thisWeek' to avoid migrating persisted/URL state.
  const serviceTimeFilter =
    timeFilter === 'thisWeek' ? 'last7' :
    timeFilter === 'lastWeek' ? 'lastWeek' :
    timeFilter === 'last4' ? 'last4' :
    timeFilter === 'last8' ? 'last8' :
    'all';
  const { data: allCards = [], isLoading: cardsLoading } = useActionItems(
    venueFilter !== 'all' ? venueFilter : (showVenueFilter ? undefined : selectedBar?.id),
    serviceTimeFilter,
  );
  const capHit = (allCards as { __capHit?: boolean }).__capHit === true;
  const { config: autoApproveConfig } = useAutoApproveConfig();
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchText]);

  const { data: searchResults = [], isLoading: searchLoading } = useInsightSearch(
    debouncedSearch,
    showVenueFilter ? (venueFilter !== 'all' ? venueFilter : undefined) : selectedBar?.id
  );

  // Build venue name lookup from accessibleBars (already role-scoped)
  const venues = useMemo(() => accessibleBars.map(b => ({ id: b.id, name: b.bar_name })), [accessibleBars]);
  const venueNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of venues) map.set(v.id, v.name);
    return map;
  }, [venues]);

  const proposedCards = useMemo(() => allCards.filter(c => c.approval_status === 'Proposed'), [allCards]);
  const approvedCards = useMemo(() => allCards.filter(c => c.approval_status === 'Approved'), [allCards]);
  const rejectedCards = useMemo(() => allCards.filter(c => c.approval_status === 'Rejected'), [allCards]);

  // Always bounded to the current PT calendar week (Mon-Sun), independent of the page's date filter
  const currentWeekPriorityCards = useMemo(() => {
    const toMonday = (d: Date): Date => {
      const day = d.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      const m = new Date(d);
      m.setDate(d.getDate() + offset);
      m.setHours(0, 0, 0, 0);
      return m;
    };
    const todayParts = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }).split('-');
    const todayLocal = new Date(+todayParts[0], +todayParts[1] - 1, +todayParts[2]);
    const currentMonday = toMonday(todayLocal);

    return proposedCards.filter(card => {
      if (!card.weekStart) return false;
      const [y, mo, da] = card.weekStart.split('-').map(Number);
      const cardMonday = toMonday(new Date(y, mo - 1, da));
      return cardMonday.getTime() === currentMonday.getTime();
    });
  }, [proposedCards]);

  // Date scoping now happens server-side via timeFilter → useActionItems
  // (see resolveInsightDateRange in services/insightsSupabase.ts). This
  // memo only handles priority/pillar/venue.
  const filteredCards = useMemo(() => {
    return proposedCards.filter(card => {
      if (!priorityFilter.includes(card.priority)) return false;
      if (pillarFilter !== 'all' && card.pillar !== pillarFilter) return false;
      if (venueFilter !== 'all' && card.bar_id !== venueFilter) return false;
      return true;
    });
  }, [proposedCards, priorityFilter, pillarFilter, venueFilter]);

  const groupedCards = useMemo(() => ({
    Critical: filteredCards.filter(c => c.priority === 'Critical'),
    High: filteredCards.filter(c => c.priority === 'High'),
    Medium: filteredCards.filter(c => c.priority === 'Medium'),
    Low: filteredCards.filter(c => c.priority === 'Low'),
  }), [filteredCards]);

  const dateSortedCards = useMemo(() => {
    return [...filteredCards].sort((a, b) => {
      if (a.weekStart && b.weekStart) return compareDesc(parseISO(a.weekStart), parseISO(b.weekStart));
      if (a.weekStart) return -1;
      if (b.weekStart) return 1;
      return 0;
    });
  }, [filteredCards]);

  const PILLAR_SECTIONS = [
    { key: 'Revenue', title: 'Revenue', icon: '💰', colorClass: 'text-primary', borderColorClass: 'border-primary/30' },
    { key: 'Labor', title: 'Labor', icon: '👥', colorClass: 'text-blue-400', borderColorClass: 'border-blue-400/30' },
    { key: 'Operations', title: 'Operations', icon: '⚙️', colorClass: 'text-orange', borderColorClass: 'border-orange/30' },
    { key: 'Guest Experience', title: 'Guest Experience', icon: '⭐', colorClass: 'text-gold', borderColorClass: 'border-gold/30' },
  ] as const;

  const pillarGroupedCards = useMemo(() => {
    const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
    const grouped: Record<string, typeof filteredCards> = {};
    for (const section of PILLAR_SECTIONS) {
      grouped[section.key] = filteredCards
        .filter(c => c.pillar === section.key)
        .sort((a, b) => {
          const pDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
          if (pDiff !== 0) return pDiff;
          if (a.weekStart && b.weekStart) return compareDesc(parseISO(a.weekStart), parseISO(b.weekStart));
          return 0;
        });
    }
    return grouped;
  }, [filteredCards]);

  const handleResetFilters = useCallback(() => {
    setPriorityFilter(['Critical', 'High', 'Medium', 'Low']);
    setPillarFilter('all');
    setTimeFilter('all');
    setSortBy('priority');
    // Reset to header-synced single-venue scope (rather than "All Venues").
    setAllVenuesMode(false);
  }, []);

  const handleSearchResultClick = useCallback((result: { id: string; status: string | null }) => {
    if (result.status === 'Dismissed' || result.status === 'Consolidated') return;
    handleResetFilters();
    setSearchText('');
    setDebouncedSearch('');
    setTimeout(() => {
      const node = document.getElementById(`insight-card-${result.id}`);
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }, [handleResetFilters]);

  const handleRestoreInsight = useCallback(async (id: string) => {
    setRestoringId(id);
    try {
      await updateInsightStatus(id, 'New');
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      queryClient.invalidateQueries({ queryKey: ['insightSearch'] });
      toast({ title: 'Insight restored', description: 'Insight has been restored to active.' });
    } catch {
      toast({ title: 'Restore failed', variant: 'destructive' });
    } finally {
      setRestoringId(null);
    }
  }, [queryClient]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    const visibleIds = filteredCards.map(c => c.id);
    setSelectedIds(new Set(visibleIds));
  }, [filteredCards]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    const focusedId = (location.state as { focusCardId?: string } | null)?.focusCardId;
    if (!focusedId) return;

    setSortBy('date');
    setTimeFilter('all');
    setPillarFilter('all');
    setPriorityFilter(['Critical', 'High', 'Medium', 'Low']);
    setVisibleCount(prev => Math.max(prev, filteredCards.length || ITEMS_PER_PAGE));

    const timer = window.setTimeout(() => {
      const node = document.getElementById(`insight-card-${focusedId}`);
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [location.state, filteredCards.length]);

  // Resolve bar_code from a card's bar_id UUID using accessibleBars
  const resolveBarCode = useCallback((cardBarId?: string) => {
    if (!cardBarId) return selectedBar?.bar_id;
    const venue = accessibleBars.find(b => b.id === cardBarId);
    return venue?.bar_id || selectedBar?.bar_id;
  }, [accessibleBars, selectedBar?.bar_id]);

  const onApproveAction = useCallback(async (cardId: string, assigneeId?: string, _barCode?: string, note?: string, dueDate?: string, asanaGid?: string, mentionGids?: string[]) => {
    const card = proposedCards.find(c => c.id === cardId);
    if (!card) return;
    const cardBarCode = resolveBarCode(card.bar_id);
    await handleApprove(cardId, assigneeId, cardBarCode, note, dueDate, asanaGid, mentionGids);
  }, [proposedCards, resolveBarCode, handleApprove]);

  const onRejectAction = useCallback(async (cardId: string) => {
    await handleReject(cardId);
  }, [handleReject]);

  const handleBatchApprove = useCallback(async () => {
    setBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await updateActionItemApproval(id, { approval_status: 'Approved' });
      }
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      toast({ title: `${ids.length} actions approved`, description: 'All selected actions have been approved.' });
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Batch approve failed:', error);
      toast({ title: 'Batch approve failed', variant: 'destructive' });
    } finally { setBatchProcessing(false); }
  }, [selectedIds, queryClient]);

  const handleBatchReject = useCallback(async () => {
    setBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const allCardsList = queryClient.getQueryData<ActionCardWithWeek[]>(['actionItems', selectedBar?.id ?? 'all']) || [];
      for (const id of ids) {
        const card = allCardsList.find(c => c.id === id);
        if (card && !card.action_title) {
          await updateInsightStatus(id, 'Dismissed');
        } else {
          await updateActionItemApproval(id, { approval_status: 'Rejected' });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      toast({ title: `${ids.length} actions dismissed`, description: 'All selected actions have been rejected.' });
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Batch reject failed:', error);
      toast({ title: 'Batch dismiss failed', variant: 'destructive' });
    } finally { setBatchProcessing(false); }
  }, [selectedIds, queryClient, selectedBar]);

  const isLoading = appLoading || cardsLoading;
  const hasVisibleContent = sortBy === 'priority'
    ? PRIORITY_SECTIONS.some(s => priorityFilter.includes(s.key) && groupedCards[s.key as keyof typeof groupedCards].length > 0)
    : sortBy === 'date'
    ? dateSortedCards.length > 0
    : PILLAR_SECTIONS.some(s => (pillarGroupedCards[s.key]?.length ?? 0) > 0);

  const paginatedDateCards = dateSortedCards.slice(0, visibleCount);
  const hasMoreDateCards = dateSortedCards.length > visibleCount;

  return (
    <>
      <div className="pb-24 md:pb-6">
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Insights</h1>
              <a
                href="/insights/audit"
                className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
              >
                Audit log →
              </a>
            </div>
            {filteredCards.length > 0 && (
              <button
                onClick={selectedIds.size === filteredCards.length ? clearSelection : selectAllVisible}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedIds.size === filteredCards.length ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedIds.size === filteredCards.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            AI-powered insights and actions{showVenueFilter ? ' across your venues' : ` for ${selectedBar?.bar_name || 'your bar'}`}
          </p>
        </div>

        {/* Search */}
        <div className="mb-4 animate-fade-in-up stagger-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search all insights (including dismissed)…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9 pr-9 bg-card border-border"
            />
            {searchText && (
              <button
                onClick={() => { setSearchText(''); setDebouncedSearch(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {debouncedSearch.length >= 2 && (
            <div className="mt-2">
              <InsightSearchResults
                results={searchResults}
                isLoading={searchLoading}
                query={debouncedSearch}
                onClickResult={handleSearchResultClick}
                onRestore={handleRestoreInsight}
                restoringId={restoringId}
                venueNameMap={venueNameMap}
              />
            </div>
          )}
        </div>

        {!isLoading && (
          <div className="animate-fade-in-up stagger-2">
            <InsightsSummaryDashboard allCards={allCards as ActionCardWithWeek[]} />
          </div>
        )}

        {/* Top Priorities */}
        {!isLoading && proposedCards.length > 0 && (
          <div className="animate-fade-in-up stagger-2">
            <TopPriorities
              cards={currentWeekPriorityCards}
              onApprove={onApproveAction}
              onReject={onRejectAction}
              processingIds={processingIds}
              barCode={selectedBar?.bar_id}
              venueNameMap={venueNameMap}
            />
          </div>
        )}

        <div className="animate-fade-in-up stagger-3">
          <InsightFilters
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            pillarFilter={pillarFilter}
            setPillarFilter={setPillarFilter}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onReset={handleResetFilters}
            venues={showVenueFilter ? venues : undefined}
            venueFilter={venueFilter}
            setVenueFilter={setVenueFilter}
          />
          {timeFilter === 'all' && capHit && (
            <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Showing newest 5,000 insights. Older cards aren't loaded — narrow the time filter to see them.
            </div>
          )}
          {(timeFilter === 'thisWeek' || timeFilter === 'lastWeek') && (() => {
            const tParts = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }).split('-');
            const t = new Date(+tParts[0], +tParts[1] - 1, +tParts[2]);
            const day = t.getDay();
            const off = day === 0 ? -6 : 1 - day;
            const m = new Date(t); m.setDate(t.getDate() + off);
            if (timeFilter === 'lastWeek') m.setDate(m.getDate() - 7);
            const label = m.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-medium">
                  Week of {label}
                </span>
                <button
                  className="underline-offset-4 hover:underline hover:text-foreground"
                  onClick={() => setTimeFilter('all')}
                >
                  Show all weeks
                </button>
              </div>
            );
          })()}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative z-10" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up stagger-4">
            <div className="lg:col-span-2 space-y-4">
              {sortBy === 'priority' && PRIORITY_SECTIONS.map(section => {
                const sectionCards = groupedCards[section.key as keyof typeof groupedCards];
                if (!priorityFilter.includes(section.key) || sectionCards.length === 0) return null;
                return (
                  <InsightSection
                    key={section.key}
                    title={section.title}
                    icon={section.icon}
                    colorClass={section.colorClass}
                    borderColorClass={section.borderColorClass}
                    cards={sectionCards}
                    defaultExpanded={section.defaultExpanded}
                    onApprove={onApproveAction}
                    onReject={onRejectAction}
                    processingIds={processingIds}
                    barCode={selectedBar?.bar_id}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    autoApproveEnabled={autoApproveConfig.enabled}
                    venueNameMap={venueNameMap}
                  />
                );
              })}

              {sortBy === 'date' && paginatedDateCards.map((card, idx) => (
                <div id={`insight-card-${card.id}`} key={card.id} className="flex items-start gap-2" style={{ animationDelay: `${idx * 50}ms` }}>
                  <Checkbox
                    checked={selectedIds.has(card.id)}
                    onCheckedChange={() => toggleSelect(card.id)}
                    className="mt-4 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <ExpandableActionCard
                      card={card}
                      onApprove={onApproveAction}
                      onReject={onRejectAction}
                      isProcessing={processingIds.has(card.id)}
                      barCode={selectedBar?.bar_id}
                      venueName={venueNameMap.get(card.bar_id || '') || undefined}
                      initialExpanded={(location.state as { focusCardId?: string } | null)?.focusCardId === card.id}
                    />
                  </div>
                </div>
              ))}

              {sortBy === 'date' && hasMoreDateCards && (
                <button
                  onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                  className="w-full py-3 text-sm text-primary hover:text-primary/80 bg-card border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  Show more ({dateSortedCards.length - visibleCount} remaining)
                </button>
              )}

              {sortBy === 'pillar' && PILLAR_SECTIONS.map(section => {
                const sectionCards = pillarGroupedCards[section.key] || [];
                if (sectionCards.length === 0) return null;
                return (
                  <InsightSection
                    key={section.key}
                    title={section.title}
                    icon={section.icon}
                    colorClass={section.colorClass}
                    borderColorClass={section.borderColorClass}
                    cards={sectionCards}
                    defaultExpanded={true}
                    onApprove={onApproveAction}
                    onReject={onRejectAction}
                    processingIds={processingIds}
                    barCode={selectedBar?.bar_id}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    autoApproveEnabled={autoApproveConfig.enabled}
                    venueNameMap={venueNameMap}
                  />
                );
              })}

              {!hasVisibleContent && (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                  <Lightbulb className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No insights match your filters.</p>
                  <button onClick={handleResetFilters} className="text-primary text-sm mt-2 hover:underline">Reset filters</button>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <ApprovedTasksModule cards={approvedCards} />
              <RejectedTasksModule cards={rejectedCards} />
            </aside>
          </div>
        )}

        {selectedIds.size > 0 && (
          <BatchActionBar
            selectedCount={selectedIds.size}
            onApproveAll={handleBatchApprove}
            onRejectAll={handleBatchReject}
            onClearSelection={clearSelection}
            isProcessing={batchProcessing}
          />
        )}
      </div>
    </>
  );
};

export default Insights;
