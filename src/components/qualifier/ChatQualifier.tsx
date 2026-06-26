import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  projectType: string;
  capturedForProjectId?: string | null;
  onSubmitted: (leadId: string, isReady: boolean) => void;
}

interface ChatTurn { role: "user" | "assistant"; content: string }

export function ChatQualifier({ projectType, capturedForProjectId = null, onSubmitted }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([
    { role: "assistant", content: "Hi — I'm the intake assistant. What do you need help with today?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scroll = useRef<HTMLDivElement | null>(null);

  useEffect(() => { scroll.current?.scrollTo(0, scroll.current.scrollHeight); }, [messages, sending]);

  const submit = async (next: ChatTurn[]) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("qualifier-chat", {
        body: { project_type: projectType, messages: next },
      });
      if (error) throw error;
      const reply = (data as any)?.reply as string | undefined;
      const sub = (data as any)?.submit;
      if (reply) setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (sub && typeof sub === "object") {
        const qd = (sub.qualifier_data ?? {}) as Record<string, string>;
        const name = String(qd.contact || qd.name || "Chat lead").slice(0, 200);
        const phone = String(qd.phone || "").slice(0, 40) || null;
        const email = String(qd.email || "").slice(0, 255) || null;
        const transcript = next.map((m) => ({ role: m.role, text: m.content, at: new Date().toISOString() }));
        const { data: res, error: subErr } = await supabase.functions.invoke("submit-inbound-lead", {
          body: {
            name, email, phone,
            message: sub.summary ?? null,
            project_type: projectType,
            qualifier_data: qd,
            is_ready: !!sub.is_ready,
            not_ready_reason: sub.not_ready_reason ?? null,
            transcript,
            conversation_channel: "chat",
            route_to: "self",
            captured_for_project_id: capturedForProjectId ?? null,
          },
        });
        if (subErr) throw subErr;
        onSubmitted((res as any)?.id ?? "", !!sub.is_ready);
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong — please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    await submit(next);
  };

  return (
    <Card className="border-forest/20">
      <CardContent className="p-0 flex flex-col h-[min(70vh,560px)] sm:h-[460px]">
        <div ref={scroll} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("rounded-2xl px-4 py-2 text-sm max-w-[80%]",
                m.role === "user" ? "bg-forest text-bone" : "bg-muted text-foreground")}>
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-2 text-sm bg-muted flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="border-t flex gap-2 p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={sending}
            className="h-11"
          />
          <Button type="submit" disabled={sending || !input.trim()} className="bg-forest hover:bg-forest/90 text-bone h-11 min-w-11">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}