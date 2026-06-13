import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageKey, PAGE_CONFIG } from '@/types/permissions';
import { useUserPagePermissions } from '@/hooks/usePagePermissions';

interface UserPagePermissionsProps {
  userId: string;
  permissions: Record<PageKey, boolean>;
  onChange: (permissions: Record<PageKey, boolean>) => void;
}

export const UserPagePermissions = ({ 
  userId, 
  permissions, 
  onChange 
}: UserPagePermissionsProps) => {
  const { data: existingPermissions, isLoading } = useUserPagePermissions(userId);
  const [initialized, setInitialized] = useState(false);

  // Initialize permissions from database when component loads
  useEffect(() => {
    if (existingPermissions && !initialized) {
      const newPermissions = { ...permissions };
      
      // Start with all enabled
      PAGE_CONFIG.forEach(page => {
        newPermissions[page.key] = true;
      });

      // Apply disabled permissions from database
      existingPermissions.forEach(perm => {
        if (!perm.enabled) {
          newPermissions[perm.page_key as PageKey] = false;
        }
      });

      onChange(newPermissions);
      setInitialized(true);
    }
  }, [existingPermissions, initialized, onChange, permissions]);

  const handleToggle = (pageKey: PageKey, enabled: boolean) => {
    onChange({
      ...permissions,
      [pageKey]: enabled,
    });
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Loading permissions...
      </div>
    );
  }

  // Group pages by section
  const mainPages = PAGE_CONFIG.filter(p => 
    ['dashboard', 'weekly_review', 'insights'].includes(p.key)
  );
  const pillarPages = PAGE_CONFIG.filter(p => 
    ['sales', 'labor', 'operations', 'guest_experience'].includes(p.key)
  );
  const toolPages = PAGE_CONFIG.filter(p => 
    ['tasks', 'logs', 'social_media', 'marketing'].includes(p.key)
  );

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-foreground">Page Access</div>
      <p className="text-xs text-muted-foreground">
        Control which pages this user can see and access
      </p>

      {/* Main Pages */}
      <div className="space-y-3">
        {mainPages.map(page => (
          <div key={page.key} className="flex items-center justify-between">
            <Label 
              htmlFor={`page-${page.key}`} 
              className={!page.canDisable ? 'text-muted-foreground' : ''}
            >
              {page.label}
              {!page.canDisable && (
                <span className="ml-2 text-xs text-muted-foreground">(always on)</span>
              )}
            </Label>
            <Switch
              id={`page-${page.key}`}
              checked={permissions[page.key] ?? true}
              onCheckedChange={(checked) => handleToggle(page.key, checked)}
              disabled={!page.canDisable}
            />
          </div>
        ))}
      </div>

      <Separator />

      {/* Pillar Pages */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Pillars
        </div>
        {pillarPages.map(page => (
          <div key={page.key} className="flex items-center justify-between">
            <Label htmlFor={`page-${page.key}`}>{page.label}</Label>
            <Switch
              id={`page-${page.key}`}
              checked={permissions[page.key] ?? true}
              onCheckedChange={(checked) => handleToggle(page.key, checked)}
            />
          </div>
        ))}
      </div>

      <Separator />

      {/* Tool Pages */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Tools
        </div>
        {toolPages.map(page => (
          <div key={page.key} className="flex items-center justify-between">
            <Label htmlFor={`page-${page.key}`}>{page.label}</Label>
            <Switch
              id={`page-${page.key}`}
              checked={permissions[page.key] ?? true}
              onCheckedChange={(checked) => handleToggle(page.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
