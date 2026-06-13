import { Card, CardContent } from '@/components/ui/card';
import { Instagram, Facebook, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { SocialAccount, WeeklySocialMetrics, SocialPlatform } from '@/types/venue';

// Platform configuration with icons and colors
const platformConfig: Record<SocialPlatform, { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  'Instagram': { 
    icon: <Instagram className="h-5 w-5" />, 
    color: 'text-[#E1306C]', 
    bgColor: 'bg-[#E1306C]/10',
    label: 'Instagram'
  },
  'Facebook': { 
    icon: <Facebook className="h-5 w-5" />, 
    color: 'text-[#1877F2]', 
    bgColor: 'bg-[#1877F2]/10',
    label: 'Facebook'
  },
  'TikTok': { 
    icon: <span className="text-lg font-bold">♪</span>, 
    color: 'text-foreground', 
    bgColor: 'bg-foreground/10',
    label: 'TikTok'
  },
  'Google Business': { 
    icon: <span className="text-lg font-bold">G</span>, 
    color: 'text-[#4285F4]', 
    bgColor: 'bg-[#4285F4]/10',
    label: 'Google'
  },
  'Yelp': { 
    icon: <span className="text-lg font-bold">Y</span>, 
    color: 'text-[#D32323]', 
    bgColor: 'bg-[#D32323]/10',
    label: 'Yelp'
  },
};

interface FollowerSummaryCardsProps {
  accounts: SocialAccount[];
  metrics: WeeklySocialMetrics[];
}

export const FollowerSummaryCards = ({ accounts, metrics }: FollowerSummaryCardsProps) => {
  const platforms: SocialPlatform[] = ['Instagram', 'Facebook', 'TikTok', 'Google Business'];

  const getFollowerData = (platform: SocialPlatform) => {
    const account = accounts.find(a => a.platform === platform);
    const metric = metrics.find(m => m.platform === platform);
    
    return {
      followers: account?.current_followers ?? metric?.followers_end ?? 0,
      change: metric?.followers_change ?? 0,
    };
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {platforms.map((platform) => {
        const config = platformConfig[platform];
        const data = getFollowerData(platform);
        const hasData = data.followers > 0;

        return (
          <Card key={platform} className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("p-2 rounded-lg", config.bgColor, config.color)}>
                  {config.icon}
                </div>
                <span className="font-medium text-sm text-muted-foreground">
                  {config.label}
                </span>
              </div>
              
              <div className="text-3xl font-bold text-foreground mb-2">
                {hasData ? formatNumber(data.followers) : '—'}
              </div>
              
              {hasData ? (
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full w-fit",
                  data.change > 0 && "bg-signal-green/20 text-signal-green",
                  data.change < 0 && "bg-destructive/20 text-destructive",
                  data.change === 0 && "bg-muted text-muted-foreground"
                )}>
                  {data.change > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : data.change < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {data.change > 0 ? '+' : ''}{formatNumber(data.change)} this week
                  </span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
