// Action Pack data model — shared between mock generator, edge function,
// store, and UI. Every asset is back-linked to the finding it addresses.

import type { ActionPackAssetKind } from '../findings/actionPackBlueprints';
import type { FindingType } from '../findings/findingTypes';
import type { Finding } from '../findings/mockFindings';

/**
 * Generation context discriminated union.
 *  - 'finding'  → blueprint resolved from growth_finding_types.action_pack_blueprint
 *  - 'campaign' → blueprint derived from a small static map keyed on campaign type
 *  - 'ad_hoc'   → default blueprint
 *
 * Only the 'finding' kind is wired into UI today; 'campaign' / 'ad_hoc' surfaces
 * land in Prompt 15. The shape is stable so generators can branch generically.
 */
export type GenerationContext =
  | { kind: 'finding'; finding: Finding }
  | {
      kind: 'campaign';
      campaign: {
        id: string;
        type: string;
        title: string;
        venueId: string;
        description?: string;
        targetAudience?: string;
        channels?: string[];
        brandPartner?: string | null;
        linkedMenuItems?: string[];
      };
    }
  | {
      kind: 'ad_hoc';
      venueId: string;
      brief: string;
      category?: string;
      assetKinds?: AssetKind[];
    };

export type AssetKind = ActionPackAssetKind;

export type AssetStatus = 'Draft' | 'In Use' | 'Launched' | 'Archived';
export type AssetApproval = 'Proposed' | 'Approved' | 'Rejected';

export type ActionPackAsset = {
  id: string;
  packId: string;
  findingId: string;        // back-link, never optional
  findingType: FindingType;  // for Action Center grouping/badges
  kind: AssetKind;
  title: string;
  body: string;
  /** Optional metadata for structured kinds (e.g. email subject). */
  meta?: Record<string, string>;
  /** 1..n for kinds generated in multiple variants (social_post). */
  variant?: number;
  status: AssetStatus;
  approval: AssetApproval;
  approvalAssigneeId?: string;
  approvalDueDate?: string;
  approvalNotes?: string;
  createdAt: string;
  editedAt?: string;
  regenerationCount: number;
};

export type ActionPack = {
  id: string;
  findingId: string;
  venueId: string;
  generatedAt: string;
  source: 'ai' | 'mock';
  brandVoice: 'detected' | 'casual_professional_default';
  assets: ActionPackAsset[];
};

export type GenerationMode = 'ai' | 'mock';

export type VenueContext = {
  venueId: string;
  venueName: string;
  city?: string;
  brandVoice?: string;
};

/** Mock list of approval assignees — matches the look of insight-v2 flow. */
export const MOCK_ASSIGNEES: { id: string; name: string }[] = [
  { id: 'gm', name: 'GM — Venue Lead' },
  { id: 'marketing', name: 'Marketing Coordinator' },
  { id: 'owner', name: 'Owner' },
  { id: 'shift_lead', name: 'Shift Lead' },
];

export const ASSET_SECTION_ORDER = [
  'campaign',          // campaign_brief (Ready-to-Launch Campaigns)
  'social',            // social_post
  'gbp',               // gbp_post
  'email_sms',         // email_draft + sms_draft
  'staff',             // staff_script + measurement_plan-ish (no measurement_plan kind; use ops_fix_brief? -> separate)
  'blog',              // blog_draft (placeholder, conditional)
  'landing',           // landing_page_copy / website_block / inquiry_form_spec
  'ops',               // ops_fix_brief
  'menu',              // menu_callout
] as const;
export type AssetSectionKey = typeof ASSET_SECTION_ORDER[number];

export const SECTION_LABEL: Record<AssetSectionKey, string> = {
  campaign: 'Ready-to-Launch Campaigns',
  social: 'Social Posts',
  gbp: 'GBP Posts',
  email_sms: 'Email & SMS Templates',
  staff: 'Staff Briefs & Scripts',
  blog: 'Blog Drafts',
  landing: 'Landing Page Copy',
  ops: 'Ops-Fix Briefs',
  menu: 'Menu Callouts',
};

/** Canonical mapping: asset kind -> Action Center section. */
export const sectionForKind = (kind: AssetKind): AssetSectionKey => {
  switch (kind) {
    case 'campaign_brief': return 'campaign';
    case 'social_post': return 'social';
    case 'gbp_post': return 'gbp';
    case 'email_draft':
    case 'sms_draft': return 'email_sms';
    case 'staff_script': return 'staff';
    case 'website_block':
    case 'inquiry_form_spec': return 'landing';
    case 'ops_fix_brief': return 'ops';
    case 'menu_callout': return 'menu';
  }
};
