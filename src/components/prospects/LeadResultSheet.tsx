import { useEffect, useState } from 'react';
import type { Prospect } from '@/hooks/useProspects';
import { useSalesActions, useSalesPackages } from '@/hooks/useSalesDesk';
import { RESULT_LABELS, voicemailAllowed, zonedInputToIso, type LeadResult, type SalesSettings } from '@/lib/leads';
import { Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
export function LeadResultSheet({lead,open,onClose,onSaved,settings,talked=false}:{lead:Prospect;open:boolean;onClose:()=>void;onSaved:()=>void;settings:SalesSettings;talked?:boolean}) {
  const [tab,setTab]=useState(talked?'talked':'missed');const [result,setResult]=useState<LeadResult|null>(null);
  const [values,setValues]=useState<Record<string,string>>({});const [textOk,setTextOk]=useState(false);const [confirmed,setConfirmed]=useState(false);
  const actions=useSalesActions();const {data:packages=[]}=useSalesPackages();
  useEffect(()=>{if(open){setTab(talked?'talked':'missed');setResult(null);setValues({owner_name:lead.contact_name ?? '',owner_cell:lead.phone ?? '',google_link:lead.source_url ?? (lead.place_id?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.business_name)}&query_place_id=${encodeURIComponent(lead.place_id)}`:'')});setTextOk(false);setConfirmed(false);}},[open,lead.id,talked]);
  const field=(key:string,label:string,type='text')=><div className="space-y-1" key={key}><Label htmlFor={`result-${key}`}>{label}</Label><Input id={`result-${key}`} type={type} value={values[key] ?? ''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))} className="h-11 text-base" required /></div>;
  const choices:LeadResult[]=tab==='missed'?['no_answer',...(voicemailAllowed(lead.attempt_count ?? 0,settings.cadence,!!lead.preview_by)?['voicemail' as const]:[]),'owner_not_in','wrong_number']:['preview_yes','intro_booked','follow_up','not_interested','stop',...(lead.preview_by?['pending_close' as const,'hand_to_sean' as const]:[])];
  const save=async()=>{if(!result)return;try{
    const details:Record<string,unknown>={...values,request_key:crypto.randomUUID(),confirmed,text_ok:textOk};
    if(values.next_try_at)details.next_try_at=zonedInputToIso(values.next_try_at,lead.time_zone || 'America/Los_Angeles');
    if(values.promised_at)details.promised_at=zonedInputToIso(values.promised_at,lead.time_zone || 'America/Los_Angeles');
    await actions.result.mutateAsync({id:lead.id,result,details});toast({title:'Result saved'});onSaved();onClose();
  }catch(e){toast({title:'Could not save',description:e instanceof Error?e.message:'Try again.',variant:'destructive'});}};
  return <Sheet open={open} onOpenChange={v=>!v&&onClose()}><SheetContent side="bottom" className="max-h-[94dvh] flex flex-col p-0 sm:max-w-xl sm:mx-auto"><SheetHeader className="p-4 border-b text-left"><SheetTitle>What happened?</SheetTitle><SheetDescription>{lead.business_name} · Times in {lead.time_zone || 'America/Los_Angeles'}</SheetDescription></SheetHeader>
    <div className="overflow-y-auto p-4 space-y-4 pb-24"><Tabs value={tab} onValueChange={v=>{setTab(v);setResult(null);}}><TabsList className="w-full"><TabsTrigger className="flex-1" value="missed">Couldn't reach</TabsTrigger><TabsTrigger className="flex-1" value="talked">Talked</TabsTrigger></TabsList></Tabs>
    <div className="grid grid-cols-2 gap-2">{choices.map(r=><Button key={r} variant={result===r?'default':'outline'} className="min-h-12 h-auto py-3 whitespace-normal text-left" onClick={()=>setResult(r)}>{RESULT_LABELS[r]}</Button>)}</div>
    {result&&<div className="space-y-3 border-t pt-4">
      {result==='owner_not_in'&&<>{field('owner_name',"Owner's name")}{field('next_try_at','Best day and time','datetime-local')}</>}
      {result==='follow_up'&&<>{field('next_try_at','Follow-up day and time','datetime-local')}{field('note','What should we follow up on?')}</>}
      {result==='preview_yes'&&<>{field('owner_name','Owner name')}{field('owner_cell','Owner cell','tel')}{field('google_link','Google listing link','url')}{field('services','Services they want calls for')}{field('areas','Areas they cover')}<Label htmlFor="result-photos">Photos</Label><select id="result-photos" className="h-11 w-full rounded-md border bg-background px-3" value={values.photos ?? ''} onChange={e=>setValues(v=>({...v,photos:e.target.value}))}><option value="">Choose</option><option value="from Google">From Google</option><option value="they will send">They will send</option></select><label className="flex items-center gap-3 text-sm"><Checkbox checked={textOk} onCheckedChange={v=>setTextOk(v===true)} />They said this is the best number and yes to texting the link</label>{field('promised_at','Promised by: day and time','datetime-local')}</>}
      {result==='intro_booked'&&<>{field('contact_name','Contact name')}{field('role','Their role')}{field('phone','Phone','tel')}{field('email','Email','email')}{field('their_words','What they told me, in their words')}{field('fix','What they want fixed')}{field('spending_approver','Who approves spending')}{field('times','Times they offered')}</>}
      {result==='not_interested'&&<><Label htmlFor="result-reason">Reason</Label><select id="result-reason" className="h-11 w-full rounded-md border bg-background px-3" value={values.reason ?? ''} onChange={e=>setValues(v=>({...v,reason:e.target.value}))}><option value="">Choose</option>{Object.entries({has_someone:'Has someone / happy with what they have',too_expensive:'Too expensive',bad_timing:'Bad timing',does_it_themselves:'Does it themselves',other:'Other'}).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><label className="flex items-center gap-3"><Checkbox checked={confirmed} onCheckedChange={v=>setConfirmed(v===true)} />Confirm: mark this lead Dead</label></>}
      {result==='pending_close'&&<><Label htmlFor="result-package">Package</Label><select id="result-package" className="h-11 w-full rounded-md border bg-background px-3" value={values.package_id ?? ''} onChange={e=>setValues(v=>({...v,package_id:e.target.value}))}><option value="">Choose</option>{packages.filter(p=>['local-growth','startup'].includes(p.slug)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.price}</option>)}</select>{field('client_email','Client email','email')}<p className="text-sm text-muted-foreground">Sean confirms the sale and sends the written price and agreement. This is not Won yet.</p></>}
      {(result==='preview_yes'||result==='intro_booked'||result==='not_interested'||result==='hand_to_sean')&&<div className="space-y-1"><Label htmlFor="result-note">Notes{result==='hand_to_sean'?' (required)':''}</Label><Textarea id="result-note" value={values.note ?? ''} onChange={e=>setValues(v=>({...v,note:e.target.value}))} /></div>}
      {result==='stop'&&<p className="text-sm text-destructive">This immediately stops contact on every channel.</p>}
      <Button className="h-12 w-full" disabled={actions.result.isPending} onClick={()=>void save()}>{actions.result.isPending?'Saving…':result==='stop'?'Mark Do not contact':'Save result'}</Button>
    </div>}</div></SheetContent></Sheet>;
}