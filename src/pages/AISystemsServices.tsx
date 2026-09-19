import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "AI & business systems",
  title: "Make the work behind the business easier to run.",
  description: "Reduce the time your team spends chasing information, copying updates, and checking routine work. We start with the business process, then connect tools, data, workflows, reporting, tasks, and AI only where they make the operation easier to run.",
  path: "/services/ai-systems",
  seoTitle: "AI & Business Systems | Supreme Team Media",
  seoDescription: "Practical dashboards, internal tools, CRM workflows, reporting integrations and AI-assisted systems built around real business processes.",
  intent: "ai-systems",
  primaryCta: "Discuss a business system",
  secondaryCta: "See systems work",
  proofSlugs: ["barpulse", "allmighty-supreme"],
  problemTitle: "Small manual problems become expensive when they happen every day.",
  problems: [
    { title: "Important information lives in separate tools.", body: "A clearer operating view can bring the information you need together without forcing you to replace every system." },
    { title: "Follow-up depends on memory and manual handoffs.", body: "Clear workflows, ownership, and carefully chosen automation can reduce dropped steps and repeated administrative work." },
    { title: "AI is being discussed before the process is understood.", body: "The first job is mapping what happens now, where judgment matters, and where software can genuinely help." },
  ],
  outcomesTitle: "Less chasing. Fewer repeated steps. Better visibility.",
  outcomesIntro: "The answer may be a simpler workflow, a dashboard, an internal app, or a set of useful connections. It depends on how your team actually works.",
  outcomes: ["A clearer view of the information that matters", "Less avoidable copying and follow-up", "Defined workflows and responsibilities", "AI assistance where it saves time or improves judgment"],
  capabilitiesTitle: "Turn a frustrating process into a system your team can use.",
  capabilities: ["Dashboards and internal applications", "CRM and pipeline workflows", "Reporting and data connections", "Task and approval systems", "Operational automations", "AI-assisted analysis and drafting", "Forms, notifications, and handoffs", "Iterative refinement and scoped support"],
  process: [
    { title: "Map the operation", body: "Understand the existing process, people, systems, decisions, information gaps, and the cost of the current friction." },
    { title: "Choose the right fix", body: "Start with the smallest responsible system that improves visibility or execution, then build and review it around real workflows." },
    { title: "Put it to work", body: "Test the agreed paths, document responsibilities, and refine the tool or workflow based on scoped use and feedback." },
  ],
  connectedTitle: "A useful system has to make sense to the people using it.",
  connectedBody: "Process logic, interface design, clear communication, and implementation work together so the system is easier to understand and adopt.",
  connectedLinks: [{ label: "BarPulse case study", to: "/work/barpulse" }, { label: "Websites & digital products", to: "/services/websites" }, { label: "Marketing & growth", to: "/services/marketing" }],
  faqs: [
    { q: "Do we need AI for this project?", a: "Not necessarily. The process determines the tools. A clearer workflow, dashboard, integration, or rule-based automation may be more useful than AI." },
    { q: "Can you work with tools we already use?", a: "Often, yes. Feasibility depends on available access, APIs, data quality, platform rules, and the agreed security and ownership model." },
    { q: "Is BarPulse a template sold to every business?", a: "No. BarPulse demonstrates a substantial historical hospitality implementation. New systems work begins with the specific business process and scope." },
    { q: "How are sensitive data and access handled?", a: "Data, permissions, account ownership, and security requirements are defined before implementation. Sensitive credentials are never treated as ordinary project content." },
  ],
  finalTitle: "Start with the bottleneck—not the technology.",
  finalBody: "Share the workflow, tools, recurring friction, and the decisions that are currently harder than they should be.",
  tone: "systems",
};

export default function AISystemsServices() { return <ServicePage content={content} />; }