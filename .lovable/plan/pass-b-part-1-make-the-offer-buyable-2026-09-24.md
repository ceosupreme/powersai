# Pass B, part 1: make the offer buyable

## Step 0: connect your Stripe test key
Right after you approve, I open the Connect Stripe form (your own account). Paste the test-mode restricted key there, not in chat. The key stays on the backend and is never sent to the browser. If the form doesn't open in this session, I stop and tell you.

## What gets built
1. **Checkout (create-checkout-session).** Anyone can call it and no login is needed. It is lightly rate-limited like the inquiry form. It offers three products, each priced in the checkout session itself, so nothing is created in your Stripe account:
   - Launch Site deposit: $1,250, paid once
   - Launch Site monthly: $297 a month
   - Care Seat: $149 a month

   Every checkout asks for "Business name" and records the product, src, industry and business name. After payment the buyer lands on /thank-you. If they cancel, they return to /services/websites#pricing. On the preview, both links point back to the preview so testing works.
2. **Payment check (verify-checkout).** Your backend asks Stripe directly whether the payment went through.
   - Paid (or subscription active or trialing): it saves or updates the order in site_orders, keyed by the checkout session.
   - If the order has no lead yet: it creates one inquiry the same way the inquiry form does, alerts you, and sends the buyer the instant confirmation. It then links that lead to the order.
   - Reloading the page never creates a second order or lead. Card details are removed before anything is stored.
3. **/thank-you page.** A public page.
   - Confirmed payment: "You're in.", the product and amount, what happens next, your contact email and the call button. It also records a checkout event.
   - Not confirmed: "We couldn't confirm the payment yet" with your contact email. No error details are shown.
4. **The offer on the site.** Homepage offer section and /services/websites get "Websites that run your business.":
   - the five-step ladder (Launch Site, Care Seat, Business Site, Growth, Systems), using your exact copy and prices
   - the "What is included, what is not" block
   - "How it works" in three steps

   Buy buttons record the click, then open checkout. Inquiry buttons carry src=home or src=services-websites. The umbrella line and the case studies stay.
5. **HQ.** One new line on the "Website, last 7 days" card: "Orders, last 30 days: {count} · ${sum}" (paid or active orders only).

## Testing
- Type check and build.
- A full test purchase with card 4242 4242 4242 4242 on the preview.
- Check the order row and the linked lead. Reload /thank-you and confirm nothing is duplicated.
- Check the cancel path.
- Check the new offer section on a phone-sized screen, signed out.

The buyer confirmation email will go out once during the test purchase. I'll use an @example.com address so it's skipped. No live charges, nothing published.

## Technical details
- New functions: `supabase/functions/create-checkout-session`, `supabase/functions/verify-checkout`. Both call the Stripe REST API with `STRIPE_SECRET_KEY` and are listed in config.toml with `verify_jwt = false`.
- Checkout settings: `customer_creation: always` (one-time payments only), `billing_address_collection: auto`, a required "business_name" text field, and metadata of product_key, src, source_vertical and biz.
- The lead is created with the same fields submit-inbound-lead uses: message "Paid on the website: {product}", conversation_channel form, route_to self, project_type website. qualifier_data holds site_section checkout, product_key, order_id, src, source_vertical and purchase true. The existing alert and confirmation functions then run for it, as in submit-inbound-lead.
- To avoid duplicates, the order is saved first, keyed by stripe_session_id. A lead is added only when the order's lead_id is empty (a conditional update that fires once).
- Files: `src/App.tsx` (one new /thank-you route, nothing else changes), `src/pages/ThankYou.tsx`, a new `studio/sections/Offer.tsx` used by `MarketingSite.tsx` and `WebsiteServices.tsx`, `ServicePage.tsx` if it needs a pricing slot, `ProjectHome.tsx`, and `PublicSiteAnalytics.tsx` (/thank-you added).
- Protected and unchanged: client intake, follow-up automations, owner alerts, confirmation email, scoring, auth and roles.
