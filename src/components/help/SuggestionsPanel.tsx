import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { useSuggestions, type Suggestion } from "@/hooks/useSuggestions";
import { useHelpState } from "@/hooks/useHelpState";

type Props = {
  /** Filter to a single scope. If omitted, shows all unscoped + all suggestions. */
  filter?: (s: Suggestion) => boolean;
  title?: string;
  /** Hide entirely when there's nothing to suggest (don't render an "all clear"). */
  hideWhenEmpty?: boolean;
  className?: string;
};

export function SuggestionsPanel({ filter, title = "Suggested next steps", hideWhenEmpty, className }: Props) {
  const { suggestions, isLoading, helpEnabled } = useSuggestions();
  const { dismiss } = useHelpState();

  if (!helpEnabled) return null;
  if (isLoading) return null;

  const items = filter ? suggestions.filter(filter) : suggestions;

  if (items.length === 0) {
    if (hideWhenEmpty) return null;
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          You're all caught up.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" /> {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((s) => (
          <div
            key={s.dismissKey}
            className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/30 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.body}</div>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to={s.href}>
                {s.ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => dismiss(s.dismissKey)}
              aria-label="Dismiss suggestion"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}