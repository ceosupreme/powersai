# AI Recommendation Seat — six public sales pages

## Route
`/seat/:category` (e.g. `/seat/family-law`, `/seat/med-spa`), with optional town deep link `/seat/:category/:town` (e.g. `/seat/cosmetic-dentist/carmel-valley`) that pre-selects the town in the visual, the seat panel and the form. A seventh category is a new row, no code. `/for/legal` and `/for/medspa` are untouched. Why not `/for/...`: that route belongs to the other offer, so sharing it would mix the two in navigation, analytics and the sitemap.

Prospecting videos can link to the town URL, so the first screen already says "Del Mar" and the person's profession.

## Sections, in order
1. **The question** (first screen). Big headline from data, e.g. "Your next client just asked an AI who to hire in Del Mar. It didn't say your name." Below it, the AI answer visual (below). One button: "Check what the AI says about you".
2. **What it means.** Three short lines: who asks AI, that it names about three businesses, that the rest are invisible. No numbers unless the row supplies a sourced one.
3. **Why the AI picks who it picks.** Three plain cards: reviews on the sites it reads, credentials stated where it can find them, the same facts repeated everywhere. Category-specific wording (bar membership and certifications for attorneys, board certification for surgeons, CFP/fiduciary for advisors, licenses and project photos for builders).
4. **The first 90 days.** Timeline in three steps (days 1–30, 31–60, 61–90), each one sentence plus "what you'll see".
5. **One seat per town.** Seat availability panel (below).
6. **The price.** One card: install, monthly, six-month term, what's included, what we need from them. No checkout.
7. **Two angles** (only dentists and surgeons; shown when the row has them): side-by-side "Take a seat for one procedure" vs "Defend the seat you hold", each with its own button that tags the inquiry.
8. **Questions owners ask.** 5–7 FAQs per category, large type, open one at a time.
9. **Founder note.** Short Sean Powers line, since 2002, LinkedIn link — trust for older owners.
10. **One clear action.** Form: name, practice, phone or email, town (pre-filled), angle if relevant, "Claim the seat" or "Check the AI answer first". Lands in existing inquiries.

A sticky bottom button on phones repeats the one action.

## The AI answer visual
- A neutral "answer card", not any product: ivory card, charcoal text, a small copper sparkle mark of our own, label "An AI assistant's answer" (never ChatGPT/Gemini/Google styling or logos).
- Top: the question typed out in the visitor's words, with town and category filled in; it types itself once on load (static if reduced motion).
- Answer: three generic listings — "A Del Mar family law firm with 300+ reviews", etc., drawn from row text, never real names; shown as soft placeholders.
- Fourth line, faded, with a wine underline: "Your practice — not mentioned." This is the emotional beat.
- A small caption under it: "Illustration. Not a real AI answer." — honest and in readable size.
- Town chips under the card switch the town in the question (Del Mar / Carmel Valley / Solana Beach / Rancho Santa Fe).
- A second state appears in section 6 or after the 90 days: same card with "Your practice" now in slot one — before/after without a fake screenshot.

## Seat availability panel
- Four large town tiles in a 2×2 grid on phones. Each: town name, big word **Open** (copper) or **Taken** (charcoal, wine outline) or **Held for review** (amber, someone is mid-conversation).
- For dentists/surgeons, a taken general seat can still show "Open by procedure" with a short list (veneers, implants...).
- Line under it: "We take one business per category per town. When a town is taken, it stays taken while they are a client." Taken tiles offer "Join the waitlist" (same form, tagged).
- Never shows client names.

## Data shape (one new table, needs your approval)
`public.ai_seat_pages` — one row per category:
- `slug text unique`, `category_name text`, `is_published boolean`, `sort_order int`
- `meta_title`, `meta_description`, `share_image_url text`
- `hero_headline`, `hero_subhead`, `cta_primary_label`, `cta_secondary_label text`
- `answer_question_template text` (uses `{town}`), `answer_listings jsonb` (array of 3 strings), `answer_you_line text`
- `why_points jsonb` [{title, body}], `plan_90 jsonb` [{range, title, body, you_see}]
- `install_cents int`, `monthly_cents int`, `term_months int default 6`, `included jsonb` [string], `price_note text`
- `angles jsonb` nullable [{key: "challenger"|"defender", title, body, cta_label}]
- `faqs jsonb` [{q, a}], `founder_note text`, `updated_at`

`public.ai_seat_availability` — one row per category×town (so seat status edits are one-line updates):
- `page_slug text` FK, `town_slug text`, `town_name text`, `status text check (open|held|taken)`, `procedures_open jsonb` nullable, `sort_order`, unique(page_slug, town_slug)

RLS: public read of published rows, admin write. You edit with plain SQL updates.

Inquiries: reuse `submit-inbound-lead` unchanged — `project_type = 'ai_seat'`, `qualifier_data = {offer:'ai_recommendation_seat', category, town, angle, intent:'claim'|'answer_check'|'waitlist'}`, source `/seat/...`. Admin sees them in Inbound and Leads with a small "AI Seat · Med spa · Del Mar" badge (one-line display change).

## SEO and sharing
Each page prerendered with its own title/description/share image; sitemap adds every published category (and town URLs as canonical to the category page, to avoid six-times-four thin duplicates). Fallback share image generated in the existing share-card style if a row's field is empty.

## Where I'd differ
- **Town URLs**, so the video can link straight to "Carmel Valley veneers".
- **"Held" status**, so two prospects in the same town aren't both promised an open seat.
- **Answer check before claim** as the safer first step for older, cautious owners; the claim stays the main button.
- **Show "Illustration" label** — protects truthful-claims rule.
- **No guarantee wording**: "we work to get you named and keep you there", never "guaranteed #1". Price card says what's included, not outcomes.
- Not linked from main nav at first; reachable by video links, a footer "AI Recommendation Seat" link and the sitemap. Say if you want it in the header.
- Copy for all six rows drafted and loaded by me as starting text for you to edit, unless you'd rather load it yourself.

## Left out of v1
Running real AI answer checks on the page, live seat changes from Leads, checkout, Spanish versions.

## Rough credits
About 10–15 credits (tables, page, visual, panel, prerender/sitemap, inquiry badge, Guide, seed copy, phone/desktop checks).

## Next
The Drive files plan is ready and I'll show it again after this one.
