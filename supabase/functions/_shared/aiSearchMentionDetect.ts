// Two-pass mention detection used by ai-search-run.
// Pass 1: cheap heuristic substring/normalized matching.
// Pass 2: AI-verified disambiguation via Lovable AI Gateway, capped per-run.

const NORMALIZE = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export type Heuristic = {
  matched: boolean;            // confident substring/normalized match
  ambiguous: boolean;          // partial token overlap, needs verification
  position: number | null;     // ordinal position within recommendations list
  competitors: Array<{ name: string; position: number }>;
};

/**
 * Pass 1 heuristic. Looks at recommendation list items first (lines starting
 * with `1.`, `*`, `-`, etc.); falls back to whole-text search.
 */
export function heuristicDetect(
  responseText: string,
  venueName: string,
  venueAliases: string[] = [],
): Heuristic {
  const text = responseText || '';
  const candidates = [venueName, ...venueAliases].filter(Boolean).map(NORMALIZE);
  const norm = NORMALIZE(text);

  // Build ordered "items" list — bullet/numbered list lines.
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(?:\d+[.)]\s+|[*\-•]\s+)(.+)$/);
    if (m) items.push(m[1]);
  }
  const itemList = items.length ? items : lines;
  const normItems = itemList.map(NORMALIZE);

  // Strong match: any candidate appears as substring in normalized text.
  let matched = false;
  let position: number | null = null;
  for (const cand of candidates) {
    if (cand.length < 3) continue;
    if (norm.includes(cand)) {
      matched = true;
      const idx = normItems.findIndex((it) => it.includes(cand));
      if (idx >= 0) position = idx + 1;
      break;
    }
  }

  // Ambiguous: token-level partial overlap (e.g. "Park & Rec" partially mentioned).
  let ambiguous = false;
  if (!matched) {
    const tokenizedCands = candidates.map((c) => c.split(' ').filter((t) => t.length >= 4));
    for (const toks of tokenizedCands) {
      if (toks.length === 0) continue;
      const hit = toks.filter((t) => norm.includes(t)).length;
      if (hit >= 1 && hit / toks.length >= 0.4) {
        ambiguous = true;
        break;
      }
    }
  }

  // Top competitors = first ~3 list items that don't match the venue.
  const competitors = normItems.slice(0, 5)
    .map((it, i) => ({ raw: itemList[i], norm: it, position: i + 1 }))
    .filter((row) => !candidates.some((c) => c.length >= 3 && row.norm.includes(c)))
    .slice(0, 3)
    .map((row) => ({
      name: row.raw.replace(/^([\w'’&. ]{3,80}?)(?:[—:–\-–].*)?$/, '$1').trim().slice(0, 80),
      position: row.position,
    }));

  return { matched, ambiguous, position, competitors };
}

/**
 * Pass 2: ask Lovable AI Gateway to confirm whether the venue is recommended
 * in the response, with strict tool-call output. Returns null when the
 * verification budget is exhausted or the gateway errors.
 */
export async function aiVerifyMention(opts: {
  lovableKey: string;
  venueName: string;
  city: string | null;
  responseText: string;
}): Promise<{ mentioned: boolean; position: number | null } | null> {
  const { lovableKey, venueName, city, responseText } = opts;
  const prompt = `Is the venue "${venueName}"${city ? ` in ${city}` : ''} recommended (named, listed, or suggested) in the AI response below? Ignore mere passing references that aren't recommendations. If listed in a numbered/bulleted list, return its position (1-based); otherwise position is null.

AI response:
"""
${responseText.slice(0, 4000)}
"""`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You return only structured tool calls; no chatter.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'verify_mention',
            parameters: {
              type: 'object',
              properties: {
                mentioned: { type: 'boolean' },
                position: { type: ['integer', 'null'] },
              },
              required: ['mentioned'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'verify_mention' } },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const args = j?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return null;
    const parsed = JSON.parse(args);
    return {
      mentioned: !!parsed.mentioned,
      position: typeof parsed.position === 'number' ? parsed.position : null,
    };
  } catch {
    return null;
  }
}
