-- Per-brand difficulty knob for the reveal engine (see src/features/quiz/reveal.ts).
-- start_reveal: 0 = fully hidden .. 1 = fully shown. NULL falls back to the
-- mode's tuned OBSCURE_LEVEL in the app, so existing brands are unaffected.
ALTER TABLE public.quiz_brands
  ADD COLUMN IF NOT EXISTS start_reveal numeric
  CHECK (start_reveal >= 0 AND start_reveal <= 1);
