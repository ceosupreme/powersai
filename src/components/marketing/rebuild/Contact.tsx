import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowRight, Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(1, "Tell me what's costing you").max(4000, "Please keep this under 4000 characters"),
});

type Status = "idle" | "submitting" | "success" | "error";

const TRIAGE = [
  { key: "A", label: "We miss calls and leads", prefill: "We're missing calls and leads and I want them caught." },
  { key: "B", label: "I can't see how we're really doing", prefill: "I want one honest view of how my business is doing." },
  { key: "C", label: "Too much runs on me by hand", prefill: "Too much of my business runs on me doing things by hand." },
];

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("stm.contact.prefill");
      if (stored) {
        setMessage(stored);
        sessionStorage.removeItem("stm.contact.prefill");
      }
    } catch { /* ignore */ }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail ?? "";
      setMessage(detail);
      try { sessionStorage.removeItem("stm.contact.prefill"); } catch { /* ignore */ }
    };
    window.addEventListener("stm:contact-prefill", handler as EventListener);
    return () => window.removeEventListener("stm:contact-prefill", handler as EventListener);
  }, []);

  function pickTriage(key: string) {
    const opt = TRIAGE.find((t) => t.key === key);
    if (!opt) return;
    setPicked(key);
    setMessage(opt.prefill);
    try { sessionStorage.setItem("stm.contact.prefill", opt.prefill); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("stm:contact-prefill", { detail: opt.prefill }));
    window.setTimeout(() => messageRef.current?.focus(), 60);
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const honeypot = String(form.get("company_website") ?? "");
    if (honeypot) {
      setStatus("success");
      return;
    }

    const parsed = schema.safeParse({
      name: form.get("name"),
      business_name: form.get("business_name"),
      email: form.get("email"),
      message: form.get("message"),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your entries");
      return;
    }

    setStatus("submitting");
    const { error: fnError } = await supabase.functions.invoke("submit-inbound-lead", {
      body: {
        name: parsed.data.name,
        business_name: parsed.data.business_name || null,
        email: parsed.data.email,
        message: parsed.data.message,
        company_website: "",
      },
    });

    if (fnError) {
      setStatus("error");
      setError("Something went wrong. Please email hello@supremeteammedia.com.");
      return;
    }
    setStatus("success");
  };

  return (
    <section
      id="contact"
      className="scroll-mt-24 py-20 md:py-28"
      style={{ backgroundColor: "hsl(var(--stm-band-dark))", color: "#FFFFFF" }}
    >
      <div className="mx-auto w-full max-w-6xl px-6 md:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span
              className="inline-flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.06em]"
              style={{ color: "#55D6FF" }}
            >
              <span style={{ display: "inline-block", width: 12, height: 2, backgroundColor: "#55D6FF" }} />
              CONTACT
            </span>
            <h2
              className="font-display mt-5 text-balance"
              style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)", lineHeight: 1.05, color: "#FFFFFF" }}
            >
              What keeps getting missed in your business?
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed md:text-lg" style={{ color: "rgba(255,255,255,0.78)" }}>
              Tell me where the headache is. I'll reply with the first thing I'd fix — and whether it's worth building. Usually within a day.
            </p>
            <a
              href="mailto:hello@supremeteammedia.com"
              className="mt-8 inline-flex items-center gap-2 text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <Mail size={14} /> hello@supremeteammedia.com
            </a>
          </div>

          <div
            className="rounded-2xl p-7 md:p-9"
            style={{ backgroundColor: "#FFFFFF", color: "hsl(var(--stm-ink))" }}
          >
            {status === "success" ? (
              <div className="flex flex-col items-start gap-4 py-6">
                <span
                  className="inline-flex items-center justify-center rounded-full p-3"
                  style={{ backgroundColor: "hsl(var(--stm-ok) / 0.12)", color: "hsl(var(--stm-ok))", border: "1px solid hsl(var(--stm-ok) / 0.3)" }}
                >
                  <Check size={20} />
                </span>
                <h3 className="font-display text-2xl text-foreground">
                  Thanks — I&apos;ll review this and reply, usually within a day.
                </h3>
                <p className="text-sm text-muted-foreground">
                  In the meantime, feel free to email me directly at{" "}
                  <a href="mailto:hello@supremeteammedia.com" className="text-foreground underline-offset-4 hover:underline">
                    hello@supremeteammedia.com
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5">
                {/* Triage picker */}
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Pick the one that stings — it&apos;ll start your note for you
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {TRIAGE.map((t) => {
                      const on = picked === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => pickTriage(t.key)}
                          className={`flex items-center gap-3 rounded-md border px-3.5 py-2.5 text-left text-sm transition-all ${
                            on
                              ? "border-[hsl(var(--stm-cobalt))] bg-[hsl(var(--stm-cobalt-soft))]"
                              : "border-border hover:border-[hsl(var(--stm-cobalt))]/50"
                          }`}
                        >
                          <span
                            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.7rem] font-semibold ${
                              on ? "bg-[hsl(var(--stm-cobalt))] text-white" : "border border-border text-foreground/70"
                            }`}
                          >
                            {t.key}
                          </span>
                          <span className="text-foreground">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Honeypot */}
                <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                  <label>
                    Company website
                    <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Name" name="name" placeholder="Your name" required />
                  <Field label="Business name" name="business_name" placeholder="Optional" />
                </div>
                <Field label="Email" name="email" type="email" placeholder="you@company.com" required />
                <FieldTextarea
                  label="WHAT'S COSTING YOU THE MOST RIGHT NOW?"
                  name="message"
                  placeholder="A few sentences about what keeps getting missed."
                  required
                  value={message}
                  onChange={setMessage}
                  textareaRef={messageRef}
                />

                {error && (
                  <p className="text-sm" style={{ color: "hsl(var(--stm-loss))" }} role="alert">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
                  style={{ backgroundColor: "hsl(var(--stm-cobalt))" }}
                >
                  {status === "submitting" ? "Sending…" : "Show me the first fix"}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </button>

                <ul className="mt-1 grid grid-cols-1 gap-1.5 text-[0.8rem] text-muted-foreground sm:grid-cols-3">
                  <li>Reply, usually within a day</li>
                  <li>15-minute first call</li>
                  <li>No obligation, ever</li>
                </ul>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; }) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        maxLength={255}
        className="mt-2 w-full rounded-md border border-border bg-white px-4 py-3 text-[0.95rem] text-foreground placeholder:text-muted-foreground/60 focus:border-[hsl(var(--stm-cobalt))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--stm-cobalt))]/20"
      />
    </label>
  );
}

function FieldTextarea({ label, name, placeholder, required, value, onChange, textareaRef }: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <label className="block">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
      <textarea
        ref={textareaRef}
        name={name}
        required={required}
        rows={5}
        maxLength={4000}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full resize-y rounded-md border border-border bg-white px-4 py-3 text-[0.95rem] text-foreground placeholder:text-muted-foreground/60 focus:border-[hsl(var(--stm-cobalt))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--stm-cobalt))]/20"
      />
    </label>
  );
}