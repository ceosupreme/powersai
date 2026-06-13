import { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Target } from 'lucide-react';

interface DashboardBriefingProps {
  briefing?: unknown;
  wins?: unknown;
  keyDrivers?: unknown;
}

// Helper function to parse text into bullet points
const parseTextToItems = (text: unknown): string[] => {
  if (Array.isArray(text)) {
    return text.length > 0 ? parseTextToItems(text[0]) : [];
  }
  if (!text || typeof text !== 'string') return [];
  if (text.match(/^[\s]*[-•*\d\.]\s/m)) {
    return text
      .split(/\n/)
      .map(item => item.replace(/^[\s]*[-•*\d\.]+\s*/, '').trim())
      .filter(item => item.length > 0);
  }
  return text
    .split(/\n/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

export const DashboardBriefing = ({ briefing, wins, keyDrivers }: DashboardBriefingProps) => {
  const [expanded, setExpanded] = useState(false);
  const initialItemsToShow = 4;
  
  const briefingItems = parseTextToItems(briefing);
  const winsItems = parseTextToItems(wins);
  const driversItems = parseTextToItems(keyDrivers);
  
  const shouldTruncateBriefing = briefingItems.length > initialItemsToShow;
  const displayBriefingItems = expanded || !shouldTruncateBriefing
    ? briefingItems
    : briefingItems.slice(0, initialItemsToShow);

  return (
    <div className="card-metric p-6 animate-fade-in-up">
      <h3 className="text-sm font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        This Week's Briefing
      </h3>
      
      <ul className="text-foreground space-y-3 font-sans mb-6">
        {displayBriefingItems.length > 0 ? (
          displayBriefingItems.map((item, index) => (
            <li key={index} className="flex items-start gap-3 leading-relaxed text-sm">
              <span className="text-primary mt-1 flex-shrink-0">•</span>
              <span className="whitespace-pre-wrap">{item}</span>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground/60">No briefing available — check back after weekly data processing.</li>
        )}
      </ul>
      
      {shouldTruncateBriefing && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm mb-6 transition-colors"
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-signal-green mb-3">
            <Trophy className="w-4 h-4" />
            Wins
          </h4>
          <ul className="space-y-2">
            {winsItems.length > 0 ? (
              winsItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground/90">
                  <span className="text-signal-green mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground/60 text-sm">No wins recorded</li>
            )}
          </ul>
        </div>
        
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gold mb-3">
            <Target className="w-4 h-4" />
            Key Drivers
          </h4>
          <ul className="space-y-2">
            {driversItems.length > 0 ? (
              driversItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground/90">
                  <span className="text-gold mt-0.5 flex-shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground/60 text-sm">No drivers recorded</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
