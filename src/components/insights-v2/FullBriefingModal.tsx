import { X, DollarSign, Users, Settings, Star, Megaphone, MessageSquare, Award, AlertTriangle, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseBriefingList } from '@/hooks/useWeeklyBriefing';
import { getScoreColor, getGradeFromScore } from '@/utils/scoring';
import type { WeeklyBriefingV2 } from '@/types/insights-v2';

interface FullBriefingModalProps {
  briefing: WeeklyBriefingV2 | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const sentimentColors = {
  Strong: 'text-emerald-400',
  Good: 'text-emerald-300',
  Mixed: 'text-yellow-400',
  Challenging: 'text-orange-400',
  Critical: 'text-red-400',
};

const pillarIcons = {
  Revenue: DollarSign,
  Labor: Users,
  Operations: Settings,
  Guest: Star,
  Marketing: Megaphone,
};

export const FullBriefingModal = ({ briefing, open, onOpenChange }: FullBriefingModalProps) => {
  if (!briefing) return null;

  const talkingPoints = parseBriefingList(briefing.talking_points_json, briefing.talking_points);
  const recognition = parseBriefingList(undefined, briefing.recognition);
  const coaching = parseBriefingList(undefined, briefing.coaching_needed);
  const nextWeekFocus = parseBriefingList(undefined, briefing.next_week_focus);

  const pillarScores = [
    { key: 'Revenue', score: briefing.revenue_score ?? 0 },
    { key: 'Labor', score: briefing.labor_score ?? 0 },
    { key: 'Operations', score: briefing.operations_score ?? 0 },
    { key: 'Guest', score: briefing.guest_experience_score ?? 0 },
    { key: 'Marketing', score: briefing.marketing_score ?? 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-bold text-foreground">
            Weekly Briefing
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Overall Score & Sentiment */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold ${getScoreColor(briefing.overall_score)}`}>
                {briefing.overall_score}
              </span>
              <span className="text-muted-foreground text-lg">/100</span>
              <span className={`text-2xl font-bold ml-2 ${getScoreColor(briefing.overall_score)}`}>
                ({getGradeFromScore(briefing.overall_score)})
              </span>
            </div>
            <span className={`text-lg font-medium ${sentimentColors[briefing.overall_sentiment]}`}>
              {briefing.overall_sentiment}
            </span>
          </div>

          {/* Headline */}
          <p className="text-lg text-foreground font-medium">
            {briefing.headline}
          </p>

          {/* Pillar Scores Row */}
          <div className="grid grid-cols-5 gap-3 p-4 bg-muted/30 rounded-xl">
            {pillarScores.map(({ key, score }) => {
              const Icon = pillarIcons[key as keyof typeof pillarIcons];
              return (
                <div key={key} className="flex flex-col items-center">
                  <Icon className={`w-5 h-5 mb-1 ${getScoreColor(score)}`} />
                  <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                    {score || '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {key}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Talking Points */}
          {talkingPoints.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Talking Points for Meeting</h3>
              </div>
              <ol className="space-y-2 pl-4">
                {talkingPoints.map((point, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground list-decimal">
                    {point}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Recognition */}
          {recognition.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-foreground">Recognition</h3>
              </div>
              <ul className="space-y-1.5 pl-5">
                {recognition.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground list-disc">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching Needed */}
          {coaching.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-foreground">Coaching Needed</h3>
              </div>
              <ul className="space-y-1.5 pl-5">
                {coaching.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground list-disc">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Week Focus */}
          {nextWeekFocus.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-foreground">Next Week Focus</h3>
              </div>
              <ol className="space-y-1.5 pl-4">
                {nextWeekFocus.map((item, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground list-decimal">
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
