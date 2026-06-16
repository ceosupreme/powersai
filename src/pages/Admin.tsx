import { Navigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

import { UsersTab } from '@/components/admin/UsersTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { Users, ShieldCheck, Settings, Lock, Sparkles, Megaphone, Layers } from 'lucide-react';
import { RolePageDefaults } from '@/components/admin/RolePageDefaults';
import { GrowthAuditLaunchTab } from '@/components/admin/GrowthAuditLaunchTab';
import { MarketingHubLaunchTab } from '@/components/admin/MarketingHubLaunchTab';
import { SettingsPillarsTab } from '@/components/admin/SettingsPillarsTab';

const Admin = () => {
  const { isAdmin, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';
  const setActiveTab = (value: string) => setSearchParams({ tab: value });

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent relative z-10" />
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3 animate-fade-in-up">
          <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground text-sm">
              Manage users, roles, and project access.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 animate-fade-in-up stagger-1">
          <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 w-full sm:w-auto">
            <TabsTrigger 
              value="users" 
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="permissions" 
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            <TabsTrigger
              value="growth-audit"
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Growth Audit</span>
            </TabsTrigger>
            <TabsTrigger
              value="marketing-hub"
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Marketing Hub</span>
            </TabsTrigger>
            <TabsTrigger
              value="pillars"
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Pillars</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 animate-fade-in-up">
            <UsersTab />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 animate-fade-in-up">
            <RolePageDefaults />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 animate-fade-in-up">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="growth-audit" className="space-y-4 animate-fade-in-up">
            <GrowthAuditLaunchTab />
          </TabsContent>

          <TabsContent value="marketing-hub" className="space-y-4 animate-fade-in-up">
            <MarketingHubLaunchTab />
          </TabsContent>

          <TabsContent value="pillars" className="space-y-4 animate-fade-in-up">
            <SettingsPillarsTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Admin;
