-- Create channel type enum
CREATE TYPE public.chat_channel_type AS ENUM ('team', 'dm');

-- Channels table
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id TEXT,
  type public.chat_channel_type NOT NULL DEFAULT 'team',
  name TEXT NOT NULL,
  topic TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel members table
CREATE TABLE public.chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]'::jsonb,
  is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_channel_members_user ON public.chat_channel_members(user_id);
CREATE INDEX idx_chat_channel_members_channel ON public.chat_channel_members(channel_id);
CREATE INDEX idx_chat_channels_bar ON public.chat_channels(bar_id);

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check channel membership
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id UUID, _channel_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channel_members
    WHERE user_id = _user_id AND channel_id = _channel_id
  )
$$;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view channels they are members of"
ON public.chat_channels FOR SELECT
USING (
  public.is_channel_member(auth.uid(), id) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create channels for their bars"
ON public.chat_channels FOR INSERT
WITH CHECK (
  (bar_id IS NULL) OR 
  public.user_has_bar_access(auth.uid(), bar_id) OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Channel creators and admins can update channels"
ON public.chat_channels FOR UPDATE
USING (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete channels"
ON public.chat_channels FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_channel_members
CREATE POLICY "Users can view their own memberships"
ON public.chat_channel_members FOR SELECT
USING (
  user_id = auth.uid() OR 
  public.is_channel_member(auth.uid(), channel_id) OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can join channels for their bars"
ON public.chat_channel_members FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update their own membership"
ON public.chat_channel_members FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave channels"
ON public.chat_channel_members FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages
CREATE POLICY "Users can read messages in their channels"
ON public.chat_messages FOR SELECT
USING (
  public.is_channel_member(auth.uid(), channel_id) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can send messages to their channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND public.is_channel_member(auth.uid(), channel_id)
);

CREATE POLICY "Users can edit their own messages"
ON public.chat_messages FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for messages and members
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;