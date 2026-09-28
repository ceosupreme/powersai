import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckoutButton } from "@/components/marketing/offer/CheckoutButton";
import { CustomerWalkthrough } from "@/components/marketing/studio/sections/CustomerWalkthrough";
import { Inquiry } from "@/components/marketing/studio/sections/Inquiry";
import { StudioFooter } from "@/components/marketing/studio/StudioFooter";
import { StudioHeader } from "@/components/marketing/studio/StudioHeader";
import { Container } from "@/components/marketing/studio/primitives";
import { useStudioHead } from "@/components/marketing/studio/useStudioHead";
import { useCheckoutEnabled } from "@/hooks/useCheckoutEnabled";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { ROUTE_META } from "@/config/routeMeta";

const choices = [
  ["I need a credible place to start", "Launch Site", "A polished website that makes the business look credible and gives people a clear next step."],
  ["I need inquiries to keep moving", "Business Site", "A connected website with agreed follow-up, reminders, review requests and an owner report."],
  ["I already have a site", "Care", "Ongoing help with the website, updates and support after launch."],
] as const;
const comparison = [
  ["Launch Site", "Up to eight pages, mobile-first design, a clear inquiry path, instant visitor confirmation and an owner alert, one revision round, launch and 30 days of fixes."],
  ["Business Site", "Everything is scoped around keeping opportunities moving, with agreed follow-up sequences, reminders, review requests and a monthly owner report."],
  ["Care", "Month-to-month website help and updates, with responsibilities stated in writing before you begin."],
] as const;
const questions = [
  ["Which option should I choose?", "Choose Launch when you need a strong website and clear inquiry path. Choose Business when the work after an inquiry also needs support. Care is ongoing help after launch."],
  ["How does the $0-down option work?", "The build is $297 a month for 12 months, then $149 a month. If you stop early, the remaining balance of the $2,500 build price is due before handover."],
  ["What do I own?", "You own the site, domain, content and customer list in writing. If you leave, you receive the files and every login. Hosting, automations and updates stop unless Care continues."],
  ["Are other costs included?", "You’ll know what is included, what it costs and what happens next before anything starts. Any third-party costs are identified in the written scope."],
] as const;

export default function Pricing() {
  const { enabled: checkout } = useCheckoutEnabled();
  useStudioHead({ ...ROUTE_META["/pricing"], path: "/pricing" });
  return <div className="stm-studio pricing-page min-h-screen"><StudioHeader/><main>
    <section className="pricing-hero"><Container><span className="home-eyebrow">Plans and pricing</span><h1 className="home-section-title">Choose the right place <em>to begin.</em></h1><p>Clear starting prices, practical choices and room to grow. You’ll know what is included, what it costs and what happens next before anything starts.</p></Container></section>
    <section className="pricing-choices"><Container><span className="home-eyebrow">Choose where you are now</span><div className="pricing-choice-grid">{choices.map(([lead,title,body]) => <article key={title}><span>{lead}</span><h2>{title}</h2><p>{body}</p></article>)}</div></Container></section>
    <section className="pricing-core"><Container><div className="pricing-core-grid">
      <article><span className="home-eyebrow">Launch Site</span><h2>$2,500</h2><p>$1,250 to start and $1,250 at launch, or $0 down at $297/month for 12 months, then $149/month.</p><ul><li><Check/>A polished, mobile-first website</li><li><Check/>A clear path from interest to inquiry</li><li><Check/>Instant visitor confirmation and owner alert</li></ul>{checkout ? <div className="pricing-actions"><CheckoutButton product="launch_site_deposit" label="Start with the deposit" originPath="/pricing" source="pricing"/><CheckoutButton product="launch_site_monthly" label="Start monthly" originPath="/pricing" source="pricing"/></div> : <Link className="home-btn-amber" to="/?intent=websites&offer=launch-site&src=pricing#contact">Ask about Launch <ArrowRight size={16}/></Link>}</article>
      <article><span className="home-eyebrow">Business Site</span><h2>From $3,500 setup + $297/month</h2><p>For a business that needs the website and the next steps connected, so good opportunities do not stall after someone reaches out.</p><Link className="home-btn-amber" to="/?intent=websites&offer=business-site&src=pricing#contact">Get a quote <ArrowRight size={16}/></Link></article>
      <article><span className="home-eyebrow">Care</span><h2>$149/month founding rate</h2><p>Ongoing help, updates and support. The founding rate is for the first 10 paid, active Care seats; new Care clients are $199/month after those seats are filled.</p>{checkout ? <CheckoutButton product="care_seat" label="Get the Care seat" originPath="/pricing" source="pricing"/> : <Link className="home-btn-ghost" to="/?intent=websites&offer=care&src=pricing#contact">Ask about Care <ArrowRight size={16}/></Link>}</article>
    </div></Container></section>
    <section className="pricing-walkthrough"><Container><CustomerWalkthrough/></Container></section>
    <section className="pricing-compare"><Container><span className="home-eyebrow">Plain-language comparison</span><h2 className="home-section-title">What each option <em>helps you do.</em></h2><div className="pricing-compare-grid">{comparison.map(([title,body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></Container></section>
    <section className="pricing-expansion"><Container><div><span className="home-eyebrow">Growth</span><h2>From $497/month</h2><p>Strengthen the offer, campaign and customer path when the business is ready to grow.</p><Link to="/?intent=marketing&offer=growth&src=pricing#contact">Discuss Growth <ArrowRight size={16}/></Link></div><div><span className="home-eyebrow">Custom Systems</span><h2>Starts at $10,000</h2><p>Connect the tools and workflows behind the business when the handoffs need a clearer system.</p><Link to="/?intent=ai-systems&offer=custom-systems&src=pricing#contact">Discuss Systems <ArrowRight size={16}/></Link></div></Container></section>
    <section className="pricing-ownership"><Container><div><span className="home-eyebrow">Ownership and support</span><h2 className="home-section-title">Your business stays <em>yours.</em></h2><p>You own the site, domain, content and customer list in writing. The agreed scope, support and third-party costs are clear before work starts.</p></div><Accordion type="single" collapsible>{questions.map(([q,a],i) => <AccordionItem key={q} value={`pricing-${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></Container></section>
    <section className="pricing-final"><Container><span className="home-eyebrow">A clear next step</span><h2 className="home-section-title">Not sure which path <em>fits?</em></h2><p>Share where the business is now and Sean will recommend the smallest sensible starting point.</p><a className="home-btn-amber" href="#contact" onClick={() => trackSiteEvent({event_type:"cta_click",label:"pricing_final_contact"})}>Talk through the options <ArrowRight size={16}/></a></Container></section>
    <Inquiry source="pricing"/>
  </main><StudioFooter/></div>;
}