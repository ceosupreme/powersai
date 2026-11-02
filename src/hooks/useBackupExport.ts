import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useHelpState } from "@/hooks/useHelpState";
import {
  BACKUP_TABLES,
  fetchTable,
  toCSV,
  downloadBlob,
  todayStamp,
} from "@/lib/backupExport";

export function useBackupExport() {
  const { toast } = useToast();
  const { markBackupTaken } = useHelpState();
  const [loadingTable, setLoadingTable] = useState<string | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const exportCsv = async (name: string) => {
    setLoadingTable(name);
    try {
      const rows = await fetchTable(name);
      const csv = toCSV(rows);
      downloadBlob(`${name}-${todayStamp()}.csv`, "text/csv;charset=utf-8", csv);
      toast({
        title: "Export complete",
        description: `${name}: ${rows.length} row${rows.length === 1 ? "" : "s"}.`,
      });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setLoadingTable(null);
    }
  };

  const exportFullJson = async () => {
    setLoadingFull(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tables: Record<string, Record<string, unknown>[]> = {};
      let totalRows = 0;
      const errors: Record<string, string> = {};
      for (const t of BACKUP_TABLES) {
        try {
          const rows = await fetchTable(t.name);
          tables[t.name] = rows;
          totalRows += rows.length;
        } catch (e: any) {
          // Failed reads are recorded explicitly and never disguised as empty tables.
          errors[t.name] = e?.message ?? String(e);
          console.warn(`[backup] ${t.name}: ${e?.message ?? e}`);
        }
      }
      const payload = {
        exported_at: new Date().toISOString(),
        exported_by: user?.id ?? null,
        version: 2,
        complete: Object.keys(errors).length === 0,
        errors,
        row_counts: Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
        scope: "Records visible to the signed-in user, fetched in pages; not a transactionally consistent database snapshot. Uploaded files are not included.",
        tables,
      };
      downloadBlob(
        `supreme-team-backup-${todayStamp()}.json`,
        "application/json",
        JSON.stringify(payload, null, 2),
      );
      if (!Object.keys(errors).length) markBackupTaken();
      toast({
        title: Object.keys(errors).length ? "Partial backup — some tables failed" : "Backup ready",
        variant: Object.keys(errors).length ? "destructive" : "default",
        description: `${Object.keys(tables).length} tables, ${totalRows} rows. ${Object.keys(errors).length ? "See errors in the export and retry." : "Uploaded files must be backed up separately."}`,
      });
    } catch (e: any) {
      toast({
        title: "Backup failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setLoadingFull(false);
    }
  };

  return { exportCsv, exportFullJson, loadingTable, loadingFull };
}
