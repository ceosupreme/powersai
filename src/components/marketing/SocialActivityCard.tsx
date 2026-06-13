import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Heart, MessageCircle, Repeat2, ExternalLink, Instagram, Facebook } from 'lucide-react';
import { WeeklySocialMetrics, SocialMediaPost, SocialPlatform } from '@/types/venue';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface SocialActivityCardProps {
  metrics: WeeklySocialMetrics[];
  posts: SocialMediaPost[];
}

const getPlatformIcon = (platform: SocialPlatform) => {
  switch (platform) {
    case 'Instagram':
      return Instagram;
    case 'Facebook':
      return Facebook;
    default:
      return Share2;
  }
};

const getPlatformColor = (platform: SocialPlatform) => {
  switch (platform) {
    case 'Instagram':
      return 'text-pink-400';
    case 'Facebook':
      return 'text-blue-400';
    case 'TikTok':
      return 'text-foreground';
    default:
      return 'text-muted-foreground';
  }
};

export const SocialActivityCard = ({ metrics, posts }: SocialActivityCardProps) => {
  // Calculate totals from metrics
  const totalPosts = metrics.reduce((sum, m) => sum + (m.posts_count || 0), 0);
  const totalEngagement = metrics.reduce(
    (sum, m) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0),
    0
  );
  
  // Get platform breakdown
  const platformBreakdown = metrics.reduce((acc, m) => {
    acc[m.platform] = (acc[m.platform] || 0) + (m.posts_count || 0);
    return acc;
  }, {} as Record<string, number>);

  // Get recent posts (max 3)
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
    .slice(0, 3);

  return (
    <Card className="card-metric animate-fade-in-up">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Social Media Activity
          </CardTitle>
          <Link to="/social-media">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-2xl font-bold text-primary">{totalPosts}</p>
            <p className="text-xs text-muted-foreground">Posts This Week</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-2xl font-bold text-signal-green">
              {totalEngagement.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Engagement</p>
          </div>
        </div>

        {/* Platform breakdown */}
        {Object.keys(platformBreakdown).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(platformBreakdown).map(([platform, count]) => {
              const Icon = getPlatformIcon(platform as SocialPlatform);
              return (
                <Badge 
                  key={platform}
                  variant="outline" 
                  className="flex items-center gap-1.5"
                >
                  <Icon className={cn("w-3.5 h-3.5", getPlatformColor(platform as SocialPlatform))} />
                  <span>{platform}: {count}</span>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Recent posts */}
        {recentPosts.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Recent Posts
            </h4>
            {recentPosts.map((post) => {
              const Icon = getPlatformIcon(post.platform);
              return (
                <div 
                  key={post.id}
                  className="p-2 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", getPlatformColor(post.platform))} />
                    <span className="text-xs text-muted-foreground">
                      {post.post_date ? format(parseISO(post.post_date), 'MMM d') : 'Unknown'}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {post.post_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-1 mb-1.5">
                    {post.content || 'No caption'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.comments || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" />
                      {post.shares || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No posts this week
          </p>
        )}
      </CardContent>
    </Card>
  );
};
