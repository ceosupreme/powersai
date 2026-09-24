import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackSiteEvent } from "@/lib/studioAnalytics";
import { cn } from "@/lib/utils";

export function BookingCta({ className, src: srcOverride, biz: bizOverride }: { className?: string; src?: string | null; biz?: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: bookingUrl = "" } = useQuery({
    queryKey: ["site-settings", "booking_url"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "booking_url").maybeSingle();
      if (error) throw error;
      return data?.value?.trim() ?? "";
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const activate = () => {
    const params = new URLSearchParams(location.search);
    const src = srcOverride ?? params.get("src");
    const biz = bizOverride ?? params.get("biz");
    if (bookingUrl) {
      trackSiteEvent({ event_type: "cta_click", label: "book_call" });
      window.open(bookingUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const next = new URLSearchParams();
    if (src) next.set("src", src);
    if (biz) next.set("biz", biz);
    next.set("call_requested", "1");
    trackSiteEvent({ event_type: "call_request", label: "request_call" });
    navigate(`/?${next.toString()}#contact`);
  };

  return (
    <Button type="button" onClick={activate} className={cn("studio-btn studio-btn-outline", className)}>
      <CalendarDays aria-hidden size={16} /> {bookingUrl ? "Book 15 minutes" : "Request a call"}
    </Button>
  );
}