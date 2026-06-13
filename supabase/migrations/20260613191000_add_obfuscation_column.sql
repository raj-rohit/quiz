-- Add obfuscation_type column to quiz_brands table
ALTER TABLE public.quiz_brands ADD COLUMN IF NOT EXISTS obfuscation_type text DEFAULT 'none';
