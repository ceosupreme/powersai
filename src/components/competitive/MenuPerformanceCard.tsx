import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { MenuGroup } from '@/types/venue';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MenuPerformanceCardProps {
  menuGroups: MenuGroup[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

// Low performer threshold (bottom 20% of net sales)
const isLowPerformer = (menu: MenuGroup, allMenus: MenuGroup[]) => {
  if (allMenus.length === 0) return false;
  const sortedSales = allMenus.map(m => m.net_amount).sort((a, b) => a - b);
  const threshold = sortedSales[Math.floor(sortedSales.length * 0.2)] || 0;
  return menu.net_amount <= threshold;
};

export const MenuPerformanceCard = ({ menuGroups }: MenuPerformanceCardProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (!menuGroups || menuGroups.length === 0) {
    return (
      <div className="card-metric p-6">
        <h3 className="font-semibold text-foreground">Menu Breakdown</h3>
        <EmptyState 
          message="No menu data"
          title="No menu data"
          description="Menu group data will appear here once Toast data syncs."
          icon={<UtensilsCrossed className="w-6 h-6 text-muted-foreground" />}
          className="mt-2"
        />
      </div>
    );
  }

  const sortedMenus = [...menuGroups].sort((a, b) => b.net_amount - a.net_amount);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="card-metric p-6">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-amber" />
              <h3 className="font-semibold text-foreground">Menu Breakdown</h3>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Menu</TableHead>
                <TableHead className="text-right text-muted-foreground">Avg Price</TableHead>
                <TableHead className="text-right text-muted-foreground">Items</TableHead>
                <TableHead className="text-right text-muted-foreground">Net Sales</TableHead>
                <TableHead className="text-right text-muted-foreground">Discount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMenus.slice(0, showAll ? sortedMenus.length : 6).map((menu) => {
                const isLow = isLowPerformer(menu, menuGroups);
                
                return (
                  <TableRow key={menu.id}>
                    <TableCell className="font-medium text-foreground">
                      <span className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="h-4 w-4 text-gold" />}
                        {menu.menu_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-foreground">{formatCurrency(menu.avg_price)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{menu.item_qty}</TableCell>
                    <TableCell className="text-right text-foreground font-medium">{formatCurrency(menu.net_amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(menu.discount_amount)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {sortedMenus.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full mt-3 text-primary hover:text-primary/80"
            >
              {showAll ? 'Show less' : `Load ${sortedMenus.length - 6} more`}
            </Button>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
