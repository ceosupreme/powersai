import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { updatePreferences } = useUserPreferences();

  const apply = (next: 'light' | 'dark' | 'system') => {
    setTheme(next);
    updatePreferences({ theme: next });
  };

  const isDark = (resolvedTheme ?? theme) === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => apply('light')}>
          <Sun className="mr-2 h-4 w-4" /> Light
          {theme === 'light' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => apply('dark')}>
          <Moon className="mr-2 h-4 w-4" /> Dark
          {theme === 'dark' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => apply('system')}>
          <Monitor className="mr-2 h-4 w-4" /> System
          {theme === 'system' && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};