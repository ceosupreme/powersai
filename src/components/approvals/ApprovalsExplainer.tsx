import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  onDismiss: () => void;
}

export function ApprovalsExplainer({ onDismiss }: Props) {
  return (
    <Card className="mb-4 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2 text-sm">
          <p className="font-medium">How approvals work</p>
          <p className="text-muted-foreground">
            These are messages our system drafted for your customers. Nothing sends until you approve it.
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li><span className="font-medium text-foreground">✓ Approve</span> sends it.</li>
            <li><span className="font-medium text-foreground">✎ Edit</span> lets you change the wording first.</li>
            <li><span className="font-medium text-foreground">Skip</span> means it never sends.</li>
            <li><span className="font-medium text-foreground">⚑ Flag</span> asks us to take a look.</li>
          </ul>
          <p className="text-muted-foreground">
            If you do nothing, messages simply wait — nothing ever sends on its own.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={onDismiss}
          aria-label="Dismiss explainer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}