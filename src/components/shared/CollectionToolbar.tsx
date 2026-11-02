import { useId } from 'react';
import { Search, ArrowDownWideNarrow, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CollectionToolbar({ query, onQuery, placeholder = 'Search…', sort, onSort, options, count, total }: {
  query: string; onQuery: (value: string) => void; placeholder?: string;
  sort: string; onSort: (value: string) => void; options: readonly { value: string; label: string }[];
  count: number; total?: number;
}) {
  const id = useId();
  return <div className="hq-toolbar flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
    <div className="min-w-0 flex-1 basis-60 space-y-1.5">
      <Label htmlFor={`${id}-search`}>Search</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id={`${id}-search`} className="pl-9 pr-10" placeholder={placeholder} value={query} onChange={e => onQuery(e.target.value)} />
        {query && <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 p-2" aria-label="Clear search" onClick={() => onQuery('')}><X className="h-4 w-4" /></button>}
      </div>
    </div>
    <div className="min-w-0 basis-56 space-y-1.5">
      <Label htmlFor={`${id}-sort`} className="flex items-center gap-1.5"><ArrowDownWideNarrow className="h-4 w-4" />Sort by</Label>
      <Select value={sort} onValueChange={onSort}>
        <SelectTrigger id={`${id}-sort`}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <p className="pb-2 text-sm text-muted-foreground" role="status">{total != null && total !== count ? `${count} of ${total}` : count} {count === 1 ? 'item' : 'items'}</p>
  </div>;
}
