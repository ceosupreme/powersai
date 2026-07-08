import { useState, useMemo } from 'react';
import { Bot, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAutoApproveConfig, useAutoApproveLog } from '@/hooks/useAutoApproveConfig';
import { toast } from '@/hooks/use-toast';
import { format, parseISO, startOfWeek } from 'date-fns';

export const AutoApproveSettingsCard = () => {
  const { config, updateConfig, isUpdating } = useAutoApproveConfig();
  const { data: logEntries = [] } = useAutoApproveLog();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStats = useMemo(() => {
    const thisWeek = logEntries.filter(e => new Date(e.created_at) >= weekStart);
    const autoApproved = thisWeek.filter(e => e.status === 'Active').length;
    const revoked = thisWeek.filter(e => e.status === 'Revoked').length;
    const estMinutes = autoApproved * 2; // ~2 min saved per auto-approved item
    return { autoApproved, revoked, estMinutes };
  }, [logEntries, weekStart]);

  const handleSave = async (updates: Partial<typeof config>) => {
    try {
      await updateConfig({ ...config, ...updates });
      toast({ title: 'Settings saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Auto-Approve</h3>
              <p className="text-xs text-muted-foreground">Automatically approve low-risk actions</p>
            </div>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => handleSave({ enabled })}
            disabled={isUpdating}
          />
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Rule 1: Severity Thresholds */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Rule 1 — Severity by Project Score</h4>
            <p className="text-xs text-muted-foreground">Auto-approve low-risk actions when project is performing well</p>

            <div className="space-y-4 mt-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">LOW severity auto-approve when score ≥</span>
                  <span className="text-sm font-semibold text-primary">{config.severity_thresholds.Low}</span>
                </div>
                <Slider
                  value={[config.severity_thresholds.Low]}
                  min={50} max={100} step={1}
                  onValueCommit={([v]) => handleSave({ severity_thresholds: { ...config.severity_thresholds, Low: v } })}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">MEDIUM severity auto-approve when score ≥</span>
                  <span className="text-sm font-semibold text-primary">{config.severity_thresholds.Medium}</span>
                </div>
                <Slider
                  value={[config.severity_thresholds.Medium]}
                  min={50} max={100} step={1}
                  onValueCommit={([v]) => handleSave({ severity_thresholds: { ...config.severity_thresholds, Medium: v } })}
                />
              </div>
              {['HIGH', 'CRITICAL'].map(level => (
                <div key={level} className="flex items-center justify-between py-2 opacity-50">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" /> {level} severity
                  </span>
                  <span className="text-xs text-muted-foreground">Always requires manual review</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rule 2: Repeat Matching */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Rule 2 — Repeat Action Matching</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-approve actions matching previously approved patterns</p>
              </div>
              <Switch
                checked={config.repeat_matching.enabled}
                onCheckedChange={(enabled) => handleSave({ repeat_matching: { ...config.repeat_matching, enabled } })}
                disabled={isUpdating}
              />
            </div>

            {config.repeat_matching.enabled && (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">Match window:</span>
                  <Select
                    value={String(config.repeat_matching.window_weeks)}
                    onValueChange={(v) => handleSave({ repeat_matching: { ...config.repeat_matching, window_weeks: Number(v) } })}
                  >
                    <SelectTrigger className="w-[120px] h-9 text-sm bg-card border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[4, 8, 12, 26, 52].map(w => (
                        <SelectItem key={w} value={String(w)}>{w} weeks</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {advancedOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Advanced
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">Similarity threshold</span>
                      <span className="text-sm font-semibold text-primary">{config.repeat_matching.similarity_threshold}%</span>
                    </div>
                    <Slider
                      value={[config.repeat_matching.similarity_threshold]}
                      min={50} max={100} step={1}
                      onValueCommit={([v]) => handleSave({ repeat_matching: { ...config.repeat_matching, similarity_threshold: v } })}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      When an action title closely matches one you've manually approved before for the same project and pillar, it will be auto-approved
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </div>

          {/* Rule 3: Pillar Overrides */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Rule 3 — Pillar Overrides</h4>
            <p className="text-xs text-muted-foreground">Enable auto-approve per pillar</p>
            <div className="flex flex-wrap gap-4 mt-2">
              {['Revenue', 'Labor', 'Operations', 'Guest Experience'].map(pillar => (
                <div key={pillar} className="flex items-center gap-2">
                  <Switch
                    checked={config.pillar_overrides[pillar] ?? true}
                    onCheckedChange={(checked) => handleSave({ pillar_overrides: { ...config.pillar_overrides, [pillar]: checked } })}
                    disabled={isUpdating}
                  />
                  <span className="text-sm text-foreground">{pillar}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Turn OFF a pillar to require manual review for all actions in that category, regardless of severity
            </p>
          </div>

          {/* Activity Section */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Activity</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <span className="text-2xl font-bold text-foreground">{weekStats.autoApproved}</span>
                <p className="text-xs text-muted-foreground mt-0.5">Auto-approved</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <span className="text-2xl font-bold text-foreground">{weekStats.revoked}</span>
                <p className="text-xs text-muted-foreground mt-0.5">Revoked</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <span className="text-2xl font-bold text-foreground">~{weekStats.estMinutes}</span>
                <p className="text-xs text-muted-foreground mt-0.5">Min saved</p>
              </div>
            </div>

            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-primary text-xs">
                  {historyOpen ? 'Hide' : 'View'} auto-approve history
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {logEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No history yet</p>
                ) : (
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Action</TableHead>
                          <TableHead className="text-xs">Pillar</TableHead>
                          <TableHead className="text-xs">Rule</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logEntries.slice(0, 20).map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs">{format(parseISO(entry.created_at), 'MMM d')}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{entry.action_title}</TableCell>
                            <TableCell className="text-xs">{entry.pillar}</TableCell>
                            <TableCell className="text-xs">{entry.rule_triggered}</TableCell>
                            <TableCell>
                              <Badge variant={entry.status === 'Active' ? 'default' : 'destructive'} className="text-[10px]">
                                {entry.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </>
      )}
    </div>
  );
};
