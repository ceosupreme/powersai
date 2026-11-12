import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ContentItem, useContentItems } from "@/hooks/useContentItems";
import { ContentListView } from "@/components/content/ContentListView";
import { ContentKanbanView } from "@/components/content/ContentKanbanView";
import { ContentItemDialog } from "@/components/content/ContentItemDialog";
import { ContentWorkflowDialog } from "@/components/content/ContentWorkflowDialog";
import { useAuth } from "@/context/AuthContext";
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";

export default function ContentPipeline() {
  const { selectedBar } = useApp();
  const { isAdmin } = useAuth();
  const projectId = selectedBar?.id ?? null;
  const { data: items = [], isLoading } = useContentItems(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (it: ContentItem) => { setEditing(it); setDialogOpen(true); };
  const openWorkflow = (it: ContentItem) => setWorkflowId(it.id);

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-dashed p-8 space-y-3 text-center">
          <h1 className="text-xl font-semibold">Choose the brand whose content you want to work on</h1>
          <p className="text-sm text-muted-foreground">Content belongs to a project. Choose your brand to see its steps, or open the Production Board to find work across all brands.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline"><Link to="/portfolio">Choose a brand</Link></Button>
            {isAdmin && <Button asChild><Link to="/production-board">See all production work</Link></Button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Content Pipeline</h1>
          <p className="text-sm text-muted-foreground">{selectedBar?.bar_name} · stages describe production, while approval is a separate quality check.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <Button variant="outline" asChild><Link to="/production-board">Production Board</Link></Button>}
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Content Item</Button>
        </div>
      </div>

      <HelpTip helpKey={HELP_KEYS.contentPipeline} title="Content Pipeline — production steps and approval">
        Content uses one saved production stage: Idea, Script, Design or Record,
        Edit, Thumbnail, Scheduled, or Published. The steps depend on the format.
        A separately recorded concept-quality approval does not mean a finished file exists.
        Open a content item to finish the work, approve its deliverable, or record scheduling and publication.
        Switch brands from Portfolio to see another project's content.
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
            <ContentListView items={items} projectId={projectId} onEdit={openEdit} onOpenWorkflow={openWorkflow} />
          )}
        </TabsContent>
        <TabsContent value="kanban" className="mt-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ContentKanbanView items={items} projectId={projectId} onEdit={openEdit} onOpenWorkflow={openWorkflow} />
          )}
        </TabsContent>
      </Tabs>

      <ContentItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        item={editing}
      />
      <ContentWorkflowDialog projectId={projectId} itemId={workflowId}
        onClose={() => setWorkflowId(null)} />
    </div>
  );
}