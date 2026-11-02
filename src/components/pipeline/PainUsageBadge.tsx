import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
export function PainUsageBadge({projectId,painId}: {projectId:string;painId:string}) {
  const {data} = useQuery({queryKey:['pain-pipelines',projectId,painId],queryFn:async()=>{
    const {data,error} = await (supabase as any).from('production_jobs').select('id,target_key,status')
      .eq('project_id',projectId).eq('target_key',`pain:${painId}`).neq('status','parked').order('created_at',{ascending:false}).limit(1);
    if(error) throw error;
    return data as {id:string;target_key:string;status:string}[];
  }});
  const job=data?.find(j=>j.target_key===`pain:${painId}`);
  return job ? <Link className="text-xs text-primary underline" to={`/project/${projectId}/jobs/${job.id}`}>Used in pipeline · {job.status === 'finished' ? 'Finished' : 'Open pipeline'}</Link> : null;
}
