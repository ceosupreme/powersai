// Hidden from Settings UI (Phase C). Preserved as reusable upload/ingest infrastructure — do not delete.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ReviewRow {
  id: string;
  venue_id: string;
  employee_name: string;
  email: string | null;
  toast_employee_guid: string | null;
  sevenshifts_user_id_int: number | null;
  source_systems: string[] | null;
  match_status: string;
}

interface VenueLookup { id: string; name: string }

export const EmployeeMatchingReviewCard = () => {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [venues, setVenues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: empRows }, { data: vRows }] = await Promise.all([
      supabase
        .from("employee_profiles")
        .select("id, venue_id, employee_name, email, toast_employee_guid, sevenshifts_user_id_int, source_systems, match_status")
        .in("match_status", ["unmatched", "no_match_in_other"]) as any,
      supabase.from("venues").select("id, name") as any,
    ]);
    setRows((empRows ?? []) as ReviewRow[]);
    const map: Record<string, string> = {};
    for (const v of (vRows ?? []) as VenueLookup[]) map[v.id] = v.name;
    setVenues(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markNoMatch = async (id: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from("employee_profiles")
      .update({
        match_status: "manual",
        match_method: "no_match",
        match_reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setSavingId(null);
    if (error) toast.error(error.message);
    else { toast.success("Marked as no match"); load(); }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Person Matching Review</CardTitle></CardHeader>
        <CardContent><Loader2 className="h-5 w-5 animate-spin text-primary" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Person Matching Review ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employees need review.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{r.employee_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {venues[r.venue_id] ?? r.venue_id} · {r.email ?? "no email"} ·{" "}
                    sources: {(r.source_systems ?? []).join(", ") || "—"}
                  </div>
                </div>
                <Badge variant="outline" className="mr-3 capitalize">{r.match_status.replace(/_/g, " ")}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingId === r.id}
                  onClick={() => markNoMatch(r.id)}
                >
                  {savingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark no match"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
