import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export const PlaceholderView = ({ title }: { title: string }) => (
  <Card className="p-12 flex flex-col items-center justify-center text-center bg-card/30 border-dashed">
    <div className="p-3 rounded-xl bg-accent/20 text-accent-foreground mb-4">
      <Sparkles className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    <p className="text-sm text-muted-foreground mt-1">Coming in next phase</p>
  </Card>
);
