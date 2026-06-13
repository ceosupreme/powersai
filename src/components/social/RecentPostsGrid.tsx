import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Instagram, Facebook, Grid3X3, Eye, Heart, ExternalLink } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { SocialMediaPost, SocialPlatform, SocialPostType } from '@/types/venue';
import { EmptyState } from '@/components/shared/EmptyState';

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  'Instagram': <Instagram className="h-3.5 w-3.5 text-[#E1306C]" />,
  'Facebook': <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />,
  'TikTok': <span className="text-xs font-bold">♪</span>,
  'Google Business': <span className="text-xs font-bold text-[#4285F4]">G</span>,
  'Yelp': <span className="text-xs font-bold text-[#D32323]">Y</span>,
};

const postTypeBadgeColors: Record<SocialPostType, string> = {
  'Photo': 'bg-blue/20 text-blue border-blue/30',
  'Video': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Reel': 'bg-[#E1306C]/20 text-[#E1306C] border-[#E1306C]/30',
  'Story': 'bg-gold/20 text-gold border-gold/30',
  'Carousel': 'bg-signal-green/20 text-signal-green border-signal-green/30',
  'Text': 'bg-muted text-muted-foreground border-border',
};

interface RecentPostsGridProps {
  posts: SocialMediaPost[];
}

export const RecentPostsGrid = ({ posts }: RecentPostsGridProps) => {
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);

  // Sort by date and take last 9
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.post_date).getTime() - new Date(a.post_date).getTime())
    .slice(0, 9);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateContent = (content: string | undefined | null, maxLength = 40): string => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const PostCard = ({ post }: { post: SocialMediaPost }) => (
    <button
      onClick={() => setSelectedPost(post)}
      className="group relative aspect-square bg-muted rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all"
    >
      {post.thumbnail_url ? (
        <img 
          src={post.thumbnail_url} 
          alt="Post thumbnail" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-3 text-xs text-muted-foreground text-center leading-tight">
          {truncateContent(post.content)}
        </div>
      )}
      
      {/* Platform icon overlay */}
      <div className="absolute bottom-2 right-2 bg-background/80 rounded-full p-1.5 backdrop-blur-sm">
        {platformIcons[post.platform]}
      </div>

      {/* Hover overlay with stats */}
      <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {formatNumber(post.reach)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            {formatNumber(post.likes)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(post.post_date)}</span>
      </div>
    </button>
  );

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Recent Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPosts.length > 0 ? (
            <>
              {/* Desktop: 3x3 grid */}
              <div className="hidden md:grid grid-cols-3 gap-3">
                {recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              
              {/* Mobile: Horizontal scroll */}
              <div className="md:hidden">
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-4">
                    {recentPosts.map((post) => (
                      <div key={post.id} className="w-32 h-32 shrink-0">
                        <PostCard post={post} />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </>
          ) : (
            <EmptyState 
              message="No posts logged"
              title="No posts logged"
              description="Social media posts will appear here as they are tracked."
              icon={<Grid3X3 className="w-6 h-6 text-muted-foreground" />}
            />
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
              {selectedPost.thumbnail_url && (
                <img 
                  src={selectedPost.thumbnail_url} 
                  alt="Post" 
                  className="w-full rounded-lg"
                />
              )}
              
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

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-semibold">{formatNumber(selectedPost.reach)}</div>
                  <div className="text-xs text-muted-foreground">Reach</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Heart className="h-4 w-4 mx-auto mb-1 text-destructive" />
                  <div className="font-semibold">{formatNumber(selectedPost.likes)}</div>
                  <div className="text-xs text-muted-foreground">Likes</div>
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
