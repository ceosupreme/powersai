import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Target, Bot, Mail, Star, ShieldCheck, Download, HelpCircle, Package, Package2 } from 'lucide-react';
import { SettingsBarsTab } from './SettingsBarsTab';
import { SettingsTargetsTab } from './SettingsTargetsTab';
// Hidden from Settings UI (Phase C). SettingsSyncTab/SculptureUploadTab/ManualDataUploadTab/DataAuditTab
// are preserved on disk as reusable upload/ingest infrastructure — do not delete.
import { AutoApproveSettingsCard } from './AutoApproveSettingsCard';
import { DailyFlashSettingsCard } from './DailyFlashSettingsCard';
import { GoogleRatingOverrideCard } from './GoogleRatingOverrideCard';
import { SettingsComplianceTab } from './SettingsComplianceTab';
import { SettingsBackupTab } from './SettingsBackupTab';
import { SettingsHelpTab } from './SettingsHelpTab';
import { SettingsAutomationBundlesTab } from './SettingsAutomationBundlesTab';
import { SettingsServiceCatalogTab } from './SettingsServiceCatalogTab';

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
          <span className="hidden sm:inline">Projects</span>
        </TabsTrigger>
        <TabsTrigger value="targets" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">Targets</span>
        </TabsTrigger>
        <TabsTrigger value="auto-approve" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Bot className="h-4 w-4" />
          <span className="hidden sm:inline">Auto-Approve</span>
        </TabsTrigger>
        <TabsTrigger value="daily-flash" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Daily Flash</span>
        </TabsTrigger>
        <TabsTrigger value="google-ratings" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Online Ratings</span>
        </TabsTrigger>
        <TabsTrigger value="compliance" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <ShieldCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Compliance</span>
        </TabsTrigger>
        <TabsTrigger value="bundles" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Automation Bundles</span>
        </TabsTrigger>
        <TabsTrigger value="service-catalog" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Package2 className="h-4 w-4" />
          <span className="hidden sm:inline">Service Catalog</span>
        </TabsTrigger>
        <TabsTrigger value="backup" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Backup & Export</span>
        </TabsTrigger>
        <TabsTrigger value="help" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Help & Guidance</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="bars"><SettingsBarsTab /></TabsContent>
      <TabsContent value="targets"><SettingsTargetsTab /></TabsContent>
      <TabsContent value="auto-approve"><AutoApproveSettingsCard /></TabsContent>
      <TabsContent value="daily-flash"><DailyFlashSettingsCard /></TabsContent>
      <TabsContent value="google-ratings"><GoogleRatingOverrideCard /></TabsContent>
      <TabsContent value="compliance"><SettingsComplianceTab /></TabsContent>
      <TabsContent value="bundles"><SettingsAutomationBundlesTab /></TabsContent>
      <TabsContent value="service-catalog"><SettingsServiceCatalogTab /></TabsContent>
      <TabsContent value="backup"><SettingsBackupTab /></TabsContent>
      <TabsContent value="help"><SettingsHelpTab /></TabsContent>
    </Tabs>
  );
};
