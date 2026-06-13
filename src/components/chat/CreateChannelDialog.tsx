import { useState } from 'react';
import { Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useChannels } from '@/hooks/useChannels';
import { toast } from 'sonner';

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateChannelDialog = ({ open, onOpenChange }: CreateChannelDialogProps) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const { createChannel, isCreating } = useChannels();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a channel name');
      return;
    }

    try {
      await createChannel({
        name: name.trim(),
        type: 'team',
        topic: topic.trim() || undefined,
        memberIds: [],
      });
      toast.success('Channel created');
      setName('');
      setTopic('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create channel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Create Channel
          </DialogTitle>
          <DialogDescription>
            Create a new channel for your team to collaborate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              placeholder="e.g., announcements"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Textarea
              id="topic"
              placeholder="What's this channel about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? 'Creating...' : 'Create Channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
