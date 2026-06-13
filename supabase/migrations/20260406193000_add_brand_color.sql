ALTER TABLE public.quiz_brands ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#FFFFFF';

UPDATE public.quiz_brands SET brand_color = '#FFFFFF' WHERE brand_name = 'Albert Heijn';
UPDATE public.quiz_brands SET brand_color = '#FFC82E' WHERE brand_name = 'Jumbo';
UPDATE public.quiz_brands SET brand_color = '#E31E24' WHERE brand_name = 'HEMA';
