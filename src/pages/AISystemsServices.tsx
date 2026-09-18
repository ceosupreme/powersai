import { ServicePage, type ServicePageContent } from "@/components/marketing/studio/ServicePage";

const content: ServicePageContent = {
  eyebrow: "AI & business systems",
  title: "Make the work behind the business easier to run.",
  description: "Supreme Team Media designs dashboards, internal tools, CRM workflows, reporting integrations, automations, and AI-assisted processes around the way the business actually operates. The work starts with the process—not with forcing AI into it.",
  path: "/services/ai-systems",
  seoTitle: "AI & Business Systems | Supreme Team Media",
  seoDescription: "Practical dashboards, internal tools, CRM workflows, reporting integrations and AI-assisted systems built around real business processes.",
  intent: "ai-systems",
  primaryCta: "Discuss a business system",
  secondaryCta: "See systems work",
  proofSlugs: ["barpulse", "allmighty-supreme"],
  problemTitle: "Operational friction compounds when information and responsibility stay scattered.",
  problems: [
    { title: "Important information lives in separate tools.", body: "A useful operating view can bring the agreed signals together without pretending every system needs to be replaced." },
    { title: "Follow-up depends on memory and manual handoffs.", body: "Clear workflows, ownership, and carefully chosen automation can reduce dropped steps and repeated administrative work." },
    { title: "AI is being discussed before the process is understood.", body: "The first job is mapping what happens now, where judgment matters, and where software can genuinely help." },
  ],
  outcomesTitle: "A system shaped around the work, not the trend.",
  outcomesIntro: "The result may be a focused workflow, a dashboard, an internal application, or a connected operating system. The right answer depends on the process and the people using it.",
  outcomes: ["One clearer view of agreed information", "Less avoidable manual coordination", "Defined workflows and responsibilities", "AI assistance where it adds practical value"],
  capabilitiesTitle: "From workflow mapping to a working operational tool.",
  capabilities: ["Dashboards and internal applications", "CRM and pipeline workflows", "Reporting and data connections", "Task and approval systems", "Operational automations", "AI-assisted analysis and drafting", "Forms, notifications, and handoffs", "Iterative refinement and scoped support"],
  process: [
    { title: "Map the operation", body: "Understand the existing process, people, systems, decisions, information gaps, and the cost of the current friction." },
    { title: "Design the useful layer", body: "Choose the smallest responsible system that improves visibility or execution, then build and review it with real workflows in mind." },
    { title: "Put it to work", body: "Test the agreed paths, document responsibilities, and refine the tool or workflow based on scoped use and feedback." },
  ],
  connectedTitle: "Systems work still needs product thinking, clear communication, and a usable interface.",
  connectedBody: "That is where the studio's creative and technical range matters: the operating logic, user experience, communication, and implementation can be designed together.",
  connectedLinks: [{ label: "BarPulse case study", to: "/work/barpulse" }, { label: "Websites & digital products", to: "/services/websites" }, { label: "Marketing & growth", to: "/services/marketing" }],
  faqs: [
    { q: "Do we need AI for this project?", a: "Not necessarily. The process determines the tools. A clearer workflow, dashboard, integration, or rule-based automation may be more useful than AI." },
    { q: "Can you work with tools we already use?", a: "Often, yes. Feasibility depends on available access, APIs, data quality, platform rules, and the agreed security and ownership model." },
    { q: "Is BarPulse a template sold to every business?", a: "No. BarPulse demonstrates a substantial historical hospitality implementation. New systems work begins with the specific business process and scope." },
    { q: "How are sensitive data and access handled?", a: "Data, permissions, account ownership, and security requirements are defined before implementation. Sensitive credentials are never treated as ordinary project content." },
  ],
  finalTitle: "Start with the bottleneck. Build only what makes the operation better.",
  finalBody: "Share the workflow, tools, recurring friction, and the decisions that are currently harder than they should be.",
  tone: "systems",
};

export default function AISystemsServices() { return <ServicePage content={content} />; }