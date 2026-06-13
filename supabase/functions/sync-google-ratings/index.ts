import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for deduplication
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!GOOGLE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse optional body for snapshot_date override
  let body: Record<string, any> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { /* empty body ok */ }
  }

  // Pacific time helpers
  function nowPacific(): Date {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  }
  function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Determine snapshot_date:
  // - If explicitly provided in body, use it
  // - If today is Monday (cron case), use yesterday (Sunday) to align with week_end
  // - Otherwise use today
  let snapshotDate: string;
  if (body.snapshot_date) {
    snapshotDate = body.snapshot_date;
  } else {
    const now = nowPacific();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon (Pacific)
    if (dayOfWeek === 1) {
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - 1);
      snapshotDate = formatDate(sunday);
      console.log(`Monday detected (Pacific) — using Sunday ${snapshotDate} as snapshot_date`);
    } else {
      snapshotDate = formatDate(now);
    }
  }

  try {
    // Get all active venues with a google_place_id
    const { data: venues, error: venueErr } = await supabase
      .from("venues")
      .select("id, name, google_place_id")
      .eq("is_active", true)
      .not("google_place_id", "is", null);

    if (venueErr) throw venueErr;

    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({ message: "No venues with Google Place IDs configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Syncing Google ratings for ${venues.length} venues, snapshot_date=${snapshotDate}`);

    const results: Array<{ venue: string; rating: number | null; reviews: number | null; new_reviews_stored: number; error?: string }> = [];

    for (const venue of venues) {
      try {
        const placeId = venue.google_place_id!.trim();
        // Include reviews in field mask
        const url = `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,reviews&key=${GOOGLE_API_KEY}`;

        const resp = await fetch(url);
        if (!resp.ok) {
          const errBody = await resp.text();
          results.push({ venue: venue.name, rating: null, reviews: null, new_reviews_stored: 0, error: `API ${resp.status}: ${errBody}` });
          continue;
        }

        const data = await resp.json();
        const rating = data.rating ?? null;
        const reviewCount = data.userRatingCount ?? null;

        // --- Compute rating_change vs previous snapshot ---
        let ratingChange: number | null = null;
        if (rating !== null) {
          const { data: prevSnapshot } = await supabase
            .from("review_snapshots")
            .select("google_rating")
            .eq("bar_id", venue.id)
            .lt("snapshot_date", snapshotDate)
            .not("google_rating", "is", null)
            .order("snapshot_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (prevSnapshot?.google_rating != null) {
            ratingChange = parseFloat((rating - prevSnapshot.google_rating).toFixed(2));
          }
        }

        // --- Upsert review_snapshots ---
        const { error: upsertErr } = await supabase
          .from("review_snapshots")
          .upsert(
            {
              bar_id: venue.id,
              snapshot_date: snapshotDate,
              google_rating: rating,
              google_review_count: reviewCount,
              rating_change: ratingChange,
            },
            { onConflict: "bar_id,snapshot_date" }
          );

        if (upsertErr) {
          // Fallback: try insert/update
          const { data: existing } = await supabase
            .from("review_snapshots")
            .select("id")
            .eq("bar_id", venue.id)
            .eq("snapshot_date", snapshotDate)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("review_snapshots")
              .update({ google_rating: rating, google_review_count: reviewCount, rating_change: ratingChange })
              .eq("id", existing.id);
          } else {
            await supabase.from("review_snapshots").insert({
              bar_id: venue.id,
              snapshot_date: snapshotDate,
              google_rating: rating,
              google_review_count: reviewCount,
              rating_change: ratingChange,
            });
          }
        }

        // --- Store individual reviews ---
        let newReviewsStored = 0;
        const apiReviews = data.reviews || [];
        for (const rev of apiReviews) {
          const authorName = rev.authorAttribution?.displayName || "Anonymous";
          const revRating = rev.rating ?? 0;
          const revText = rev.text?.text || rev.originalText?.text || "";
          const publishTime = rev.publishTime || null;

          // Generate dedup hash from bar_id + author + publishTime
          const hashInput = `${venue.id}|${authorName}|${publishTime || ""}`;
          const reviewHash = simpleHash(hashInput);

          const { error: revErr } = await supabase
            .from("google_reviews")
            .upsert(
              {
                bar_id: venue.id,
                snapshot_date: snapshotDate,
                author_name: authorName,
                rating: revRating,
                review_text: revText,
                publish_time: publishTime,
                review_hash: reviewHash,
              },
              { onConflict: "bar_id,review_hash", ignoreDuplicates: true }
            );

          if (!revErr) {
            newReviewsStored++;
          } else {
            // Duplicate — expected, not an error
            if (!revErr.message?.includes("duplicate")) {
              console.error(`Review insert error for ${venue.name}:`, revErr.message);
            }
          }
        }

        console.log(`${venue.name}: rating=${rating}, reviews=${reviewCount}, change=${ratingChange}, stored=${newReviewsStored} individual reviews`);
        results.push({ venue: venue.name, rating, reviews: reviewCount, new_reviews_stored: newReviewsStored });
      } catch (e: any) {
        results.push({ venue: venue.name, rating: null, reviews: null, new_reviews_stored: 0, error: e.message });
      }
    }

    // --- Yelp Rating Sync ---
    const YELP_API_KEY = Deno.env.get("YELP_API_KEY");
    const yelpResults: Array<{ venue: string; rating: number | null; reviews: number | null; error?: string }> = [];

    if (YELP_API_KEY) {
      const { data: yelpVenues, error: yelpVenueErr } = await supabase
        .from("venues")
        .select("id, name, yelp_business_id")
        .eq("is_active", true)
        .not("yelp_business_id", "is", null);

      if (yelpVenueErr) {
        console.error("Error fetching Yelp venues:", yelpVenueErr.message);
      } else if (yelpVenues && yelpVenues.length > 0) {
        console.log(`Syncing Yelp ratings for ${yelpVenues.length} venues`);

        for (const venue of yelpVenues) {
          try {
            const yelpId = venue.yelp_business_id!.trim();
            const yelpUrl = `https://api.yelp.com/v3/businesses/${encodeURIComponent(yelpId)}`;
            const yelpResp = await fetch(yelpUrl, {
              headers: { Authorization: `Bearer ${YELP_API_KEY.replace(/[^\x20-\x7E]/g, "").trim()}` },
            });

            if (!yelpResp.ok) {
              const errBody = await yelpResp.text();
              yelpResults.push({ venue: venue.name, rating: null, reviews: null, error: `Yelp API ${yelpResp.status}: ${errBody}` });
              continue;
            }

            const yelpData = await yelpResp.json();
            const yelpRating = yelpData.rating ?? null;
            const yelpReviewCount = yelpData.review_count ?? null;

            // Upsert into review_snapshots (row may already exist from Google sync)
            const { data: existing } = await supabase
              .from("review_snapshots")
              .select("id")
              .eq("bar_id", venue.id)
              .eq("snapshot_date", snapshotDate)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("review_snapshots")
                .update({ yelp_rating: yelpRating, yelp_review_count: yelpReviewCount })
                .eq("id", existing.id);
            } else {
              await supabase.from("review_snapshots").insert({
                bar_id: venue.id,
                snapshot_date: snapshotDate,
                yelp_rating: yelpRating,
                yelp_review_count: yelpReviewCount,
              });
            }

            console.log(`${venue.name}: yelp_rating=${yelpRating}, yelp_reviews=${yelpReviewCount}`);
            yelpResults.push({ venue: venue.name, rating: yelpRating, reviews: yelpReviewCount });
          } catch (e: any) {
            yelpResults.push({ venue: venue.name, rating: null, reviews: null, error: e.message });
          }
        }
      }
    } else {
      console.log("YELP_API_KEY not configured — skipping Yelp sync");
    }

    return new Response(
      JSON.stringify({ synced: results.length, snapshot_date: snapshotDate, results, yelp: yelpResults }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("sync-google-ratings error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
