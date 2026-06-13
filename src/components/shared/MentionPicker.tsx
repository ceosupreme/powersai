import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AtSign, Check, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VenueLeader {
  id: string;
  display_name: string;
  role_type: string;
  asana_gid: string | null;
}

const useVenueLeadership = (barId?: string) => {
  return useQuery({
    queryKey: ['venue-leadership-mention', barId],
    enabled: !!barId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<VenueLeader[]> => {
      if (!barId) return [];
      const { data, error } = await supabase
        .from('venue_leadership_contacts')
        .select('id, display_name, role_type, asana_gid')
        .eq('venue_id', barId)
        .eq('is_active', true)
        .not('asana_gid', 'is', null)
        .order('role_type', { ascending: true });
      if (error) throw error;
      return (data || []) as VenueLeader[];
    },
  });
};

interface MentionPickerProps {
  venueId?: string;
  value: string[]; // Asana GIDs
  onChange: (gids: string[]) => void;
  disabled?: boolean;
}

export const MentionPicker = ({ venueId, value, onChange, disabled }: MentionPickerProps) => {
  const [open, setOpen] = useState(false);
  const { data: leaders = [] } = useVenueLeadership(venueId);

  const gms = leaders.filter((l) => l.role_type === 'gm');
  const others = leaders.filter((l) => l.role_type !== 'gm');
  const ordered = [...gms, ...others];

  const toggle = (gid: string) => {
    if (value.includes(gid)) onChange(value.filter((g) => g !== gid));
    else onChange([...value, gid]);
  };

  const selectedLeaders = ordered.filter((l) => l.asana_gid && value.includes(l.asana_gid));

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">Notify on Asana (optional)</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || ordered.length === 0}
            className="w-full justify-between bg-muted/50 border-border/60 hover:bg-muted hover:border-border h-auto min-h-10 py-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <AtSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              {selectedLeaders.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  {ordered.length === 0 ? 'No Asana-linked leaders' : 'Mention people…'}
                </span>
              ) : (
                selectedLeaders.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 text-primary text-xs"
                  >
                    @{l.display_name}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (l.asana_gid) toggle(l.asana_gid);
                      }}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                ))
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-1 bg-card border-border z-50" align="start">
          {ordered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No venue leaders with linked Asana accounts.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {ordered.map((l) => {
                const checked = !!l.asana_gid && value.includes(l.asana_gid);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => l.asana_gid && toggle(l.asana_gid)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted text-left',
                      checked && 'bg-primary/10'
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="truncate">{l.display_name}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {l.role_type === 'gm' ? 'GM' : 'Lead'}
                      </span>
                    </span>
                    {checked && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
