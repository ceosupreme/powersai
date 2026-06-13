// Helpers for parsing synthetic findingId back-links used by the asset store.
// Real findings keep their UUID; non-finding contexts use prefixed IDs:
//   campaign:{campaignId}
//   adhoc:{venueId}:{ts}
//
// Used by the Action Center to render a meaningful source label and to power
// the "Source" filter pills.

export type AssetSource = 'finding' | 'campaign' | 'adhoc';

export const parseAssetSource = (findingId: string): AssetSource => {
  if (findingId.startsWith('campaign:')) return 'campaign';
  if (findingId.startsWith('adhoc:')) return 'adhoc';
  return 'finding';
};

export const sourceCampaignId = (findingId: string): string | null =>
  findingId.startsWith('campaign:') ? findingId.slice('campaign:'.length) : null;

export const SOURCE_LABEL: Record<AssetSource, string> = {
  finding: 'From Finding',
  campaign: 'From Campaign',
  adhoc: 'Ad-hoc',
};
