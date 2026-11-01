import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';

/** Selects this brand, then opens the HQ Brand kit page (which reads the selected brand). */
export function useOpenBrandKit(projectId: string) {
  const { bars, accessibleBars, setSelectedBar } = useApp();
  const navigate = useNavigate();
  return () => {
    const bar = [...accessibleBars, ...bars].find((b) => b.id === projectId);
    if (bar) setSelectedBar(bar);
    navigate('/brand-kit');
  };
}

export function BrandKitLink({ projectId, children = 'Open Brand kit', asButton }: { projectId: string; children?: React.ReactNode; asButton?: boolean }) {
  const open = useOpenBrandKit(projectId);
  if (asButton) return <Button size="sm" onClick={open}>{children}</Button>;
  return <button type="button" onClick={open} className="underline text-primary">{children}</button>;
}
