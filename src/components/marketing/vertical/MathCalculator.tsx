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

function Estimated({ amount, language }: { amount: number; language: "en" | "es" }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className="font-display" style={{ color: "hsl(var(--rust))", fontSize: "1.75rem", lineHeight: 1 }}>
        {formatDollars(amount)}
      </span>
      <span className="font-mono-label text-[0.65rem]" style={{ color: "hsl(var(--ink-soft))" }}>
        {language === "es" ? "Estimado" : "Estimated"}
      </span>
    </span>
  );
}

const ES_MATH: Record<string, string> = {
  "The math": "Los números", "Total monthly leak": "Pérdida mensual estimada", "Reset to benchmarks": "Restablecer valores",
  "Monthly estimates, your numbers. Commissions are money paid out each month; the other blocks are revenue that never arrived. Every figure is an estimate and the formula is printed next to it.": "Estimados mensuales con tus números. Las comisiones son dinero pagado cada mes; los otros bloques son ingresos que no llegaron. Cada cifra es un estimado y la fórmula aparece junto a ella.",
  "Catering requests that go unanswered": "Solicitudes de catering sin respuesta", "catering inquiries per month × share that would have booked × average catering order": "solicitudes mensuales × porcentaje que habría reservado × pedido promedio", "Catering inquiries per month": "Solicitudes de catering al mes", "Share that would have booked": "Porcentaje que habría reservado", "Average catering order": "Pedido promedio de catering",
  "Regulars who did not come back this month": "Clientes habituales que no regresaron este mes", "regulars on your list × share an email brings in × average ticket": "clientes en tu lista × porcentaje que regresa por email × cuenta promedio", "Regulars on your list": "Clientes habituales en tu lista", "Share an email brings in": "Porcentaje que regresa por email", "Average ticket": "Cuenta promedio",
  "Commissions paid to the delivery apps": "Comisiones pagadas a las apps de entrega", "app orders per month × average ticket × commission rate": "pedidos mensuales por app × cuenta promedio × comisión", "App orders per month": "Pedidos por app al mes", "Commission rate you pay": "Comisión que pagas",
};
const translate = (text: string | undefined, language: "en" | "es") => language === "es" && text ? ES_MATH[text] ?? text : text;

export function MathCalculator({ config, language = "en" }: { config: MathConfig; language?: "en" | "es" }) {
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
           <span className="eyebrow">{translate("The math", language)}</span>
          {config.intro && (
             <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[hsl(var(--ink-soft))]">{translate(config.intro, language)}</p>
          )}
        </Reveal>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {blocks.map((b, bi) => (
            <div key={b.key} className="rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 md:p-6">
               <h3 className="font-display text-[1.1rem] leading-snug text-foreground">{translate(b.label, language)}</h3>
              {b.formula_text && (
                <p className="font-mono-label mt-3 text-[0.7rem]" style={{ color: "hsl(var(--ink-soft))" }}>
                   {translate(b.formula_text, language)}
                </p>
              )}
              <div className="mt-5 space-y-3">
                {(b.inputs ?? []).map((i) => (
                  <div key={i.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label htmlFor={`${b.key}-${i.key}`} className="text-[0.9rem] text-[hsl(var(--ink-soft))]">
                       {translate(i.label, language)}
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
                 <Estimated amount={estimates[bi]} language={language} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <div className="font-mono-label" style={{ color: "hsl(var(--ink))" }}>
               {translate("Total monthly leak", language)}
            </div>
            <div className="mt-2">
               <Estimated amount={total} language={language} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setValues(seedValues(config))}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[hsl(var(--line))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[hsl(var(--bone-2))] md:self-auto"
          >
            <RotateCcw size={14} />
             {translate("Reset to benchmarks", language)}
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
