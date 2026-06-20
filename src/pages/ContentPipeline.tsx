import { useState } from "react";
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
  const { selectedBar } = useApp();
  const projectId = selectedBar?.id ?? null;
  const { data: items = [], isLoading } = useContentItems(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

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

      <HelpTip helpKey={HELP_KEYS.contentPipeline} title="Content Pipeline">
        Plan, draft, and ship content through 7 stages (idea → published). Switch between List
        and Kanban views. Scoped to the active project — switch project from Portfolio to see a
        different pipeline.
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