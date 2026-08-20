-- Angrerett (right-of-withdrawal) consent, explicit and server-recorded.
-- Closes the gap flagged in vilkar/page.tsx section 7's LegalReviewFlag:
-- the checkout previously had no consent step before payment at all.
-- Stored directly on the purchase row since it's inherently 1:1 with one
-- purchase attempt -- product_code/user_id/case_id already live here, so
-- no separate consent table is needed.
--
-- Nullable and not backfilled: existing purchases genuinely never
-- collected this consent, and the older case-page PurchasePrompt/
-- PurchaseGate flow keeps working unchanged without sending it (see
-- src/lib/purchases/createCheckout.ts) -- only the new one-page checkout
-- at /utsjekk populates it.
alter table public.purchases
  add column angrerett_accepted_at timestamptz;
