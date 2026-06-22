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

      // Second batch — split to avoid deep type instantiation in Promise.all.
      const [
        projectsRes,
        leadsReadyRes,
        pillarScoresRes,
        openFindingsRes,
        contentItemsRes,
        channelRevenueRes,
        qualifierFieldsRes,
      ] = await Promise.all([
        supabase.from("venues").select("id, name, project_type").eq("is_active", true),
        supabase
          .from("inbound_leads")
          .select("id", { count: "exact", head: true })
          .eq("is_ready", true)
          .eq("status", "new"),
        supabase.from("project_pillar_scores").select("project_id, week_start"),
        supabase.from("growth_findings").select("venue_id").eq("status", "open"),
        supabase.from("content_items").select("project_id"),
        supabase.from("channel_revenue").select("project_id, period_month"),
        supabase.from("project_type_qualifier_fields").select("project_type"),
      ]);

      const companies = companiesRes.data ?? [];
      const contacts = contactsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const interactions = interactionsRes.data ?? [];
      const kits = kitsRes.data ?? [];
      const projects = ((projectsRes.data ?? []) as unknown) as {
        id: string;
        name: string;
        project_type: string | null;
      }[];
      const pillarScores = (pillarScoresRes.data ?? []) as { project_id: string; week_start: string }[];
      const openFindings = (openFindingsRes.data ?? []) as { venue_id: string }[];
      const contentItems = (contentItemsRes.data ?? []) as { project_id: string }[];
      const channelRevenue = ((channelRevenueRes.data ?? []) as unknown) as {
        project_id: string;
        period_month: string;
      }[];
      const qualifierFieldRows = (qualifierFieldsRes.data ?? []) as { project_type: string }[];

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

      // --- H: Project with no type set ---
      for (const p of projects) {
        if (!p.project_type) {
          out.push({
            dismissKey: `sugg:no-project-type:${p.id}`,
            title: `${p.name}: no project type set`,
            body: "Pick a vertical so the right pillars and qualifier questions apply.",
            href: `/admin?tab=projects&project=${p.id}`,
            ctaLabel: "Set type",
            scope: { kind: "project", id: p.id },
          });
        }
      }

      // --- I: Project type missing qualifier fields ---
      const fieldCountByType = new Map<string, number>();
      for (const r of qualifierFieldRows) {
        fieldCountByType.set(r.project_type, (fieldCountByType.get(r.project_type) ?? 0) + 1);
      }
      const flaggedTypes = new Set<string>();
      for (const p of projects) {
        if (!p.project_type) continue;
        if ((fieldCountByType.get(p.project_type) ?? 0) > 0) continue;
        if (flaggedTypes.has(p.project_type)) continue;
        flaggedTypes.add(p.project_type);
        out.push({
          dismissKey: `sugg:no-qualifier-fields:${p.project_type}`,
          title: `No qualifier questions for "${p.project_type}"`,
          body: "Add fields so the Lead Qualifier knows what to ask for this vertical.",
          href: "/admin?tab=settings&subtab=qualifier",
          ctaLabel: "Configure",
        });
      }

      // --- J: Qualified leads waiting to be promoted ---
      const leadsReadyCount = leadsReadyRes.count ?? 0;
      if (leadsReadyCount > 0) {
        out.push({
          dismissKey: `sugg:qualified-leads-pending:${leadsReadyCount}`,
          title: `${leadsReadyCount} qualified lead${leadsReadyCount === 1 ? "" : "s"} waiting to promote`,
          body: "Move them into the CRM as company + deal.",
          href: "/crm",
          ctaLabel: "Open CRM",
        });
      }

      // --- K: Projects missing this week's Weekly Review ---
      const now = new Date();
      const dow = now.getDay(); // 0 Sun, 1 Mon
      const mondayOffset = (dow + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      const weekStart = monday.toISOString().slice(0, 10);
      const reviewedProjects = new Set(
        pillarScores.filter((s) => s.week_start === weekStart).map((s) => s.project_id),
      );
      for (const p of projects) {
        if (reviewedProjects.has(p.id)) continue;
        out.push({
          dismissKey: `sugg:weekly-review-due:${p.id}:${weekStart}`,
          title: `${p.name}: no Weekly Review this week`,
          body: "Grade the pillars so the Pillar Score stays fresh.",
          href: "/weekly-review",
          ctaLabel: "Open Weekly Review",
          scope: { kind: "project", id: p.id },
        });
      }

      // --- L: Open growth findings per project ---
      const findingsByProject = new Map<string, number>();
      for (const f of openFindings) {
        findingsByProject.set(f.venue_id, (findingsByProject.get(f.venue_id) ?? 0) + 1);
      }
      for (const [pid, count] of findingsByProject) {
        const proj = projects.find((p) => p.id === pid);
        if (!proj) continue;
        out.push({
          dismissKey: `sugg:open-findings:${pid}:${count}`,
          title: `${proj.name}: ${count} open growth finding${count === 1 ? "" : "s"}`,
          body: "Review and clear them on the Growth Audit.",
          href: "/growth-audit",
          ctaLabel: "Open Growth Audit",
          scope: { kind: "project", id: pid },
        });
      }

      // --- M: Empty Content Pipeline per project ---
      const projectsWithContent = new Set(contentItems.map((c) => c.project_id));
      for (const p of projects) {
        if (projectsWithContent.has(p.id)) continue;
        out.push({
          dismissKey: `sugg:no-content:${p.id}`,
          title: `${p.name}: no content items yet`,
          body: "Add an item to start using the 7-stage pipeline.",
          href: "/content",
          ctaLabel: "Open Content",
          scope: { kind: "project", id: p.id },
        });
      }

      // --- N: No Channel Revenue logged this month ---
      const ym = now.toISOString().slice(0, 7);
      const projectsWithRevenueThisMonth = new Set(
        channelRevenue.filter((r) => (r.period_month ?? "").slice(0, 7) === ym).map((r) => r.project_id),
      );
      for (const p of projects) {
        if (projectsWithRevenueThisMonth.has(p.id)) continue;
        out.push({
          dismissKey: `sugg:no-revenue:${p.id}:${ym}`,
          title: `${p.name}: no revenue logged for ${ym}`,
          body: "Log Channel Revenue so the Monetization pillar has data.",
          href: "/channel-revenue",
          ctaLabel: "Open Channel Revenue",
          scope: { kind: "project", id: p.id },
        });
      }

      // --- O–S: New-surface suggestions. Wrapped in allSettled so missing tables don't break the panel. ---
      const [
        pendingApprovalsRes,
        enrollmentsRes,
        recoveryReportsRes,
        customerListsRes,
      ] = await Promise.allSettled([
        supabase
          .from("automation_queue")
          .select("project_id")
          .eq("status", "pending_review"),
        supabase
          .from("automation_enrollments")
          .select("project_id, enabled"),
        supabase
          .from("recovery_reports")
          .select("id, project_id, status, period_end")
          .in("status", ["draft", "reviewed"]),
        supabase
          .from("customer_lists")
          .select("id, project_id, name, member_count"),
      ]);

      // O: Automation Inbox has pending drafts per project
      if (pendingApprovalsRes.status === "fulfilled") {
        const rows = ((pendingApprovalsRes.value.data ?? []) as { project_id: string }[]);
        const byProject = new Map<string, number>();
        for (const r of rows) byProject.set(r.project_id, (byProject.get(r.project_id) ?? 0) + 1);
        for (const [pid, count] of byProject) {
          const proj = projects.find((p) => p.id === pid);
          if (!proj) continue;
          out.push({
            dismissKey: `sugg:automation-pending:${pid}:${count}`,
            title: `${proj.name}: ${count} draft${count === 1 ? "" : "s"} waiting for approval`,
            body: "Open the Automation Inbox to approve, edit, or reject each one.",
            href: "/automation-inbox",
            ctaLabel: "Open Automation Inbox",
            scope: { kind: "project", id: pid },
          });
        }
      }

      // P: Project has no automation enrollments → suggest applying a bundle
      if (enrollmentsRes.status === "fulfilled") {
        const rows = ((enrollmentsRes.value.data ?? []) as { project_id: string; enabled: boolean }[]);
        const enrolledProjects = new Set(rows.filter((r) => r.enabled).map((r) => r.project_id));
        for (const p of projects) {
          if (enrolledProjects.has(p.id)) continue;
          out.push({
            dismissKey: `sugg:no-automation-bundle:${p.id}`,
            title: `${p.name}: no automations enrolled yet`,
            body: "Apply an Automation Bundle in Admin so AI starts drafting customer messages.",
            href: "/admin?tab=automation-bundles",
            ctaLabel: "Apply a bundle",
            scope: { kind: "project", id: p.id },
          });
        }
      }

      // Q: Recovery Report draft awaiting review per project
      if (recoveryReportsRes.status === "fulfilled") {
        const rows = ((recoveryReportsRes.value.data ?? []) as {
          id: string; project_id: string; status: string; period_end: string;
        }[]);
        // Surface the latest pending per project only.
        const latestByProject = new Map<string, { id: string; status: string; period_end: string }>();
        for (const r of rows) {
          const cur = latestByProject.get(r.project_id);
          if (!cur || r.period_end > cur.period_end) {
            latestByProject.set(r.project_id, { id: r.id, status: r.status, period_end: r.period_end });
          }
        }
        for (const [pid, r] of latestByProject) {
          const proj = projects.find((p) => p.id === pid);
          if (!proj) continue;
          const verb = r.status === "draft" ? "Review" : "Send";
          out.push({
            dismissKey: `sugg:recovery-report:${r.id}`,
            title: `${proj.name}: Recovery Report for week of ${r.period_end} is ${r.status}`,
            body: `${verb} the report when you're ready — internal-first, nothing auto-sends.`,
            href: "/recovery-reports",
            ctaLabel: "Open Recovery Reports",
            scope: { kind: "project", id: pid },
          });
        }
      }

      // R: Customer list uploaded but no reactivation campaign drafted yet
      if (customerListsRes.status === "fulfilled" && pendingApprovalsRes.status === "fulfilled") {
        const lists = ((customerListsRes.value.data ?? []) as {
          id: string; project_id: string; name: string; member_count: number | null;
        }[]);
        // Heuristic: list has members and the project has zero pending reactivation drafts.
        const queueRows = ((pendingApprovalsRes.value.data ?? []) as { project_id: string }[]);
        const projectsWithQueue = new Set(queueRows.map((q) => q.project_id));
        for (const l of lists) {
          if ((l.member_count ?? 0) === 0) continue;
          if (projectsWithQueue.has(l.project_id)) continue;
          const proj = projects.find((p) => p.id === l.project_id);
          if (!proj) continue;
          out.push({
            dismissKey: `sugg:reactivation-list-idle:${l.id}`,
            title: `${proj.name}: list "${l.name}" hasn't been campaigned yet`,
            body: "Start a reactivation campaign — AI drafts go to the Automation Inbox.",
            href: "/reactivation",
            ctaLabel: "Open Reactivation",
            scope: { kind: "project", id: l.project_id },
          });
        }
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