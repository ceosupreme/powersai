import {
  Utensils, Users, ListChecks, Star, FileText, PackageSearch,
  MapPin, Globe, Instagram, ThumbsUp, Search, Sparkles, Swords,
  type LucideIcon,
} from 'lucide-react';
import type { FindingCategoryKey } from '../findings/mockFindings';

// Status vocabulary used by the operator "Data Sources" tab. This surface
// must NEVER display a fabricated "Connected · 2 hours ago" — every value
// is either derived from a live table read or explicitly "Not Wired".
export type SourceStatus =
  | 'Connected'       // scheduled: last success ≤ cadence budget
  | 'Stale'           // scheduled: last success past the budget
  | 'Partial'         // GBP-only: mapping without recent snapshot
  | 'Limited'         // GBP-only: fetch failing / older than 30d
  | 'Never Synced'    // scheduled: source is wired but has never produced a row
  | 'Not Wired'       // catalog entry with no integration in this build
  | 'Coming Soon';    // planned integration, no read/write path yet

// How this source refreshes. Drives the recency copy the card renders
// ("Last sync" vs "Last entry" vs "Last upload").
export type RefreshMode = 'scheduled' | 'on_demand' | 'manual_entry' | 'manual_upload' | 'none';

export type DataSource = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconTint?: string;
  status: SourceStatus;
  lastSync?: string;
  /** Optional human-readable qualifier shown under the status chip,
   *  e.g. "Never synced for this project" or "No manager entries yet". */
  note?: string;
  feeds: FindingCategoryKey[];
  group: 'in-use' | 'available';
  action: 'Configure' | 'Reconnect' | 'Connect' | 'Coming Soon' | 'None';
  refreshMode: RefreshMode;
};

// Catalog: definitional metadata only. Status/lastSync are computed live
// in DataSourcesView from real table reads — the catalog seeds status as
// the honest "no live signal" value.
export const DATA_SOURCE_CATALOG: DataSource[] = [
  // ── In use ──────────────────────────────
  {
    id: 'toast', name: 'Toast POS', icon: Utensils, iconTint: 'text-orange-600',
    description: 'POS, KDS, item mix, daily metrics — the core revenue & operational signal.',
    status: 'Never Synced',
    feeds: ['revenue', 'menu', 'events', 'operational'],
    group: 'in-use', action: 'Configure', refreshMode: 'scheduled',
  },
  {
    id: '7shifts', name: '7shifts', icon: Users, iconTint: 'text-blue-600',
    description: 'Schedule, labor cost, and shift coverage signals.',
    status: 'Never Synced',
    feeds: ['operational', 'events'],
    group: 'in-use', action: 'Configure', refreshMode: 'scheduled',
  },
  {
    id: 'asana', name: 'Asana / Marketing Hub', icon: ListChecks, iconTint: 'text-rose-600',
    description: 'Marketing log, campaign tracking, action item completion.',
    status: 'Never Synced',
    feeds: ['events', 'menu', 'social'],
    group: 'in-use', action: 'Configure', refreshMode: 'scheduled',
  },
  {
    id: 'google_reviews', name: 'Google Reviews', icon: Star, iconTint: 'text-amber-600',
    description: 'Review volume, rating trend, and sentiment themes.',
    status: 'Never Synced',
    feeds: ['reputation'],
    group: 'in-use', action: 'Configure', refreshMode: 'on_demand',
  },
  {
    id: 'manager_logs', name: 'Manager Logs', icon: FileText, iconTint: 'text-emerald-600',
    description: 'Qualitative shift notes parsed for ops issues, wins, and compliance.',
    status: 'Never Synced',
    feeds: ['operational'],
    group: 'in-use', action: 'Configure', refreshMode: 'manual_entry',
  },
  {
    id: 'sculpture', name: 'Sculpture Hospitality', icon: PackageSearch, iconTint: 'text-purple-600',
    description: 'Inventory variance and beverage cost — feeds menu profitability signals.',
    status: 'Never Synced',
    feeds: ['menu'],
    group: 'in-use', action: 'Configure', refreshMode: 'manual_upload',
  },

  // ── Available to connect ────────────────
  {
    id: 'gbp', name: 'Google Business Profile API', icon: MapPin, iconTint: 'text-sky-600',
    description: 'GBP attributes, posts, photos, and Q&A — the local-pack visibility backbone.',
    status: 'Never Synced',
    feeds: ['local'],
    group: 'available', action: 'Connect', refreshMode: 'scheduled',
  },
  {
    id: 'website_crawler', name: 'Website Crawler', icon: Globe, iconTint: 'text-indigo-600',
    description: 'Audits site structure, conversion paths, and content freshness.',
    status: 'Never Synced',
    feeds: ['website'],
    group: 'available', action: 'Connect', refreshMode: 'on_demand',
  },
  {
    id: 'social_apis', name: 'Instagram / Facebook / TikTok', icon: Instagram, iconTint: 'text-pink-600',
    description: 'Post cadence, reach, engagement rate, and content theme tracking.',
    status: 'Not Wired',
    feeds: ['social'],
    group: 'available', action: 'None', refreshMode: 'none',
  },
  {
    id: 'yelp', name: 'Yelp Business API', icon: ThumbsUp, iconTint: 'text-red-600',
    description: 'Supplementary reputation signal — review volume, rating, and response rate.',
    status: 'Not Wired',
    feeds: ['reputation'],
    group: 'available', action: 'None', refreshMode: 'none',
  },
  {
    id: 'local_scrape', name: 'Local Search Scraping', icon: Search, iconTint: 'text-teal-600',
    description: 'Rank tracking across local-pack keywords for the venue category.',
    status: 'Coming Soon',
    feeds: ['local'],
    group: 'available', action: 'Coming Soon', refreshMode: 'scheduled',
  },
  {
    id: 'ai_search', name: 'AI Search Visibility', icon: Sparkles, iconTint: 'text-violet-600',
    description: 'Mentions across ChatGPT, Gemini, Perplexity, and Google AI Overviews.',
    status: 'Coming Soon',
    feeds: ['local'],
    group: 'available', action: 'Coming Soon', refreshMode: 'scheduled',
  },
  {
    id: 'competitor', name: 'Competitor Data Scraping', icon: Swords, iconTint: 'text-slate-600',
    description: 'Benchmarks competitors on hours, menu, pricing, and review velocity.',
    status: 'Coming Soon',
    feeds: ['local', 'menu', 'reputation', 'social'],
    group: 'available', action: 'Coming Soon', refreshMode: 'none',
  },
];

// Legacy alias — kept temporarily so any lingering imports keep compiling
// while the internal-mock purge lands.
export const MOCK_DATA_SOURCES = DATA_SOURCE_CATALOG;
