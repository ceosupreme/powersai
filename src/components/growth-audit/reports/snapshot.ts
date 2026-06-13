import { MOCK_CATEGORIES, MOCK_PRIMARY, MOCK_PRIORITIES, MOCK_QUICK_STATS } from '../mockData';
import { MOCK_FINDINGS } from '../findings/mockFindings';
import type { ReportConfig, ReportSnapshot } from './types';

const METHODOLOGY = [
  'The Growth Audit aggregates 8 categories of venue performance signals scored 0–100, rolled into an overall Growth Score.',
  'Findings are surfaced when at least one signal in a category breaches its baseline by a statistically meaningful margin over the trailing window.',
  'Each finding carries Revenue Upside, Ease, Confidence, and Operational Risk on a 1–5 scale, combined into a Priority Score.',
  'The Operational Readiness Gate guards traffic-driving recommendations: campaigns are paused while ops capacity is below threshold.',
];

const DATA_SOURCES: ReportSnapshot['dataSources'] = [
  { label: 'Toast (POS, KDS, item mix)', status: 'Connected' },
  { label: '7shifts (schedule, labor)', status: 'Connected' },
  { label: 'Google Business Profile', status: 'Partial' },
  { label: 'Yelp Business API', status: 'Connected' },
  { label: 'Review sentiment classifier', status: 'Connected' },
  { label: 'BrightLocal rank tracker', status: 'Partial' },
  { label: 'Asana marketing log', status: 'Connected' },
  { label: 'Site audit + chat transcripts', status: 'Limited' as never },
];

/** Deep-clone the relevant mock state into an immutable snapshot. */
export const captureSnapshot = (config: ReportConfig): ReportSnapshot => {
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    id: `rpt_${Date.now().toString(36)}`,
    config,
    generatedAt: new Date().toISOString(),
    primary: clone(MOCK_PRIMARY),
    // Strip non-serializable icon refs — re-attach in the renderer by key.
    categories: MOCK_CATEGORIES.map(c => ({ ...c })),
    priorities: clone(MOCK_PRIORITIES),
    findings: clone(MOCK_FINDINGS),
    quickStats: clone(MOCK_QUICK_STATS),
    methodology: METHODOLOGY,
    dataSources: DATA_SOURCES,
  };
};
