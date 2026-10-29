import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** A lease prevents overlapping cron/webhook attempts; its state survives process death. */
export async function claimWorker(sb: SupabaseClient, key: string) {
  const { data, error } = await sb.rpc("hq_claim_worker", { p_key: key });
  if (error) throw new Error(`worker_claim_failed: ${error.message}`);
  if (!data) return null;
  let state: Record<string, unknown> = data.state ?? {};
  return {
    get state() { return state; },
    async save(next: Record<string, unknown>, release = false) {
      const { data: saved, error: saveError } = await sb.rpc("hq_save_worker", {
        p_key: key, p_token: data.lease_token, p_state: next, p_release: release,
      });
      if (saveError || saved !== true) throw new Error(`worker_checkpoint_failed: ${saveError?.message ?? "lease lost"}`);
      state = next;
    },
    async release() {
      const { data: saved, error: saveError } = await sb.rpc("hq_save_worker", {
        p_key: key, p_token: data.lease_token, p_state: state, p_release: true,
      });
      if (saveError || saved !== true) throw new Error(`worker_release_failed: ${saveError?.message ?? "lease lost"}`);
    },
  };
}
