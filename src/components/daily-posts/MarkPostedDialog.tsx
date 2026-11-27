import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { useMarkDailyPostPosted } from "@/hooks/useDailyPosts";
import type { DailyPostPlacement } from "@/lib/dailyPosts";

interface Props {
  placement: DailyPostPlacement | null;
  brandName: string;
  onClose: () => void;
}

export function MarkPostedDialog({ placement, brandName, onClose }: Props) {
  const [liveUrl, setLiveUrl] = useState("");
  const [note, setNote] = useState("");
  const markPosted = useMarkDailyPostPosted();

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setLiveUrl(text.trim());
    } catch {
      toast.error("Could not read clipboard — paste the link directly.");
    }
  };

  const submit = async (withLink: boolean) => {
    if (!placement) return;
    const clean = liveUrl.trim();
    if (withLink && !/^https?:\/\//i.test(clean)) {
      toast.error("Paste a full link starting with https://");
      return;
    }
    try {
      await markPosted.mutateAsync({
        placementId: placement.id,
        liveUrl: withLink ? clean : null,
        note: note.trim() || null,
      });
      toast.success(withLink ? "Marked as posted." : "Saved as posted without link yet.");
      setLiveUrl("");
      setNote("");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save.");
    }
  };

  return (
    <Dialog open={!!placement} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark {placement?.channel ?? "post"} as posted</DialogTitle>
          <DialogDescription>
            {brandName} — paste the live post link so HQ can verify it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="daily-post-live-url">Live post link</Label>
            <div className="flex gap-2">
              <Input
                id="daily-post-live-url"
                type="url"
                placeholder="https://instagram.com/p/..."
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                className="text-base"
              />
              <Button type="button" variant="outline" size="icon" onClick={handlePaste} title="Paste from clipboard">
                <ClipboardPaste className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="daily-post-note">Note (optional)</Label>
            <Input
              id="daily-post-note"
              placeholder="Any note for the team"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={markPosted.isPending}
            onClick={() => submit(false)}
          >
            Posted, no link yet
          </Button>
          <Button
            type="button"
            disabled={markPosted.isPending}
            onClick={() => submit(true)}
          >
            Save live link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}