import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { STAGES, useDeals, useCompanies, useCrmMutations, type CrmDealStage } from "@/hooks/useCrm";

const STAGE_LABEL: Record<CrmDealStage, string> = {
  lead: "Lead", pitch: "Pitch", proposal: "Proposal", won: "Won", lost: "Lost",
};

export function PipelineBoard({ onSelectCompany }: { onSelectCompany: (id: string) => void }) {
  const deals = useDeals();
  const companies = useCompanies();
  const { moveDealStage } = useCrmMutations();

  const companyById = useMemo(
    () => Object.fromEntries((companies.data ?? []).map((c) => [c.id, c])),
    [companies.data],
  );

  const grouped = useMemo(() => {
    const map: Record<CrmDealStage, typeof deals.data> = {
      lead: [], pitch: [], proposal: [], won: [], lost: [],
    } as any;
    (deals.data ?? []).forEach((d) => { (map[d.stage] ||= []).push(d); });
    return map;
  }, [deals.data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {STAGES.map((stage) => (
        <div key={stage} className="bg-muted/30 rounded-lg p-2 min-h-[300px]">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-semibold">{STAGE_LABEL[stage]}</span>
            <Badge variant="outline">{grouped[stage]?.length ?? 0}</Badge>
          </div>
          <div className="space-y-2">
            {(grouped[stage] ?? []).map((d) => {
              const c = companyById[d.company_id];
              const stageIdx = STAGES.indexOf(stage);
              const nextStage = STAGES[Math.min(stageIdx + 1, STAGES.length - 1)];
              return (
                <Card key={d.id} className="cursor-pointer" onClick={() => c && onSelectCompany(c.id)}>
                  <CardContent className="p-3 space-y-2">
                    <div className="text-xs text-muted-foreground truncate">{c?.name ?? "—"}</div>
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    {d.value != null && (
                      <div className="text-xs">${Number(d.value).toLocaleString()} {d.currency}</div>
                    )}
                    {stage !== "lost" && nextStage !== stage && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                        onClick={(e) => { e.stopPropagation(); moveDealStage.mutate({ id: d.id, stage: nextStage }); }}>
                        → {STAGE_LABEL[nextStage]} <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}