// Phase 1 integration kill-switch. Reads app_config.integrations_disabled
// (a JSON string array) via the service role and caches it briefly.
// Edge functions wrap their handler in `if (await isDisabled('toast')) ...`
// to short-circuit before any external HTTP call.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TTL_MS = 60_000;
let cache: { at: number; list: string[] } | null = null;

async function getList(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.list;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'integrations_disabled')
      .maybeSingle();
    const list = Array.isArray(data?.value) ? (data!.value as string[]) : [];
    cache = { at: Date.now(), list };
    return list;
  } catch (_e) {
    return cache?.list ?? [];
  }
}

export async function isDisabled(name: string): Promise<boolean> {
  const list = await getList();
  return list.includes(name);
}

export function disabledResponse(name: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ disabled: true, integration: name, message: `Integration "${name}" is disabled.` }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// Convenience guard. Returns a Response if disabled, null otherwise.
export async function guardIntegration(
  name: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  return (await isDisabled(name)) ? disabledResponse(name, corsHeaders) : null;
}