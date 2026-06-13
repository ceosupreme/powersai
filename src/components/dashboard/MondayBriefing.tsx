import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MondayBriefingProps {
  briefing: string;
  initialItemsToShow?: number;
}

// Helper function to parse briefing into bullet points
const parseBriefing = (briefing: string): string[] => {
  if (!briefing) return [];
  
  // First try explicit bullet points or numbered lists
  if (briefing.match(/^[\s]*[-•*\d\.]\s/m)) {
    return briefing
      .split(/\n/)
      .map(item => item.replace(/^[\s]*[-•*\d\.]+[\s]*/, '').trim())
      .filter(item => item.length > 0);
  }
  
  // Otherwise split by newlines only (preserve complete sentences)
  const items = briefing
    .split(/\n/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  return items;
};

export const MondayBriefing = ({ briefing, initialItemsToShow = 4 }: MondayBriefingProps) => {
  const [expanded, setExpanded] = useState(false);
  const briefingItems = parseBriefing(briefing);
  const shouldTruncate = briefingItems.length > initialItemsToShow;
  const displayItems = expanded || !shouldTruncate 
    ? briefingItems 
    : briefingItems.slice(0, initialItemsToShow);

  return (
    <div className="card-metric p-6 h-full flex flex-col">
      <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Monday Briefing
      </h3>
      
      <ul className="text-foreground flex-1 space-y-3 font-sans">
        {displayItems.length > 0 ? (
          displayItems.map((item, index) => (
            <li key={index} className="flex items-start gap-3 leading-relaxed text-sm">
              <span className="text-primary mt-1 flex-shrink-0">•</span>
              <span className="whitespace-pre-wrap">{item}</span>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground/60">No briefing available</li>
        )}
      </ul>
      
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm mt-4 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {briefingItems.length - initialItemsToShow} more
            </>
          )}
        </button>
      )}
    </div>
  );
};
