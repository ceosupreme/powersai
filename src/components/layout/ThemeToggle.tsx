import { Moon, Sun, Monitor, Type } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { HQ_TEXT_SIZES, useHqTextSize, type HqTextSize } from '@/hooks/useHqAppearance';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { updatePreferences } = useUserPreferences();
  const [textSize, setTextSize] = useHqTextSize();

  const apply = (next: 'light' | 'dark' | 'system') => {
    setTheme(next);
    updatePreferences({ theme: next });
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Display settings: theme and text size"
        >
          <Type className="h-5 w-5" />
          <span className="hidden lg:inline">Display</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Text size</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={textSize} onValueChange={v => setTextSize(v as HqTextSize)}>
          {HQ_TEXT_SIZES.map(s => <DropdownMenuRadioItem key={s.value} value={s.value}>{s.label}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
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
