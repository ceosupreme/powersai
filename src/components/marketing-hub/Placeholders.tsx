import { Card } from '@/components/ui/card';
import { CalendarRange, BarChart3 } from 'lucide-react';

export const CalendarPlaceholder = () => (
  <Card className="p-12 text-center">
    <CalendarRange className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
    <h3 className="font-semibold text-foreground">Campaign calendar</h3>
    <p className="text-sm text-muted-foreground mt-1">
      Day / week / month view of all campaigns. Coming in a future prompt.
    </p>
  </Card>
);

export const ResultsPlaceholder = () => (
  <Card className="p-12 text-center">
    <BarChart3 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
    <h3 className="font-semibold text-foreground">Results comparison</h3>
    <p className="text-sm text-muted-foreground mt-1">
      Side-by-side comparison of completed campaigns over time. Coming in a future prompt.
    </p>
  </Card>
);
