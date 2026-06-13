import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Settings, Lock } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Bar {
  id: string;
  name: string;
  yelp_business_id?: string | null;
}

interface VenueConfigCardProps {
  bars: Bar[];
  selectedBarId: string | null;
  onSelectBar: (barId: string) => void;
  isLoading?: boolean;
}

export const VenueConfigCard = ({
  bars,
  selectedBarId,
  onSelectBar,
  isLoading,
}: VenueConfigCardProps) => {
  const hasTargets = (_barId: string) => true;
  const [yelpIds, setYelpIds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleSaveYelp = async (barId: string) => {
    const val = yelpIds[barId];
    if (val === undefined) return;
    setSaving(barId);
    const { error } = await supabase
      .from('venues')
      .update({ yelp_business_id: val || null } as any)
      .eq('id', barId);
    setSaving(null);
    if (error) {
      toast.error('Failed to save Yelp Business ID');
    } else {
      toast.success('Yelp Business ID saved');
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Venue Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
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
          <Building2 className="h-5 w-5 text-primary" />
          Venue Configuration
        </CardTitle>
        <CardDescription>
          Configure target thresholds for each venue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bars.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No venues found
          </p>
        ) : (
          bars.map((bar) => {
            const isConfigured = hasTargets(bar.id);
            const isSelected = selectedBarId === bar.id;
            const currentYelpId = yelpIds[bar.id] ?? bar.yelp_business_id ?? '';

            return (
              <div
                key={bar.id}
                className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-muted/50 hover:bg-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{bar.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isConfigured ? (
                          <Badge variant="outline" className="bg-gold/20 text-gold border-gold/30 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => onSelectBar(bar.id)}
                    className="gap-1"
                  >
                    <Settings className="h-4 w-4" />
                    Configure
                  </Button>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-2 pl-8">
                    <Input
                      placeholder="Yelp Business ID (e.g. aero-club-bar-san-diego)"
                      value={currentYelpId}
                      onChange={(e) => setYelpIds(prev => ({ ...prev, [bar.id]: e.target.value }))}
                      className="text-sm h-8"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      disabled={saving === bar.id}
                      onClick={() => handleSaveYelp(bar.id)}
                    >
                      {saving === bar.id ? 'Saving…' : 'Save Yelp'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
