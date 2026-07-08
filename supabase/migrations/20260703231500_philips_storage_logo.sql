-- Philips: switch from unavatar.io to the official 2013 shield mark,
-- served from the Supabase Storage `logos` bucket (uploaded as philips-shield.png).
-- Shield blue matches the asset (#0b5ed7).
UPDATE public.quiz_brands
SET image_url = 'logos/philips-shield.png',
    brand_color = '#0b5ed7'
WHERE brand_name = 'Philips' AND pack_id = 'classics';
