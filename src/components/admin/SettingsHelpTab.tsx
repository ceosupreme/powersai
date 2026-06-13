import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { RotateCcw, HelpCircle, Rocket, Sparkles } from "lucide-react";
import { useHelpState } from "@/hooks/useHelpState";

export function SettingsHelpTab() {
  const {
    helpEnabled, dismissedKeys, setHelpEnabled, resetAll, isLoading,
    setupCompletedAt, setupSkippedAt, relaunchSetup,
  } = useHelpState();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Help & Guidance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Show help across the app</Label>
              <p className="text-xs text-muted-foreground">
                When off, all tooltips and info boxes are hidden everywhere.
              </p>
            </div>
            <Switch
              checked={helpEnabled}
              disabled={isLoading}
              onCheckedChange={setHelpEnabled}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Dismissed help items</Label>
              <p className="text-xs text-muted-foreground">
                {dismissedKeys.length === 0
                  ? "Nothing dismissed yet."
                  : `${dismissedKeys.length} help item${dismissedKeys.length === 1 ? "" : "s"} currently hidden by you.`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || dismissedKeys.length === 0}
              onClick={() => resetAll()}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset all
            </Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Setup wizard</Label>
              <p className="text-xs text-muted-foreground">
                {setupCompletedAt
                  ? `Completed ${new Date(setupCompletedAt).toLocaleDateString()}.`
                  : setupSkippedAt
                  ? `Skipped ${new Date(setupSkippedAt).toLocaleDateString()}.`
                  : "Not run yet."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => relaunchSetup()}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Re-launch wizard
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Go to</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/help">
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Help Center
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/launch">
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              Launch Checklist
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}