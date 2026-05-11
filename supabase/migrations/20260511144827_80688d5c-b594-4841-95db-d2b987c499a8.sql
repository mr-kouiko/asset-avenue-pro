-- Delete 3 approved submissions that have no original file (empty submissions)
DELETE FROM content_submissions 
WHERE id IN (
  '760e8ea6-5b0e-4f20-8a3a-14ce0eb98842',  -- a EFFACER CLAIREMENT
  '3f32dc52-863a-45d5-87b8-c2c4ae2f6e99',  -- The Line : Futurisme et Innovation
  'd170d2c5-dfb8-4f9b-8472-6d88da674169'   -- Cinematic Architect Reviewing Blueprints
);

-- Also delete any associated content_files records (if any exist)
DELETE FROM content_files 
WHERE submission_id IN (
  '760e8ea6-5b0e-4f20-8a3a-14ce0eb98842',
  '3f32dc52-863a-45d5-87b8-c2c4ae2f6e99',
  'd170d2c5-dfb8-4f9b-8472-6d88da674169'
);