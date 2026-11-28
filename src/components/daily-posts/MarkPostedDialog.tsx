import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { driveCall, driveId } from '@/lib/brandDrive';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { useMarkDailyPostPosted } from "@/hooks/useDailyPosts";
import type { DailyPostPlacement, DailyPostPackage } from "@/lib/dailyPosts";

interface Props {
  placement: DailyPostPlacement | null;
  brandName: string;
  onClose: () => void;
  drivePackage?: DailyPostPackage | null;
}

export function MarkPostedDialog({ placement, brandName, onClose, drivePackage }: Props) {
  const qc = useQueryClient();
  const [channel, setChannel] = useState('instagram');
  const [saving, setSaving] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const [note, setNote] = useState("");
  const markPosted = useMarkDailyPostPosted();
  useEffect(() => { setChannel(placement?.channel === 'caption' ? 'instagram' : placement?.channel ?? 'instagram'); setLiveUrl(''); setNote(''); }, [placement?.id]);

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
      setSaving(true);
      if (drivePackage) {
        const folderId = driveId(drivePackage.drive_folder_url ?? '');
        if (!folderId) throw new Error('No post folder available.');
        await driveCall({ action: 'mark', projectId: drivePackage.project_id, date: drivePackage.post_date,
          fileId: folderId, channel, liveUrl: withLink ? clean : null, note: note.trim() || null });
        for (const key of ['daily-posts', 'drive-posts', 'agent-desk', 'brand-pulses']) qc.invalidateQueries({ queryKey: [key] });
      } else await markPosted.mutateAsync({
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!placement} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark {drivePackage ? 'post' : placement?.channel ?? "post"} as posted</DialogTitle>
          <DialogDescription>
            {brandName} — paste the live post link so HQ can verify it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {drivePackage && <div className="space-y-1.5"><Label>Platform</Label><Select value={channel} onValueChange={setChannel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['instagram','facebook','tiktok','google','linkedin','youtube','pinterest','x','other'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent></Select></div>}
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
            disabled={markPosted.isPending || saving}
            onClick={() => submit(false)}
          >
            Posted, no link yet
          </Button>
          <Button
            type="button"
            disabled={markPosted.isPending || saving}
            onClick={() => submit(true)}
          >
            Save live link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}