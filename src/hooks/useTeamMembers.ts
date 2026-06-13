import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { ASANA_TEAM } from '@/services/asana';

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  isAsanaOnly?: boolean;
  asanaGid?: string;
}

// Fetch all team members (profiles + Asana team) for assignment dropdown
export const useTeamMembers = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['team-members'],
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

      const leadershipContacts = leadershipRes.data || [];

      // Build a map of profile_id -> asana_gid from venue leadership
      const profileToAsanaGid = new Map<string, string>();
      for (const contact of leadershipContacts) {
        if (contact.profile_id && contact.asana_gid) {
          profileToAsanaGid.set(contact.profile_id, contact.asana_gid);
        }
      }

      // Resolve Asana GIDs for profile members
      const resolvedGids = new Set<string>();
      const profileMembers: TeamMember[] = (profilesRes.data || []).map(p => {
        // 1. Use profile.asana_gid (admin-set) first
        let asanaGid = (p as any).asana_gid as string | undefined;

        // 2. Then venue leadership contacts
        if (!asanaGid) asanaGid = profileToAsanaGid.get(p.id);

        // 3. Then fuzzy match ASANA_TEAM
        if (!asanaGid && p.full_name) {
          const nameLC = p.full_name.toLowerCase();
          const asanaMatch = ASANA_TEAM.find(a => {
            const aLC = a.name.toLowerCase();
            return aLC === nameLC || aLC.includes(nameLC) || nameLC.includes(aLC);
          });
          if (asanaMatch) asanaGid = asanaMatch.gid;
        }

        if (asanaGid) resolvedGids.add(asanaGid);

        return {
          ...p,
          isAsanaOnly: false,
          asanaGid,
        };
      });

      // Add Asana team members whose GID wasn't already resolved to a profile
      const asanaOnlyMembers: TeamMember[] = ASANA_TEAM
        .filter(asana => !resolvedGids.has(asana.gid))
        .map(asana => ({
          id: `asana-${asana.gid}`,
          full_name: asana.name,
          email: null,
          avatar_url: null,
          isAsanaOnly: true,
          asanaGid: asana.gid,
        }));

      return [...profileMembers, ...asanaOnlyMembers];
    },
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });
};
