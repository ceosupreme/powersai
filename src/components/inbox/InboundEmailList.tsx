import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const KEY = ["inbound-emails"];

export function InboundEmailList() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbound_emails")
        .select("id, received_at, created_at, from_email, from_name, subject, text_body, forwarded_at, read_at")
        .order("received_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inbound_emails").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (q.error) return <div className="text-sm text-destructive">Couldn't load email.</div>;
  if (!q.data?.length) return <div className="text-sm text-muted-foreground">No email to hello@ yet.</div>;

  return (
    <div className="space-y-2">
      {q.data.map((m) => {
        const preview = (m.text_body ?? "").replace(/\s+/g, " ").trim().slice(0, 140);
        const when = m.received_at ?? m.created_at;
        const mailto = m.from_email
          ? `mailto:${m.from_email}?subject=${encodeURIComponent(`Re: ${m.subject ?? ""}`)}`
          : undefined;
        return (
          <Card key={m.id} className={m.read_at ? "opacity-70" : undefined}>
            <CardContent className="p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{m.from_name || m.from_email || "—"}</span>
                {m.from_name && m.from_email && <span className="text-xs text-muted-foreground">{m.from_email}</span>}
                {!m.read_at && <Badge variant="secondary">New</Badge>}
                <Badge variant="outline" className="ml-auto">{m.forwarded_at ? "Forwarded" : "Not forwarded"}</Badge>
              </div>
              <div className="text-sm font-medium">{m.subject || "(no subject)"}</div>
              {preview && <div className="text-sm text-muted-foreground">{preview}</div>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">{when ? new Date(when).toLocaleString() : "—"}</span>
                <div className="ml-auto flex gap-2">
                  {mailto && (
                    <Button asChild size="sm" variant="outline" className="h-8"><a href={mailto}>Reply</a></Button>
                  )}
                  {!m.read_at && (
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => markRead.mutate(m.id)}>Mark read</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
