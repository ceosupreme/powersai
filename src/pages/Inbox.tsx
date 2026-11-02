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
import { HelpTip } from "@/components/help/HelpTip";
import { HELP_KEYS } from "@/config/helpKeys";
import { InboundEmailList } from "@/components/inbox/InboundEmailList";
import { CollectionToolbar } from "@/components/shared/CollectionToolbar";
import { sortCollection } from "@/lib/collectionSort";
import { Label } from "@/components/ui/label";

const TYPES: CaptureType[] = ["task","idea","note","brand_asset","crm_lead","content_idea"];
const TYPE_LABELS: Record<CaptureType, string> = { task: 'Task', idea: 'Idea', note: 'Note', brand_asset: 'Brand asset', crm_lead: 'CRM lead', content_idea: 'Content idea' };

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
      <CardContent className="p-5 space-y-4">
        <div className="text-base leading-relaxed whitespace-pre-wrap break-words">{item.raw_text}</div>
        <div className="text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
          {item.status === "routed" && item.routed_type && (
            <Badge variant="outline" className="ml-2">{TYPE_LABELS[item.routed_type] ?? item.routed_type}</Badge>
          )}
        </div>

        {item.status === "inbox" && (
          <>
            {!aiDisabled && item.ai_suggestion_status === "suggested" && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5 text-sm">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>Suggested: <b>{item.suggested_type ? TYPE_LABELS[item.suggested_type] : "—"}</b>
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

            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3">
              <div className="space-y-1.5"><Label htmlFor={`capture-project-${item.id}`}>Project</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger id={`capture-project-${item.id}`}><SelectValue placeholder="Choose a project" /></SelectTrigger>
                <SelectContent>
                  {[...accessibleBars].sort((a, b) => a.bar_name.localeCompare(b.bar_name)).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.bar_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div><div className="space-y-1.5"><Label htmlFor={`capture-type-${item.id}`}>Save as</Label>
              <Select value={type} onValueChange={(v) => setType(v as CaptureType)}>
                <SelectTrigger id={`capture-type-${item.id}`}><SelectValue placeholder="Choose a type" /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              </div><div className="flex gap-2">
              <Button size="sm" disabled={!type || (type !== 'crm_lead' && !project) || m.routeItem.isPending} onClick={() => route()}>Route item</Button>
              <Button size="icon" variant="outline" aria-label="Archive this capture"
                onClick={() => m.archive.mutate(item.id)}><Archive className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Inbox() {
  const aiDisabled = useIntegrationDisabled("capture_ai_routing");
  const [status, setStatus] = useState<CaptureStatus | "email">("inbox");
  const items = useCaptureItems(status === "email" ? "inbox" : status);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('oldest');
  const visible = sortCollection((items.data ?? []).filter(it => it.raw_text.toLowerCase().includes(query.trim().toLowerCase()))
    .map(it => ({...it, title: it.raw_text})), sort);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto pb-24 space-y-4">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <InboxIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Capture Inbox</h1>
          <p className="text-sm text-muted-foreground">All projects · capture first, route later</p>
        </div>
      </header>

      <Tabs value={status} onValueChange={(v) => setStatus(v as CaptureStatus | "email")}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="routed">Routed</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        {status === "email" ? (
          <TabsContent value="email" className="mt-3"><InboundEmailList /></TabsContent>
        ) : (
          <>
            <div className="mt-4"><CollectionToolbar query={query} onQuery={setQuery} placeholder="Find a captured idea, task, or note…"
              sort={sort} onSort={setSort} count={visible.length} total={items.data?.length ?? 0}
              options={[{value:'oldest',label:'Oldest first'},{value:'newest',label:'Newest first'},{value:'name',label:'Text · A to Z'}]} /></div>
            {aiDisabled && <p role="status" className="rounded border p-3 text-sm">AI routing suggestions are currently disabled. Choose a project and type to route manually.</p>}
            <HelpTip helpKey={HELP_KEYS.captureSuggest} title="AI suggests, you accept" className="mt-3">
              When an item lands here, the AI proposes a type and project — exactly once per item. Nothing files automatically. Click Accept to take the suggestion, or pick your own type + project and click Route.
            </HelpTip>
            <TabsContent value={status} className="mt-3 space-y-2">
              {items.isLoading ? <p role="status">Loading captures…</p> : items.isError ? <p role="alert">Captures could not be loaded. <Button variant="link" onClick={() => items.refetch()}>Try again</Button></p> : visible.length === 0 && (
                <div className="rounded-lg border border-dashed bg-card p-6 text-muted-foreground">{query ? 'No captures match your search.' : 'Nothing here. Use Capture in the header to save a new idea, task, or note.'}</div>
              )}
              {visible.map((it) => <ItemRow key={it.id} item={it} />)}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
