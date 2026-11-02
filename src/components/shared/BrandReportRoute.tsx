import { type ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useProjectType } from '@/hooks/useEffectivePillars';
import { projectGroup } from '@/hooks/usePortfolioData';
export function BrandReportRoute({children,team=false}: {children:ReactNode;team?:boolean}) {
  const {selectedBar} = useApp();
  const type = useProjectType(selectedBar?.id);
  if(selectedBar && type.isLoading) return <p className="p-6">Loading project…</p>;
  if(selectedBar && type.isError) return <p role="alert" className="p-6">Could not load the project type. Please refresh.</p>;
  if(selectedBar && type.data && projectGroup({project_type:type.data,is_prospect_shell:false}) === 'brands') {
    if(team) return <div className="p-6 space-y-3"><h1 className="text-2xl font-semibold">Team</h1><p>Staff shift reports apply to operating locations. Manage this brand’s contributors through task assignments and Chat.</p><div className="flex gap-4"><Link className="text-primary underline" to="/tasks">Tasks</Link><Link className="text-primary underline" to="/chat">Chat</Link></div></div>;
    return <Navigate to={`/project/${selectedBar.id}?tab=overview`} replace />;
  }
  return <>{children}</>;
}
