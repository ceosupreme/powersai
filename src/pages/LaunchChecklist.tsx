import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Rocket, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { LAUNCH_CHECKLIST } from "@/config/launchChecklist";
import { useChecklist } from "@/hooks/useChecklist";

export default function LaunchChecklist() {
  const { isComplete, toggle, isLoading } = useChecklist();
  const total = LAUNCH_CHECKLIST.length;
  const done = LAUNCH_CHECKLIST.filter((i) => isComplete(i.key)).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 space-y-4">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Rocket className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Launch Checklist</h1>
          <p className="text-sm text-muted-foreground">Your real remaining steps before going live.</p>
        </div>
      </header>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">{done} of {total} complete</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {LAUNCH_CHECKLIST.map((item) => {
          const checked = isComplete(item.key);
          return (
            <Card key={item.key} className={checked ? "opacity-70" : undefined}>
              <CardContent className="p-4 flex gap-3">
                <Checkbox
                  checked={checked}
                  disabled={isLoading}
                  onCheckedChange={(v) => toggle(item.key, !!v)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className={`font-medium text-sm ${checked ? "line-through" : ""}`}>{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                  {item.link && (
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
                      <Link to={item.link.to}>
                        {item.link.label}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}