import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useProjectDirectory } from '@/hooks/usePortfolioData';
import { useBrandWorkSummaries } from '@/hooks/useBrandWorkspace';
import { useCampaignStore } from '@/components/marketing-hub/useCampaignStore';
import { AllProjectsNextTen } from '@/components/workspace/AllProjectsNextTen';
import { WaitingOnMe } from '@/components/workspace/WaitingOnMe';
import { BrandIdentity } from '@/components/shared/BrandIdentity';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpTip } from '@/components/help/HelpTip';
import { useBrandManagerProjects } from '@/hooks/useBrandManagerProjects';
import BrandManagerPortal from './BrandManagerPortal';

export default function OwnerDashboard() {
  const { role, isAdmin } = useAuth();
  const managed = useBrandManagerProjects();
  const [params] = useSearchParams();
  const previewId = params.get('brand');
  const teamView = isAdmin && params.get('team_view') === '1' && !!previewId;
  const previewBrand = useQuery({ queryKey: ['team-view-brand', previewId], enabled: teamView, queryFn: async () => {
    if (!previewId) return null;
    const { data, error } = await supabase.from('venues').select('id,name,north_star,project_type').eq('id', previewId).maybeSingle();
    if (error) throw error;
    return data;
  } });
  if (teamView) {
    if (previewBrand.isLoading) return <p role="status">Loading team view…</p>;
    if (previewBrand.isError || !previewBrand.data) return <Card className="p-5 space-y-3"><p role="alert">This brand could not be loaded.</p><Button asChild><Link to="/workspace">Back to my dashboard</Link></Button></Card>;
    return <BrandManagerPortal brands={[{ ...previewBrand.data, project_type: previewBrand.data.project_type ?? '' }]} preview />;
  }
  if (role === 'owner' && !isAdmin) {
    if (managed.isLoading) return <p role="status">Loading your brand workspace…</p>;
    if (managed.isError) return <Card className="p-5 space-y-3"><p role="alert">We could not verify your assigned brands.</p><Button onClick={() => void managed.refetch()}>Try again</Button></Card>;
    if (managed.data?.length) return <BrandManagerPortal brands={managed.data} />;
  }
  return <OwnerDashboardContent />;
}

function OwnerDashboardContent() {
  const {selectedBar} = useApp();
  const {canAccessPage, isAdmin} = useAuth();
  const directory = useProjectDirectory();
  const projects = useMemo(() => (directory.data ?? []).filter(p => p.group !== 'prospects' && (!selectedBar || p.id === selectedBar.id)), [directory.data, selectedBar?.id]);
  const brands = useMemo(() => projects.filter(p => p.group === 'brands' && p.focus_status !== 'parked'), [projects]);
  const work = useBrandWorkSummaries(brands);
  const campaigns = useCampaignStore(selectedBar?.id);
  const totals = [...(work.data?.values() ?? [])];
  const count = (key:'waitingCount'|'publishedThisMonth'|'channelsLive') => work.isError ? 'Unavailable' : work.isLoading ? '…' : totals.reduce((sum, row) => sum + row[key], 0).toString();
  const links = [
    {to:'/portfolio',title:'Portfolio',note:'Open a brand or client workspace',color:'brand',key:'dashboard'},
    {to:'/production-board',title:'Production Board',note:'Review and finish content',color:'content',key:'content_pipeline',admin:true},
    {to:'/crm',title:'CRM',note:'Move leads and follow up',color:'clients',key:'crm'},
    {to:'/marketing-hub',title:'Marketing Hub',note:'Plan campaigns and track results',color:'growth',key:'marketing_hub',admin:true},
  ];
  return <div className="space-y-6">
    <header className="flex items-start gap-3"><LayoutDashboard className="h-8 w-8 text-primary"/><div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">{selectedBar?.bar_name ?? 'All brands & client projects'} · what needs attention and where to go next</p></div></header>
    <HelpTip helpKey="hq-projects-explained" title="Brands, projects, and Portfolio">Each brand has a project: its workspace for channels, content, products, tasks, and results. Client businesses also have projects. Portfolio is the directory containing them. Choose a brand or client in the header to focus this dashboard.</HelpTip>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {links.filter(l => (!l.admin || isAdmin) && canAccessPage(l.key as any)).map(l=><Link key={l.to} to={l.to} data-hq-section={l.color} className="hq-section hover:shadow-md"><h2 className="text-lg font-bold flex justify-between gap-2">{l.title}<ArrowRight className="h-5 w-5"/></h2><p className="mt-2 text-sm text-muted-foreground">{l.note}</p></Link>)}
    </div>
    {directory.isLoading ? <p role="status">Loading your dashboard…</p> : directory.isError ? <Card className="p-5"><p role="alert">Your brands and client projects could not be loaded.</p><Button onClick={()=>directory.refetch()}>Try again</Button></Card> : <>
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3" aria-label="Current activity">
        {[...(brands.length ? [['Active brands',String(brands.length)],['Brand work waiting on you',count('waitingCount')],['Brand posts this month',count('publishedThisMonth')]] : [['Client projects',String(projects.filter(p=>p.group==='clients').length)]]),['Live campaigns',campaigns.error?'Unavailable':campaigns.loading?'…':String(campaigns.campaigns.filter(c=>c.status==='Live').length)]].map(([label,value])=><Card key={label} className="p-5 border-t-4 border-t-primary"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold mt-2">{value}</p></Card>)}
      </section>
      {work.isError && <p role="alert">Brand activity could not be loaded. <Button variant="link" onClick={()=>work.refetch()}>Try again</Button></p>}
      {brands.length>0 && <div className="grid xl:grid-cols-2 gap-5"><WaitingOnMe projects={brands}/><AllProjectsNextTen projects={brands}/></div>}
      <section className="space-y-3"><h2 className="text-xl font-bold">Your workspaces</h2><p className="text-sm text-muted-foreground">Open a brand or client to see its setup, work, and results.</p>
        {projects.length===0 ? <Card className="p-5"><p>No workspaces are available in this selection.</p><Button asChild variant="outline" className="mt-3"><Link to="/portfolio">Open Portfolio</Link></Button></Card> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{projects.map(p=><Link to={`/project/${p.id}`} key={p.id} className="rounded-lg border bg-card p-3 hover:shadow-md"><BrandIdentity id={p.id} name={p.name}/><p className="mt-3 text-sm text-muted-foreground">{p.group==='brands'?'Brand project':'Client project'}{p.focus_status==='parked'?' · Parked':''} · Open workspace →</p></Link>)}</div>}
      </section>
    </>}
  </div>;
}
