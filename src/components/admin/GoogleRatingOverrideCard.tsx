import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Star, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Venue {
  id: string;
  name: string;
  google_place_id: string | null;
}

interface Snapshot {
  id: string;
  bar_id: string;
  snapshot_date: string;
  google_rating: number | null;
  google_review_count: number | null;
  yelp_rating: number | null;
  yelp_review_count: number | null;
}

export const GoogleRatingOverrideCard = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [latestSnapshot, setLatestSnapshot] = useState<Snapshot | null>(null);
  const [rating, setRating] = useState('');
  const [reviewCount, setReviewCount] = useState('');
  const [yelpRating, setYelpRating] = useState('');
  const [yelpReviewCount, setYelpReviewCount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      const { data } = await supabase
        .from('venues')
        .select('id, name, google_place_id')
        .eq('is_active', true)
        .order('name');
      setVenues((data as Venue[]) || []);
      setIsLoading(false);
    };
    fetchVenues();
  }, []);

  useEffect(() => {
    if (!selectedVenue) {
      setLatestSnapshot(null);
      setRating('');
      setReviewCount('');
      setYelpRating('');
      setYelpReviewCount('');
      return;
    }
    const fetchSnapshot = async () => {
      const { data } = await supabase
        .from('review_snapshots')
        .select('*')
        .eq('bar_id', selectedVenue)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestSnapshot(data as Snapshot | null);
      setRating(data?.google_rating?.toString() || '');
      setReviewCount(data?.google_review_count?.toString() || '');
      setYelpRating(data?.yelp_rating?.toString() || '');
      setYelpReviewCount(data?.yelp_review_count?.toString() || '');
    };
    fetchSnapshot();
  }, [selectedVenue]);

  const handleSave = async () => {
    if (!selectedVenue) return;
    setIsSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const payload: any = {
        bar_id: selectedVenue,
        snapshot_date: today,
        google_rating: rating ? parseFloat(rating) : null,
        google_review_count: reviewCount ? parseInt(reviewCount) : null,
        yelp_rating: yelpRating ? parseFloat(yelpRating) : null,
        yelp_review_count: yelpReviewCount ? parseInt(yelpReviewCount) : null,
      };

      if (latestSnapshot && latestSnapshot.snapshot_date === today) {
        const { error } = await supabase
          .from('review_snapshots')
          .update({
            google_rating: payload.google_rating,
            google_review_count: payload.google_review_count,
            yelp_rating: payload.yelp_rating,
            yelp_review_count: payload.yelp_review_count,
          })
          .eq('id', latestSnapshot.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('review_snapshots').insert(payload);
        if (error) throw error;
      }

      toast.success('Ratings saved');
      const { data } = await supabase
        .from('review_snapshots')
        .select('*')
        .eq('bar_id', selectedVenue)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatestSnapshot(data as Snapshot | null);
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-google-ratings');
      if (error) throw error;
      toast.success(`Synced ${data?.synced || 0} venue(s) from Google`);
      if (selectedVenue) {
        const { data: snap } = await supabase
          .from('review_snapshots')
          .select('*')
          .eq('bar_id', selectedVenue)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        setLatestSnapshot(snap as Snapshot | null);
        setRating(snap?.google_rating?.toString() || '');
        setReviewCount(snap?.google_review_count?.toString() || '');
        setYelpRating(snap?.yelp_rating?.toString() || '');
        setYelpReviewCount(snap?.yelp_review_count?.toString() || '');
      }
    } catch (e: any) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const combinedRating = (() => {
    const g = rating ? parseFloat(rating) : null;
    const y = yelpRating ? parseFloat(yelpRating) : null;
    if (g != null && y != null) return ((g + y) / 2).toFixed(2);
    if (g != null) return g.toFixed(1);
    if (y != null) return y.toFixed(1);
    return '—';
  })();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base sm:text-lg font-semibold">Online Ratings</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Google from API
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Select Venue</Label>
          <Select value={selectedVenue} onValueChange={setSelectedVenue}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a venue..." />
            </SelectTrigger>
            <SelectContent>
              {venues.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name} {v.google_place_id ? '' : '(no Place ID)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedVenue && (
          <>
            {latestSnapshot && (
              <p className="text-xs text-muted-foreground">
                Last snapshot: {latestSnapshot.snapshot_date} — Google: {latestSnapshot.google_rating ?? '—'} ({latestSnapshot.google_review_count ?? '—'} reviews) · Yelp: {latestSnapshot.yelp_rating ?? '—'} ({latestSnapshot.yelp_review_count ?? '—'} reviews)
              </p>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Google</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="google-rating">Rating</Label>
                  <Input
                    id="google-rating"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={e => setRating(e.target.value)}
                    placeholder="e.g. 4.3"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="google-review-count">Review Count</Label>
                  <Input
                    id="google-review-count"
                    type="number"
                    min="0"
                    value={reviewCount}
                    onChange={e => setReviewCount(e.target.value)}
                    placeholder="e.g. 245"
                  />
                </div>
              </div>

              <p className="text-sm font-medium text-foreground">Yelp</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="yelp-rating">Rating</Label>
                  <Input
                    id="yelp-rating"
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={yelpRating}
                    onChange={e => setYelpRating(e.target.value)}
                    placeholder="e.g. 4.0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yelp-review-count">Review Count</Label>
                  <Input
                    id="yelp-review-count"
                    type="number"
                    min="0"
                    value={yelpReviewCount}
                    onChange={e => setYelpReviewCount(e.target.value)}
                    placeholder="e.g. 180"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Combined Online Reputation: <span className="font-semibold text-foreground">{combinedRating}</span>
              </p>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
