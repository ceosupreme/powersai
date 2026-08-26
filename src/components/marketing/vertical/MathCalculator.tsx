import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Container } from "@/components/marketing/site/primitives";
import { Reveal } from "@/components/marketing/site/Reveal";
import { Input } from "@/components/ui/input";
import { formatDollars } from "@/lib/leakStackFormat";
import type { MathConfig, MathInput } from "@/hooks/useVerticalLander";

type Values = Record<string, Record<string, number>>;

function seedValues(config: MathConfig): Values {
  const out: Values = {};
  (config.blocks ?? []).forEach((b) => {
    out[b.key] = {};
    (b.inputs ?? []).forEach((i) => {
      out[b.key][i.key] = Number(i.default) || 0;
    });
  });
  return out;
}

/** Percent inputs are entered as whole percents and computed as fractions. */
function factor(input: MathInput, raw: number): number {
  return input.type === "percent" ? raw / 100 : raw;
}

function blockEstimate(inputs: MathInput[], vals: Record<string, number>): number {
  if (!inputs?.length) return 0;
  return inputs.reduce((acc, i) => acc * factor(i, vals?.[i.key] ?? 0), 1);
}

function Estimated({ amount }: { amount: number }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className="font-display" style={{ color: "hsl(var(--rust))", fontSize: "1.75rem", lineHeight: 1 }}>
        {formatDollars(amount)}
      </span>
      <span className="font-mono-label text-[0.65rem]" style={{ color: "hsl(var(--ink-soft))" }}>
        Estimated
      </span>
    </span>
  );
}

export function MathCalculator({ config }: { config: MathConfig }) {
  const blocks = config.blocks ?? [];
  const [values, setValues] = useState<Values>(() => seedValues(config));

  const estimates = useMemo(
    () => blocks.map((b) => blockEstimate(b.inputs ?? [], values[b.key] ?? {})),
    [blocks, values],
  );
  const total = estimates.reduce((a, b) => a + b, 0);

  if (!blocks.length) return null;

  return (
    <section id="math" className="relative border-t border-[hsl(var(--line))] bg-[hsl(var(--bone-2))] py-16 md:py-24">
      <Container>
        <Reveal>
          <span className="eyebrow">The math</span>
          {config.intro && (
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[hsl(var(--ink-soft))]">{config.intro}</p>
          )}
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {blocks.map((b, bi) => (
            <div key={b.key} className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 md:p-6">
              <h3 className="font-display text-[1.1rem] leading-snug text-foreground">{b.label}</h3>
              {b.formula_text && (
                <p className="font-mono-label mt-3 text-[0.7rem]" style={{ color: "hsl(var(--ink-soft))" }}>
                  {b.formula_text}
                </p>
              )}
              <div className="mt-5 space-y-3">
                {(b.inputs ?? []).map((i) => (
                  <div key={i.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label htmlFor={`${b.key}-${i.key}`} className="text-[0.9rem] text-[hsl(var(--ink-soft))]">
                      {i.label}
                      {i.type === "percent" ? " (%)" : ""}
                    </label>
                    <Input
                      id={`${b.key}-${i.key}`}
                      type="number"
                      inputMode="decimal"
                      min={i.min ?? undefined}
                      max={i.max ?? undefined}
                      step={i.step ?? undefined}
                      value={String(values[b.key]?.[i.key] ?? 0)}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        setValues((prev) => ({
                          ...prev,
                          [b.key]: { ...(prev[b.key] ?? {}), [i.key]: Number.isFinite(n) ? n : 0 },
                        }));
                      }}
                      className="h-10 w-full text-[0.95rem] sm:w-32"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-[hsl(var(--line))] pt-4">
                <Estimated amount={estimates[bi]} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="font-mono-label" style={{ color: "hsl(var(--ink))" }}>
              Total monthly leak
            </div>
            <div className="mt-2">
              <Estimated amount={total} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValues(seedValues(config))}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[hsl(var(--line))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--bone-2))] md:self-auto"
          >
            <RotateCcw size={14} />
            Reset to benchmarks
          </button>
        </div>

        {config.footnote && (
          <p className="mt-5 max-w-2xl text-[0.8rem] italic leading-relaxed text-[hsl(var(--ink-soft))]">
            {config.footnote}
          </p>
        )}
      </Container>
    </section>
  );
}
