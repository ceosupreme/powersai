import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SectionTitle } from "../primitives";

const PROBLEMS = [
  { label: "My website isn’t doing its job.", diagnosis: "People may be leaving before they understand what you offer, why they should trust you, or what to do next.", tackle: "Sharpen the positioning and copy, simplify the path, strengthen the mobile experience, and make the next step obvious.", proof: "Big Paws Club · Kario Voss", to: "/services/websites", cta: "See website services" },
  { label: "My brand looks inconsistent or forgettable.", diagnosis: "A strong business can still be overlooked when its message and visual identity do not give people something clear to remember.", tackle: "Clarify the position, voice, key messages, and visual system—then carry them into the places customers actually see.", proof: "Kario Voss · Coastal Beauties", to: "/services/brand", cta: "See brand services" },
  { label: "I need more of the right people to find and choose us.", diagnosis: "More content will not fix a weak message or a campaign that leads people nowhere useful.", tackle: "Build a clearer campaign message, landing path, email and social content, and next step around the audience you need to reach.", proof: "Big Paws Club · Supreme Wellness Club", to: "/services/marketing", cta: "See marketing services" },
  { label: "Too much of the business is manual.", diagnosis: "Your team may be spending too much time chasing information, copying updates, and remembering what should happen next.", tackle: "Map the process, connect the right tools, and use automation or AI only where it makes the operation easier to run.", proof: "BarPulse", to: "/services/ai-systems", cta: "See systems services" },
  { label: "I’m launching something.", diagnosis: "A finished book, app, or digital product still needs professional packaging, clear listings, platform preparation, and a launch plan.", tackle: "Bring production, presentation, store assets, submission support, landing pages, and launch creative into one coordinated release.", proof: "Books · Apps · Digital products", to: "/publishing", cta: "See publishing services" },
] as const;

export function BuyerChooser() {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = PROBLEMS[activeIndex];

  const choose = (index: number) => { setActiveIndex(index); refs.current[index]?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % PROBLEMS.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + PROBLEMS.length) % PROBLEMS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = PROBLEMS.length - 1;
    else return;
    event.preventDefault();
    choose(next);
  };

  return (
    <section id="chooser" className="studio-section bg-[hsl(var(--surface))]">
      <Container>
        <Eyebrow>Start with the problem</Eyebrow>
        <SectionTitle>What is getting in the way?</SectionTitle>
        <div className="buyer-chooser mt-12 grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div role="tablist" aria-label="Choose a business problem" className="divide-y divide-border border-y border-border lg:col-span-5">
            {PROBLEMS.map((item, index) => (
              <Button key={item.label} ref={(node) => { refs.current[index] = node; }} type="button" role="tab"
                id={`buyer-tab-${index}`} aria-controls={`buyer-panel-${index}`} aria-selected={activeIndex === index}
                tabIndex={activeIndex === index ? 0 : -1} variant="ghost" onClick={() => choose(index)} onKeyDown={(event) => onKeyDown(event, index)}
                className={cn("h-auto min-h-16 w-full justify-between whitespace-normal rounded-none px-0 py-4 text-left text-[1rem] font-medium", activeIndex === index && "text-primary")}>
                <span>{item.label}</span><ArrowRight className={cn("h-4 w-4 shrink-0", activeIndex !== index && "opacity-35")} />
              </Button>
            ))}
          </div>
          <div key={active.label} id={`buyer-panel-${activeIndex}`} role="tabpanel" aria-labelledby={`buyer-tab-${activeIndex}`} tabIndex={0}
            className="buyer-chooser-panel lg:col-span-7">
            <p className="studio-label">What may be going wrong</p>
            <p className="studio-display mt-4 text-[1.8rem] leading-tight md:text-[2.45rem]">{active.diagnosis}</p>
            <div className="mt-8 grid gap-6 border-t border-border pt-7 md:grid-cols-2">
              <div><p className="studio-label">How we can help</p><p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{active.tackle}</p></div>
              <div><p className="studio-label">Related work</p><p className="mt-3 text-[1rem] leading-relaxed">{active.proof}</p></div>
            </div>
            <Link to={active.to} className="studio-btn studio-btn-primary mt-9">{active.cta} <ArrowRight size={15} /></Link>
          </div>
        </div>
      </Container>
    </section>
  );
}