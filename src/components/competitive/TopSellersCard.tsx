import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { TopItem, SalesMixCategory } from '@/types/venue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';

interface TopSellersCardProps {
  items: TopItem[];
}

type SortBy = 'sales' | 'quantity';

const getCategoryColor = (category: SalesMixCategory) => {
  switch (category) {
    case 'Food':
      return 'bg-blue/20 text-blue border-blue/30';
    case 'Beer':
      return 'bg-amber/20 text-amber border-amber/30';
    case 'Liquor':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Wine':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

export const TopSellersCard = ({ items }: TopSellersCardProps) => {
  const [sortBy, setSortBy] = useState<SortBy>('sales');
  const [showAll, setShowAll] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div className="card-metric p-6 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-gold" />
          <h3 className="font-semibold text-foreground">Top Sellers</h3>
        </div>
        <EmptyState 
          message="No top sellers data"
          title="No top sellers data"
          description="Top selling items will appear here once Toast data syncs."
          icon={<Trophy className="w-6 h-6 text-muted-foreground" />}
        />
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'sales') {
      return b.net_sales - a.net_sales;
    }
    return b.quantity_sold - a.quantity_sold;
  });

  return (
    <div className="card-metric p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gold" />
          <h3 className="font-semibold text-foreground">Top Sellers</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant={sortBy === 'sales' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('sales')}
            className="text-xs h-7 px-2"
          >
            Sales
          </Button>
          <Button
            variant={sortBy === 'quantity' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('quantity')}
            className="text-xs h-7 px-2"
          >
            Qty
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto space-y-2">
        {sortedItems.slice(0, showAll ? sortedItems.length : 5).map((item, index) => (
          <div key={item.id} className="flex items-center gap-3 py-1.5">
            <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${getCategoryColor(item.category)}`}>
              {item.category}
            </Badge>
            <span className="text-sm font-medium text-foreground w-16 text-right">
              {sortBy === 'sales' ? formatCurrency(item.net_sales) : item.quantity_sold}
            </span>
          </div>
        ))}
      </div>
      
      {sortedItems.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-primary hover:text-primary/80"
        >
          {showAll ? 'Show less' : `See ${sortedItems.length - 5} more`}
        </Button>
      )}
    </div>
  );
};
