
-- ============================================================
-- MERGE: Fuse ~14 FR/EN duplicate pairs into single products
-- Strategy: Keep one product, add FR translation, delete duplicate
-- ============================================================

-- ==========================================
-- PART 1: FR/EN PAIRS - Add FR translations to kept EN products
-- ==========================================

-- Pair 1: Keep ae771207 (EN Saudi businessman), save FR from 07ee08e7
INSERT INTO product_translations (product_id, language, title, description) VALUES
('ae771207-ec8a-45f4-9d48-8f37b70525ef', 'fr',
 'Homme saoudien parlant face caméra en intérieur',
 'Un homme saoudien portant une tenue traditionnelle (thobe blanc et keffieh rouge) s''exprime face caméra dans un environnement intérieur moderne et lumineux.')
ON CONFLICT DO NOTHING;

-- Pair 2: Keep abf13e31 (EN Dubai Frame side view), save FR from 5424eb4e
INSERT INTO product_translations (product_id, language, title, description) VALUES
('abf13e31-5f84-4431-a2cd-efff0496fc10', 'fr',
 'Vue aérienne du Dubai Frame au lever du soleil',
 'Une magnifique vue aérienne du Dubai Frame, monument emblématique de Dubaï, dominant la ville sous une lumière matinale douce.')
ON CONFLICT DO NOTHING;

-- Pair 3: Keep 819596eb (EN Logistics Worker), save FR from 1ff7d8cc
INSERT INTO product_translations (product_id, language, title, description) VALUES
('819596eb-b7ae-4670-8a1b-97d84254d021', 'fr',
 'Ouvrier marchant dans une usine de production moderne',
 'Un ouvrier en tenue de travail marche dans une usine industrielle moderne, entouré d''équipements, de chariots élévateurs et de pièces métalliques.')
ON CONFLICT DO NOTHING;

-- Pair 4: Keep aa0a88be (EN Legal Document), save FR from c1ad897f
INSERT INTO product_translations (product_id, language, title, description) VALUES
('aa0a88be-c514-4582-a3b5-f15c42e11c10', 'fr',
 'Main écrivant sur un dossier professionnel — plan rapproché d''un bureau moderne',
 'Vidéo en gros plan d''une main tenant un stylo doré et écrivant sur un document. Idéal pour illustrer les concepts de travail administratif, de gestion de projet, de droit, de business.')
ON CONFLICT DO NOTHING;

-- Pair 5: Keep aa3b75df (EN Aerial Dubai Frame), save FR from 17f292fa
INSERT INTO product_translations (product_id, language, title, description) VALUES
('aa3b75df-4460-422f-83bb-a00acaf8515e', 'fr',
 'Vue rapprochée du sommet du Dubai Frame',
 'Plan aérien filmé par drone montrant un gros plan impressionnant du haut du Dubai Frame, avec la skyline de Dubaï et ses gratte-ciels majestueux en arrière-plan.')
ON CONFLICT DO NOTHING;

-- ==========================================
-- PART 2: Delete ALL duplicates (FR versions + EN/EN dupes)
-- IDs to delete (the "loser" of each pair):
-- FR versions: 07ee08e7, 5424eb4e, 1ff7d8cc, c1ad897f, 17f292fa
-- EN/EN dupes: d1ba9267, b04c99a1, 6b0a694d, baa1825c, 5ee178b2, f2947483, 6dab9fcc, d3f5ca43, e23482bd
-- ==========================================

-- Step A: Delete product_translations for all duplicates
DELETE FROM product_translations WHERE product_id IN (
  '07ee08e7-b7a9-4644-98ed-42037278074a',
  '5424eb4e-cd87-478d-9b99-00e4f4771425',
  '1ff7d8cc-186f-4aa0-8f3c-8f7add35afe4',
  'c1ad897f-fd64-4fcd-8279-21b7b84571ab',
  '17f292fa-70f0-40f8-81e2-dd20bf1b91cf',
  'd1ba9267-b79c-46fc-b31b-9ef2d8e947f1',
  'b04c99a1-2edd-4507-b87e-bc75726cd92d',
  '6b0a694d-d562-401b-b74a-8926f41e9fa5',
  'baa1825c-28fb-4aa8-88a8-3c6b909adc8e',
  '5ee178b2-531e-49f8-81e4-c031bfd1c3e2',
  'f2947483-4209-496e-a335-133cbeae92d1',
  '6dab9fcc-3842-4a54-a5d6-7f02d680ca97',
  'd3f5ca43-538d-44d3-a8bc-a2288b3c8213',
  'e23482bd-d1d7-470e-9f9f-168ecadf61c4'
);

-- Step B: Delete content_files for all duplicates
DELETE FROM content_files WHERE submission_id IN (
  '07ee08e7-b7a9-4644-98ed-42037278074a',
  '5424eb4e-cd87-478d-9b99-00e4f4771425',
  '1ff7d8cc-186f-4aa0-8f3c-8f7add35afe4',
  'c1ad897f-fd64-4fcd-8279-21b7b84571ab',
  '17f292fa-70f0-40f8-81e2-dd20bf1b91cf',
  'd1ba9267-b79c-46fc-b31b-9ef2d8e947f1',
  'b04c99a1-2edd-4507-b87e-bc75726cd92d',
  '6b0a694d-d562-401b-b74a-8926f41e9fa5',
  'baa1825c-28fb-4aa8-88a8-3c6b909adc8e',
  '5ee178b2-531e-49f8-81e4-c031bfd1c3e2',
  'f2947483-4209-496e-a335-133cbeae92d1',
  '6dab9fcc-3842-4a54-a5d6-7f02d680ca97',
  'd3f5ca43-538d-44d3-a8bc-a2288b3c8213',
  'e23482bd-d1d7-470e-9f9f-168ecadf61c4'
);

-- Step C: Delete the duplicate content_submissions
DELETE FROM content_submissions WHERE id IN (
  '07ee08e7-b7a9-4644-98ed-42037278074a',
  '5424eb4e-cd87-478d-9b99-00e4f4771425',
  '1ff7d8cc-186f-4aa0-8f3c-8f7add35afe4',
  'c1ad897f-fd64-4fcd-8279-21b7b84571ab',
  '17f292fa-70f0-40f8-81e2-dd20bf1b91cf',
  'd1ba9267-b79c-46fc-b31b-9ef2d8e947f1',
  'b04c99a1-2edd-4507-b87e-bc75726cd92d',
  '6b0a694d-d562-401b-b74a-8926f41e9fa5',
  'baa1825c-28fb-4aa8-88a8-3c6b909adc8e',
  '5ee178b2-531e-49f8-81e4-c031bfd1c3e2',
  'f2947483-4209-496e-a335-133cbeae92d1',
  '6dab9fcc-3842-4a54-a5d6-7f02d680ca97',
  'd3f5ca43-538d-44d3-a8bc-a2288b3c8213',
  'e23482bd-d1d7-470e-9f9f-168ecadf61c4'
);
