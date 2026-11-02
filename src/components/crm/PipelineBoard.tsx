import { useMemo } from "react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MoreVertical } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  STAGES, useDeals, useCompanies, useCrmMutations, type CrmDeal, type CrmDealStage,
} from "@/hooks/useCrm";
import { ArchiveOrDeleteDialog } from "@/components/shared/ArchiveOrDeleteDialog";
import { CollectionToolbar } from "@/components/shared/CollectionToolbar";
import { sortCollection } from "@/lib/collectionSort";

const STAGE_LABEL: Record<CrmDealStage, string> = {
  lead: "Lead", pitch: "Pitch", proposal: "Proposal", won: "Won", lost: "Lost",
};

export function PipelineBoard({ onSelectCompany }: { onSelectCompany: (id: string) => void }) {
  const deals = useDeals();
  const companies = useCompanies();
  const { moveDealStage, archiveDeal, deleteDeal } = useCrmMutations();
  const [target, setTarget] = useState<CrmDeal | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');

  const companyById = useMemo(
    () => Object.fromEntries((companies.data ?? []).map((c) => [c.id, c])),
    [companies.data],
  );

  const grouped = useMemo(() => {
    const map: Record<CrmDealStage, typeof deals.data> = {
      lead: [], pitch: [], proposal: [], won: [], lost: [],
    } as any;
    sortCollection((deals.data ?? []).filter(d => `${d.title} ${companyById[d.company_id]?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), sort)
      .forEach((d) => { (map[d.stage] ||= []).push(d); });
    return map;
  }, [deals.data, companyById, query, sort]);

  return (
    <div className="space-y-4">
      <CollectionToolbar query={query} onQuery={setQuery} placeholder="Find a deal or company…" sort={sort} onSort={setSort}
        count={Object.values(grouped).reduce((n, rows) => n + (rows?.length ?? 0), 0)} total={deals.data?.length ?? 0}
        options={[{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'},{value:'value',label:'Deal value · highest first'},{value:'name',label:'Title · A to Z'}]} />
      {(deals.isLoading || companies.isLoading) && <p role="status">Loading pipeline…</p>}
      {(deals.isError || companies.isError) && <p role="alert">The pipeline could not be fully loaded. <Button variant="link" onClick={() => { deals.refetch(); companies.refetch(); }}>Try again</Button></p>}
      <div className="grid grid-cols-1 md:grid-cols-[repeat(5,minmax(13rem,1fr))] gap-3 overflow-x-auto pb-3" aria-label="Deals by stage">
      {STAGES.map((stage) => (
        <section key={stage} data-stage={stage} className="hq-stage md:min-h-[280px]">
          <div className="hq-stage-heading flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">{STAGE_LABEL[stage]}</h2>
            <Badge variant="outline">{grouped[stage]?.length ?? 0}</Badge>
          </div>
          <div className="space-y-2">
            {!deals.isLoading && !deals.isError && (grouped[stage]?.length ?? 0) === 0 && <p className="py-4 text-sm text-muted-foreground">{query ? 'No matching deals.' : `No ${STAGE_LABEL[stage].toLowerCase()} deals yet.`}</p>}
            {(grouped[stage] ?? []).map((d) => {
              const c = companyById[d.company_id];
              const stageIdx = STAGES.indexOf(stage);
              const nextStage = STAGES[Math.min(stageIdx + 1, STAGES.length - 1)];
              return (
                <Card key={d.id} className="relative">
                  <CardContent className="p-3 space-y-2">
                    <div className="text-xs text-muted-foreground pr-10 break-words">{c?.name ?? "—"}</div>
                    <button type="button" className="text-left text-base font-semibold leading-snug hover:underline break-words" onClick={() => c && onSelectCompany(c.id)}>{d.title}</button>
                    {d.value != null && (
                      <div className="text-xs">${Number(d.value).toLocaleString()} {d.currency}</div>
                    )}
                    <select aria-label={`Stage for ${d.title}`} className="w-full rounded border bg-background p-1 text-xs" value={stage} disabled={moveDealStage.isPending} onClick={e => e.stopPropagation()} onChange={e => {
                      moveDealStage.mutate({id:d.id, stage:e.target.value as CrmDealStage}, {onError:error => toast.error(error.message)});
                    }}>{STAGES.map(value => <option key={value} value={value}>{STAGE_LABEL[value]}</option>)}</select>
                    <div className="absolute top-1 right-1" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setTarget(d)}>Archive or delete…</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      </div>

      {target && (
        <ArchiveOrDeleteDialog
          open={!!target}
          onOpenChange={(o) => { if (!o) setTarget(null); }}
          entityLabel="deal"
          entityName={target.title}
          linkedLines={[]}
          extraNote="Linked interactions will be kept but unlinked from this deal."
          onArchive={async (reason) => {
            await archiveDeal.mutateAsync({ id: target.id, reason });
            toast.success("Deal archived");
          }}
          onDelete={async () => {
            await deleteDeal.mutateAsync(target.id);
            toast.success("Deal deleted");
          }}
        />
      )}
    </div>
  );
}
