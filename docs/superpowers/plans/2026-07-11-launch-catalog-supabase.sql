-- Launch catalog reshape (2026-07-11 spec). Run in Supabase SQL editor.
update packs set is_free = true  where id in ('food', 'sport');
update packs set visible = false where id = 'eighties';
-- retro stays: is_free = false, visible = true (verify, don't change)

update app_config set bundle = jsonb_set(
  bundle::jsonb,
  '{blurb}',
  '{"nl": "Alle packs — nu én in de toekomst. Eénmalig.",
    "en": "Every pack, now and in the future. One-time.",
    "fr": "Tous les packs, actuels et futurs. Une fois.",
    "de": "Alle Packs, jetzt und künftig. Einmalig."}'::jsonb
);
