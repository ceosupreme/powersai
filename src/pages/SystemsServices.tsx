import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Container } from "@/components/marketing/studio/primitives";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { useStudioProject } from "@/hooks/useStudioProjects";
import { getStudioMedia } from "@/config/studioMedia";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";

const stages = ["A request or task arrives", "It is organized", "You see the next action"];
const stageCopy = [
  { label: "INCOMING REQUEST", title: "Alex Rivera", body: "I'd like to talk about a service visit.", detail: "Received through the website" },
  { label: "CUSTOMER RECORD", title: "Alex Rivera", body: "Request attached to Alex's record. Booking status visible alongside the conversation.", detail: "Notes and history together" },
  { label: "WHAT NEEDS YOU TODAY", title: "Call back Alex Rivera", body: "Service visit inquiry · follow-up due today", detail: "Assigned to the owner" },
];
const before = ["Inquiries in one inbox", "Bookings in another app", "Customer notes in a spreadsheet", "Follow-up from memory"];
const after = ["One inbox", "The booking tool connected", "Notes attached to the customer", "Follow-ups scheduled", "One owner view"];
const connections = ["Google Business Profile", "Gmail and Outlook", "Google Calendar", "Stripe", "Square", "Toast", "Jobber", "Housecall Pro", "QuickBooks", "Mailchimp", "Spreadsheets"];
const process = [
  ["Map", "Map the tools you use today and the handoffs that keep getting lost."],
  ["Confirm", "Confirm access and compatibility before anything is promised or quoted."],
  ["Build", "Build only the connections and owner view agreed in the scope."],
  ["Hand over", "Test every handoff end to end and hand over a written map of what connects to what."],
];
const questions = [
  ["Will this replace my software?", "Usually not. The goal is to connect the tools you already use where access and compatibility allow it."],
  ["What if one of my tools cannot connect?", "We confirm that during mapping, before the quote, and agree on a workable alternative or leave that connection out."],
  ["Who owns it?", "You own the agreed system, accounts, data and the written map of its connections."],
  ["How is it priced?", "Custom systems start at $10,000, quoted after mapping your tools and workflow."],
];

function WorkflowCard({ index }: { index: number }) {
  const item = stageCopy[index];
  return <div className="systems-workflow-card"><span className="systems-card-label">{item.label}</span><strong>{item.title}</strong><p>{item.body}</p><small>{item.detail}</small></div>;
}

export default function SystemsServices() {
  const [stage, setStage] = useState(0);
  const { project, isLoading, isError } = useStudioProject("barpulse");
  const media = getStudioMedia(project?.mediaKey ?? "work-barpulse");
  useStudioHead({ ...ROUTE_META["/services/ai-systems"], path: "/services/ai-systems" });
  return <div className="stm-studio svc-page systems-page min-h-screen"><StudioHeader/><main>
    <section className="svc-hero svc-band-light" aria-labelledby="systems-title"><Container className="svc-hero-grid"><div className="svc-hero-copy"><span className="home-eyebrow">01 / AI & business systems</span><h1 id="systems-title">Less chasing. <em>A clearer view</em> of the business.</h1><p>Your tools, connected so requests stop falling through: inquiries, bookings, customer notes and follow-ups in one clear view. Custom systems start at $10,000, quoted after we map what you use.</p><div className="svc-actions"><a className="home-btn-amber" href="#contact" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "talk_systems" })}>Talk about a system <ArrowRight size={16} aria-hidden/></a><Link className="home-btn-ghost" to="/work/barpulse" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "systems_see_barpulse" })}>See BarPulse <ArrowRight size={16} aria-hidden/></Link></div></div><div className="systems-hero-art" aria-label="Request, customer record and owner next-action view"><div className="systems-hero-request"><WorkflowCard index={0}/></div><div className="systems-hero-record"><WorkflowCard index={1}/></div><div className="systems-hero-owner"><span className="systems-card-label">OWNER VIEW</span><h3>What needs you today</h3><ul><li>Call back Alex Rivera <small>Estimate follow-up due today</small></li><li>Review Maya’s service request <small>New inquiry</small></li><li>Check Jordan’s booking <small>Awaiting confirmation</small></li></ul></div></div></Container></section>
    <section className="svc-section svc-band-dark systems-sequence" aria-labelledby="systems-sequence-title"><Container><span className="home-eyebrow">02 / One request, one thread</span><h2 id="systems-sequence-title" className="home-section-title">From arrival to <em>next action.</em></h2><div className="systems-stage-layout"><div className="systems-stage-list" role="tablist" aria-label="Operating stages" onKeyDown={e => { const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? (stage+1)%3 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (stage+2)%3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : null; if (next !== null) { e.preventDefault(); setStage(next); document.getElementById(`systems-tab-${next}`)?.focus(); } }}>{stages.map((label,i) => <Button variant="ghost" type="button" role="tab" id={`systems-tab-${i}`} aria-controls="systems-panel" aria-selected={stage === i} tabIndex={stage === i ? 0 : -1} className={stage === i ? "is-active" : ""} onClick={() => setStage(i)} key={label}><span>0{i+1}</span>{label}<ArrowRight size={18} aria-hidden/></Button>)}</div><div className="systems-stage-panel" id="systems-panel" role="tabpanel" aria-labelledby={`systems-tab-${stage}`}><span className="systems-card-label">NORTH COUNTY HOME SERVICES / {stages[stage]}</span><WorkflowCard index={stage}/><p>The next person sees the request and its context, without hunting through separate threads.</p></div></div></Container></section>
    <section className="svc-section svc-band-light systems-outcomes" aria-labelledby="systems-outcomes-title"><Container><span className="home-eyebrow">03 / The difference</span><h2 id="systems-outcomes-title" className="home-section-title">Less scattered. <em>More connected.</em></h2><div className="systems-comparison"><div><h3>Before</h3><ul>{before.map(item => <li key={item}>{item}</li>)}</ul></div><div><h3>After</h3><ul>{after.map(item => <li key={item}>{item}</li>)}</ul></div></div><div className="systems-connections"><h3>Common connections</h3><p>Compatibility is confirmed during mapping, not assumed.</p><ul>{connections.map(item => <li key={item}>{item}</li>)}</ul></div></Container></section>
    <section className="svc-section svc-band-dark systems-proof" aria-labelledby="systems-proof-title"><Container><span className="home-eyebrow">04 / Actual work</span><h2 id="systems-proof-title" className="home-section-title">BarPulse. <em>Built around operations.</em></h2><div className="systems-proof-layout"><div><p>For an eight-venue San Diego hospitality group, Sean built BarPulse to bring operating information into a clearer management view, with custom scorecards, reporting and workflows. The engagement included integrations with Toast, 7shifts and Asana, plus weekly reviews and refinements with ownership.</p><h3>Sean’s role</h3><p>{project?.role ?? "Discovery, application build, integrations, workflow design, scoring logic, reporting, and iterative refinement."}</p><div className="systems-proof-flow"><span>Toast · 7shifts · Asana</span><ArrowRight size={18} aria-hidden/><span>BarPulse</span><ArrowRight size={18} aria-hidden/><span>Reviews · tasks · insights</span></div><Link className="home-btn-amber" to="/work/barpulse" onClick={() => trackSiteEvent({ event_type: "cta_click", label: "systems_barpulse_case" })}>See the BarPulse case <ArrowRight size={16} aria-hidden/></Link></div><div className="systems-proof-media">{isLoading ? <p role="status">Loading work…</p> : isError ? <p role="status">Work could not be loaded.</p> : <Link to="/work/barpulse" aria-label="Open BarPulse case study">{(project?.imageUrl || media?.src) && <img src={project?.imageUrl || media?.src} alt={media?.alt ?? "BarPulse platform"} loading="lazy"/>}</Link>}</div></div></Container></section>
    <section className="svc-section svc-band-light systems-process" aria-labelledby="systems-process-title"><Container><span className="home-eyebrow">05 / Scope and process</span><h2 id="systems-process-title" className="home-section-title">Map it. Confirm it. <em>Make it work.</em></h2><ol className="systems-process-list">{process.map(([title,body],i) => <li key={title}><span>0{i+1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol><div className="svc-questions"><h3>Questions worth asking.</h3><Accordion type="single" collapsible>{questions.map(([q,a],i) => <AccordionItem key={q} value={`systems-q-${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></div></Container></section>
    <Inquiry servicePage="systems"/>
  </main><StudioFooter/></div>;
}