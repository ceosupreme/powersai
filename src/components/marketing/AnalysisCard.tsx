import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AnalysisCardProps {
  explanation?: string;
}

export const AnalysisCard = ({ explanation }: AnalysisCardProps) => {
  if (!explanation) {
    return (
      <Card className="card-metric animate-fade-in-up">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm italic">
            Marketing analysis will be available once data is collected.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-metric animate-fade-in-up">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-4 border-l-2 border-primary/30">
          <p className="text-sm text-foreground leading-relaxed">
            {explanation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
