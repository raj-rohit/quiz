-- Convert quiz_brands description column to JSONB to support translations
ALTER TABLE public.quiz_brands 
ALTER COLUMN description TYPE jsonb USING jsonb_build_object('en', description);
