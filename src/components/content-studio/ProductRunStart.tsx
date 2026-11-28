import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CreatePipelineDialog, type PipelineRequest } from '@/components/pipeline/CreatePipelineDialog';
import { productTypeFromTask } from '@/lib/productRun';

export function ProductRunStart({ projectId = '', productId, jobId, taskId, title = '', entry = false }: { projectId?: string; productId?: string; jobId?: string | null; taskId?: string | null; title?: string; entry?: boolean }) {
  const [request, setRequest] = useState<PipelineRequest | null>(null);
  const lookup = useQuery({ queryKey: ['product-run-entry', productId, jobId, taskId], enabled: !entry, staleTime: 15000, queryFn: async () => {
    let target = productId; let linkedJob = jobId; let brand = projectId;
    if (taskId) {
      const task = await supabase.from('action_items').select('job_id,facts,venue_id,bar_id').eq('id', taskId).maybeSingle();
      if (task.error) throw task.error;
      linkedJob = task.data?.job_id ?? linkedJob; brand = task.data?.venue_id ?? task.data?.bar_id ?? brand;
      try { const f = JSON.parse(task.data?.facts ?? '{}'); target = f.product_id ?? (f.target_type === 'channel_products' ? f.target_id : undefined) ?? target; } catch { /* unstructured facts carry no product link */ }
    }
    if (linkedJob) {
      const j = await supabase.from('production_jobs').select('id,target_type,target_id,run_state,project_id').eq('id', linkedJob).maybeSingle();
      if (j.error) throw j.error;
      if (j.data?.target_type === 'channel_products') { target = j.data.target_id ?? target; brand = j.data.project_id; if (j.data.run_state) return { job: j.data.id, target, brand }; }
    }
    if (target) {
      const j = await supabase.from('production_jobs').select('id').eq('target_type', 'channel_products').eq('target_id', target).not('run_state', 'is', null).order('created_at').limit(1).maybeSingle();
      if (j.error) throw j.error;
      return { job: j.data?.id, target, brand };
    }
    if (taskId) {
      const j = await supabase.from('production_jobs').select('id,target_id,project_id').eq('target_type', 'channel_products').eq('target_key', `product:task:${taskId}`).not('run_state', 'is', null).order('created_at').limit(1).maybeSingle();
      if (j.error) throw j.error;
      if (j.data) return { job: j.data.id, target: j.data.target_id ?? undefined, brand: j.data.project_id };
    }
    return { target, brand, job: undefined };
  } });
  const canStart = entry || productId || lookup.data?.target || (/\b(create|make|build|write|draft)\b.*\b(book|course|guide|printable)\b/i.test(title) && !!taskId);
  if (!entry && lookup.isLoading) return null;
  if (!canStart && !lookup.data?.job) return null;
  return <>
    {lookup.data?.job ? <Button variant="outline" className="min-h-11" asChild><Link to={`/content-studio/run/${lookup.data.job}`}>Continue run</Link></Button> : <Button variant="outline" className="min-h-11" disabled={lookup.isError} onClick={() => setRequest({ projectId: lookup.data?.brand ?? projectId, kind: 'product', title, targetType: 'channel_products', targetId: lookup.data?.target ?? productId, productType: entry ? undefined : productTypeFromTask(title), guidedProduct: true, productRequestKey: taskId ? `task:${taskId}` : undefined })}>{entry ? 'Make a product' : 'Start guided run'}</Button>}
    <CreatePipelineDialog request={request} onClose={() => setRequest(null)} />
  </>;
}