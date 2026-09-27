import { useState } from "react";
import { ArrowRight, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { title: "Service page", heading: "Find the right service.", body: "A visitor sees what you do, where you work and the next step without digging for it." },
  { title: "Request form", heading: "Ask for what they need.", body: "They share the service, their details and a note in one clear request." },
  { title: "Confirmation", heading: "Know it went through.", body: "They see that the request was received and what happens next. No guessing whether Send worked." },
];

export function CustomerWalkthrough() {
  const [active, setActive] = useState(0);
  return <div className="home-walkthrough" aria-label="Customer website walkthrough">
    <span className="home-eyebrow">The customer&apos;s view</span>
    <h3>From finding you<br />to reaching you.</h3>
    <div className="home-walkthrough-tabs" role="tablist" aria-label="Customer steps">
      {STEPS.map((step, index) => <Button key={step.title} variant="ghost" type="button" role="tab" aria-selected={active === index} aria-controls="customer-walkthrough-panel" onClick={() => setActive(index)} className={active === index ? "is-active" : ""}><span>0{index + 1}</span>{step.title}</Button>)}
    </div>
    <div id="customer-walkthrough-panel" role="tabpanel" className="home-walkthrough-panel" key={active}>
      <div className="home-walkthrough-browser" aria-hidden><i /><i /><i /><span>yourbusiness.com</span></div>
      <div className="home-walkthrough-screen">
        <span className="home-walkthrough-mark">Your business <ArrowRight size={15} aria-hidden /></span>
        <small>{STEPS[active].title}</small>
        <h4>{STEPS[active].heading}</h4>
        <p>{STEPS[active].body}</p>
        {active === 0 ? <div className="home-walkthrough-action">Request service <ArrowRight size={17} aria-hidden /></div> : active === 1 ? <div className="home-walkthrough-fields"><span>Name and email</span><span>What can we help with?</span><span className="home-walkthrough-action">Send request <Send size={15} aria-hidden /></span></div> : <div className="home-walkthrough-confirm"><Check size={22} aria-hidden /> Request received</div>}
      </div>
    </div>
  </div>;
}