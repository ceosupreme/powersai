import { useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowRight, Check, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Container, Panel, SectionHeading } from "@/components/marketing/site/primitives";

const schema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(200),
  business_name: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email").max(255),
  message: z.string().trim().min(1, "Tell me what you'd like to improve").max(4000, "Please keep this under 4000 characters"),
});

type Status = "idle" | "submitting" | "success" | "error";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const honeypot = String(form.get("company_website") ?? "");
    if (honeypot) {
      // Bot. Pretend success, drop silently.
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
    <section id="contact" className="relative border-t border-border py-24 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-[300px] max-w-3xl glow-ember opacity-60 blur-3xl" aria-hidden />
      <Container className="relative max-w-4xl">
        <SectionHeading
          eyebrow="Start the conversation"
          title="See what this could be worth to your business"
          sub="Share a bit about your operation. I'll follow up to set up a call and walk you through the smallest first step that would move your numbers."
        />

        <Panel className="mt-12 p-7 md:p-10">
          {status === "success" ? (
            <div className="flex flex-col items-start gap-4 py-6">
              <span className="inline-flex items-center justify-center rounded-full border border-accent/30 bg-accent/10 p-3 text-accent">
                <Check size={20} />
              </span>
              <h3 className="font-display text-2xl text-foreground">
                Thanks — I&apos;ll review this and follow up to set up a call.
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
              {/* Honeypot — must be invisible to humans, ignored by browsers. */}
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
              <FieldTextarea label="What do you want to improve?" name="message" placeholder="A few sentences about your operation, your tools, and what's slowing you down." required />

              {error && (
                <p className="text-sm text-accent-soft" role="alert">{error}</p>
              )}

              <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                <a href="mailto:hello@supremeteammedia.com" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  <Mail size={14} /> hello@supremeteammedia.com
                </a>
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {status === "submitting" ? "Sending…" : "Send"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}
        </Panel>
      </Container>
    </section>
  );
}

function Field({ label, name, type = "text", placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; }) {
  return (
    <label className="block">
      <span className="text-[0.8rem] font-medium text-foreground/85">{label}</span>
      <input type={type} name={name} required={required} placeholder={placeholder} maxLength={255}
        className="mt-2 w-full rounded-md border border-border bg-background/40 px-4 py-3 text-[0.95rem] text-foreground placeholder:text-muted-foreground/60 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40" />
    </label>
  );
}

function FieldTextarea({ label, name, placeholder, required }: { label: string; name: string; placeholder?: string; required?: boolean; }) {
  return (
    <label className="block">
      <span className="text-[0.8rem] font-medium text-foreground/85">{label}</span>
      <textarea name={name} required={required} rows={5} maxLength={4000} placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-md border border-border bg-background/40 px-4 py-3 text-[0.95rem] text-foreground placeholder:text-muted-foreground/60 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40" />
    </label>
  );
}