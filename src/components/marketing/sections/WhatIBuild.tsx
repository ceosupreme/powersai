import { Bot, Workflow, Gauge, Globe, Megaphone, FileCheck2 } from "lucide-react";
import { Container, SectionHeading } from "@/components/marketing/site/primitives";

const items = [
  { icon: Workflow, title: "AI Lead Follow-Up Systems", body: "Every inquiry gets a fast, on-brand response — and nothing sits in an inbox unread. Recover the revenue you're currently leaking on follow-up.", tag: "Lead capture", featured: true },
  { icon: Gauge, title: "AI Operations Dashboards", body: "One live view across POS, scheduling, CRM, and tasks — so owners can see what's working, what's slipping, and what to act on this week.", tag: "Dashboards", featured: true },
  { icon: Bot, title: "Custom AI Assistants", body: "Internal GPTs trained on your SOPs, menus, listings, or playbooks — answering staff and customer questions instantly, with sources.", tag: "AI agents" },
  { icon: Megaphone, title: "Workflow Automations", body: "Quietly remove the manual handoffs between your tools — intake, scheduling, reporting, billing — so your team stops being the integration.", tag: "Automation" },
  { icon: FileCheck2, title: "Source-Cited Reporting Systems", body: "AI-generated weekly and daily reports in plain English — every claim traced to the exact data behind it. No fabrication, no guessing.", tag: "Reporting" },
  { icon: Globe, title: "AI-Powered Sites & Funnels", body: "Conversion-built sites wired into your CRM and AI follow-up — so traffic doesn't just visit, it becomes booked calls and qualified leads.", tag: "Sites & funnels" },
];

export function WhatIBuild() {
  return (
    <section id="what-i-build" className="relative border-t border-[hsl(var(--line))] py-20 md:py-28">
      <Container>
        <SectionHeading
          eyebrow="What gets installed"
          title="The systems I install."
          sub="Six surfaces that most often move the needle for operators running on too many tools. Pick one as a focused first step, or stack them into a full operating system — installed, running, and proven in week one."
        />

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {items.map((c) => (
            <div key={c.title} className={"card-lift group p-7 " + (c.featured ? "lg:col-span-3" : "lg:col-span-2")}>
              <div className="flex items-start justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--green-tint))] text-[hsl(var(--green))]">
                  <c.icon size={19} strokeWidth={1.7} />
                </span>
                <span className="font-mono-label rounded-full border border-[hsl(var(--gold)/0.5)] bg-transparent px-2.5 py-1" style={{ fontSize: "0.6rem", color: "hsl(var(--gold))" }}>{c.tag}</span>
              </div>
              <h3 className="font-display mt-6 text-[1.35rem] leading-snug text-foreground">{c.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-[hsl(var(--ink-soft))]">{c.body}</p>
              {c.featured && (
                <div className="mt-5 h-10 rounded-md border border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--green-deep))] p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] live-dot" />
                    <span className="font-mono-label" style={{ fontSize: "0.55rem", color: "hsl(var(--bone) / 0.75)" }}>stm/{c.title.toLowerCase().replace(/[^a-z]+/g,'-').slice(0,20)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}