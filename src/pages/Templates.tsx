import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Search, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  useOutreachTemplates,
  TOKEN_HINTS,
  extractTokens,
  fillTokens,
  type OutreachTemplate,
} from "@/hooks/useOutreachTemplates";

const CHANNEL_LABEL: Record<OutreachTemplate["channel"], string> = {
  sms: "SMS",
  email: "Email",
  dm: "DM",
  vm_script: "Voicemail",
};

function formatCategory(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function Templates() {
  const { data: templates = [], isLoading } = useOutreachTemplates(false);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [vertical, setVertical] = useState<string>("all");
  const [active, setActive] = useState<OutreachTemplate | null>(null);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const t of templates) s.add(t.category);
    return Array.from(s).sort();
  }, [templates]);

  const verticals = useMemo(() => {
    const s = new Set<string>();
    for (const t of templates) if (t.vertical) s.add(t.vertical);
    return Array.from(s).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (vertical === "universal" && t.vertical !== null) return false;
      if (vertical !== "all" && vertical !== "universal" && t.vertical !== vertical) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.body.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, category, vertical, search]);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">Outreach Templates</h1>
        <p className="text-sm text-muted-foreground">
          Reusable sales scripts. Click a template to fill tokens and copy the message.
        </p>
      </div>

      <Card className="p-3 space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or body…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All verticals</SelectItem>
              <SelectItem value="universal">Universal</SelectItem>
              {verticals.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>{formatCategory(c)}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No templates match those filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="p-3 space-y-2 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setActive(t)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">{t.name}</div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {CHANNEL_LABEL[t.channel]}
                </Badge>
              </div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {formatCategory(t.category)}
                {t.vertical ? ` · ${t.vertical}` : ""}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {t.body.split("\n")[0]}
              </div>
            </Card>
          ))}
        </div>
      )}

      <FillDialog template={active} onClose={() => setActive(null)} />
    </div>
  );
}

function FillDialog({ template, onClose }: { template: OutreachTemplate | null; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});

  const tokens = useMemo(
    () => (template ? extractTokens(template.subject, template.body) : []),
    [template],
  );

  // Reset values when the template changes
  useMemo(() => {
    setValues({});
  }, [template?.id]);

  if (!template) return null;

  const filledSubject = fillTokens(template.subject, values);
  const filledBody = fillTokens(template.body, values);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {template.name}
            <Badge variant="outline" className="ml-2 text-[10px]">
              {CHANNEL_LABEL[template.channel]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {tokens.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tokens</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tokens.map((tok) => (
                  <div key={tok} className="space-y-1">
                    <Label className="text-xs font-mono">{`{{${tok}}}`}</Label>
                    <Input
                      value={values[tok] ?? ""}
                      placeholder={TOKEN_HINTS[tok] ?? ""}
                      onChange={(e) => setValues((p) => ({ ...p, [tok]: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {template.channel === "email" && template.subject && (
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subject preview</Label>
              <Input readOnly value={filledSubject} className="h-8 bg-muted/40" />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Body preview</Label>
            <Textarea readOnly value={filledBody} rows={8} className="bg-muted/40 font-mono text-xs" />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {template.channel === "email" && (
            <Button variant="outline" onClick={() => copy(filledSubject, "Subject")} className="gap-1">
              <Copy className="h-4 w-4" /> Copy subject
            </Button>
          )}
          <Button onClick={() => copy(filledBody, "Body")} className="gap-1">
            <Copy className="h-4 w-4" /> Copy body
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}