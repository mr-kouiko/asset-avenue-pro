-- Update French category names and descriptions to English
UPDATE categories SET name = 'Vector', description = 'Vector files .ai, .eps, .svg' WHERE slug = 'vector';
UPDATE categories SET description = 'Audio files and music' WHERE slug = 'audio';
UPDATE categories SET description = 'Digital books in PDF format with cover' WHERE slug = 'ebooks';
UPDATE categories SET description = 'Illustrations and drawings' WHERE slug = 'illustration';
UPDATE categories SET description = 'High quality photographs' WHERE slug = 'photo';
UPDATE categories SET description = 'HD video content' WHERE slug = 'video';