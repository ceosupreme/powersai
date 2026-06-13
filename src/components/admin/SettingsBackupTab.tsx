import { useEffect, useState } from "react";
import { Download, FileJson, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BACKUP_TABLES, countTable, type BackupTable } from "@/lib/backupExport";
import { useBackupExport } from "@/hooks/useBackupExport";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

type Counts = Record<string, number | null>;

const GROUP_ORDER: BackupTable["group"][] = [
  "CRM",
  "Brand Vault",
  "Capture",
  "Inbound Leads",
  "Projects",
  "Tasks",
  "Authored Content",
  "Marketing",
];

export function SettingsBackupTab() {
  const { exportCsv, exportFullJson, loadingTable, loadingFull } = useBackupExport();
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Counts = {};
      for (const t of BACKUP_TABLES) {
        try {
          out[t.name] = await countTable(t.name);
        } catch {
          out[t.name] = null;
        }
        if (cancelled) return;
        setCounts({ ...out });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const grouped = GROUP_ORDER.map(g => ({
    group: g,
    tables: BACKUP_TABLES.filter(t => t.group === g),
  })).filter(g => g.tables.length > 0);

  return (
    <div className="space-y-6">
      <HelpTip helpKey={HELP_KEYS.backupBeforeChanges} title="Back up before big changes">
        Pull a Full JSON Backup before bulk edits, integration cutovers, or anything you can't easily undo. Exports run through your authenticated session — RLS guarantees you only see your own data.
      </HelpTip>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Backup & Export
          </CardTitle>
          <CardDescription>
            Export your business data for safekeeping. Choose an export type, download it,
            and save a copy somewhere safe (cloud drive, external disk).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div>
              <strong>Back up your data regularly</strong>, especially before major changes.
              Exports respect your account's permissions — you'll only receive rows you can see.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={exportFullJson} disabled={loadingFull} size="lg">
              {loadingFull ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              Download Full JSON Backup
            </Button>
            <span className="text-xs text-muted-foreground">
              Single file containing every table below.
            </span>
          </div>
        </CardContent>
      </Card>

      {grouped.map(({ group, tables }) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/50">
              {tables.map(t => {
                const c = counts[t.name];
                const isLoading = loadingTable === t.name;
                return (
                  <div
                    key={t.name}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.label}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {t.name}
                        {c === null
                          ? " · no access"
                          : c === undefined
                            ? " · counting…"
                            : ` · ${c} row${c === 1 ? "" : "s"}`}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportCsv(t.name)}
                      disabled={isLoading || loadingFull}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      CSV
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}