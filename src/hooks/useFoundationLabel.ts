import { useApp } from '@/contexts/AppContext';
import { useProjectType } from '@/hooks/useEffectivePillars';
import { CLIENT_PROJECT_TYPE } from '@/lib/effectivePillars';

/**
 * The foundation audit is called "Money Lanes" for non-client projects
 * (own brands, channels, apps, offers) and keeps its canonical name for clients.
 */
export function useFoundationLabel(): string {
  const { selectedBar } = useApp();
  const { data: projectType } = useProjectType(selectedBar?.id ?? null);
  return projectType && projectType !== CLIENT_PROJECT_TYPE ? 'Money Lanes' : 'Foundation Audit';
}
