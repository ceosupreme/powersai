import { guardEdgeRequest } from '../_shared/auth-guard.ts';
// Reads follower numbers from one social-profile screenshot with Lovable AI.
// Admin only (guard verifies the JWT and has_role admin). No database writes;
// the image is never stored.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MODEL = 'google/gemini-2.5-flash';
const PLATFORMS = ['facebook_page', 'facebook_profile', 'instagram', 'threads', 'tiktok', 'youtube', 'pinterest', 'x', 'linkedin', 'twitch', 'spotify', 'website', 'other'];
const NUM_FIELDS = ['followers', 'following', 'posts', 'videos', 'views', 'likes'] as const;
const MAX_IMAGE_CHARS = 8_000_000;

/** "154K" -> 154000, "19.2K" -> 19200, "1.2M" -> 1200000, "1,234" -> 1234. */
export function parseShorthand(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
  if (typeof v !== 'string') return null;
  const m = v.trim().replace(/,/g, '').match(/^([\d.]+)\s*([kmb])?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] ?? '').toLowerCase() as 'k' | 'm' | 'b'] ?? 1;
  return Math.round(n * mult);
}

const strOrNull = { type: ['string', 'null'] };
const TOOL = {
  type: 'function',
  function: {
    name: 'report_accounts',
    description: 'Report every social or web account visible in the screenshot.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['accounts'],
      properties: {
        accounts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['platform', 'handle', 'display_name', ...NUM_FIELDS, 'bio', 'category'],
            properties: {
              platform: { type: 'string', enum: PLATFORMS },
              handle: strOrNull, display_name: strOrNull,
              ...Object.fromEntries(NUM_FIELDS.map((f) => [f, { type: ['string', 'null'], description: 'Exactly as shown, e.g. 154K, 19.2K, 1.2M, 1,234' }])),
              bio: strOrNull, category: strOrNull,
            },
          },
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  const __authDenied = await guardEdgeRequest(req, 'read-channel-screenshot');
  if (__authDenied) return __authDenied;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return json({ error: 'AI is not configured' }, 500);

  let body: { image?: unknown } = {};
  try { body = await req.json(); } catch { return json({ error: 'Send JSON with an image' }, 400); }
  const image = body.image;
  if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return json({ error: 'image must be a JPEG, PNG or WebP data URL under 6 MB' }, 400);
  }

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Lovable-AIG-SDK': 'fetch' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You read social media profile and analytics screenshots. Report only numbers you can actually see. Use null for anything not shown. Never guess.' },
        { role: 'user', content: [
          { type: 'text', text: 'List every account shown in this screenshot with its visible numbers.' },
          { type: 'image_url', image_url: { url: image } },
        ] },
      ],
      tools: [TOOL],
      tool_choice: { type: 'function', function: { name: 'report_accounts' } },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = 'The image could not be read';
    try { message = JSON.parse(text)?.error?.message ?? JSON.parse(text)?.message ?? message; } catch { /* keep default */ }
    if (res.status === 429) message = 'Too many requests right now. Wait a minute and try again.';
    if (res.status === 402) message = 'AI credits have run out for this workspace.';
    return json({ error: message }, res.status);
  }

  const data = await res.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  let parsed: any = null;
  try { parsed = call ? JSON.parse(call.function.arguments) : null; } catch { parsed = null; }
  if (!parsed || !Array.isArray(parsed.accounts)) return json({ error: 'No accounts could be read from this image' }, 422);

  const accounts = parsed.accounts.map((a: any) => ({
    platform: PLATFORMS.includes(a?.platform) ? a.platform : 'other',
    handle: typeof a?.handle === 'string' ? a.handle.trim() || null : null,
    display_name: typeof a?.display_name === 'string' ? a.display_name.trim() || null : null,
    ...Object.fromEntries(NUM_FIELDS.map((f) => [f, parseShorthand(a?.[f])])),
    bio: typeof a?.bio === 'string' ? a.bio : null,
    category: typeof a?.category === 'string' ? a.category : null,
  }));
  return json({ accounts });
});
