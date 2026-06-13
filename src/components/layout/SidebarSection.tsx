import { ReactNode } from 'react';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
}

export const SidebarSection = ({ title, children }: SidebarSectionProps) => {
  return (
    <div className="space-y-1">
      <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
};
