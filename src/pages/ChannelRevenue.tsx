import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ChannelRevenue as ChannelRevenueRow, useChannelRevenue } from "@/hooks/useChannelRevenue";
import { RevenueSummaryCards } from "@/components/revenue/RevenueSummaryCards";
import { RevenueTable } from "@/components/revenue/RevenueTable";
import { RevenueEntryDialog } from "@/components/revenue/RevenueEntryDialog";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export default function ChannelRevenue() {
  const { selectedBar } = useApp();
  const projectId = selectedBar?.id ?? null;
  const { data: items = [], isLoading } = useChannelRevenue(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelRevenueRow | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (e: ChannelRevenueRow) => { setEditing(e); setDialogOpen(true); };

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Select a channel to view its revenue.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Channel Revenue</h1>
          <p className="text-sm text-muted-foreground">{selectedBar?.bar_name}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Entry</Button>
      </div>

      <HelpTip helpKey={HELP_KEYS.channelRevenue} title="Channel Revenue">
        Log income by channel and month. This feeds the Monetization pillar in the Weekly Review —
        without entries here, that pillar can't grade.
      </HelpTip>

      <RevenueSummaryCards items={items} />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <RevenueTable items={items} projectId={projectId} onEdit={openEdit} />
      )}

      <RevenueEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        entry={editing}
      />
    </div>
  );
}