import { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox as InboxIcon, Sparkles, Archive, Check } from "lucide-react";
import { toast } from "sonner";
import {
  useCaptureItems, useCaptureMutations,
  type CaptureStatus, type CaptureType, type CaptureItem,
} from "@/hooks/useCaptureInbox";
import { useIntegrationDisabled } from "@/hooks/useIntegrationDisabled";

const TYPES: CaptureType[] = ["task","idea","note","brand_asset","crm_lead","content_idea"];

function ItemRow({ item }: { item: CaptureItem }) {
  const { accessibleBars } = useApp();
  const m = useCaptureMutations();
  const aiDisabled = useIntegrationDisabled("capture_ai_routing");
  const [project, setProject] = useState<string>(item.suggested_project_id ?? "");
  const [type, setType] = useState<CaptureType | "">(item.suggested_type ?? "");

  // Lazy auto-fire: request a suggestion exactly once per unclassified inbox item.
  // Guards (any one short-circuits): kill-switch off, item not in inbox, status
  // already past 'none' (pending/suggested/accepted/rejected), or this row instance
  // already fired. The ref + status check together prevent StrictMode double-invoke
  // and re-render loops from spending Gateway calls.
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    if (aiDisabled) return;
    if (item.status !== "inbox") return;
    if (item.ai_suggestion_status !== "none") return;
    firedRef.current = true;
    m.requestSuggestion.mutate(item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.status, item.ai_suggestion_status, aiDisabled]);

  const route = async (overrideProject?: string, overrideType?: CaptureType) => {
    const finalType = (overrideType || type) as CaptureType;
    const finalProject = (overrideProject ?? project) || null;
    if (!finalType) { toast.error("Pick a type"); return; }
    if (finalType === "task" && !finalProject) { toast.error("Pick a project for tasks"); return; }
    try {
      await m.routeItem.mutateAsync({ id: item.id, project_id: finalProject, type: finalType, raw_text: item.raw_text });
      toast.success("Routed");
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  };

  const acceptSuggestion = () => {
    if (!item.suggested_type) return;
    route(item.suggested_project_id ?? undefined, item.suggested_type);
  };

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="text-sm whitespace-pre-wrap">{item.raw_text}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
          {item.status === "routed" && item.routed_type && (
            <Badge variant="outline" className="ml-2">{item.routed_type}</Badge>
          )}
        </div>

        {item.status === "inbox" && (
          <>
            {!aiDisabled && item.ai_suggestion_status === "suggested" && (
              <div className="flex items-center gap-2 p-2 rounded bg-primary/5 text-xs">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Suggest: <b>{item.suggested_type ?? "—"}</b>
                  {item.suggested_project_id ? ` · ${accessibleBars.find(b => b.id === item.suggested_project_id)?.bar_name ?? "project"}` : ""}
                </span>
                <Button size="sm" className="ml-auto h-7" onClick={acceptSuggestion}>
                  <Check className="h-3 w-3 mr-1" />Accept
                </Button>
              </div>
            )}
            {!aiDisabled && item.ai_suggestion_status === "none" && (
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => m.requestSuggestion.mutate(item.id)}>
                <Sparkles className="h-3 w-3 mr-1" />Suggest routing
              </Button>
            )}

            <div className="flex gap-2">
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  {accessibleBars.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.bar_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={(v) => setType(v as CaptureType)}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8" onClick={() => route()}>Route</Button>
              <Button size="sm" variant="ghost" className="h-8"
                onClick={() => m.archive.mutate(item.id)}><Archive className="h-3 w-3" /></Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Inbox() {
  const [status, setStatus] = useState<CaptureStatus>("inbox");
  const items = useCaptureItems(status);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24 space-y-4">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <InboxIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">Capture first, route later</p>
        </div>
      </header>

      <Tabs value={status} onValueChange={(v) => setStatus(v as CaptureStatus)}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="routed">Routed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
        <TabsContent value={status} className="mt-3 space-y-2">
          {(items.data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground">Nothing here.</div>
          )}
          {(items.data ?? []).map((it) => <ItemRow key={it.id} item={it} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}