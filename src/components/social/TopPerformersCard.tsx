import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Trophy, Eye, Heart, MessageCircle, ExternalLink } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { SocialMediaPost, SocialPlatform, SocialPostType } from '@/types/venue';

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4 text-[#E1306C]" />,
  'Facebook': <Facebook className="h-4 w-4 text-[#1877F2]" />,
  'TikTok': <span className="text-sm font-bold">♪</span>,
  'Google Business': <span className="text-sm font-bold text-[#4285F4]">G</span>,
  'Yelp': <span className="text-sm font-bold text-[#D32323]">Y</span>,
};

const postTypeBadgeColors: Record<SocialPostType, string> = {
  'Photo': 'bg-blue/20 text-blue border-blue/30',
  'Video': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Reel': 'bg-[#E1306C]/20 text-[#E1306C] border-[#E1306C]/30',
  'Story': 'bg-gold/20 text-gold border-gold/30',
  'Carousel': 'bg-signal-green/20 text-signal-green border-signal-green/30',
  'Text': 'bg-muted text-muted-foreground border-border',
};

interface TopPerformersCardProps {
  posts: SocialMediaPost[];
}

export const TopPerformersCard = ({ posts }: TopPerformersCardProps) => {
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);

  // Sort by reach and take top 5
  const topPosts = [...posts]
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 5);

  const truncateContent = (content: string | undefined | null, maxLength = 60): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-gold" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPosts.length > 0 ? (
            <div className="space-y-3">
              {topPosts.map((post, index) => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="w-full text-left p-3 rounded-lg bg-card hover:bg-muted/50 border border-border transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      index === 0 && "bg-gold/20 text-gold",
                      index === 1 && "bg-muted text-muted-foreground",
                      index === 2 && "bg-orange/20 text-orange",
                      index > 2 && "bg-card text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {platformIcons[post.platform]}
                        <span className="text-sm text-foreground truncate">
                          "{truncateContent(post.content)}"
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", postTypeBadgeColors[post.post_type])}>
                          {post.post_type}
                        </Badge>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(post.reach)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatNumber(post.likes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {formatNumber(post.comments)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Log your first post to see top performers
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPost && platformIcons[selectedPost.platform]}
              Post Details
            </DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn(postTypeBadgeColors[selectedPost.post_type])}>
                  {selectedPost.post_type}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(selectedPost.post_date).toLocaleDateString()}
                </span>
              </div>

              <p className="text-foreground whitespace-pre-wrap">
                {selectedPost.content}
              </p>

              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(selectedPost.reach)}
                  </div>
                  <div className="text-xs text-muted-foreground">Reach</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {formatNumber(selectedPost.impressions)}
                  </div>
                  <div className="text-xs text-muted-foreground">Impressions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {selectedPost.views ? formatNumber(selectedPost.views) : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-card rounded-lg border border-border">
                  <Heart className="h-4 w-4 mx-auto mb-1 text-destructive" />
                  <div className="font-semibold">{formatNumber(selectedPost.likes)}</div>
                  <div className="text-xs text-muted-foreground">Likes</div>
                </div>
                <div className="text-center p-2 bg-card rounded-lg border border-border">
                  <MessageCircle className="h-4 w-4 mx-auto mb-1 text-blue" />
                  <div className="font-semibold">{formatNumber(selectedPost.comments)}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </div>
                <div className="text-center p-2 bg-card rounded-lg border border-border">
                  <span className="text-lg">↗</span>
                  <div className="font-semibold">{formatNumber(selectedPost.shares)}</div>
                  <div className="text-xs text-muted-foreground">Shares</div>
                </div>
                <div className="text-center p-2 bg-card rounded-lg border border-border">
                  <span className="text-lg">🔖</span>
                  <div className="font-semibold">{formatNumber(selectedPost.saves)}</div>
                  <div className="text-xs text-muted-foreground">Saves</div>
                </div>
              </div>

              {selectedPost.post_url && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={selectedPost.post_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Original Post
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
