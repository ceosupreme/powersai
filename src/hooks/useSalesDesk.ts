import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LeadResult, LeadScript, SalesSettings } from '@/lib/leads';
const db = supabase as any;
export async function salesRpc(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return data;
}
export function useSalesSettings() {
  return useQuery({ queryKey: ['sales-settings'], queryFn: async (): Promise<SalesSettings> => {
    const { data,error } = await supabase.from('sales_settings').select('key,value'); if(error) throw error;
    const rows = Object.fromEntries((data ?? []).map(r=>[r.key,r.value]));
    if (!rows.cadence || !rows.pay || typeof rows.mailing_address !== 'string') throw new Error('Sales settings are not ready.');
    return rows as unknown as SalesSettings;
  }, refetchInterval:20000 });
}
export function useSalesScripts() {
  return useQuery({queryKey:['sales-scripts'],queryFn:async ():Promise<LeadScript[]>=>{
    const {data,error}=await supabase.from('outreach_templates').select('id,name,body,subject,channel,lead_type,step')
      .eq('is_active',true).not('lead_type','is',null).not('step','is',null).order('sort_order');
    if(error)throw error;return data ?? [];
  }});
}
export function useSalesPackages() {
  return useQuery({queryKey:['sales-packages'],queryFn:async()=>{
    const {data,error}=await supabase.from('starter_packages').select('id,slug,name,price,price_note').order('sort_order');
    if(error)throw error;return data ?? [];
  }});
}
export function useSalesDeals(companyId:string|null) {
  return useQuery({queryKey:['sales-deals',companyId],enabled:!!companyId,queryFn:async()=>{
    const {data,error}=await supabase.from('crm_deals').select('id,title,stage').eq('company_id',companyId ?? '').eq('archived',false);
    if(error)throw error;return data ?? [];
  }});
}
export function useSalesActivity() {
  return useQuery({queryKey:['sales-activity'],refetchInterval:20000,queryFn:async()=>{
    const rows: {id:string;prospect_id:string;created_by:string|null;created_at:string;kind:string;summary:string|null}[]=[];
    for(let from=0;;from+=500){const {data,error}=await supabase.from('prospect_activity').select('*').order('created_at',{ascending:false}).range(from,from+499);
      if(error)throw error;rows.push(...(data ?? []));if((data ?? []).length<500)return rows;}
  }});
}
export function useWrongPhones() {
  return useQuery({queryKey:['wrong-phones'],queryFn:async()=>{
    const {data,error}=await supabase.from('contact_points').select('prospect_id,value').eq('kind','phone').eq('is_wrong',true);
    if(error)throw error;return data ?? [];
  }});
}
export function useSalesActions() {
  const qc=useQueryClient();
  const invalidate=()=>Promise.all(['prospects','prospect_activity','sales-activity','wrong-phones','agent-desk','agent-handoffs','waiting-on-me','crm'].map(k=>qc.invalidateQueries({queryKey:[k]})));
  const result=useMutation({mutationFn:({id,result,details}:{id:string;result:LeadResult;details:Record<string,unknown>})=>salesRpc('hq_lead_log_result',{p_prospect_id:id,p_result:result,p_details:details}),onSuccess:invalidate});
  const action=useMutation({mutationFn:({name,args}:{name:string;args:Record<string,unknown>})=>salesRpc(name,args),onSuccess:invalidate});
  return {result,action,invalidate};
}