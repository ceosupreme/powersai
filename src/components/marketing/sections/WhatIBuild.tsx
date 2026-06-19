import { Bot, Workflow, Gauge, Globe, Megaphone, FileCheck2 } from "lucide-react";
import { Container, Panel, SectionHeading } from "@/components/marketing/site/primitives";

const items = [
  { icon: Gauge, title: "AI Operations Dashboards", body: "One live view across POS, scheduling, CRM, and tasks — so owners can see what's working, what's slipping, and what to act on this week.", tag: "Dashboards" },
  { icon: Workflow, title: "AI Lead Follow-Up Systems", body: "Every inquiry gets a fast, on-brand response — and nothing sits in an inbox unread. Recover the revenue you're currently leaking on follow-up.", tag: "Lead capture" },
  { icon: Bot, title: "Custom AI Assistants", body: "Internal GPTs trained on your SOPs, menus, listings, or playbooks — answering staff and customer questions instantly, with sources.", tag: "AI agents" },
  { icon: Megaphone, title: "Workflow Automations", body: "Quietly remove the manual handoffs between your tools — intake, scheduling, reporting, billing — so your team stops being the integration.", tag: "Automation" },
  { icon: FileCheck2, title: "Source-Cited Reporting Systems", body: "AI-generated weekly and daily reports in plain English — every claim traced to the exact data behind it. No fabrication, no guessing.", tag: "Reporting" },
  { icon: Globe, title: "AI-Powered Sites & Funnels", body: "Conversion-built sites wired into your CRM and AI follow-up — so traffic doesn't just visit, it becomes booked calls and qualified leads.", tag: "Sites & funnels" },
];

export function WhatIBuild() {
  return (
    <section id="what-i-build" className="relative border-t border-border py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="What I build"
          title="AI Systems I Build"
          sub="Six surfaces that most often move the needle for operators running on too many tools. Pick one as a focused first step, or stack them into a full operating system."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Panel key={c.title} className="hover-lift group bg-panel p-7">
              <div className="flex items-start justify-between">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
                  <c.icon size={18} strokeWidth={1.6} />
                </span>
                <span className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[0.65rem] text-muted-foreground">{c.tag}</span>
              </div>
              <h3 className="font-display mt-6 text-[1.2rem] leading-snug text-foreground">{c.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{c.body}</p>
            </Panel>
          ))}
        </div>
      </Container>
    </section>
  );
}