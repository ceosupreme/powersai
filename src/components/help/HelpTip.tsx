import { Info, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHelpState } from "@/hooks/useHelpState";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HelpTipProps {
  helpKey: string;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function HelpTip({ helpKey, title, children, className }: HelpTipProps) {
  const { helpEnabled, isDismissed, dismiss } = useHelpState();
  if (!helpEnabled || isDismissed(helpKey)) return null;

  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border border-border bg-card px-3 py-1 text-sm",
        className,
      )}
    >
      <details className="hq-help flex-1 min-w-0 rounded px-2">
        <summary>
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1">{title ?? 'How this works'}</span>
          <ChevronDown className="hq-help-chevron h-4 w-4 shrink-0 transition-transform" />
        </summary>
        <div className="pb-3 pt-1 leading-relaxed text-muted-foreground">{children}</div>
      </details>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => dismiss(helpKey)}
        aria-label={`Dismiss help: ${title ?? 'How this works'}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
