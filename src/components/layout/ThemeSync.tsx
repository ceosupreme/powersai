import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useUserPreferences } from '@/hooks/useUserPreferences';

/**
 * Applies the user's persisted theme preference once it loads.
 * Runs inside auth/query providers so it has access to the current user.
 */
export const ThemeSync = () => {
  const { preferences } = useUserPreferences();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (preferences?.theme && preferences.theme !== theme) {
      setTheme(preferences.theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences?.theme]);

  return null;
};