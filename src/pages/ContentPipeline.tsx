import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ContentItem, useContentItems } from "@/hooks/useContentItems";
import { ContentListView } from "@/components/content/ContentListView";
import { ContentKanbanView } from "@/components/content/ContentKanbanView";
import { ContentItemDialog } from "@/components/content/ContentItemDialog";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export default function ContentPipeline() {
  const { selectedBar, accessibleBars, setSelectedBar } = useApp();
  const [params, setParams] = useSearchParams();
  const projectId = selectedBar?.id ?? null;
  const { data: items = [], isLoading } = useContentItems(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

  // Details opened from the production board preserve brand and exact item.
  useEffect(() => {
    const brandId = params.get('brand');
    if (!brandId || selectedBar?.id === brandId) return;
    const permitted = accessibleBars.find((bar) => bar.id === brandId);
    if (permitted) setSelectedBar(permitted);
  }, [params, selectedBar?.id, accessibleBars, setSelectedBar]);

  useEffect(() => {
    const openId = params.get('open');
    if (!openId || isLoading) return;
    const item = items.find((candidate) => candidate.id === openId);
    if (!item) return;
    setEditing(item);
    setDialogOpen(true);
    const cleaned = new URLSearchParams(params);
    cleaned.delete('open');
    cleaned.delete('brand');
    setParams(cleaned, { replace: true });
  }, [params, items, isLoading, setParams]);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (it: ContentItem) => { setEditing(it); setDialogOpen(true); };

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Select a channel to view its content pipeline.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Pipeline</h1>
          <p className="text-sm text-muted-foreground">{selectedBar?.bar_name}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Content Item</Button>
      </div>

      <HelpTip helpKey={HELP_KEYS.contentPipeline} title="Content Pipeline — 7 stages">
        Each item flows through 7 stages: idea → planned → drafting → review → scheduled →
        published → archived. Use List for spreadsheet-style editing, Kanban for drag-and-drop.
        Scoped to the active project — switch project from Portfolio to see a different pipeline.
      </HelpTip>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ContentListView items={items} projectId={projectId} onEdit={openEdit} />
          )}
        </TabsContent>
        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ContentKanbanView items={items} projectId={projectId} onEdit={openEdit} />
          )}
        </TabsContent>
      </Tabs>

      <ContentItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        item={editing}
      />
    </div>
  );
}