/**
 * Supreme Team Media's own website numbers, shown low on that brand's Overview tab.
 * Only this brand has site tracking (site_events, inbound_leads without a captured project, site_orders).
 */
export const STM_PROJECT_ID = '34cb1836-6ead-4478-915c-0a9dc552a554';

export interface WebsiteWeek {
  pageViews: number;
  ctaClicks: number;
  callRequests: number;
  /** Inquiries in the last 7 days by the industry page they came from. */
  inquiries: Record<string, number>;
  inquiryCount: number;
  /** Percent of the last 7 days' email inquiries that have a first reply; null when there were none. */
  firstResponseRate: number | null;
  ordersCount: number;
  /** Paid or active site orders in the last 30 days, in cents. */
  ordersTotal: number;
}

export interface WebsiteLeadRow { email: string | null; first_response_at: string | null; qualifier_data: unknown }

export function summarizeWebsiteWeek(
  counts: { pageViews: number; ctaClicks: number; callRequests: number },
  leads: WebsiteLeadRow[],
  orders: { amount_cents: number | null }[],
): WebsiteWeek {
  const inquiries: Record<string, number> = {};
  let emailLeads = 0;
  let responded = 0;
  for (const lead of leads) {
    const q = (lead.qualifier_data && typeof lead.qualifier_data === 'object' ? lead.qualifier_data : {}) as Record<string, unknown>;
    const vertical = typeof q.source_vertical === 'string' && q.source_vertical ? q.source_vertical : 'other';
    inquiries[vertical] = (inquiries[vertical] ?? 0) + 1;
    if (lead.email) {
      emailLeads += 1;
      if (lead.first_response_at) responded += 1;
    }
  }
  return {
    ...counts,
    inquiries,
    inquiryCount: leads.length,
    firstResponseRate: emailLeads ? Math.round((responded / emailLeads) * 100) : null,
    ordersCount: orders.length,
    ordersTotal: orders.reduce((sum, o) => sum + (o.amount_cents ?? 0), 0),
  };
}

const counted = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** The pieces of the one summary line, in reading order. */
export function websiteWeekParts(w: WebsiteWeek): string[] {
  return [
    counted(w.pageViews, 'page view', 'page views'),
    counted(w.ctaClicks, 'CTA click', 'CTA clicks'),
    counted(w.callRequests, 'call request', 'call requests'),
    counted(w.inquiryCount, 'inquiry', 'inquiries'),
    w.firstResponseRate == null ? 'no email inquiries to answer' : `first-response rate ${w.firstResponseRate}%`,
  ];
}

export function websiteOrdersLine(w: WebsiteWeek): string {
  return `Orders, last 30 days: ${w.ordersCount} · $${(w.ordersTotal / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Industries with the most inquiries first, then by name. */
export function websiteInquiryRows(w: WebsiteWeek): { label: string; count: number }[] {
  return Object.entries(w.inquiries)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([vertical, count]) => ({ label: vertical.replace(/-/g, ' '), count }));
}
