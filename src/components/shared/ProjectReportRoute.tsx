import { ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { useProjectType } from '@/hooks/useEffectivePillars';
import { projectGroup } from '@/hooks/usePortfolioData';
import BrandReports from '@/pages/BrandReports';
import { Button } from '@/components/ui/button';
export default function ProjectReportRoute({children,mode}:{children:ReactNode;mode:'weekly'|'insights'}) {
  const {selectedBar,isLoading} = useApp();
  const type = useProjectType(selectedBar?.id);
  if(isLoading || (selectedBar && type.isLoading)) return <p role="status">Loading report…</p>;
  if(selectedBar && type.isError) return <div role="alert">Could not determine the workspace type. <Button onClick={()=>type.refetch()}>Try again</Button></div>;
  if(selectedBar && projectGroup({project_type:type.data ?? null,is_prospect_shell:false})==='clients') return <>{children}</>;
  return <BrandReports mode={mode}/>;
}
