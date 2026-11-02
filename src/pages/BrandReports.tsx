import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {useApp} from '@/context/AppContext';
import {useProjectDirectory,useNonClientPortfolio} from '@/hooks/usePortfolioData';
import {useBrandWorkSummaries} from '@/hooks/useBrandWorkspace';
import {currentWeekRange} from '@/hooks/useEnsureCurrentWeek';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {BrandIdentity} from '@/components/shared/BrandIdentity';
import {ScoreDataStatus} from '@/components/pillar/ScoreDataStatus';
import {CollectionToolbar} from '@/components/shared/CollectionToolbar';
import {sortCollection} from '@/lib/collectionSort';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Label} from '@/components/ui/label';

export default function BrandReports({mode}:{mode:'weekly'|'insights'}) {
  const {selectedBar,accessibleBars,setSelectedBar} = useApp();
  const directory=useProjectDirectory();
  const projects=useMemo(()=>(directory.data??[]).filter(p=>p.group==='brands'&&(!selectedBar||p.id===selectedBar.id)),[directory.data,selectedBar?.id]);
  const clients=(directory.data??[]).filter(p=>p.group==='clients');
  const [week,setWeek]=useState(currentWeekRange().week_start);
  const [query,setQuery]=useState('');
  const [sort,setSort]=useState('name');
  const scores=useNonClientPortfolio(projects,mode==='weekly'?week:undefined);
  const work=useBrandWorkSummaries(projects);
  const weeks=Array.from({length:12},(_,i)=>{const d=new Date(`${currentWeekRange().week_start}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-i*7);return d.toISOString().slice(0,10)});
  const rows=sortCollection((scores.data??[]).filter(p=>p.name.toLowerCase().includes(query.trim().toLowerCase())).map(p=>({...p,title:p.name,value:work.data?.get(p.id)?.waitingCount??null})),sort);
  const loading=directory.isLoading||scores.isLoading;
  const error=directory.isError||scores.isError;
  return <div className="space-y-5">
    <header><h1 className="text-3xl font-bold">{mode==='weekly'?'Weekly Review':'Insights'}</h1><p className="mt-2 text-muted-foreground">{selectedBar?.bar_name??'All brands'} · {mode==='weekly'?'recorded scores and progress':'signals from your existing work and measurements'}</p></header>
    {mode==='weekly'?<div className="space-y-2 max-w-sm"><Label htmlFor="brand-review-week">Reporting week</Label><Select value={week} onValueChange={setWeek}><SelectTrigger id="brand-review-week"><SelectValue/></SelectTrigger><SelectContent>{weeks.map(w=><SelectItem key={w} value={w}>Week of {w}{w===weeks[0]?' · in progress':''}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Scores use this week. Revenue covers its calendar month. Work needing attention is current.</p></div>:<p className="text-sm text-muted-foreground">These signals come from saved scores, channel activity, and work awaiting review. No AI run is needed to see them.</p>}
    <CollectionToolbar query={query} onQuery={setQuery} placeholder="Find a brand…" sort={sort} onSort={setSort} count={rows.length} options={[{value:'name',label:'Brand · A to Z'},{value:'value',label:'Waiting on you · most first'}]}/>
    {loading?<p role="status">Loading brand reports…</p>:error?<Card className="p-5"><p role="alert">The report could not be loaded. Your data has not been replaced with zeros.</p><Button onClick={()=>{directory.refetch();scores.refetch();}}>Try again</Button></Card>:<>
      {work.isError&&<p role="alert">Current work activity is unavailable. <Button variant="link" onClick={()=>work.refetch()}>Retry activity</Button></p>}
      {rows.length===0&&<Card className="p-5"><h2 className="font-bold">{query?'No brands match your search':'No brand reports in this selection'}</h2><p className="mt-2">Open Portfolio to choose or set up a brand workspace.</p><Button asChild variant="outline" className="mt-3"><Link to="/portfolio">Open Portfolio</Link></Button></Card>}
      <div className="grid xl:grid-cols-2 gap-4">{rows.map(p=>{const w=work.data?.get(p.id);return <Card key={p.id} className="p-4 space-y-4">
        <BrandIdentity id={p.id} name={p.name}/>
        <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-muted-foreground">Recorded score</p><p className="text-2xl font-bold">{p.overall??'Not measured'}{p.overall!=null?' / 100':''}</p>{p.overallWoW!=null&&<p className="text-sm">{p.overallWoW>0?'+':''}{p.overallWoW} points from the prior week</p>}</div><div><p className="text-sm text-muted-foreground">Revenue recorded for month</p><p className="text-2xl font-bold">{p.monthRevenue==null?'Not entered':p.monthRevenue.toLocaleString(undefined,{style:'currency',currency:'USD'})}</p></div></div>
        <ScoreDataStatus coverage={p.coverage}/>
        {mode==='weekly'&&p.pillars.length>0&&<ul className="divide-y">{p.pillars.map(pillar=><li key={pillar.key} className="py-2 flex justify-between gap-2"><span>{pillar.label}</span><strong>{pillar.score??'Not measured'}</strong></li>)}</ul>}
        <section className="border-t pt-3 space-y-2"><h2 className="text-lg font-bold">Next steps</h2>
          {p.overall==null&&<p>No score is recorded for this reporting period. <Link className="text-primary underline" to={`/project/${p.id}?tab=overview`}>Review measurements</Link></p>}
          {p.monthRevenue==null&&<p>Revenue has not been entered. <Link className="text-primary underline" to="/revenue" onClick={()=>{const b=accessibleBars.find(b=>b.id===p.id);if(b)setSelectedBar(b)}}>Record channel revenue</Link></p>}
          {w?<><p>{w.waitingCount} items waiting on you · {w.channelsStale} channels behind their cadence.</p>{w.channelsTotal===0&&<p><Link className="text-primary underline" to={`/project/${p.id}?tab=channels`}>Add the brand’s channels</Link> to begin tracking publishing.</p>}<p>{w.nextMove??'Review the workspace to choose the next piece of work.'}</p></>:<p className="text-muted-foreground">{work.isError?'Activity unavailable.':work.isLoading?'Loading current activity…':'No current activity loaded.'}</p>}
        </section>
        <Button asChild variant="outline"><Link to={`/project/${p.id}?tab=overview`}>Open brand workspace →</Link></Button>
      </Card>})}</div>
    </>}
    {!selectedBar&&clients.length>0&&<section className="hq-section space-y-3" data-hq-section="clients"><h2 className="text-xl font-bold">Client reports</h2><p>Choose a client to open its operating scorecard and insights.</p><div className="flex flex-wrap gap-2">{clients.map(c=><Button key={c.id} variant="outline" onClick={()=>{const bar=accessibleBars.find(b=>b.id===c.id);if(bar)setSelectedBar(bar)}}>{c.name}</Button>)}</div></section>}
  </div>;
}
