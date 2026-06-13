import { useState, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { ActionCardWithWeek } from '@/hooks/useActionItems';

interface TalkingPointsProps {
  actions: ActionCardWithWeek[];
}

const STOPWORDS = new Set([
  'the', 'to', 'and', 'a', 'an', 'is', 'was', 'were', 'are', 'be', 'been',
  'being', 'in', 'on', 'at', 'for', 'of', 'with', 'by', 'from', 'this',
  'that', 'it', 'its', 'has', 'had', 'have', 'not', 'but', 'or', 'so',
  'if', 'as', 'up', 'out', 'no', 'do', 'did', 'does', 'vs', 'than',
  'gm', 'unknown', 'during', 'while', 'after', 'before', 'into', 'about',
  'over', 'also', 'more', 'very', 'just', 'will', 'can', 'should', 'would',
  'could', 'may', 'need', 'new', 'making', 'creating', 'causing', 'affecting',
  'impacting', 'resulting', 'including',
]);

const ENTITY_KEYWORDS = new Set([
  'roach', 'roaches', 'pest', 'rodent', 'bathroom', 'restroom', 'comic',
  'checklist', 'task', 'tasks', 'supply', 'supplies', 'shortage', 'inventory',
  'cash', 'bank', 'register', 'void', 'voids', 'comp', 'comps',
  'overtime', 'scheduling', 'schedule', 'menu', 'knowledge', 'training',
  'maintenance', 'repair', 'broken', 'leak',
]);

function extractSignificantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = a.filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function isDuplicate(aWords: string[], bWords: string[]): boolean {
  if (jaccardSimilarity(aWords, bWords) >= 0.25) return true;
  const aEntities = aWords.filter(w => ENTITY_KEYWORDS.has(w));
  const bEntities = bWords.filter(w => ENTITY_KEYWORDS.has(w));
  if (aEntities.length > 0 && bEntities.length > 0) {
    const shared = aEntities.filter(e => bEntities.includes(e));
    if (shared.length >= 2) return true;
  }
  return false;
}

const SEVERITY_ORDER: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function smartDedup(items: ActionCardWithWeek[]): ActionCardWithWeek[] {
  const withTitle = items.filter(a => a.insight_title);
  if (withTitle.length === 0) return [];

  const wordCache = withTitle.map(item => extractSignificantWords(item.insight_title || ''));
  const removed = new Set<number>();

  for (let i = 0; i < withTitle.length; i++) {
    if (removed.has(i)) continue;
    for (let j = i + 1; j < withTitle.length; j++) {
      if (removed.has(j)) continue;
      if (isDuplicate(wordCache[i], wordCache[j])) {
        const sevI = SEVERITY_ORDER[withTitle[i].priority] || 0;
        const sevJ = SEVERITY_ORDER[withTitle[j].priority] || 0;
        if (sevJ > sevI || (sevJ === sevI && (withTitle[j].insight_summary?.length || 0) > (withTitle[i].insight_summary?.length || 0))) {
          removed.add(i);
          break;
        } else {
          removed.add(j);
        }
      }
    }
  }

  return withTitle.filter((_, i) => !removed.has(i));
}

export function TalkingPoints({ actions }: TalkingPointsProps) {
  const [showAll, setShowAll] = useState(false);
  const unique = useMemo(() => smartDedup(actions), [actions]);
  const capped = unique.slice(0, 5);
  const visible = showAll ? capped : capped.slice(0, 3);
  const remaining = capped.length - 3;
  const extraCount = unique.length - 5;

  if (unique.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <MessageSquare className="w-5 h-5 text-muted-foreground mx-auto mb-2 opacity-40" />
        <p className="text-sm text-muted-foreground">Meeting prep generates after weekly insights run</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Talking Points</h3>
      </div>
      <ol className="space-y-2">
        {visible.map((item, i) => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{item.insight_title}</p>
              {item.insight_summary && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.insight_summary}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-3 mt-3">
        {!showAll && remaining > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-primary hover:underline"
          >
            Show {remaining} More ↓
          </button>
        )}
        {extraCount > 0 && (
          <span className="text-[10px] text-muted-foreground">(+{extraCount} more)</span>
        )}
      </div>
    </div>
  );
}
