import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { UserRole, roleToLayout, roleToHomeRoute, ROLE_LABELS, LayoutType } from '@/types/roles';

interface PreviewContextType {
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  isPreview: boolean;
  previewLayout: LayoutType | null;
  previewRoleLabel: string | null;
  previewHomeRoute: string | null;
}

const PreviewContext = createContext<PreviewContextType>({
  previewRole: null,
  setPreviewRole: () => {},
  isPreview: false,
  previewLayout: null,
  previewRoleLabel: null,
  previewHomeRoute: null,
});

export const PreviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(null);

  const setPreviewRole = useCallback((role: UserRole | null) => {
    setPreviewRoleState(role);
  }, []);

  const value = useMemo(() => ({
    previewRole,
    setPreviewRole,
    isPreview: previewRole !== null,
    previewLayout: previewRole ? roleToLayout[previewRole] : null,
    previewRoleLabel: previewRole ? ROLE_LABELS[previewRole] : null,
    previewHomeRoute: previewRole ? roleToHomeRoute[previewRole] : null,
  }), [previewRole, setPreviewRole]);

  return (
    <PreviewContext.Provider value={value}>
      {children}
    </PreviewContext.Provider>
  );
};

export const usePreview = () => useContext(PreviewContext);
