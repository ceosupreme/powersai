import { useState, type KeyboardEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Interaction = {
  kind: "walkthrough" | "selector";
  eyebrow?: string; title?: string; intro?: string; business?: string; domain?: string;
  steps?: { label: string; screen: "browser" | "phone" | "email" | "alert"; heading: string; body?: string; fields?: string[]; action?: string }[];
  options?: { label: string; heading: string; body?: string; action?: string }[];
};

type Screen = { heading?: string; body?: string; action?: string; fields?: string[] };

function DemoAction({ action }: { action?: string }) {
  return action ? <span className="industry-demo-action">{action} <ArrowRight size={15} aria-hidden /></span> : null;
}

export function BrowserScene({ interaction, screen }: { interaction: Interaction; screen?: Screen }) {
  return <div className="industry-browser"><div className="industry-browser-bar"><i/><i/><i/><span>{interaction.domain}</span></div><div className="industry-browser-site"><div className="industry-browser-nav"><strong>{interaction.business}</strong><span>{interaction.domain}</span></div><div className="industry-browser-copy"><h3>{screen?.heading}</h3>{screen?.body && <p>{screen.body}</p>}<DemoAction action={screen?.action}/></div></div></div>;
}

export function PhoneScene({ interaction, screen }: { interaction: Interaction; screen?: Screen }) {
  return <div className="industry-phone"><div className="industry-phone-notch"/><div className="industry-phone-content"><strong>{interaction.business}</strong><h3>{screen?.heading}</h3>{screen?.body && <p>{screen.body}</p>}{screen?.fields?.map((field, i) => <div key={`${field}-${i}`} className="industry-phone-field">{field}<span aria-hidden /></div>)}<DemoAction action={screen?.action}/></div></div>;
}

function MessageScene({ interaction, screen, owner }: { interaction: Interaction; screen: Screen; owner?: boolean }) {
  return <article className="industry-message"><Mail size={24} aria-hidden /><div className="industry-message-meta"><span>{owner ? "Owner alert" : "From"}</span><strong>{interaction.business}{!owner && interaction.domain ? ` · ${interaction.domain}` : ""}</strong></div><div className="industry-message-meta"><span>Subject</span><strong>{screen.heading}</strong></div>{screen.body && <p>{screen.body}</p>}</article>;
}

export function IndustryInteraction({ interaction }: { interaction: Interaction }) {
  const [active, setActive] = useState(0);
  const items = interaction.kind === "walkthrough" ? interaction.steps ?? [] : interaction.options ?? [];
  const index = Math.min(active, Math.max(0, items.length - 1));
  const item = items[index];
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (!items.length) return;
    let next = i;
    if (event.key === "ArrowRight") next = (i + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault(); setActive(next);
    document.getElementById(`industry-tab-${next}`)?.focus();
  };
  if (!items.length) return null;
  return <div className="industry-interaction">
    <div className="industry-interaction-head"><div><span className="home-eyebrow">{interaction.eyebrow}</span><h2 className="industry-title">{interaction.title}</h2></div>{interaction.intro && <p>{interaction.intro}</p>}</div>
    <div className="industry-tabs" role="tablist" aria-label={interaction.title || "Choose a view"}>{items.map((step, i) => <Button key={i} type="button" variant="ghost" id={`industry-tab-${i}`} role="tab" aria-selected={index === i} aria-controls="industry-panel" tabIndex={index === i ? 0 : -1} className={index === i ? "is-active" : ""} onKeyDown={(event) => onKey(event, i)} onClick={() => setActive(i)}>{step.label}</Button>)}</div>
    <div id="industry-panel" role="tabpanel" aria-labelledby={`industry-tab-${index}`} className="industry-interaction-panel">
      {interaction.kind === "selector" ? <BrowserScene interaction={interaction} screen={item} /> : interaction.steps?.[index]?.screen === "phone" ? <PhoneScene interaction={interaction} screen={item}/> : interaction.steps?.[index]?.screen === "email" ? <MessageScene interaction={interaction} screen={item ?? {}} /> : interaction.steps?.[index]?.screen === "alert" ? <MessageScene interaction={interaction} screen={item ?? {}} owner/> : <BrowserScene interaction={interaction} screen={item} />}
    </div>
  </div>;
}
