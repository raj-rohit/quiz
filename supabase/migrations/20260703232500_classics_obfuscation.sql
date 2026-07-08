-- Obfuscation modes for the Classics wordmark brands (see src/features/quiz/reveal.ts).
-- Pixelate: block size = difficulty, works for any logo.
UPDATE public.quiz_brands SET obfuscation_type = 'pixelate'
WHERE brand_name IN ('HEMA', 'Jumbo') AND pack_id = 'classics';
