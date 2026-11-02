import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  isAsanaOnly?: boolean;
  asanaGid?: string;
}

// Fetch all team members (current authenticated profiles) for assignment dropdown
export const useTeamMembers = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['team-members', session?.user.id],
    queryFn: async (): Promise<TeamMember[]> => {
      // Fetch profiles and venue leadership contacts in parallel
      const [profilesRes, leadershipRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, asana_gid')
          .order('full_name', { ascending: true }),
        supabase
          .from('venue_leadership_contacts')
          .select('profile_id, asana_gid, display_name')
          .eq('is_active', true),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (leadershipRes.error) throw leadershipRes.error;

      const leadershipContacts = leadershipRes.data || [];

      // Build a map of profile_id -> asana_gid from venue leadership
      const profileToAsanaGid = new Map<string, string>();
      for (const contact of leadershipContacts) {
        if (contact.profile_id && contact.asana_gid) {
          profileToAsanaGid.set(contact.profile_id, contact.asana_gid);
        }
      }

      // Resolve Asana GIDs for profile members
      const profileMembers: TeamMember[] = (profilesRes.data || []).map(p => {
        // 1. Use profile.asana_gid (admin-set) first
        let asanaGid = (p as any).asana_gid as string | undefined;

        // 2. Then venue leadership contacts
        if (!asanaGid) asanaGid = profileToAsanaGid.get(p.id);

        return {
          ...p,
          isAsanaOnly: false,
          asanaGid,
        };
      });

      return profileMembers;
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });
};
