import {
  Utensils, Users, ListChecks, Star, FileText, PackageSearch,
  MapPin, Globe, Instagram, ThumbsUp, Search, Sparkles, Swords,
  type LucideIcon,
} from 'lucide-react';
import type { FindingCategoryKey } from '../findings/mockFindings';

export type SourceStatus = 'Connected' | 'Partial' | 'Limited' | 'Not Connected' | 'Coming Soon';

export type DataSource = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  iconTint?: string;
  status: SourceStatus;
  lastSync?: string;
  feeds: FindingCategoryKey[];
  group: 'in-use' | 'available';
  action: 'Configure' | 'Reconnect' | 'Connect' | 'Coming Soon';
};

export const MOCK_DATA_SOURCES: DataSource[] = [
  // ── In use ──────────────────────────────
  {
    id: 'toast', name: 'Toast POS', icon: Utensils, iconTint: 'text-orange-600',
    description: 'POS, KDS, item mix, daily metrics — the core revenue & operational signal.',
    status: 'Connected', lastSync: '2 hours ago',
    feeds: ['revenue', 'menu', 'events', 'operational'],
    group: 'in-use', action: 'Configure',
  },
  {
    id: '7shifts', name: '7shifts', icon: Users, iconTint: 'text-blue-600',
    description: 'Schedule, labor cost, and shift coverage signals.',
    status: 'Connected', lastSync: '1 hour ago',
    feeds: ['operational', 'events'],
    group: 'in-use', action: 'Configure',
  },
  {
    id: 'asana', name: 'Asana / Marketing Hub', icon: ListChecks, iconTint: 'text-rose-600',
    description: 'Marketing log, campaign tracking, action item completion.',
    status: 'Connected', lastSync: '15 minutes ago',
    feeds: ['events', 'menu', 'social'],
    group: 'in-use', action: 'Configure',
  },
  {
    id: 'google_reviews', name: 'Google Reviews', icon: Star, iconTint: 'text-amber-600',
    description: 'Review volume, rating trend, and sentiment themes.',
    status: 'Connected', lastSync: '4 hours ago',
    feeds: ['reputation'],
    group: 'in-use', action: 'Configure',
  },
  {
    id: 'manager_logs', name: 'Manager Logs', icon: FileText, iconTint: 'text-emerald-600',
    description: 'Qualitative shift notes parsed for ops issues, wins, and compliance.',
    status: 'Connected', lastSync: '38 minutes ago',
    feeds: ['operational'],
    group: 'in-use', action: 'Configure',
  },
  {
    id: 'sculpture', name: 'Sculpture Hospitality', icon: PackageSearch, iconTint: 'text-purple-600',
    description: 'Inventory variance and beverage cost — feeds menu profitability signals.',
    status: 'Partial', lastSync: '2 days ago',
    feeds: ['menu'],
    group: 'in-use', action: 'Reconnect',
  },

  // ── Available to connect ────────────────
  {
    id: 'gbp', name: 'Google Business Profile API', icon: MapPin, iconTint: 'text-sky-600',
    description: 'GBP attributes, posts, photos, and Q&A — the local-pack visibility backbone.',
    status: 'Not Connected',
    feeds: ['local'],
    group: 'available', action: 'Connect',
  },
  {
    id: 'website_crawler', name: 'Website Crawler', icon: Globe, iconTint: 'text-indigo-600',
    description: 'Audits site structure, conversion paths, and content freshness.',
    status: 'Not Connected',
    feeds: ['website'],
    group: 'available', action: 'Connect',
  },
  {
    id: 'social_apis', name: 'Instagram / Facebook / TikTok', icon: Instagram, iconTint: 'text-pink-600',
    description: 'Post cadence, reach, engagement rate, and content theme tracking.',
    status: 'Not Connected',
    feeds: ['social'],
    group: 'available', action: 'Connect',
  },
  {
    id: 'yelp', name: 'Yelp Business API', icon: ThumbsUp, iconTint: 'text-red-600',
    description: 'Supplementary reputation signal — review volume, rating, and response rate.',
    status: 'Limited', lastSync: '6 days ago',
    feeds: ['reputation'],
    group: 'available', action: 'Reconnect',
  },
  {
    id: 'local_scrape', name: 'Local Search Scraping', icon: Search, iconTint: 'text-teal-600',
    description: 'Rank tracking across local-pack keywords for the venue category.',
    status: 'Coming Soon',
    feeds: ['local'],
    group: 'available', action: 'Coming Soon',
  },
  {
    id: 'ai_search', name: 'AI Search Visibility', icon: Sparkles, iconTint: 'text-violet-600',
    description: 'Mentions across ChatGPT, Gemini, Perplexity, and Google AI Overviews.',
    status: 'Coming Soon',
    feeds: ['local'],
    group: 'available', action: 'Coming Soon',
  },
  {
    id: 'competitor', name: 'Competitor Data Scraping', icon: Swords, iconTint: 'text-slate-600',
    description: 'Benchmarks competitors on hours, menu, pricing, and review velocity.',
    status: 'Coming Soon',
    feeds: ['local', 'menu', 'reputation', 'social'],
    group: 'available', action: 'Coming Soon',
  },
];
