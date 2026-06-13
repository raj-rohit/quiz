UPDATE public.quiz_brands 
SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Albert_Heijn_logo.svg/512px-Albert_Heijn_logo.svg.png' 
WHERE brand_name = 'Albert Heijn';

INSERT INTO public.quiz_brands (brand_name, image_url, description)
VALUES 
    ('Jumbo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Jumbo_Logo.svg/512px-Jumbo_Logo.svg.png', 'The bright yellow powerhouse of Dutch groceries. Jumbo grew from an independent store in Tilburg to the second largest chain in the Netherlands.'),
    ('HEMA', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/HEMA_logo.svg/320px-HEMA_logo.svg.png', 'Iconic Dutch department store famous for their 1 euro rookworst and highly affordable, bright-colored domestic designs.');
