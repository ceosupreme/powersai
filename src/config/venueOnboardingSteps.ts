import type { LucideIcon } from 'lucide-react';
import {
  Building2, Layers, MessageSquareText, Bell, Inbox, Users, Palette, Target,
  Plug, BookOpen, ListChecks, MapPin, Search, Globe, Sparkles, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectType } from '@/lib/effectivePillars';

export type OnboardingPhase = 'identity' | 'go_live' | 'full_config';

export interface DetectorCtx {
  venueId: string;
  projectType: ProjectType | null;
}

/** Returns true if this step's surface is configured for the venue. */
export type Detector = (ctx: DetectorCtx) => Promise<boolean>;

export interface OnboardingStep {
  key: string;
  phase: OnboardingPhase;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Manual-only steps have no reliable detector. */
  manualOnly?: boolean;
  /** Required for the phase's gating logic. */
  required?: boolean;
  detector?: Detector;
  /** Where to send the user to actually configure this (link-out). */
  href?: (venueId: string) => string;
  /** Component embedded inline when present (passed { projectId, projectType }). */
  inlineComponent?: 'pillars' | 'leak_vectors' | 'qualifier' | 'asana_log_sources';
}

const exists = async (table: string, filter: (q: any) => any): Promise<boolean> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = (supabase as any).from(table).select('id', { count: 'exact', head: true });
  const { count, error } = await filter(q);
  if (error) return false;
  return (count ?? 0) > 0;
};

export const VENUE_ONBOARDING_STEPS: OnboardingStep[] = [
  // -------- PHASE 1 — Identity & Type (gating) --------
  {
    key: 'identity',
    phase: 'identity',
    title: 'Identity & vertical',
    description: 'Name, project code, timezone, and the project type (vertical).',
    icon: Building2,
    required: true,
    href: (id) => `/admin?tab=projects&edit=${id}`,
    detector: async ({ venueId }) => {
      const { data } = await (supabase as any)
        .from('venues')
        .select('name,bar_code,project_type')
        .eq('id', venueId)
        .maybeSingle();
      return !!(data?.name && data?.bar_code && data?.project_type);
    },
  },

  // -------- PHASE 2 — Go-Live Essentials --------
  {
    key: 'qualifier_config',
    phase: 'go_live',
    title: 'Qualifier questions',
    description: 'Confirm the questions the lead qualifier will ask for this vertical.',
    icon: MessageSquareText,
    required: true,
    inlineComponent: 'qualifier',
    detector: async ({ venueId, projectType }) => {
      if (!projectType) return false;
      // Either project has overrides OR the type has template fields + config.
      const hasOverrides = await exists('project_qualifier_field_overrides', (q) =>
        q.eq('project_id', venueId),
      );
      if (hasOverrides) return true;
      const hasTemplate = await exists('project_type_qualifier_fields', (q) =>
        q.eq('project_type', projectType),
      );
      return hasTemplate;
    },
  },
  {
    key: 'capture_channel',
    phase: 'go_live',
    title: 'Capture channel live',
    description:
      'Open /qualify/<slug> for this vertical and test a lead end-to-end. The lead should land in your CRM Inbound.',
    icon: Inbox,
    required: true,
    href: () => `/crm?tab=inbound`,
    detector: async ({ venueId }) =>
      exists('inbound_leads', (q) =>
        q.or(`venue_id.eq.${venueId},project_id.eq.${venueId}`),
      ),
  },
  {
    key: 'owner_notifications',
    phase: 'go_live',
    title: 'Owner notifications',
    description: 'Make sure you get pinged when a qualified lead comes in.',
    icon: Bell,
    required: true,
    manualOnly: true,
    href: () => `/admin?tab=settings&subtab=notifications`,
  },

  // -------- PHASE 3 — Full Configuration (tracked, non-gating) --------
  {
    key: 'pillars',
    phase: 'full_config',
    title: 'Pillars',
    description: 'Tune which pillars apply to this client (or accept the vertical defaults).',
    icon: Layers,
    inlineComponent: 'pillars',
    detector: async ({ venueId }) =>
      exists('project_pillar_overrides', (q) => q.eq('project_id', venueId)),
  },
  {
    key: 'leak_vectors',
    phase: 'full_config',
    title: 'Leak vectors',
    description: 'Override growth-leak vectors for this client when the defaults don\'t fit.',
    icon: Zap,
    inlineComponent: 'leak_vectors',
    detector: async ({ venueId }) =>
      exists('project_leak_vector_overrides', (q) => q.eq('project_id', venueId)),
  },
  {
    key: 'contacts',
    phase: 'full_config',
    title: 'Leadership & contacts',
    description: 'Add the owner, GM, and any vendor contacts for routing.',
    icon: Users,
    href: (id) => `/admin?tab=projects&edit=${id}`,
    detector: async ({ venueId }) => {
      const a = await exists('venue_contacts', (q) => q.eq('venue_id', venueId));
      if (a) return true;
      return exists('venue_leadership_contacts', (q) => q.eq('venue_id', venueId));
    },
  },
  {
    key: 'brand_kit',
    phase: 'full_config',
    title: 'Brand vault',
    description: 'Colors, taglines, hashtags, logos. Powers content + qualifier landing.',
    icon: Palette,
    href: () => `/brand-kit`,
    detector: async ({ venueId }) =>
      exists('brand_kits', (q) => q.eq('project_id', venueId)),
  },
  {
    key: 'targets',
    phase: 'full_config',
    title: 'Targets & period config',
    description: 'Sales / labor / scoring targets and the fiscal-period config.',
    icon: Target,
    href: () => `/admin?tab=settings&subtab=targets`,
    detector: async ({ venueId }) => {
      const a = await exists('bar_targets', (q) => q.eq('bar_id', venueId));
      if (a) return true;
      return exists('period_config', (q) => q.eq('bar_id', venueId));
    },
  },
  {
    key: 'execution_adapter',
    phase: 'full_config',
    title: 'Execution adapter',
    description: 'Wire how this client executes tasks (Asana / native / read-only).',
    icon: Plug,
    href: () => `/admin?tab=settings&subtab=adapter`,
    detector: async ({ venueId }) =>
      exists('venue_execution_adapters', (q) => q.eq('venue_id', venueId)),
  },
  {
    key: 'programming_context',
    phase: 'full_config',
    title: 'Programming context',
    description: 'Recurring events, promotions, and ops cadence the AI should know about.',
    icon: BookOpen,
    href: () => `/admin?tab=settings&subtab=programming`,
    detector: async ({ venueId }) =>
      exists('venue_programming_context', (q) => q.eq('venue_id', venueId)),
  },
  {
    key: 'asana_log_sources',
    phase: 'full_config',
    title: 'Asana log sources',
    description: 'Up to 4 Asana projects to ingest as daily log sources.',
    icon: ListChecks,
    inlineComponent: 'asana_log_sources',
    detector: async ({ venueId }) =>
      exists('venue_asana_log_sources', (q) => q.eq('venue_id', venueId).eq('is_active', true)),
  },
  {
    key: 'gbp_mapping',
    phase: 'full_config',
    title: 'Google Business Profile',
    description: 'Map this client to their GBP Place ID for ratings and map-pack data.',
    icon: MapPin,
    href: () => `/admin?tab=settings&subtab=gbp`,
    detector: async ({ venueId }) =>
      exists('gbp_place_mappings', (q) => q.eq('venue_id', venueId)),
  },
  {
    key: 'map_pack',
    phase: 'full_config',
    title: 'Map-pack keywords',
    description: 'Keywords to track ranking on in the local 3-pack.',
    icon: Search,
    href: () => `/admin?tab=settings&subtab=map-pack`,
    detector: async ({ venueId }) =>
      exists('map_pack_keywords', (q) => q.eq('venue_id', venueId)),
  },
  {
    key: 'ai_search',
    phase: 'full_config',
    title: 'AI search queries',
    description: 'Queries to track AI/LLM-search visibility (Perplexity, ChatGPT, etc.).',
    icon: Sparkles,
    href: () => `/admin?tab=settings&subtab=ai-search`,
    detector: async ({ venueId }) =>
      exists('ai_search_queries', (q) => q.eq('venue_id', venueId)),
  },
  {
    key: 'website_mapping',
    phase: 'full_config',
    title: 'Website mapping',
    description: 'Site URL + crawl config for SEO and content audit.',
    icon: Globe,
    href: () => `/admin?tab=settings&subtab=website`,
    detector: async ({ venueId }) =>
      exists('website_mappings', (q) => q.eq('venue_id', venueId)),
  },
  {
    key: 'auto_approve',
    phase: 'full_config',
    title: 'Auto-approve rules',
    description: 'Decide which AI insights push to your task system without review.',
    icon: Sparkles,
    manualOnly: true,
    href: () => `/admin?tab=settings&subtab=auto-approve`,
  },
  {
    key: 'daily_flash',
    phase: 'full_config',
    title: 'Daily flash',
    description: 'Daily flash digest cadence + recipients for this client.',
    icon: Zap,
    manualOnly: true,
    href: () => `/admin?tab=settings&subtab=daily-flash`,
  },
];

export const PHASES: { key: OnboardingPhase; title: string; subtitle: string }[] = [
  { key: 'identity', title: 'Identity & type', subtitle: 'Required' },
  { key: 'go_live', title: 'Go-live essentials', subtitle: 'Capture leads' },
  { key: 'full_config', title: 'Full configuration', subtitle: 'Tracked, not gating' },
];

export function stepsForPhase(phase: OnboardingPhase) {
  return VENUE_ONBOARDING_STEPS.filter((s) => s.phase === phase);
}