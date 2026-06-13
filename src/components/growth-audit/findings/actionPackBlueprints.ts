// Per-finding-type Action Pack blueprints (Prompt 5 scaffold).
// Each blueprint lists the asset *kinds* and titles produced for that type.
// Actual content (copy, drafts) ships in Prompt 6 — these names must stay
// stable so generators can target them.

import type { FindingType } from './findingTypes';

export type ActionPackAssetKind =
  | 'social_post'
  | 'gbp_post'
  | 'email_draft'
  | 'sms_draft'
  | 'staff_script'
  | 'menu_callout'
  | 'website_block'
  | 'campaign_brief'
  | 'ops_fix_brief'
  | 'inquiry_form_spec';

export const ASSET_KIND_LABEL: Record<ActionPackAssetKind, string> = {
  social_post: 'Social post',
  gbp_post: 'GBP post',
  email_draft: 'Email draft',
  sms_draft: 'SMS draft',
  staff_script: 'Staff script',
  menu_callout: 'Menu callout',
  website_block: 'Website block',
  campaign_brief: 'Campaign brief',
  ops_fix_brief: 'Ops fix brief',
  inquiry_form_spec: 'Inquiry form spec',
};

export type ActionPackAssetSpec = { kind: ActionPackAssetKind; title: string };

export type ActionPackBlueprint = {
  summary: string;
  assets: ActionPackAssetSpec[];
};

export const ACTION_PACK_BLUEPRINTS: Record<FindingType, ActionPackBlueprint> = {
  soft_shift_opportunity: {
    summary: 'Targeted promo to lift a single underperforming shift, with measurable A/B window.',
    assets: [
      { kind: 'social_post', title: 'Shift-specific feature post (Instagram + Facebook)' },
      { kind: 'gbp_post', title: 'GBP "What\'s New" promo for the shift' },
      { kind: 'staff_script', title: 'Staff upsell script for the shift' },
      { kind: 'campaign_brief', title: '4-week test campaign brief with success metric' },
    ],
  },
  strong_shift_amplification: {
    summary: 'Amplify what already works — content series + email + menu placement around the strong shift.',
    assets: [
      { kind: 'social_post', title: '4-post content series spotlighting the shift' },
      { kind: 'email_draft', title: 'Subscriber email feature ("don\'t miss this")' },
      { kind: 'menu_callout', title: 'Print/digital menu callout for the shift' },
      { kind: 'campaign_brief', title: 'Amplification brief with reach and lift target' },
    ],
  },
  menu_item_under_promotion: {
    summary: 'Move a high-margin or high-volume item from invisible to featured.',
    assets: [
      { kind: 'social_post', title: 'Hero post + 2 follow-ups featuring the item' },
      { kind: 'gbp_post', title: 'GBP product post with photo and price' },
      { kind: 'staff_script', title: 'Suggestive-sell script for FOH' },
      { kind: 'menu_callout', title: 'Menu placement spec (position, badge, copy)' },
    ],
  },
  event_lift_opportunity: {
    summary: 'Capture the missing category lift on an event night with complementary product.',
    assets: [
      { kind: 'social_post', title: 'Event-night cross-promo post' },
      { kind: 'menu_callout', title: 'Event-only menu insert (cross-category items)' },
      { kind: 'campaign_brief', title: 'Cross-promo brief with attach-rate target' },
    ],
  },
  event_underperformance: {
    summary: 'Decide: kill, improve, repeat, or scale — with structured options before pulling the plug.',
    assets: [
      { kind: 'campaign_brief', title: 'Kill / Improve / Repeat / Scale decision brief' },
    ],
  },
  reputation_theme_opportunity: {
    summary: 'Turn what guests already love into a social-proof engine.',
    assets: [
      { kind: 'social_post', title: 'Review-quote content series (4 posts)' },
      { kind: 'website_block', title: 'Homepage testimonial block spec' },
      { kind: 'gbp_post', title: 'GBP highlight post featuring the theme' },
    ],
  },
  reputation_risk: {
    summary: 'Flag the operational gap behind the reviews and prep response language.',
    assets: [
      { kind: 'ops_fix_brief', title: 'Ops-fix brief with owner, deadline, and re-evaluation metric' },
      { kind: 'staff_script', title: 'Review-response template for the issue' },
    ],
  },
  operational_readiness_blocker: {
    summary: 'No marketing assets — fix capacity first. Gate enforces this before traffic-driving content can ship.',
    assets: [
      { kind: 'ops_fix_brief', title: 'Ops-fix brief (staffing/workflow) with re-evaluation date' },
    ],
  },
  private_party_conversion_gap: {
    summary: 'Build the missing conversion path: page, form, package, and follow-up.',
    assets: [
      { kind: 'website_block', title: 'Private-party landing page spec' },
      { kind: 'inquiry_form_spec', title: 'Inquiry form fields + routing spec' },
      { kind: 'email_draft', title: '3-touch follow-up sequence' },
      { kind: 'campaign_brief', title: 'Group/private-event launch brief' },
    ],
  },
  local_visibility_gap: {
    summary: 'GBP-led visibility refresh + review velocity for the missing search terms.',
    assets: [
      { kind: 'gbp_post', title: 'Weekly GBP post cadence (4 posts)' },
      { kind: 'social_post', title: 'Local-intent post with neighborhood tag' },
      { kind: 'website_block', title: 'On-page block targeting the search term' },
      { kind: 'campaign_brief', title: 'Review-request brief mentioning the term' },
    ],
  },
  context_marketing_opportunity: {
    summary: 'Date-specific campaign tied to an upcoming context item (calendar/weather/news/sports/events).',
    assets: [
      { kind: 'social_post', title: 'Context-aware post (with date + hook)' },
      { kind: 'gbp_post', title: 'GBP "What\'s Happening" post for the date' },
      { kind: 'campaign_brief', title: 'Date-anchored campaign brief with success metric' },
      { kind: 'staff_script', title: 'Staff prompt referencing the upcoming context' },
    ],
  },
};
