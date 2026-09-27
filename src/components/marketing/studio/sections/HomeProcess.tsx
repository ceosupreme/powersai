import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Container } from "../primitives";
import { trackSiteEvent } from "@/lib/studioAnalytics";

const STEPS = [
  { title: "Clarify", body: "We agree on the goal, the audience and the scope before work starts. You know what is being built and why." },
  { title: "Build", body: "The words, design and working parts come together around a clear customer path. You review the direction as it takes shape." },
  { title: "Launch and support", body: "We check the agreed work, launch it and hand it over. Ongoing care is available when the business needs it." },
];
const SERVICES = [
  ["Websites", "/services/websites"], ["Brand", "/services/brand"], ["Marketing", "/services/marketing"], ["Systems", "/services/ai-systems"], ["Publishing", "/publishing"],
];

export function HomeProcess() {
  return <section id="process" className="home-process" aria-labelledby="home-process-title"><span id="how-it-starts" aria-hidden className="block h-0" /><Container>
    <span className="home-eyebrow">06 / How we work</span>
    <h2 id="home-process-title" className="home-section-title">Good work starts<br />with a <em>clear direction.</em></h2>
    <ol className="home-process-steps">{STEPS.map((step, index) => <li key={step.title}><span className="home-process-number">0{index + 1} <span aria-hidden>↗</span></span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
    <div className="home-process-links"><span>Explore the work</span><nav aria-label="Services">{SERVICES.map(([name, path]) => <Link key={path} to={path} onClick={() => trackSiteEvent({ event_type: "cta_click", label: `home_service_${name.toLowerCase()}` })}>{name}<ArrowUpRight size={15} aria-hidden /></Link>)}</nav></div>
  </Container></section>;
}