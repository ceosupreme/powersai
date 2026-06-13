import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Target, RefreshCw, Bot, Mail, Package, Upload, Star, FileSearch, ShieldCheck } from 'lucide-react';
import { SettingsBarsTab } from './SettingsBarsTab';
import { SettingsTargetsTab } from './SettingsTargetsTab';
import { SettingsSyncTab } from './SettingsSyncTab';
import { AutoApproveSettingsCard } from './AutoApproveSettingsCard';
import { DailyFlashSettingsCard } from './DailyFlashSettingsCard';
import { SculptureUploadTab } from './SculptureUploadTab';
import { ManualDataUploadTab } from './ManualDataUploadTab';
import { GoogleRatingOverrideCard } from './GoogleRatingOverrideCard';
import { DataAuditTab } from './DataAuditTab';
import { SettingsComplianceTab } from './SettingsComplianceTab';

export const SettingsTab = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('subtab') || 'bars';
  const setSubTab = (value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'settings');
      next.set('subtab', value);
      next.delete('mode');
      return next;
    });
  };

  return (
    <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
      <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 flex-wrap h-auto overflow-x-auto">
        <TabsTrigger value="bars" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">Bars</span>
        </TabsTrigger>
        <TabsTrigger value="targets" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">Targets</span>
        </TabsTrigger>
        <TabsTrigger value="sync" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Sync</span>
        </TabsTrigger>
        <TabsTrigger value="auto-approve" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">Auto-Approve</span>
        </TabsTrigger>
        <TabsTrigger value="daily-flash" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Daily Flash</span>
        </TabsTrigger>
        <TabsTrigger value="inventory" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Inventory</span>
        </TabsTrigger>
        <TabsTrigger value="data-upload" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Data Upload</span>
        </TabsTrigger>
        <TabsTrigger value="google-ratings" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Online Ratings</span>
        </TabsTrigger>
        <TabsTrigger value="data-audit" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <FileSearch className="h-4 w-4" />
          <span className="hidden sm:inline">Data Audit</span>
        </TabsTrigger>
        <TabsTrigger value="compliance" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Compliance</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bars"><SettingsBarsTab /></TabsContent>
      <TabsContent value="targets"><SettingsTargetsTab /></TabsContent>
      <TabsContent value="sync"><SettingsSyncTab /></TabsContent>
      <TabsContent value="auto-approve"><AutoApproveSettingsCard /></TabsContent>
      <TabsContent value="daily-flash"><DailyFlashSettingsCard /></TabsContent>
      <TabsContent value="inventory"><SculptureUploadTab /></TabsContent>
      <TabsContent value="data-upload"><ManualDataUploadTab /></TabsContent>
      <TabsContent value="google-ratings"><GoogleRatingOverrideCard /></TabsContent>
      <TabsContent value="data-audit"><DataAuditTab /></TabsContent>
      <TabsContent value="compliance"><SettingsComplianceTab /></TabsContent>
    </Tabs>
  );
};
