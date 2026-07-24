import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  extractTokens,
  fillTokens,
  getTokenMeta,
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
  useEffect(() => {
    setValues({});
  }, [template?.id]);

  if (!template) return null;

  const unfilled = tokens.filter((t) => !(values[t] && values[t].trim().length > 0));

  // Copy variant: unfilled tokens become [human label] instead of raw {{token}},
  // and a warning toast tells the operator to fix them before sending.
  const humanizeUnfilled = (text: string | null | undefined) =>
    (text ?? "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
      const v = values[key];
      if (v && v.length > 0) return v;
      return `[${getTokenMeta(key).label.toLowerCase()}]`;
    });

  const copy = async (_ignored: string, label: string) => {
    const source = label === "Subject" ? template.subject : template.body;
    const text = humanizeUnfilled(source);
    try {
      await navigator.clipboard.writeText(text);
      if (unfilled.length > 0) {
        toast.warning(
          `${unfilled.length} blank${unfilled.length === 1 ? "" : "s"} copied — fill before sending`,
        );
      } else {
        toast.success(`${label} copied`);
      }
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
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Fill in the blanks</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tokens.map((tok) => {
                  const meta = getTokenMeta(tok);
                  return (
                    <div key={tok} className="space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <Label className="text-xs font-medium">{meta.label}</Label>
                        <span className="text-[10px] font-mono text-muted-foreground/70">{`{{${tok}}}`}</span>
                      </div>
                      <Input
                        value={values[tok] ?? ""}
                        placeholder={meta.placeholder ?? ""}
                        onChange={(e) => setValues((p) => ({ ...p, [tok]: e.target.value }))}
                        className="h-8"
                      />
                      {meta.hint && (
                        <p className="text-[10px] text-muted-foreground leading-snug">{meta.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {template.channel === "email" && template.subject && (
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subject preview</Label>
              <PreviewBlock text={template.subject} values={values} inline />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Body preview</Label>
            <PreviewBlock text={template.body} values={values} />
          </div>
        </div>

        <DialogFooter className="gap-2 flex-wrap sm:items-center">
          {unfilled.length > 0 && (
            <p className="text-[11px] text-muted-foreground mr-auto">
              {unfilled.length} blank{unfilled.length === 1 ? "" : "s"} left — copy will use [label] placeholders.
            </p>
          )}
          {template.channel === "email" && (
            <Button variant="outline" onClick={() => copy("", "Subject")} className="gap-1">
              <Copy className="h-4 w-4" /> Copy subject
            </Button>
          )}
          <Button onClick={() => copy("", "Body")} className="gap-1">
            <Copy className="h-4 w-4" /> Copy body
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBlock({
  text,
  values,
  inline = false,
}: { text: string | null | undefined; values: Record<string, string>; inline?: boolean }) {
  if (!text) return null;
  const parts: Array<{ kind: "text" | "chip" | "filled"; value: string }> = [];
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ kind: "text", value: text.slice(last, m.index) });
    const key = m[1];
    const v = values[key];
    if (v && v.length > 0) parts.push({ kind: "filled", value: v });
    else parts.push({ kind: "chip", value: getTokenMeta(key).label });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  return (
    <div
      className={
        inline
          ? "min-h-8 rounded-md border bg-muted/40 px-3 py-1.5 text-xs whitespace-pre-wrap break-words"
          : "min-h-[10rem] rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words"
      }
    >
      {parts.map((p, i) => {
        if (p.kind === "text") return <span key={i}>{p.value}</span>;
        if (p.kind === "filled") return <span key={i}>{p.value}</span>;
        return (
          <span
            key={i}
            className="inline-block rounded bg-primary/10 text-primary px-1 py-[1px] mx-[1px] font-sans text-[11px] align-baseline"
          >
            〈{p.value.toLowerCase()}〉
          </span>
        );
      })}
    </div>
  );
}