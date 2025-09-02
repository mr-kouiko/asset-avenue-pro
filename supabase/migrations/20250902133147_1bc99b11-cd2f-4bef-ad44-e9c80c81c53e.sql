-- Ajouter la catégorie Ebooks si elle n'existe pas déjà
INSERT INTO categories (name, slug, description) 
SELECT 'Ebooks', 'ebooks', 'Livres numériques au format PDF avec couverture'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE slug = 'ebooks'
);