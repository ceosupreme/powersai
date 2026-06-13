import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useCaptureMutations } from "@/hooks/useCaptureInbox";

export function QuickCaptureButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const { capture } = useCaptureMutations();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => taRef.current?.focus(), 50); }, [open]);

  const submit = async () => {
    if (!text.trim()) return;
    try {
      await capture.mutateAsync(text);
      setText(""); setOpen(false);
      toast.success("Captured", {
        action: { label: "Inbox", onClick: () => { window.location.href = "/inbox"; } },
      });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to capture");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Quick capture (⌘⇧K)"
          className="text-muted-foreground hover:text-foreground">
          <Inbox className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-2">
        <div className="text-xs text-muted-foreground">Capture to Inbox · ⌘⇧K</div>
        <Textarea
          ref={taRef}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); }
          }}
          placeholder="Idea, task, note… (⌘↵ to save)"
        />
        <div className="flex justify-between items-center">
          <Link to="/inbox" className="text-xs text-muted-foreground hover:underline">Open Inbox →</Link>
          <Button size="sm" onClick={submit} disabled={!text.trim() || capture.isPending}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}