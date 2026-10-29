// Integration kill-switch. A missing/failed configuration read never enables a
// provider. Fresh reads are cached briefly; a previously disabled integration
// stays disabled during an outage, while an unknown enabled state returns 503.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TTL_MS = 60_000;
let cache: { at: number; list: string[] } | null = null;

export class IntegrationConfigUnavailable extends Error {
  constructor() { super('Integration configuration unavailable'); this.name = 'IntegrationConfigUnavailable'; }
}

async function getList(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.list;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await supabase.from('app_config').select('value')
      .eq('key', 'integrations_disabled').abortSignal(AbortSignal.timeout(8_000)).maybeSingle();
    if (error || !Array.isArray(data?.value) || !data.value.every((name: unknown) => typeof name === 'string')) {
      throw new IntegrationConfigUnavailable();
    }
    const list = data.value as string[];
    cache = { at: Date.now(), list };
    return list;
  } catch {
    throw new IntegrationConfigUnavailable();
  }
}

export async function isDisabled(name: string): Promise<boolean> {
  try { return (await getList()).includes(name); }
  catch (error) {
    // Stale knowledge may safely keep a provider off; it cannot turn one on.
    if (cache?.list.includes(name)) return true;
    throw error;
  }
}

export function disabledResponse(name: string, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ disabled: true, integration: name, message: `Integration "${name}" is disabled.` }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/** A response stops provider work; null means a fresh successful read allows it. */
export async function guardIntegration(
  name: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  try { return (await isDisabled(name)) ? disabledResponse(name, corsHeaders) : null; }
  catch {
    return new Response(JSON.stringify({ error: 'integration_configuration_unavailable', integration: name }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }
}
