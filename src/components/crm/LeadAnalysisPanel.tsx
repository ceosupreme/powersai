import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { LeadAnalysis, useAnalyzeLead, useLeadAnalyses } from "@/hooks/useLeadAnalyses";
import { useServiceOffers } from "@/hooks/useServiceOffers";

const PRIORITY_VARIANT: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function LeadAnalysisPanel({
  companyId,
  defaultWebsite,
  onAnalysisChange,
}: {
  companyId: string;
  defaultWebsite?: string | null;
  onAnalysisChange?: (a: LeadAnalysis | null) => void;
}) {
  const analysesQ = useLeadAnalyses(companyId);
  const analyze = useAnalyzeLead();
  const offersQ = useServiceOffers();
  const offerById = new Map((offersQ.data ?? []).map((o) => [o.id, o]));

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fetchHint, setFetchHint] = useState<string | null>(null);

  useEffect(() => {
    if (defaultWebsite && !url) setUrl(defaultWebsite);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultWebsite]);

  const latest = analysesQ.data?.[0] ?? null;
  useEffect(() => { onAnalysisChange?.(latest); }, [latest, onAnalysisChange]);

  const run = async () => {
    setFetchHint(null);
    try {
      const res = await analyze.mutateAsync({
        company_id: companyId,
        source_kind: mode,
        source_url: mode === "url" ? url.trim() : undefined,
        source_text: mode === "text" ? text.trim() : undefined,
      });
      if ((res as any).ok) {
        toast.success("Lead analyzed");
        setOpen(false);
        setText("");
      } else if ((res as any).code === "fetch_failed") {
        setFetchHint((res as any).message);
        setMode("text");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to analyze");
    }
  };

  const matchedOffer = latest?.recommended_offer_id ? offerById.get(latest.recommended_offer_id) : null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Lead Analysis</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Sparkles className="h-4 w-4 mr-1" /> {open ? "Cancel" : latest ? "Re-analyze" : "Analyze Lead"}
        </Button>
      </div>

      {open && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <RadioGroup value={mode} onValueChange={(v) => { setMode(v as any); setFetchHint(null); }} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="url" /> Website URL
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <RadioGroupItem value="text" /> Paste details
              </label>
            </RadioGroup>
            {mode === "url" ? (
              <div>
                <Label className="text-xs">URL</Label>
                <Input type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
            ) : (
              <div>
                <Label className="text-xs">What does this business do?</Label>
                <Textarea rows={5} placeholder="Paste site copy, notes, or describe the business…" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            )}
            {fetchHint && (
              <div className="flex items-start gap-2 text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded p-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{fetchHint}</span>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={run}
                disabled={analyze.isPending || (mode === "url" ? !url.trim() : !text.trim())}>
                {analyze.isPending ? "Analyzing…" : "Run analysis"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {analysesQ.isLoading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : !latest ? (
        <div className="text-xs text-muted-foreground">No analysis yet.</div>
      ) : (
        <Card>
          <CardContent className="p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {latest.priority && (
                <Badge variant="outline" className={PRIORITY_VARIANT[latest.priority]}>
                  {latest.priority} priority
                </Badge>
              )}
              {matchedOffer ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Offer: {matchedOffer.name}
                </Badge>
              ) : (
                <Badge variant="outline">No offer matched</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(latest.created_at).toLocaleString()}
              </span>
            </div>
            {latest.summary && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Summary</div>
                <div className="whitespace-pre-wrap">{latest.summary}</div>
              </div>
            )}
            {latest.recommendation_reason && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Why this offer</div>
                <div className="whitespace-pre-wrap">{latest.recommendation_reason}</div>
              </div>
            )}
            {analysesQ.data && analysesQ.data.length > 1 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">History ({analysesQ.data.length - 1} previous)</summary>
                <div className="mt-2 space-y-2">
                  {analysesQ.data.slice(1).map((a) => (
                    <div key={a.id} className="border rounded p-2">
                      <div className="flex gap-2 text-muted-foreground">
                        <span>{new Date(a.created_at).toLocaleString()}</span>
                        {a.priority && <span>· {a.priority}</span>}
                        {a.recommended_offer_id && offerById.get(a.recommended_offer_id) && (
                          <span>· {offerById.get(a.recommended_offer_id)!.name}</span>
                        )}
                      </div>
                      {a.summary && <div className="mt-1 whitespace-pre-wrap">{a.summary}</div>}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}