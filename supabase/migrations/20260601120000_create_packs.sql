-- Local Logo pack catalog (SPEC §4).
-- Supabase is the source of truth for content/config; the app bakes in an
-- offline fallback. NO price numbers live here — localized prices come from
-- the store (StoreKit / Play Billing) keyed by store_product_id.

create table if not exists public.packs (
  id text primary key,
  title jsonb not null,
  blurb jsonb not null default '{}'::jsonb,
  cover text not null default 'accent',          -- accent | cyan | ink | cream
  icon text not null default 'star',              -- material symbol name
  questions int not null default 0,
  is_free boolean not null default false,
  free_question_count int not null default 0,
  store_product_id text,                          -- SKU to surface (price from store)
  is_bundle_member boolean not null default true,
  sample boolean not null default false,          -- "try free" allowed
  sort_order int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.packs enable row level security;
drop policy if exists "public read packs" on public.packs;
create policy "public read packs" on public.packs for select using (true);

create table if not exists public.app_config (
  id text primary key default 'singleton',
  bundle jsonb,                                   -- { id, icon, store_product_id, title, blurb }
  quiz_title jsonb,                               -- catalog-driven (not hard-coded)
  chapter_label jsonb
);

alter table public.app_config enable row level security;
drop policy if exists "public read app_config" on public.app_config;
create policy "public read app_config" on public.app_config for select using (true);

-- Map questions (brands) to a pack.
alter table public.quiz_brands add column if not exists pack_id text references public.packs(id);

-- Seed packs (mirrors the app's offline catalog).
insert into public.packs (id, title, blurb, cover, icon, questions, is_free, free_question_count, store_product_id, sample, sort_order, visible)
values
 ('classics',
  '{"nl":"Klassiekers","en":"Classics","fr":"Classiques","de":"Klassiker"}',
  '{"nl":"De bekendste merken — gratis om te starten.","en":"The most famous marks — free to start.","fr":"Les marques les plus connues — gratuit.","de":"Die bekanntesten Marken — gratis."}',
  'accent', 'star', 5, true, 5, null, false, 0, true),
 ('food',
  '{"nl":"Eten & Drinken","en":"Food & Drink","fr":"Gastronomie","de":"Essen & Trinken"}',
  '{"nl":"Supermarkt-iconen en huismerken.","en":"Supermarket icons and house brands.","fr":"Icônes de supermarché et marques maison.","de":"Supermarkt-Ikonen und Hausmarken."}',
  'cyan', 'restaurant', 12, false, 3, 'sku_food', true, 1, true),
 ('eighties',
  '{"nl":"Jaren ’80","en":"The 80s","fr":"Années 80","de":"Die 80er"}',
  '{"nl":"Retro merken uit een ander tijdperk.","en":"Retro brands from another era.","fr":"Marques rétro d’une autre époque.","de":"Retro-Marken aus einer anderen Zeit."}',
  'ink', 'graphic_eq', 10, false, 3, 'sku_eighties', true, 2, true),
 ('sport',
  '{"nl":"Sport","en":"Sport","fr":"Sport","de":"Sport"}',
  '{"nl":"Clubs, merken en toernooien.","en":"Clubs, brands and tournaments.","fr":"Clubs, marques et tournois.","de":"Vereine, Marken und Turniere."}',
  'cream', 'sports_soccer', 8, false, 3, 'sku_sport', true, 3, true),
 ('retro',
  '{"nl":"Retro Arcade","en":"Retro Arcade","fr":"Rétro Arcade","de":"Retro-Arcade"}',
  '{"nl":"Games en gadgets, pixel-stijl.","en":"Games and gadgets, pixel-style.","fr":"Jeux et gadgets, style pixel.","de":"Spiele und Gadgets im Pixel-Stil."}',
  'accent', 'sports_esports', 14, false, 3, 'sku_retro', true, 4, true)
on conflict (id) do nothing;

insert into public.app_config (id, bundle)
values ('singleton',
  '{"id":"allaccess","icon":"workspace_premium","store_product_id":"sku_allaccess","title":{"nl":"Alles ontgrendelen","en":"Unlock Everything","fr":"Tout débloquer","de":"Alles freischalten"},"blurb":{"nl":"Alle 4 betaalde packs. Eénmalig.","en":"All 4 paid packs. One-time.","fr":"Les 4 packs payants. Une fois.","de":"Alle 4 Bezahl-Packs. Einmalig."}}')
on conflict (id) do nothing;

-- Put the existing seeded brands into the free starter pack.
update public.quiz_brands set pack_id = 'classics' where pack_id is null;
