import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Loader2, Plus, Trash2, Save, MessageSquare, Copy, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import type { OutreachTemplate } from "@/hooks/useOutreachTemplates";

type Channel = OutreachTemplate["channel"];
const CHANNELS: Channel[] = ["sms", "email", "dm", "vm_script"];

export const SettingsOutreachTemplatesTab = () => {
  const qc = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-outreach-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("outreach_templates")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OutreachTemplate[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-outreach-templates"] });

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort(),
    [rows],
  );
  const verticals = useMemo(
    () => Array.from(new Set(rows.map((r) => r.vertical).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (channelFilter !== "all" && r.channel !== channelFilter) return false;
    if (verticalFilter === "universal" && r.vertical !== null) return false;
    if (verticalFilter !== "all" && verticalFilter !== "universal" && r.vertical !== verticalFilter) return false;
    return true;
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("outreach_templates")
        .insert({
          category: "uncategorized",
          name: "New template",
          channel: "sms",
          body: "",
          sort_order: rows.length,
        });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Template created"); },
    onError: (e: any) => toast.error(e.message || "Create failed"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" /> Outreach Templates
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Reusable sales scripts. Free-text category — type any value to add a new one.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={verticalFilter} onValueChange={setVerticalFilter}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All verticals</SelectItem>
                <SelectItem value="universal">Universal</SelectItem>
                {verticals.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto">
              <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending} className="gap-1">
                <Plus className="h-4 w-4" /> New template
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No templates match.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <TemplateEditor key={r.id} row={r} allCategories={categories} onChanged={refresh} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function TemplateEditor({
  row, allCategories, onChanged,
}: { row: OutreachTemplate; allCategories: string[]; onChanged: () => void }) {
  const [local, setLocal] = useState<OutreachTemplate>(row);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof OutreachTemplate>(k: K, v: OutreachTemplate[K]) =>
    setLocal((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("outreach_templates")
        .update({
          category: (local.category || "uncategorized").trim(),
          name: local.name,
          channel: local.channel,
          subject: local.channel === "email" ? (local.subject || null) : null,
          body: local.body,
          vertical: local.vertical || null,
          sort_order: local.sort_order,
          is_active: local.is_active,
        })
        .eq("id", local.id);
      if (error) throw error;
      toast.success("Saved");
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm(`Delete template "${local.name}"?`)) return;
    const { error } = await (supabase as any).from("outreach_templates").delete().eq("id", local.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    onChanged();
  };

  const duplicate = async () => {
    const { error } = await (supabase as any).from("outreach_templates").insert({
      category: local.category,
      name: `${local.name} (copy)`,
      channel: local.channel,
      subject: local.subject,
      body: local.body,
      vertical: local.vertical,
      sort_order: local.sort_order + 1,
      is_active: local.is_active,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Duplicated");
    onChanged();
  };

  return (
    <Card className="p-4 space-y-3 border-border/70">
      <div className="grid grid-cols-12 gap-2 items-center">
        <Input
          className="col-span-4 h-9"
          value={local.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Template name"
        />
        <div className="col-span-3">
          <CategoryCombobox
            value={local.category}
            options={allCategories}
            onChange={(v) => set("category", v)}
          />
        </div>
        <Select value={local.channel} onValueChange={(v) => set("channel", v as Channel)}>
          <SelectTrigger className="col-span-2 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          className="col-span-1 h-9"
          type="number"
          value={local.sort_order}
          onChange={(e) => set("sort_order", Number(e.target.value))}
        />
        <div className="col-span-2 flex items-center gap-2">
          <Switch checked={local.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <Label className="text-xs">{local.is_active ? "Active" : "Inactive"}</Label>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 items-center">
        <Input
          className="col-span-4 h-9"
          value={local.vertical ?? ""}
          onChange={(e) => set("vertical", e.target.value || null)}
          placeholder="Vertical (blank = universal)"
        />
        {local.channel === "email" && (
          <Input
            className="col-span-8 h-9"
            value={local.subject ?? ""}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="Subject"
          />
        )}
      </div>

      <Textarea
        rows={4}
        value={local.body}
        onChange={(e) => set("body", e.target.value)}
        placeholder="Body — use {{token}} placeholders"
        className="font-mono text-xs"
      />

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={remove} className="gap-1">
          <Trash2 className="h-4 w-4 text-destructive" /> Delete
        </Button>
        <Button size="sm" variant="outline" onClick={duplicate} className="gap-1">
          <Copy className="h-4 w-4" /> Duplicate
        </Button>
        <Button size="sm" onClick={save} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
      </div>
    </Card>
  );
}

function CategoryCombobox({
  value, options, onChange,
}: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const showCreate = input.trim().length > 0 && !options.some((o) => o.toLowerCase() === input.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full h-9 justify-between font-normal"
        >
          <span className="truncate">{value || "Pick a category"}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type new…" value={input} onValueChange={setInput} />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o}
                  value={o}
                  onSelect={() => { onChange(o); setInput(""); setOpen(false); }}
                >
                  <Check className={`h-4 w-4 mr-2 ${o === value ? "opacity-100" : "opacity-0"}`} />
                  {o}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create_${input}`}
                  onSelect={() => { onChange(input.trim()); setInput(""); setOpen(false); }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Create "{input.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}