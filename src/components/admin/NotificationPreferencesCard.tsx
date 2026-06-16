// Unmounted/unused (Phase C). Bar-era or not-yet-wired — deletion decision deferred to a later pass.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, AlertTriangle, Brain, FileText } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export const NotificationPreferencesCard = () => {
  const { preferences, updatePreferences, isUpdating, isLoading } = useUserPreferences();

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const notifications = [
    {
      key: 'daily_summary_email' as const,
      label: 'Daily Summary Email',
      description: 'Receive a daily digest of your bar\'s performance',
      icon: Mail,
    },
    {
      key: 'labor_threshold_alerts' as const,
      label: 'Labor Threshold Alerts',
      description: 'Get notified when labor costs exceed targets',
      icon: AlertTriangle,
    },
    {
      key: 'ai_insight_notifications' as const,
      label: 'AI Insight Notifications',
      description: 'Receive AI-generated insights and recommendations',
      icon: Brain,
    },
    {
      key: 'weekly_report' as const,
      label: 'Weekly Report',
      description: 'Get a comprehensive weekly performance summary',
      icon: FileText,
    },
  ];

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive updates and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          const isChecked = preferences?.[notification.key] ?? true;

          return (
            <div 
              key={notification.key}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label 
                    htmlFor={notification.key} 
                    className="font-medium cursor-pointer"
                  >
                    {notification.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                </div>
              </div>
              <Switch
                id={notification.key}
                checked={isChecked}
                onCheckedChange={(checked) => handleToggle(notification.key, checked)}
                disabled={isUpdating}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
