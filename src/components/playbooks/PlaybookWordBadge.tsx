import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PlaybookWord } from '@/lib/playbookStatus';

const WORD_TONE: Record<PlaybookWord, string> = {
  Written: 'border-signal-green/60 text-signal-green',
  Thin: 'border-gold/60 text-gold',
  Planned: 'border-border text-muted-foreground',
  Superseded: 'border-border text-muted-foreground',
  Archived: 'border-border text-muted-foreground',
};

/** The status is always the word; color only reinforces it. */
export function PlaybookWordBadge({ word }: { word: PlaybookWord }) {
  return <Badge variant="outline" className={cn('text-[10px]', WORD_TONE[word])}>{word}</Badge>;
}
