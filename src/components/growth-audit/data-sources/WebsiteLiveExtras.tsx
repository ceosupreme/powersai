// Inline panel for Website Crawler data source: shows mapping, last crawl,
// JS-heavy/persistent failure warnings, manual entry trigger, on-demand audit.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, AlertTriangle, CheckCircle2, Settings2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useWebsiteStatus, websiteStatusKey } from './useWebsiteStatus';
import { WebsiteManualEntryDrawer } from './WebsiteManualEntryDrawer';

type Props = { venueId: string; venueName: string };

export const WebsiteLiveExtras = ({ venueId, venueName }: Props) => {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useWebsiteStatus(venueId);
  const [open, setOpen] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const qc = useQueryClient();

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const { error } = await supabase.functions.invoke('website-crawl-weekly', {
        body: { venue_id: venueId },
      });
      if (error) throw error;
      toast.success('Crawl dispatched');
      qc.invalidateQueries({ queryKey: websiteStatusKey(venueId) });
    } catch (e) {
      toast.error('Crawl failed', { description: (e as Error).message });
    } finally {
      setCrawling(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin inline mr-2" />
        Checking website crawl for {venueName}…
      </Card>
    );
  }

  const mapping = data?.mapping;
  const weekly = data?.weekly;
  const failures = mapping?.consecutive_fetch_failures ?? 0;

  return (
    <>
      <Card className="p-4 border-l-4 border-l-indigo-500/60">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
            <Globe className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-foreground">Website Crawler · {venueName}</h4>
              <Badge variant="outline" className="text-[10px]">{data?.status ?? 'Not Connected'}</Badge>
              {weekly && (
                <Badge variant="outline" className="text-[10px] bg-muted/40">
                  {weekly.discovered_page_count ?? 0} pages · {data?.lastSyncLabel}
                </Badge>
              )}
              {mapping?.cms_detected && (
                <Badge variant="outline" className="text-[10px]">{mapping.cms_detected}</Badge>
              )}
            </div>

            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {mapping?.canonical_url ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="font-mono truncate">{mapping.canonical_url}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  No website URL configured — automated crawl disabled.
                </div>
              )}
              {mapping?.js_heavy && (
                <div className="flex items-center gap-1.5 text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  JavaScript-heavy site — server HTML is minimal. Manual entry recommended.
                </div>
              )}
              {failures >= 3 && (
                <div className="flex items-center gap-1.5 text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  {failures} consecutive fetch failures.
                  {mapping?.last_resolve_error ? ` Last error: ${mapping.last_resolve_error}` : ''}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
                <Settings2 className="w-3 h-3" />
                Manual Entry
              </Button>
              {isAdmin && mapping?.canonical_url && (
                <Button size="sm" variant="ghost" disabled={crawling} onClick={handleCrawl} className="gap-1.5">
                  {crawling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Crawl Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <WebsiteManualEntryDrawer
        open={open}
        onOpenChange={setOpen}
        venueId={venueId}
        venueName={venueName}
      />
    </>
  );
};
