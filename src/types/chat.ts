export type ChatChannelType = 'team' | 'dm';

export interface ChatChannel {
  id: string;
  bar_id: string | null;
  type: ChatChannelType;
  name: string;
  topic: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  mentions: { user_id: string; display_name: string }[];
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

// Extended types with profile info
export interface ChatChannelWithMembers extends ChatChannel {
  members?: ChatChannelMemberWithProfile[];
  unread_count?: number;
  last_message?: ChatMessageWithProfile;
}

export interface ChatChannelMemberWithProfile extends ChatChannelMember {
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface ChatMessageWithProfile extends ChatMessage {
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

// For DM channels, we need to know the other participant
export interface DMChannel extends ChatChannelWithMembers {
  other_user?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}
