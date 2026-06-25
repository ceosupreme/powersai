import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, LayoutGrid, ListChecks, AlertCircle } from 'lucide-react';
import { FoundationOverview } from '@/components/foundation-audit/FoundationOverview';
import { FoundationCategoriesView } from '@/components/foundation-audit/FoundationCategoriesView';
import { FoundationGapsView } from '@/components/foundation-audit/FoundationGapsView';

const SUBVIEWS = [
  { value: 'overview', label: 'Overview', icon: LayoutGrid },
  { value: 'categories', label: 'Categories', icon: ListChecks },
  { value: 'gaps', label: 'Gaps', icon: AlertCircle },
];

const FoundationAudit = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('subtab') || 'overview';
  const setSubTab = (v: string) => setSearchParams({ subtab: v });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 animate-fade-in-up border-l-4 border-l-sky-500/70 pl-4">
        <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-500">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Foundation Audit</h1>
          <p className="text-muted-foreground text-sm">
            Per-project readiness score across legal, brand, web, Google, reviews, social, offers, and collateral.
          </p>
        </div>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4 animate-fade-in-up stagger-1">
        <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 flex-wrap h-auto overflow-x-auto">
          {SUBVIEWS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><FoundationOverview /></TabsContent>
        <TabsContent value="categories"><FoundationCategoriesView /></TabsContent>
        <TabsContent value="gaps"><FoundationGapsView /></TabsContent>
      </Tabs>
    </div>
  );
};

export default FoundationAudit;