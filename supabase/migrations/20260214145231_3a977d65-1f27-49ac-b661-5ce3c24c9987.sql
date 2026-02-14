
-- Delete duplicate "Coffee Beans & Brew" (keep dfd4768e, remove 6c985a9f)
DELETE FROM content_files WHERE submission_id = '6c985a9f-3fa6-4904-8e70-aab664c5978a';
DELETE FROM content_submissions WHERE id = '6c985a9f-3fa6-4904-8e70-aab664c5978a';

-- Delete duplicate "Homme saoudien parlant face caméra" (keep 07ee08e7, remove d296c8e4)
DELETE FROM content_files WHERE submission_id = 'd296c8e4-d18a-4661-a633-824995a960a5';
DELETE FROM content_submissions WHERE id = 'd296c8e4-d18a-4661-a633-824995a960a5';
