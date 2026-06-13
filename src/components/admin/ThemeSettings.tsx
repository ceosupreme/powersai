import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThemeSettings = () => {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sun className="h-5 w-5 text-primary" />
          Theme Preferences
        </CardTitle>
        <CardDescription>
          Choose how BarPulse looks for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            
            return (
              <Button
                key={option.value}
                variant="ghost"
                size="sm"
                onClick={() => setTheme(option.value)}
                className={cn(
                  'flex-1 gap-2 transition-all',
                  isActive 
                    ? 'bg-card shadow-sm text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
