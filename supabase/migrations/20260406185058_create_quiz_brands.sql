CREATE TABLE public.quiz_brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_name text NOT NULL,
    image_url text NOT NULL,
    description text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to quiz_brands"
ON public.quiz_brands FOR SELECT USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "public_logos_read"
ON storage.objects FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "public_logos_insert"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');

INSERT INTO public.quiz_brands (brand_name, image_url, description)
VALUES (
    'Albert Heijn', 
    'logos/albert_heijn.png',
    'A trusted presence in Dutch streets since 1887.'
);
