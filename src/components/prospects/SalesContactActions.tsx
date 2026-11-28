import { useEffect, useRef, useState } from 'react';
import { Phone,Mail,MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Prospect } from '@/hooks/useProspects';
import { salesRpc, useSalesScripts, useWrongPhones } from '@/hooks/useSalesDesk';
import { contactGate, contactScript, fillLeadScript, type SalesSettings } from '@/lib/leads';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { LeadResultSheet } from './LeadResultSheet';
export function SalesContactActions({lead,settings,rep,onSaved=()=>{},compact=false}:{lead:Prospect;settings:SalesSettings;rep:string;onSaved?:()=>void;compact?:boolean}) {
  const [resultOpen,setResultOpen]=useState(false);const [talked,setTalked]=useState(false);const [seconds,setSeconds]=useState(0);
  const started=useRef<number|null>(null);const left=useRef(false);const [now,setNow]=useState(new Date());
  const {user,profile}=useAuth();const qc=useQueryClient();const held=useRef(false);
  const {data:scripts=[]}=useSalesScripts();const {data:wrong=[]}=useWrongPhones();
  const wrongPhone=wrong.some(p=>p.prospect_id===lead.id && p.value.replace(/\D/g,'').endsWith((lead.phone ?? '').replace(/\D/g,'').slice(-10)));
  useEffect(()=>{const interval=setInterval(()=>{setNow(new Date());if(started.current)setSeconds(Math.floor((Date.now()-started.current)/1000));},1000);
    const back=()=>{if(document.hidden){left.current=true;return;}if(started.current&&left.current){setTalked(Date.now()-started.current>=120000);setResultOpen(true);left.current=false;}};
    document.addEventListener('visibilitychange',back);window.addEventListener('focus',back);
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',back);window.removeEventListener('focus',back);};},[]);
  const dial=async(channel:'call'|'text'|'email')=>{try{
    if(contactGate(lead,channel,settings,new Date(),wrongPhone))return;
    const claim=await salesRpc('hq_lead_claim',{p_prospect_id:lead.id});if(!claim.claimed){toast({title:'Someone else is on this lead'});return;}
    held.current=true;
    const template=contactScript(scripts,lead,channel);
    const text=template?fillLeadScript(template.body,{...lead,their_words:String(lead.preview_answers?.services ?? lead.their_words ?? '')},profile?.full_name || rep):'';
    if(channel==='call'){
      const {error}=await supabase.from('prospect_activity').insert({prospect_id:lead.id,kind:'call',summary:'Dial started',created_by:user?.id});
      if(error)throw error;
      void qc.invalidateQueries({queryKey:['sales-activity']});
      started.current=Date.now();setSeconds(0);sessionStorage.setItem(`sales-call:${lead.id}`,String(started.current));left.current=true;window.location.href=`tel:${lead.phone?.replace(/[^\d+]/g,'')}`;
    }
    else if(channel==='text')window.location.href=`sms:${lead.phone?.replace(/[^\d+]/g,'')}?body=${encodeURIComponent(text)}`;
    else {const body=`${text}\n\nSupreme Team Media\n${settings.mailing_address}\nReply 'unsubscribe' and we won't email you again.`;window.location.href=`mailto:${encodeURIComponent(lead.email ?? '')}?subject=${encodeURIComponent(template?.subject?fillLeadScript(template.subject,lead,rep):'')}&body=${encodeURIComponent(body)}`;}
  }catch(e){toast({title:'Could not open contact',description:e instanceof Error?e.message:'Try again.',variant:'destructive'});}};
  useEffect(()=>{const saved=sessionStorage.getItem(`sales-call:${lead.id}`);if(saved){started.current=Number(saved);setTalked(Date.now()-Number(saved)>=120000);setResultOpen(true);}},[lead.id]);
  useEffect(()=>()=>{if(held.current)void salesRpc('hq_lead_release',{p_prospect_id:lead.id}).catch(()=>{});},[lead.id]);
  return <div className="space-y-2"><div className={compact?'flex gap-1.5':'grid grid-cols-3 gap-2'}>
    {(['call','text','email'] as const).map(channel=>{const reason=contactGate(lead,channel,settings,now,wrongPhone);const Icon=channel==='call'?Phone:channel==='text'?MessageSquare:Mail;
      return <div key={channel} className="min-w-0"><Button variant={channel==='call'?'default':'outline'} className={compact?'h-10 w-10 p-0':'h-12 w-full'} disabled={!!reason} title={reason ?? channel} aria-label={`${channel} ${lead.business_name}`} onClick={()=>void dial(channel)}><Icon className={compact?'h-4 w-4':'h-4 w-4 mr-1.5'} />{!compact&&{call:'Call',text:'Text',email:'Email'}[channel]}</Button>{!compact&&reason&&<p className="text-xs text-muted-foreground mt-1 break-words">{reason}</p>}</div>;})}
    </div>{started.current&&<p className="text-sm tabular-nums">Call time {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p>}
    {!compact&&<Button variant="outline" className="w-full h-11" disabled={lead.do_not_contact} onClick={()=>setResultOpen(true)}>What happened?</Button>}
    <LeadResultSheet lead={lead} settings={settings} open={resultOpen} talked={talked} onClose={()=>setResultOpen(false)} onSaved={()=>{held.current=false;started.current=null;sessionStorage.removeItem(`sales-call:${lead.id}`);onSaved();}} />
  </div>;
}