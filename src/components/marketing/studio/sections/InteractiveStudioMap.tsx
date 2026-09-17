import { useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, Lede, SectionTitle } from "../primitives";
import { requestServiceIntent, type ServiceId } from "../serviceIntent";

type Lane = {
  id: ServiceId;
  shortLabel: string;
  label: string;
  startingPoint: string;
  actions: string[];
  ships: string[];
  related: { title: string; slug: string }[];
  cta: string;
};

const LANES: Lane[] = [
  {
    id: "websites-apps",
    shortLabel: "Websites",
    label: "Websites & digital products",
    startingPoint: "We need a site that looks credible, works on mobile, and gives people a clear next step.",
    actions: ["Clarify the audience and goal", "Structure the information", "Design the experience", "Build and test the responsive site"],
    ships: ["Site or landing page", "Responsive UI", "Contact or conversion path", "Handoff and support notes"],
    related: [{ title: "Kario Voss", slug: "kario-voss" }, { title: "Big Paws Club", slug: "big-paws-club" }],
    cta: "Discuss a website or product",
  },
  {
    id: "brand-creative",
    shortLabel: "Brand",
    label: "Brand & creative",
    startingPoint: "The business is good, but the presentation feels inconsistent or forgettable.",
    actions: ["Define the direction", "Shape the visual language", "Build reusable creative", "Carry it into real touchpoints"],
    ships: ["Identity direction", "Visual system", "Campaign and brand assets", "Web and social applications"],
    related: [{ title: "Coastal Beauties", slug: "coastal-beauties" }, { title: "AllMighty Supreme", slug: "allmighty-supreme" }],
    cta: "Discuss brand or creative work",
  },
  {
    id: "marketing-growth",
    shortLabel: "Marketing",
    label: "Marketing & growth",
    startingPoint: "We have something worth promoting, but the message, campaign, and follow-through are scattered.",
    actions: ["Sharpen the positioning", "Define the audience and action", "Build campaign assets", "Connect landing, content, and follow-up"],
    ships: ["Campaign concept", "Landing page", "Email and social creative", "Launch or event promotion plan"],
    related: [{ title: "Coastal Beauties", slug: "coastal-beauties" }, { title: "Supreme Wellness Club", slug: "supreme-wellness-club" }],
    cta: "Discuss marketing and growth",
  },
  {
    id: "ai-systems",
    shortLabel: "Systems",
    label: "AI & business systems",
    startingPoint: "Too much information lives in separate tools, and the owner is still the follow-up system.",
    actions: ["Map the workflow", "Connect the right systems", "Create the operating view", "Add AI or automation only where useful"],
    ships: ["Dashboard or internal tool", "Integrations", "Workflow and tasks", "Reporting and AI-assisted actions"],
    related: [{ title: "BarPulse", slug: "barpulse" }, { title: "AllMighty Supreme", slug: "allmighty-supreme" }],
    cta: "Discuss a business system",
  },
];

export function InteractiveStudioMap() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = LANES[activeIndex];

  const select = (index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % LANES.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + LANES.length) % LANES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = LANES.length - 1;
    else return;
    event.preventDefault();
    select(next);
  };

  return (
    <section id="studio-map" className="studio-section">
      <Container>
        <Eyebrow>Interactive studio map</Eyebrow>
        <SectionTitle>Pick the problem. See how I&apos;d attack it.</SectionTitle>
        <Lede>
          Different jobs need different combinations of strategy, creative work, implementation, and systems thinking.
          Choose a lane to see the shape of the work.
        </Lede>

        <div className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-4" role="tablist" aria-label="Choose a service lane">
          {LANES.map((lane, index) => (
            <Button
              key={lane.id}
              ref={(node) => { tabRefs.current[index] = node; }}
              type="button"
              role="tab"
              id={`studio-map-tab-${lane.id}`}
              aria-controls={`studio-map-panel-${lane.id}`}
              aria-selected={activeIndex === index}
              tabIndex={activeIndex === index ? 0 : -1}
              variant="outline"
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "h-auto min-h-12 whitespace-normal border-border px-3 py-3 text-center leading-tight",
                activeIndex === index && "border-primary bg-secondary text-primary",
              )}
            >
              <span className="md:hidden">{lane.shortLabel}</span>
              <span className="hidden md:inline">{lane.label}</span>
            </Button>
          ))}
        </div>

        <div
          key={active.id}
          id={`studio-map-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`studio-map-tab-${active.id}`}
          tabIndex={0}
          className="studio-map-panel mt-5 border-y border-border bg-[hsl(var(--surface))]"
        >
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="p-6 md:p-8">
              <p className="studio-label">Starting point</p>
              <p className="studio-display mt-4 text-[1.25rem] leading-snug">“{active.startingPoint}”</p>
            </div>
            <MapList title="What I do" items={active.actions} />
            <div className="border-t border-border p-6 md:border-l md:border-t-0 md:p-8">
              <MapListContent title="What ships" items={active.ships} />
              <p className="studio-label mt-7">Related work</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {active.related.map((project) => (
                  <Link key={project.slug} to={`/work/${project.slug}`} className="text-[0.9rem] font-medium text-primary underline-offset-4 hover:underline">
                    {project.title} <span aria-hidden>↗</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex border-t border-border p-5 md:justify-end md:px-8">
            <a href="#contact" onClick={() => requestServiceIntent(active.id)} className="studio-btn studio-btn-primary w-full md:w-auto">
              {active.cta} <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}

function MapList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border-t border-border p-6 md:border-l md:border-t-0 md:p-8">
      <MapListContent title={title} items={items} />
    </div>
  );
}

function MapListContent({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <p className="studio-label">{title}</p>
      <ul className="mt-4 space-y-3 text-[0.92rem] text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  );
}