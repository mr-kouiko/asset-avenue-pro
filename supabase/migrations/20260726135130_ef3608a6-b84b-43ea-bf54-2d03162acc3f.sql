
-- 1) Backfill NULL prices based on associated original file
UPDATE public.content_submissions cs
SET price = sub.new_price, updated_at = now()
FROM (
  SELECT cs.id,
    CASE
      WHEN cs.status = 'draft' AND cf.id IS NULL THEN 0
      WHEN cf.file_format = 'image/svg+xml' OR lower(cf.file_name) LIKE '%.svg' OR cf.file_type = 'vector' THEN 4.99
      WHEN cf.file_format ILIKE 'video/%' OR cf.file_type = 'video' THEN 20.00
      WHEN cf.file_format ILIKE 'audio/%' OR cf.file_type = 'audio' THEN 4.99
      WHEN cf.file_format = 'application/pdf' OR lower(cf.file_name) LIKE '%.pdf' THEN 3.99
      WHEN cf.file_format ILIKE '%zip%' OR cf.file_format ILIKE '%rar%'
           OR lower(cf.file_name) LIKE '%.zip' OR lower(cf.file_name) LIKE '%.rar'
           OR cf.file_type = 'vfx' THEN 20.00
      WHEN cf.file_format ILIKE 'image/%' OR cf.file_type = 'image' THEN 2.99
      ELSE 2.99
    END AS new_price
  FROM public.content_submissions cs
  LEFT JOIN LATERAL (
    SELECT id, file_type, file_format, file_name
    FROM public.content_files
    WHERE submission_id = cs.id AND is_original = true
    LIMIT 1
  ) cf ON true
  WHERE cs.price IS NULL
) sub
WHERE cs.id = sub.id;

-- 2) Enforce NOT NULL (no default — app must compute)
ALTER TABLE public.content_submissions
  ALTER COLUMN price DROP DEFAULT;

ALTER TABLE public.content_submissions
  ALTER COLUMN price SET NOT NULL;

-- 3) Non-negative price constraint
ALTER TABLE public.content_submissions
  DROP CONSTRAINT IF EXISTS content_submissions_price_non_negative;
ALTER TABLE public.content_submissions
  ADD CONSTRAINT content_submissions_price_non_negative CHECK (price >= 0);
