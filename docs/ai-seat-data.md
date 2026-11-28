# AI Recommendation Seat: SQL content contract and publishing

## Public routes

`/seat/:category` uses `ai_seat_pages.slug`. `/seat/:category/:town` uses `ai_seat_availability.town_slug`. Both use the category canonical URL. Town pages preselect the question, availability and form. No navigation entries were added.

The only inserted content is an **unpublished `family-law` layout sample**. No town rows or real category offers were seeded. Overwrite its row or insert your own; preserve its `id` when attaching availability.

## Exact deployed columns

### public.ai_seat_pages

| Type | Columns |
|---|---|
| uuid | id |
| text | slug, category, status, offer, meta_title, meta_description, share_image_url, video_url, headline, question, meaning_title, meaning_body, why_title, ninety_days_title, seats_title, seats_body, price_title, install, monthly, term, price_note, faq_title, trust_title, trust_body, form_title, form_body |
| jsonb | answer_listings, labels, market_facts, why_points, ninety_days, included, requirements, angles, faqs |
| timestamp with time zone | created_at, updated_at |

`share_image_url`, `video_url`, `price_note` are nullable. Every other column is NOT NULL. Text defaults to empty text except required `slug`/`category`, `status='draft'`, `offer='ai_seat'`. Arrays default to `[]`; labels defaults to `{}`. IDs and timestamps have generated defaults. `slug` is unique.

Page `status`: **draft, published, archived**.

### public.ai_seat_availability

| Type | Columns |
|---|---|
| uuid | id, page_id |
| text | town, town_slug, status, note |
| jsonb | procedures |
| integer | sort_order |
| timestamp with time zone | created_at, updated_at |

All columns are NOT NULL. `page_id` references `ai_seat_pages.id`; `(page_id,town_slug)` is unique. `status='open'`, `procedures=[]`, `note=''`, `sort_order=0`; ID/timestamps have generated defaults. `page_id`, `town`, `town_slug` have no defaults.

Town `status`: **open, held, taken** (displayed Open, Held, Taken). Taken offers a waitlist; submitting never changes availability or claims a reservation.

## JSON values and labels

Use these shapes, preserving order:

```json
{
  "answer_listings": [{"name":"Generic listing", "description":"Generic description"}],
  "market_facts": [{"figure":"42%", "label":"Fact label", "source_name":"Source name", "source_url":"https://example.org/source"}],
  "why_points": [{"title":"Point title", "body":"Point explanation"}],
  "ninety_days": [{"title":"Stage title", "body":"Stage explanation"}],
  "included": ["Included item"],
  "requirements": ["Required item"],
  "angles": [{"key":"angle-key", "title":"Angle title", "body":"Angle explanation"}],
  "faqs": [{"question":"Owner question", "answer":"Answer"}],
  "procedures": ["Procedure name"]
}
```

Published pages need **exactly three generic listings**, a headline, title, description, and these nonempty labels: `assistant`, `illustration`, `missing`, `goal`, `practice`, `before`, `after`, `cta`, `waitlist`, `submit`, `success`, `error`.

Provide these additional labels for the relevant sections: `open_procedure`, `install`, `monthly`, `term`, `included`, `requirements`, `angles`, `claim`, `answer_check`, `consent`, `video`, `no_script`. All label values are strings. The sample row contains example labels, not approved sales copy. `question` substitutes `{category}` and `{town}`. Trust content is only `trust_title` and `trust_body`; no founder note is added.

`install`, `monthly`, `term` are **display text**, not calculated amounts. No checkout, guarantee, pause clause, founding-seat cap or results claim is inserted. Empty facts, angles, video and price-note fields produce no corresponding element or gap. HTTPS media URLs only; direct video, YouTube and Vimeo are supported. Share image fallback is `https://supremeteammedia.com/og-share.jpg`.

## SQL edits and no-JavaScript HTML

The existing public build runs `scripts/prerender-meta.mjs` after Vite. It reads fresh **published** Seat rows anonymously under RLS, creates category and town files with their own static title/description/share metadata, then `scripts/prerender-pages.py` saves the complete React-rendered HTML, including header/footer and all page text. FAQ answers are in HTML even while their disclosure is closed. FAQ JSON-LD is included. `scripts/seat-html.mjs` then refuses an incomplete Seat snapshot: headline, why points, prices, FAQ questions/answers and title/description must exist **outside scripts**. There is a 200-route Seat output limit.

This is **build-time HTML, not request-time rendering**. After loading the six categories and 24 towns, use **Publish → Update** to produce and release the first snapshot. After any later SQL copy, price, status, or availability edit, use **Publish → Update again**. No code edit is needed. Reloaded JavaScript-enabled pages read current rows immediately; script-free visitors and social crawlers receive the last published snapshot until Update completes. SQL changes alone do not refresh static HTML. Preview is a Vite development page and is not proof of published script-free HTML.

No-JavaScript reading, FAQ expansion and town links work in saved HTML. Inquiry submission requires JavaScript, matching the existing intake. No request-time rendering or automatic SQL-triggered publish was added. The company header/footer are reused unchanged, including their existing navigation and copy; row-only text applies to the new Seat content.

The sitemap is regenerated for published **category** pages only; town aliases are omitted. Archiving a category removes its sitemap entry on the next publish. Page-specific `updated_at` supplies its lastmod. SQL edits update timestamps automatically.

## Access and inquiries

Visitors can SELECT published category rows and their town rows. Admins can insert/update/delete; helpers cannot write or read drafts. Service-role grants are explicit. `?preview=1` is a noindex layout preview; it does not bypass RLS.

The form reuses `submit-inbound-lead` with `project_type='ai_seat'` and `qualifier_data={offer,category,town,angle,intent}`. Category is the category slug; town is its readable town name. Intent is `claim`, `answer_check` or `waitlist`. The existing inbound-to-Leads trigger remains unchanged. Badges read these saved qualifiers in Inbound and in Leads, without duplicating fields onto prospects. Inquiry submission does not automatically hold/take a seat.