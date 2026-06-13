import { TimeboxBar } from './TimeboxBar';
import { TalkingPoints } from './TalkingPoints';
import { ActionsCommitments } from './ActionsCommitments';
import { ActionCardWithWeek } from '@/hooks/useActionItems';

interface MeetingModeTabProps {
  actions: ActionCardWithWeek[];
}

export function MeetingModeTab({ actions }: MeetingModeTabProps) {
  return (
    <div className="space-y-4">
      <TimeboxBar />
      <TalkingPoints actions={actions} />
      <ActionsCommitments actions={actions} />
    </div>
  );
}
