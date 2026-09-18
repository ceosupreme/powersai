import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, SectionTitle } from "../primitives";

const PROBLEMS = [
  { label: "My website isn’t doing its job.", diagnosis: "Visitors may not understand the offer, trust the presentation, or see a useful next step.", tackle: "Clarify the message, structure the journey, improve the responsive experience, and build the right conversion path.", proof: "Big Paws Club · Kario Voss", to: "/services/websites", cta: "Explore websites" },
  { label: "My brand looks inconsistent or forgettable.", diagnosis: "The business can be strong while its visual language and message make it harder to recognize or remember.", tackle: "Shape the positioning, creative direction, visual system, and the real applications customers see.", proof: "Kario Voss · Coastal Beauties", to: "/services/brand", cta: "Explore brand & creative" },
  { label: "I need more of the right people to find and choose us.", diagnosis: "More content alone will not fix a scattered message or a campaign with nowhere useful to lead.", tackle: "Connect positioning, campaign creative, landing paths, email, social, and launch support around a defined audience and action.", proof: "Big Paws Club · Supreme Wellness Club", to: "/services/marketing", cta: "Explore marketing & growth" },
  { label: "Too much of the business is manual.", diagnosis: "Information, follow-up, and decisions often get trapped across separate tools and repeated handoffs.", tackle: "Map the process, connect the right systems, and add automation or AI only where it improves the operation.", proof: "BarPulse", to: "/services/ai-systems", cta: "Explore AI & systems" },
  { label: "I’m launching something.", diagnosis: "A finished book, app, or digital product still needs packaging, platform-ready assets, submission support, and a launch path.", tackle: "Coordinate production, presentation, listings, submission support, landing pages, and launch creative around the release.", proof: "Books · Apps · Digital products", to: "/publishing", cta: "Explore publishing & launch" },
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
        <Eyebrow>Start with what is not working</Eyebrow>
        <SectionTitle>What needs to work better?</SectionTitle>
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
            <p className="studio-label">What may be happening</p>
            <p className="studio-display mt-4 text-[1.8rem] leading-tight md:text-[2.45rem]">{active.diagnosis}</p>
            <div className="mt-8 grid gap-6 border-t border-border pt-7 md:grid-cols-2">
              <div><p className="studio-label">What STM would tackle</p><p className="mt-3 text-[1rem] leading-relaxed text-muted-foreground">{active.tackle}</p></div>
              <div><p className="studio-label">Relevant proof</p><p className="mt-3 text-[1rem] leading-relaxed">{active.proof}</p></div>
            </div>
            <Link to={active.to} className="studio-btn studio-btn-primary mt-9">{active.cta} <ArrowRight size={15} /></Link>
          </div>
        </div>
      </Container>
    </section>
  );
}