-- Run once in the company Supabase project after reviewing the wording below.
-- This remains in review until the owner verifies supplier evidence and publishes it.
insert into public.products
  (slug,title,category,summary,description,product_form,species,specifications,quality_summary,status,evidence_status)
values
  ('ready-to-fry-beef-skin-crackers',
   'Ready-to-fry beef skin crackers',
   'Food',
   'An unfried, bovine-skin based product for business buyers. Product details and destination requirements are confirmed for each inquiry.',
   'An unfried, bovine-skin based product for buyers seeking consistent specifications and dependable B2B supply. Product details and destination requirements are confirmed for each inquiry.',
   'Unfried / ready to fry',
   'Bovine',
   '[{"label":"Supply model","value":"Business to business"}]'::jsonb,
   null,
   'in_review','pending')
on conflict (slug) do nothing;
