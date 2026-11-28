import { useSalesScripts } from '@/hooks/useSalesDesk';
import type { Prospect } from '@/hooks/useProspects';
import { fillLeadScript, scriptFor, voicemailAllowed, type SalesSettings } from '@/lib/leads';
export function LeadScripts({lead,rep,settings,compact=false}:{lead:Prospect;rep:string;settings:SalesSettings;compact?:boolean}) {
  const {data:rows=[],isLoading}=useSalesScripts();
  const primary=lead.preview_link?'preview_call':'opener';
  const steps=compact?[primary]:[primary,...(voicemailAllowed(lead.attempt_count ?? 0,settings.cadence,!!lead.preview_by)?['voicemail']:[]),'objection','offer_facts'];
  return <section className="space-y-3" aria-label="Call script">
    {isLoading?<p>Loading script…</p>:steps.map(step=>{
      const found=scriptFor(rows,lead.lead_type,step);
      return <div key={step}>
        <h3 className="text-sm font-semibold">{{opener:'Opening',preview_call:'Preview call',voicemail:'Voicemail',objection:'Objections',offer_facts:'Offer facts'}[step]}</h3>
        {!found.length?<p className="text-sm text-muted-foreground">No {step.replace('_',' ')} script loaded yet.</p>:found.map(r=>step==='objection'?<details key={r.id} className="border-b py-2"><summary className="cursor-pointer text-sm font-medium">{r.name}</summary><p className="whitespace-pre-wrap text-sm pt-2">{fillLeadScript(r.body,{...lead,their_words:String(lead.preview_answers?.services ?? lead.their_words ?? '')},rep)}</p></details>:<p key={r.id} className="whitespace-pre-wrap text-[15px] leading-relaxed">{fillLeadScript(r.body,{...lead,their_words:String(lead.preview_answers?.services ?? lead.their_words ?? '')},rep)}</p>)}
      </div>;
    })}
  </section>;
}