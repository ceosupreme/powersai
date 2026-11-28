import { useEffect,useMemo,useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card,CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { salesRpc,useSalesActivity,useSalesSettings } from '@/hooks/useSalesDesk';
import type { Prospect } from '@/hooks/useProspects';
import { TOP_LEAD_REASON,todayPacific,topLeads } from '@/lib/leads';
import { LeadScripts } from './LeadScripts';
import { SalesContactActions } from './SalesContactActions';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
export function MyNextLead({leads,names,onOpen}:{leads:Prospect[];names:Record<string,string>;onOpen:(p:Prospect)=>void}) {
  const {user,profile}=useAuth();const {data:settings,isError}=useSalesSettings();const {data:activity=[]}=useSalesActivity();
  const qc=useQueryClient();
  const [now,setNow]=useState(new Date());const today=todayPacific(now);
  const key=`sales-skips:${user?.id}:${today}`;
  const [skipped,setSkipped]=useState<Set<string>>(()=>new Set(JSON.parse(sessionStorage.getItem(key) ?? '[]')));
  const [selected,setSelected]=useState<string|null>(null);const [holder,setHolder]=useState<string|null>(null);const [blocked,setBlocked]=useState<Set<string>>(new Set());
  const skipsToday=useMemo(()=>new Set([...skipped,...activity.filter(a=>a.created_by===user?.id&&a.summary==='Skipped until tomorrow'&&todayPacific(new Date(a.created_at))===today).map(a=>a.prospect_id)]),[skipped,activity,user?.id,today]);
  const queue=useMemo(()=>topLeads(leads.filter(p=>!blocked.has(p.id)),today,{me:user?.id,limit:leads.length,now,skipped:skipsToday}),[leads,today,user?.id,now,skipsToday,blocked]);
  const next=queue.find(q=>q.lead.id===selected) ?? queue[0];const lead=next?.lead;
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),20000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{setBlocked(new Set());},[now]);
  useEffect(()=>{if(!lead || !user)return;let cancelled=false;
    void salesRpc('hq_lead_claim',{p_prospect_id:lead.id}).then(claim=>{if(cancelled){if(claim.claimed)void salesRpc('hq_lead_release',{p_prospect_id:lead.id});return;}if(claim.claimed){setSelected(lead.id);setHolder(null);}else{setHolder(claim.working_by);setBlocked(old=>new Set([...old,lead.id]));setSelected(null);}}).catch(e=>toast({title:'Could not hold lead',description:e.message,variant:'destructive'}));
    return()=>{cancelled=true;void salesRpc('hq_lead_release',{p_prospect_id:lead.id}).catch(()=>{});};
  },[lead?.id,user?.id]);
  const skip=async()=>{if(!lead)return;try{await salesRpc('hq_lead_release',{p_prospect_id:lead.id});const {error}=await supabase.from('prospect_activity').insert({prospect_id:lead.id,kind:'note',summary:'Skipped until tomorrow',created_by:user?.id});if(error)throw error;const updated=new Set(skipped);updated.add(lead.id);setSkipped(updated);sessionStorage.setItem(key,JSON.stringify([...updated]));setSelected(null);void qc.invalidateQueries({queryKey:['sales-activity']});}catch(e){toast({title:'Could not skip',description:e instanceof Error?e.message:'Try again.',variant:'destructive'});}};
  const results=activity.filter(a=>a.created_by===user?.id && a.summary?.includes('[result:'));
  const dayRows=results.filter(a=>todayPacific(new Date(a.created_at))===today);
  const stats=[['Dials',activity.filter(a=>a.created_by===user?.id&&a.summary==='Dial started'&&todayPacific(new Date(a.created_at))===today).length],['Conversations',dayRows.filter(a=>/^(preview yes|intro booked|follow up|not interested|stop|pending close|hand to sean)/.test(a.summary ?? '')).length],['Preview yeses',dayRows.filter(a=>a.summary?.startsWith('preview yes')).length],['Intro calls',dayRows.filter(a=>a.summary?.startsWith('intro booked')).length],['Closes',dayRows.filter(a=>a.summary?.startsWith('pending close')).length]];
  const days=new Set(activity.filter(a=>a.created_by===user?.id&&(a.summary==='Dial started'||a.summary?.includes('[result:'))).map(a=>todayPacific(new Date(a.created_at))));let streak=0;let date=today;
  for(let i=0;i<365&&days.has(date);i++){streak++;const [y,m,d]=date.split('-').map(Number);date=new Date(Date.UTC(y,m-1,d-1)).toISOString().slice(0,10);}
  if(!settings)return <p role={isError?'alert':'status'}>{isError?'Sales settings could not be loaded.':'Loading sales settings…'}</p>;
  const hours=lead?.snapshot?.regularOpeningHours as {weekdayDescriptions?:string[]}|undefined;
  return <div className="space-y-5"><div className="grid grid-cols-2 sm:grid-cols-6 border-y divide-x py-3">{[...stats,['Day streak',streak]].map(([label,n])=><div key={label} className="min-w-0 px-3 py-1"><p className="text-xl font-semibold tabular-nums">{n}</p><p className="text-xs text-muted-foreground break-words">{label}</p></div>)}</div>
    {holder&&<p role="status">{names[holder] ?? 'Someone else'} is on it.</p>}
    {!lead?<p className="py-12 text-center text-muted-foreground">No lead is due right now.</p>:<Card className="max-w-2xl"><CardContent className="p-4 sm:p-6 space-y-5"><header className="space-y-2"><Badge variant="outline">{TOP_LEAD_REASON[next.reason]}</Badge><h2 className="text-2xl font-semibold break-words">{lead.business_name}</h2><p>{lead.contact_name || 'Owner name not on file'}{lead.city?` · ${lead.city}`:''}</p>
    <p className="text-sm text-muted-foreground">{lead.out_of_tries_at && lead.next_try_at && Date.parse(lead.next_try_at)>now.getTime()?'Out of tries':`Try ${(lead.attempt_count ?? 0)+1} of ${settings.cadence.max_tries}`}{lead.next_try_at?` · Callback due ${new Date(lead.next_try_at).toLocaleString('en-US',{timeZone:lead.time_zone || 'America/Los_Angeles',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`:''}</p>
    {hours?.weekdayDescriptions?.length?<details><summary className="text-sm cursor-pointer">Google listing hours</summary><p className="whitespace-pre-wrap text-sm">{hours.weekdayDescriptions.join('\n')}</p></details>:<p className="text-xs text-muted-foreground">Google listing hours not available.</p>}</header>
    <LeadScripts compact lead={lead} rep={profile?.full_name || 'Your rep'} settings={settings} />
    <SalesContactActions key={lead.id} lead={lead} settings={settings} rep={profile?.full_name || 'Your rep'} onSaved={()=>setSelected(null)} />
    <div className="flex gap-2"><Button variant="outline" className="h-11 flex-1" onClick={()=>onOpen(lead)}>Lead details</Button><Button variant="ghost" className="h-11" onClick={()=>void skip()}>Skip</Button></div></CardContent></Card>}
  </div>;
}