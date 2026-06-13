import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export type PillarFilter = 'all' | 'Revenue' | 'Labor' | 'Operations' | 'Guest Experience';
export type TimeFilter = 'all' | 'thisWeek' | 'lastWeek' | 'last4' | 'last8';
export type SortBy = 'priority' | 'date' | 'pillar';

interface VenueOption {
  id: string;
  name: string;
}

interface InsightFiltersProps {
  priorityFilter: string[];
  setPriorityFilter: (value: string[]) => void;
  pillarFilter: PillarFilter;
  setPillarFilter: (value: PillarFilter) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (value: TimeFilter) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  onReset: () => void;
  venues?: VenueOption[];
  venueFilter?: string;
  setVenueFilter?: (value: string) => void;
}

const ALL_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export const InsightFilters = ({
  priorityFilter,
  setPriorityFilter,
  pillarFilter,
  setPillarFilter,
  timeFilter,
  setTimeFilter,
  sortBy,
  setSortBy,
  onReset,
  venues,
  venueFilter,
  setVenueFilter,
}: InsightFiltersProps) => {
  const allSelected = priorityFilter.length === 4;
  const priorityDropdownValue = allSelected ? 'all' : priorityFilter[0] || 'all';

  const hasFilters =
    !allSelected ||
    pillarFilter !== 'all' ||
    timeFilter !== 'all' ||
    sortBy !== 'priority' ||
    (venueFilter && venueFilter !== 'all');

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      setPriorityFilter(ALL_PRIORITIES);
    } else {
      // Show selected priority and all above it
      const idx = ALL_PRIORITIES.indexOf(value);
      setPriorityFilter(ALL_PRIORITIES.slice(0, idx + 1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Venue Filter (owner mode) */}
      {venues && venues.length > 0 && setVenueFilter && (
        <Select value={venueFilter || 'all'} onValueChange={(v) => setVenueFilter(v)}>
          <SelectTrigger className="w-[130px] sm:w-[170px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
            <SelectValue placeholder="Venue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {venues.map(v => (
              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Priority Filter */}
      <Select value={priorityDropdownValue} onValueChange={handlePriorityChange}>
        <SelectTrigger className="w-[120px] sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="Critical">Critical</SelectItem>
          <SelectItem value="High">High</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Pillar Filter */}
      <Select value={pillarFilter} onValueChange={(v) => setPillarFilter(v as PillarFilter)}>
        <SelectTrigger className="w-[110px] sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
          <SelectValue placeholder="Pillar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Pillars</SelectItem>
          <SelectItem value="Revenue">Revenue</SelectItem>
          <SelectItem value="Labor">Labor</SelectItem>
          <SelectItem value="Operations">Delivery</SelectItem>
          <SelectItem value="Guest Experience">Client Experience</SelectItem>
        </SelectContent>
      </Select>

      {/* Time Filter */}
      <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <SelectTrigger className="w-[100px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="thisWeek">Last 7 Days</SelectItem>
          <SelectItem value="lastWeek">Last Week</SelectItem>
          <SelectItem value="last4">Last 4 Wks</SelectItem>
          <SelectItem value="last8">Last 8 Wks</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
        <SelectTrigger className="w-[100px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm bg-card border-border">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="date">Date</SelectItem>
          <SelectItem value="pillar">Pillar</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset Button */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-muted-foreground hover:text-foreground h-9 sm:h-10 px-2 sm:px-3"
        >
          <RotateCcw className="w-4 h-4 sm:mr-1" />
          <span className="hidden sm:inline">Reset</span>
        </Button>
      )}
    </div>
  );
};
