
-- ============================================================
-- CLEANUP: Remove confirmed duplicate/ghost products
-- ============================================================

-- 1. "a effacer" test products (all 5)
DELETE FROM product_translations WHERE product_id IN (
  '1b9598fb-3107-475d-ba08-da759112081d',
  '427e0367-4777-4c68-8107-651e4cb304e5',
  '0164d354-e586-4f45-8998-d968dc1b1395',
  '1a6c6917-973f-4f09-89f0-462343c18033',
  '3104fa6f-9b73-444b-9b80-b21b041b111c'
);
DELETE FROM content_files WHERE submission_id IN (
  '1b9598fb-3107-475d-ba08-da759112081d',
  '427e0367-4777-4c68-8107-651e4cb304e5',
  '0164d354-e586-4f45-8998-d968dc1b1395',
  '1a6c6917-973f-4f09-89f0-462343c18033',
  '3104fa6f-9b73-444b-9b80-b21b041b111c'
);
DELETE FROM content_submissions WHERE id IN (
  '1b9598fb-3107-475d-ba08-da759112081d',
  '427e0367-4777-4c68-8107-651e4cb304e5',
  '0164d354-e586-4f45-8998-d968dc1b1395',
  '1a6c6917-973f-4f09-89f0-462343c18033',
  '3104fa6f-9b73-444b-9b80-b21b041b111c'
);

-- 2. "The Line - Saudi Arabia" duplicates (keep 0283d65f which has a file)
DELETE FROM product_translations WHERE product_id IN (
  '160f5b79-175f-41b1-b3ae-2a8edd2e7d1f',
  'd340861d-eff2-4543-baf9-bf4a567f3cfa'
);
DELETE FROM content_files WHERE submission_id IN (
  '160f5b79-175f-41b1-b3ae-2a8edd2e7d1f',
  'd340861d-eff2-4543-baf9-bf4a567f3cfa'
);
DELETE FROM content_submissions WHERE id IN (
  '160f5b79-175f-41b1-b3ae-2a8edd2e7d1f',
  'd340861d-eff2-4543-baf9-bf4a567f3cfa'
);

-- 3. Ghost records (submissions without files)
DELETE FROM product_translations WHERE product_id IN (
  'b25f6832-2be8-40b9-9ad2-4bcd641c166c',  -- AI_Brain ghost
  'ff1dddf6-a970-4ed9-901a-8de78877fe0e',  -- Cycliste ghost
  '7fc578f4-318a-4ed9-a255-d463a25e5018',  -- PAINT RAIDER ghost 1
  '89faded6-e990-4211-b168-33ca2f2c7a0a',  -- PAINT RAIDER ghost 2
  '9af46aeb-0313-48f3-9b21-61cc2bb1c10b',  -- Velvet Shadows ghost
  '78006cab-674b-47fa-a4ac-0ec60f1b2a00'   -- Rugged Canadian ghost
);
DELETE FROM content_files WHERE submission_id IN (
  'b25f6832-2be8-40b9-9ad2-4bcd641c166c',
  'ff1dddf6-a970-4ed9-901a-8de78877fe0e',
  '7fc578f4-318a-4ed9-a255-d463a25e5018',
  '89faded6-e990-4211-b168-33ca2f2c7a0a',
  '9af46aeb-0313-48f3-9b21-61cc2bb1c10b',
  '78006cab-674b-47fa-a4ac-0ec60f1b2a00'
);
DELETE FROM content_submissions WHERE id IN (
  'b25f6832-2be8-40b9-9ad2-4bcd641c166c',
  'ff1dddf6-a970-4ed9-901a-8de78877fe0e',
  '7fc578f4-318a-4ed9-a255-d463a25e5018',
  '89faded6-e990-4211-b168-33ca2f2c7a0a',
  '9af46aeb-0313-48f3-9b21-61cc2bb1c10b',
  '78006cab-674b-47fa-a4ac-0ec60f1b2a00'
);
