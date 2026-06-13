import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/use-in-view";
import { ShowcaseShell } from "./ShowcaseShell";

const PROMPT = "Draft a Saturday promo for our taproom — locals, half-priced bottles til 7.";
const OUTPUT = [
  "Subject: Locals' Saturday — half off, til 7.",
  "",
  "Saturday's yours. Half-priced bottles til 7pm.",
  "Walk in, or grab a 7:30 table before they go.",
  "— The Taproom",
];

export function ContentShowcase() {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [run, setRun] = useState(0);
  const [typedPrompt, setTypedPrompt] = useState("");
  const [lineCount, setLineCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setTypedPrompt("");
    setLineCount(0);
    let i = 0;
    const typer = setInterval(() => {
      i++;
      setTypedPrompt(PROMPT.slice(0, i));
      if (i >= PROMPT.length) clearInterval(typer);
    }, 28);
    const start = PROMPT.length * 28 + 400;
    const timers: ReturnType<typeof setTimeout>[] = [];
    OUTPUT.forEach((_, idx) => { timers.push(setTimeout(() => setLineCount(idx + 1), start + idx * 350)); });
    return () => { clearInterval(typer); timers.forEach(clearTimeout); };
  }, [inView, run]);

  return (
    <ShowcaseShell
      id="content"
      reverse
      alt
      eyebrow="AI Content & Media"
      title={<>Marketing copy that sounds like you wrote it.</>}
      sub="Trained on your tone, your offers, and your last 6 months of winning posts — your AI drafts on-brand promos, emails, and captions in seconds, ready for approval."
      bullets={[
        "Voice-matched to your brand",
        "Multi-channel: SMS, email, social",
        "Owner-approves before anything ships",
      ]}
    >
      <div ref={ref} className="glow-border relative overflow-hidden rounded-xl p-5 md:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent live-dot" />
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-foreground/80">stm/content.studio</span>
          </div>
          <button onClick={() => setRun((r) => r + 1)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-foreground/80 transition-colors hover:border-accent hover:text-accent">
            <RefreshCw size={10} /> Regenerate
          </button>
        </div>

        <div className="mt-5 rounded-md border border-border bg-background/50 p-3">
          <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">Prompt</div>
          <div className="mt-1.5 min-h-[24px] text-[0.85rem] text-foreground/90">
            <span className={typedPrompt.length < PROMPT.length ? "type-caret" : ""}>{typedPrompt}</span>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-accent/30 bg-accent/5 p-4 min-h-[180px]">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-accent">
              <Sparkles size={10} className="inline -mt-0.5 mr-1" />
              Generated · v1
            </div>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">tone match 0.94</span>
          </div>
          <div className="mt-3 space-y-1">
            {OUTPUT.slice(0, lineCount).map((line, i) => (
              <p key={i} className="text-[0.9rem] leading-relaxed text-foreground animate-fade-in">{line || "\u00A0"}</p>
            ))}
          </div>
        </div>
      </div>
    </ShowcaseShell>
  );
}