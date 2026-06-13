import { Container } from "@/components/marketing/site/primitives";

const stack = [
  "Claude", "OpenAI", "Gemini", "Lovable", "Make",
  "Zapier", "Airtable", "Asana", "Google Workspace", "Supabase",
];

export function TechStack() {
  return (
    <section aria-label="Built with" className="relative border-y border-border bg-panel-elevated py-7">
      <Container>
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-8">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground shrink-0">
            Built with
          </span>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 md:gap-x-7">
            {stack.map((tool) => (
              <li key={tool} className="text-[0.85rem] font-medium tracking-tight text-foreground/55 transition-colors hover:text-foreground">
                {tool}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}