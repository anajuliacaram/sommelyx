-- Limpar URLs de placeholder quebradas (wine-searcher alert.jpg) para que o resolver regere com IA
UPDATE public.wines
SET image_url = NULL
WHERE image_url ILIKE '%wine-searcher.com%alert.jpg%'
   OR image_url ILIKE '%placeholder%'
   OR image_url ILIKE '%notfound%';