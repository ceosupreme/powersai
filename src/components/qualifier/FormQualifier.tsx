import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EffectiveQualifierField } from "@/lib/effectiveQualifierFields";

interface Props {
  projectType: string;
  fields: EffectiveQualifierField[];
  onSubmitted: (leadId: string, isReady: boolean) => void;
}

export function FormQualifier({ projectType, fields, onSubmitted }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      toast.error("Name plus phone or email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const qd: Record<string, string> = { ...values, contact: name };
      if (phone) qd.phone = phone;
      if (email) qd.email = email;
      const { data, error } = await supabase.functions.invoke("submit-inbound-lead", {
        body: {
          name, email: email || null, phone: phone || null,
          message: values["service_needed"] || values["job_type"] || null,
          project_type: projectType,
          qualifier_data: qd,
          is_ready: false, // server can re-evaluate later; form path is conservative.
          transcript: [],
          conversation_channel: "form",
          route_to: "self",
        },
      });
      if (error) throw error;
      onSubmitted((data as any)?.id ?? "", false);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-forest/20">
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-11" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="email">Email (optional if phone provided)</Label>
              <Input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
          </div>
          {fields.filter(f => f.field_key !== "contact").map((f) => (
            <div key={f.field_key} className="space-y-1">
              <Label htmlFor={f.field_key}>{f.field_label}</Label>
              {f.field_type === "select" ? (
                <Input
                  id={f.field_key}
                  value={values[f.field_key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.field_key]: e.target.value }))}
                  placeholder="—"
                  className="h-11"
                />
              ) : f.field_key === "job_type" || f.field_key === "service_needed" ? (
                <Textarea
                  id={f.field_key}
                  value={values[f.field_key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.field_key]: e.target.value }))}
                  rows={3}
                />
              ) : (
                <Input
                  id={f.field_key}
                  value={values[f.field_key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.field_key]: e.target.value }))}
                  className="h-11"
                />
              )}
            </div>
          ))}
          <Button type="submit" disabled={submitting} className="w-full bg-forest hover:bg-forest/90 text-bone h-12 text-base">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Send request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}