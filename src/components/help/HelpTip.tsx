import { Info, X } from "lucide-react";
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
        "flex gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm",
        className,
      )}
    >
      <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <div className="flex-1 space-y-1">
        {title && <div className="font-medium">{title}</div>}
        <div className="text-muted-foreground">{children}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => dismiss(helpKey)}
        aria-label="Dismiss help"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}