/** Brand Setup map rules. Pure so they are testable and shared by every screen. */
import type { PlannedStep } from '@/lib/pipelineComposer';

export const BRAND_PROFILES: { value: string; label: string }[] = [
  { value: 'creator', label: 'Creator (personal brand)' },
  { value: 'lifestyle', label: 'Lifestyle creator' },
  { value: 'content_brand', label: 'Content brand' },
  { value: 'channel', label: 'YouTube-first channel' },
  { value: 'local_news', label: 'Local news' },
  { value: 'music_artist', label: 'Music artist' },
  { value: 'label', label: 'Music label' },
  { value: 'agency', label: 'Agency' },
  { value: 'app', label: 'App' },
  { value: 'merch', label: 'Merch brand' },
];
export const profileLabel = (v: string) => BRAND_PROFILES.find((p) => p.value === v)?.label ?? v;

export const ASSET_GROUPS = ['Home base', 'Social', 'Video and audio', 'Stores and marketplaces', 'Money accounts', 'Local', 'Software'];

export interface AssetMapRow {
  venue_id: string; brand: string | null; asset_key: string; label: string; grp: string;
  platforms: string[] | null; playbook_key: string | null; unlocks: string | null;
  setup_minutes: number | null; priority: number | null; needed: boolean | null;
  by_profile: boolean | null; by_niches: string[] | null; by_lanes: string[] | null; lane_labels: string[] | null;
  decision: string | null; decision_reason: string | null;
  channel_id: string | null; channel_platform: string | null; channel_status: string | null;
  handle: string | null; url: string | null; followers: number | null; follower_date: string | null;
  state: string;
}

export const STATE_WORDS: Record<string, string> = {
  on_file: 'In place', needs_access: 'Exists, needs access', planned: 'Planned, not set up',
  missing: 'To set up', later: 'Later', skipped: 'Skipped', optional: 'Optional',
};

export const CHANNEL_STATUS_WORDS: Record<string, string> = {
  live: 'Live', dormant: 'Dormant', empty: 'Empty', planned: 'Planned', needs_access: 'Needs access',
};
export const channelStatusWord = (s: string | null | undefined) => (s ? CHANNEL_STATUS_WORDS[s] ?? s : '—');

export const SOURCE_WORDS: Record<string, string> = {
  screenshot: 'from a screenshot', metricool: 'from Metricool', manual: 'entered by hand',
  public_page: 'from the public page', api: 'from the platform',
};
export const sourceWord = (s: string | null | undefined) => (s ? SOURCE_WORDS[s] ?? s : '');

export function whyParts(r: Pick<AssetMapRow, 'by_profile' | 'by_niches' | 'lane_labels'>): string[] {
  const out: string[] = [];
  if (r.by_profile) out.push('Standard for this kind of brand');
  if (r.by_niches?.length) out.push(`Fits ${r.by_niches.join(', ')}`);
  if (r.lane_labels?.length) out.push(`Needed for ${r.lane_labels.join(', ')}`);
  return out;
}
export const whyLine = (r: Pick<AssetMapRow, 'by_profile' | 'by_niches' | 'lane_labels'>) => whyParts(r).join('. ');

export const minutesText = (m: number | null | undefined) =>
  m === 0 ? 'Claude makes this' : m == null ? 'Time not estimated' : `About ${m} minutes of your time`;

/** Highest priority first (larger number = higher), then label. */
export const byPriority = (a: AssetMapRow, b: AssetMapRow) =>
  (b.priority ?? 0) - (a.priority ?? 0) || a.label.localeCompare(b.label);

export function groupRows(rows: AssetMapRow[]): { grp: string; rows: AssetMapRow[] }[] {
  const order = (g: string) => { const i = ASSET_GROUPS.indexOf(g); return i < 0 ? 99 : i; };
  const m = new Map<string, AssetMapRow[]>();
  for (const r of rows) m.set(r.grp, [...(m.get(r.grp) ?? []), r]);
  return [...m.entries()].sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0])).map(([grp, rs]) => ({ grp, rows: rs }));
}

/** The three highest-priority missing assets without an open setup job. */
export function topMissing(rows: AssetMapRow[], openJobChannelIds: Set<string>, n = 3): AssetMapRow[] {
  return rows.filter((r) => r.state === 'missing' && !(r.channel_id && openJobChannelIds.has(r.channel_id))).sort(byPriority).slice(0, n);
}
export const totalMinutes = (rows: AssetMapRow[]) => rows.reduce((s, r) => s + (r.setup_minutes ?? 0), 0);

export const MEDIA_KIT_STEPS: PlannedStep[] = [
  { title: "Draft the media kit and rate card from the brand's numbers and audience", owner_kind: 'claude', method_id: null, method_key: null },
  { title: 'Check the rates and approve', owner_kind: 'owner', method_id: null, method_key: null },
  { title: "Save the final link on the brand's channels", owner_kind: 'claude', method_id: null, method_key: null },
];

const norm = (h: string | null | undefined) => (h ?? '').trim().replace(/^@/, '').toLowerCase();

/** Default "Match to" choice for a detected account: handle match, else the only channel on that platform. */
export function defaultMatch(
  detected: { platform: string; handle: string | null },
  channels: { id: string; platform: string; handle: string | null }[],
): string {
  const same = channels.filter((c) => c.platform === detected.platform);
  const h = norm(detected.handle);
  const hit = h ? same.find((c) => norm(c.handle) === h) : undefined;
  if (hit) return hit.id;
  if (same.length === 1) return same[0].id;
  return 'new';
}

export const SETUP_BRIEF_CLOSER = 'Never paste passwords into chat or HQ; log in directly on the platform.';

export function buildSetupBrief(a: {
  brand: string; niche: string | null;
  kit: { colors: string[]; fonts: string[]; voice: string | null } | null;
  inUse: { label: string; handle: string | null; url: string | null }[];
  gaps: AssetMapRow[];
  playbookIdByKey: Map<string, string>;
}): string {
  const lines: string[] = [`Brand: ${a.brand}`, `Niche: ${a.niche || 'not set'}`];
  if (a.kit) {
    lines.push(`Colors: ${a.kit.colors.length ? a.kit.colors.join(', ') : 'not set'}`);
    lines.push(`Fonts: ${a.kit.fonts.length ? a.kit.fonts.join(', ') : 'not set'}`);
    lines.push(`Voice: ${a.kit.voice || 'not set'}`);
  }
  lines.push('', 'Handles already in use:');
  if (a.inUse.length) for (const c of a.inUse) lines.push(`- ${c.label}: ${c.handle || c.url || 'no handle recorded'}`);
  else lines.push('- none yet');
  lines.push('', 'To set up:');
  a.gaps.forEach((g, i) => {
    const pid = g.playbook_key ? a.playbookIdByKey.get(g.playbook_key) : undefined;
    lines.push(`${i + 1}. ${g.label} (${STATE_WORDS[g.state] ?? g.state})`);
    if (g.unlocks) lines.push(`   What it is: ${g.unlocks}`);
    const why = whyLine(g);
    if (why) lines.push(`   Why: ${why}`);
    lines.push(`   Time: ${minutesText(g.setup_minutes)}`);
    if (pid) lines.push(`   Playbook: https://supremeteammedia.com/playbooks?open=${pid}`);
    lines.push(
      "   Steps: create or claim the account with the brand's email; use the brand's usual handle; add the bio, profile image and link from the brand kit; then record it in HQ on the Setup tab with I already have it.",
    );
  });
  if (!a.gaps.length) lines.push('- nothing left to set up');
  lines.push('', SETUP_BRIEF_CLOSER);
  return lines.join('\n');
}
