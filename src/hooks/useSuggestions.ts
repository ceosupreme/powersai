import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useHelpState } from "@/hooks/useHelpState";

export type Suggestion = {
  /** Stable per-instance key for dismissal. */
  dismissKey: string;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
  /** Optional scope filter — used by entity-scoped panels. */
  scope?: { kind: "company"; id: string } | { kind: "project"; id: string };
};

const STALE_DEAL_DAYS = 14;
const STALE_BACKUP_DAYS = 30;

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function useSuggestions() {
  const { user } = useAuth();
  const { helpEnabled, isDismissed, lastBackupAt, isLoading: helpLoading } = useHelpState();

  const q = useQuery({
    queryKey: ["suggestions", user?.id, lastBackupAt],
    enabled: !!user?.id && helpEnabled,
    queryFn: async (): Promise<Suggestion[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const out: Suggestion[] = [];

      // Parallel queries — every one is grounded in a real column.
      const [
        companiesRes,
        contactsRes,
        dealsRes,
        interactionsRes,
        captureRes,
        followupsRes,
        kitsRes,
      ] = await Promise.all([
        // Active companies (id + linked_project_id + name)
        supabase
          .from("crm_companies")
          .select("id, name, linked_project_id")
          .eq("archived", false),
        // Active contacts (just company_id, to compute "companies with zero contacts")
        supabase
          .from("crm_contacts")
          .select("company_id")
          .eq("archived", false)
          .not("company_id", "is", null),
        // Active non-terminal deals + won deals
        supabase
          .from("crm_deals")
          .select("id, title, stage, company_id, updated_at")
          .eq("archived", false),
        // Most recent interaction date per deal — we sort desc + dedupe client-side.
        supabase
          .from("crm_interactions")
          .select("deal_id, occurred_at")
          .not("deal_id", "is", null)
          .order("occurred_at", { ascending: false })
          .limit(2000),
        // Capture inbox unrouted count
        supabase
          .from("capture_items")
          .select("id", { count: "exact", head: true })
          .eq("status", "inbox"),
        // Overdue follow-ups
        supabase
          .from("crm_interactions")
          .select("id", { count: "exact", head: true })
          .not("follow_up_date", "is", null)
          .lte("follow_up_date", today),
        // Brand kits — by project_id
        supabase.from("brand_kits").select("project_id").eq("archived", false),
      ]);

      const companies = companiesRes.data ?? [];
      const contacts = contactsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const interactions = interactionsRes.data ?? [];
      const kits = kitsRes.data ?? [];

      // --- A: Company with zero contacts ---
      const contactCompanyIds = new Set(
        contacts.map((c: { company_id: string | null }) => c.company_id).filter(Boolean) as string[],
      );
      for (const c of companies) {
        if (!contactCompanyIds.has(c.id)) {
          out.push({
            dismissKey: `sugg:company-no-contacts:${c.id}`,
            title: `${c.name} has no contacts`,
            body: "Add a contact so you have someone to reach out to.",
            href: `/crm?company=${c.id}`,
            ctaLabel: "Add contact",
            scope: { kind: "company", id: c.id },
          });
        }
      }

      // --- B: Won deal whose company isn't linked to a project ---
      const companyById = new Map(companies.map((c) => [c.id, c]));
      const wonDealsByCompany = new Map<string, { id: string; title: string }>();
      for (const d of deals) {
        if (d.stage === "won" && d.company_id) {
          const co = companyById.get(d.company_id);
          if (co && !co.linked_project_id) {
            wonDealsByCompany.set(d.company_id, { id: d.id, title: d.title });
          }
        }
      }
      for (const [companyId, deal] of wonDealsByCompany) {
        const co = companyById.get(companyId)!;
        out.push({
          dismissKey: `sugg:graduate-company:${companyId}`,
          title: `Graduate ${co.name} into a project`,
          body: `Won deal "${deal.title}" — create the project workspace.`,
          href: `/crm?company=${companyId}`,
          ctaLabel: "Graduate",
          scope: { kind: "company", id: companyId },
        });
      }

      // --- C: Stale deals (no activity in 14d) — non-terminal stages only ---
      const lastActivityByDeal = new Map<string, string>();
      for (const i of interactions) {
        const did = (i as { deal_id: string | null }).deal_id;
        if (!did) continue;
        if (!lastActivityByDeal.has(did)) {
          lastActivityByDeal.set(did, (i as { occurred_at: string }).occurred_at);
        }
      }
      for (const d of deals) {
        if (d.stage === "won" || d.stage === "lost") continue;
        const last = lastActivityByDeal.get(d.id) ?? d.updated_at;
        if (!last) continue;
        if (daysAgo(last) < STALE_DEAL_DAYS) continue;
        const co = d.company_id ? companyById.get(d.company_id) : null;
        out.push({
          dismissKey: `sugg:stale-deal:${d.id}`,
          title: `"${d.title}" hasn't had activity in ${daysAgo(last)}d`,
          body: `Log a follow-up${co ? ` with ${co.name}` : ""}.`,
          href: `/crm?deal=${d.id}`,
          ctaLabel: "Log follow-up",
          scope: d.company_id ? { kind: "company", id: d.company_id } : undefined,
        });
      }

      // --- D: Capture inbox count ---
      const captureCount = captureRes.count ?? 0;
      if (captureCount > 0) {
        out.push({
          dismissKey: `sugg:capture-inbox:${captureCount}`,
          title: `${captureCount} item${captureCount === 1 ? "" : "s"} in your inbox to route`,
          body: "Tag each capture to a project so it gets actioned.",
          href: "/inbox",
          ctaLabel: "Open inbox",
        });
      }

      // --- E: Overdue follow-ups ---
      const followupCount = followupsRes.count ?? 0;
      if (followupCount > 0) {
        out.push({
          dismissKey: `sugg:followups-due:${followupCount}`,
          title: `${followupCount} follow-up${followupCount === 1 ? "" : "s"} due`,
          body: "Review and clear them on the CRM.",
          href: "/crm",
          ctaLabel: "Open CRM",
        });
      }

      // --- F: Project without brand kit (linked from a company) ---
      const kitProjectIds = new Set(kits.map((k: { project_id: string }) => k.project_id));
      for (const c of companies) {
        const pid = c.linked_project_id;
        if (pid && !kitProjectIds.has(pid)) {
          out.push({
            dismissKey: `sugg:no-brand-kit:${pid}`,
            title: `${c.name}: no brand kit yet`,
            body: "Set up colors, fonts, and voice in the Brand Vault.",
            href: `/brand-kit?project=${pid}`,
            ctaLabel: "Set up kit",
            scope: { kind: "project", id: pid },
          });
        }
      }

      // --- G: Stale / missing backup ---
      const stale = !lastBackupAt || daysAgo(lastBackupAt) >= STALE_BACKUP_DAYS;
      if (stale) {
        out.push({
          dismissKey: lastBackupAt
            ? `sugg:backup-stale:${lastBackupAt.slice(0, 10)}`
            : `sugg:backup-never`,
          title: lastBackupAt
            ? `Last backup was ${daysAgo(lastBackupAt)} days ago`
            : "No backup on record",
          body: "Export a backup so your authored data is safe.",
          href: "/admin?tab=backup",
          ctaLabel: "Export backup",
        });
      }

      return out.filter((s) => !isDismissed(s.dismissKey));
    },
  });

  return {
    suggestions: helpEnabled ? q.data ?? [] : [],
    isLoading: helpLoading || q.isLoading,
    helpEnabled,
  };
}