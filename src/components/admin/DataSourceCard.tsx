import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Cloud, CheckCircle2 } from 'lucide-react';

export const DataSourceCard = () => {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Data Source</CardTitle>
              <CardDescription>
                All data is sourced from the automated cloud pipeline
              </CardDescription>
            </div>
          </div>
          <Badge variant="default">Cloud</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-signal-green flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Automated Pipeline Active</p>
            <p className="text-xs text-muted-foreground mt-1">
              Insights are generated from Toast POS data, 7shifts, and manager logs. No manual configuration needed.
            </p>
          </div>
          <Cloud className="h-5 w-5 text-primary ml-auto flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
