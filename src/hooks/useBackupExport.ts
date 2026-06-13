import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  BACKUP_TABLES,
  fetchTable,
  toCSV,
  downloadBlob,
  todayStamp,
} from "@/lib/backupExport";

export function useBackupExport() {
  const { toast } = useToast();
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
      for (const t of BACKUP_TABLES) {
        try {
          const rows = await fetchTable(t.name);
          tables[t.name] = rows;
          totalRows += rows.length;
        } catch (e: any) {
          // RLS-denied tables still appear as [] so the backup shape is stable.
          tables[t.name] = [];
          console.warn(`[backup] ${t.name}: ${e?.message ?? e}`);
        }
      }
      const payload = {
        exported_at: new Date().toISOString(),
        exported_by: user?.id ?? null,
        version: 1,
        tables,
      };
      downloadBlob(
        `supreme-team-backup-${todayStamp()}.json`,
        "application/json",
        JSON.stringify(payload, null, 2),
      );
      toast({
        title: "Full backup ready",
        description: `${BACKUP_TABLES.length} tables, ${totalRows} total rows.`,
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