import type { ChatChannelWithMembers } from '@/types/chat';

type RoleName = 'owner' | 'gm' | 'lead' | 'foh' | 'boh';

const channelVisibility: Record<RoleName, string[]> = {
  owner: ['general', 'gm-only', 'all-staff', 'all', 'leads', 'foh', 'boh'],
  gm: ['general', 'all-staff', 'all', 'leads', 'foh', 'boh'],
  lead: ['general', 'leads'],
  foh: ['general', 'foh'],
  boh: ['general', 'boh'],
};

export function getVisibleChannelNames(role: string | null, context?: string): string[] {
  if (!role) return ['general'];
  const baseChannels = channelVisibility[role as RoleName] || ['general'];

  // For leads, add their department channel
  if (role === 'lead' && context) {
    const dept = context.toLowerCase();
    if (!baseChannels.includes(dept)) {
      return [...baseChannels, dept];
    }
  }

  return baseChannels;
}

export function filterChannelsByRole(
  channels: ChatChannelWithMembers[],
  role: string | null,
  context?: string
): ChatChannelWithMembers[] {
  const allowedNames = getVisibleChannelNames(role, context);

  return channels.filter((channel) => {
    // DMs are always visible
    if (channel.type === 'dm') return true;

    // Team channels: match name against allowed patterns
    const name = channel.name.toLowerCase();
    return allowedNames.some((allowed) => name.includes(allowed));
  });
}
