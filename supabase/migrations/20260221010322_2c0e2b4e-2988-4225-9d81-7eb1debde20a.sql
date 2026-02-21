
-- Add category and subcategory to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category text DEFAULT 'damske';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subcategory text;

-- Add photo_url to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url text;

-- Update existing services with categories and subcategories
UPDATE public.services SET category = 'damske', subcategory = 'STRIH' WHERE name_sk IN ('Dámsky strih');
UPDATE public.services SET category = 'damske', subcategory = 'STYLING' WHERE name_sk IN ('Finálny styling', 'Fúkaná dlhé vlasy', 'Fúkaná polodlhé vlasy');
UPDATE public.services SET category = 'damske', subcategory = 'FARBENIE' WHERE name_sk IN ('Farbenie odrastov', 'Farbenie odrastov so strihom', 'Kompletné farbenie', 'Kompletné farbenie so strihom', 'Farbenie vlasov');
UPDATE public.services SET category = 'damske', subcategory = 'BALAYAGE' WHERE name_sk IN ('Balayage komplet', 'Balayage dorábka', 'Melír komplet', 'Melír dorábka');
UPDATE public.services SET category = 'damske', subcategory = 'REGENERÁCIA' WHERE name_sk IN ('Brazílsky keratín', 'Methamorphyc - exkluzívna kúra', 'Methamorphyc - rýchla kúra', 'Gumovanie alebo čistenie farby');
UPDATE public.services SET category = 'damske', subcategory = 'PREDLŽOVANIE' WHERE name_sk IN ('Aplikácia Tape-in', 'Prepojenie Tape-in', 'Spoločenský účes', 'Svadobný účes');
UPDATE public.services SET category = 'panske', subcategory = 'VLASY' WHERE name_sk IN ('Pánsky strih');
UPDATE public.services SET category = 'panske', subcategory = 'BRADA' WHERE name_sk IN ('Strih brady');
UPDATE public.services SET category = 'panske', subcategory = 'VLASY A BRADA' WHERE name_sk IN ('Kombinácia vlasy a brada', 'Pánsky špeciál');
UPDATE public.services SET category = 'panske', subcategory = 'FARBA' WHERE name_sk IN ('Farbenie brady');
UPDATE public.services SET category = 'panske', subcategory = 'DOPLNKOVÉ SLUŽBY' WHERE name_sk IN ('Čierna zlupovacia maska', 'Depilácia nosa aj uší');

-- Update employees: rename to Miška and Maťo
UPDATE public.employees SET display_name = 'Miška' WHERE id = 'c1000000-0000-0000-0000-000000000001';
UPDATE public.employees SET display_name = 'Maťo' WHERE id = 'c1000000-0000-0000-0000-000000000002';
