# Batch Translation Scripts

## batch-translate-products.js

Script pour traduire tous les produits existants dans la marketplace avec LibreTranslate (gratuit).

### Installation

```bash
npm install @supabase/supabase-js node-fetch
```

### Usage

```bash
# Traduire en français (défaut)
node scripts/batch-translate-products.js

# Traduire dans une autre langue
node scripts/batch-translate-products.js en
node scripts/batch-translate-products.js es
node scripts/batch-translate-products.js de
```

### Langues supportées

- `fr` - Français
- `en` - Anglais
- `es` - Espagnol
- `de` - Allemand
- `it` - Italien
- `pt` - Portugais
- Et bien d'autres...

### Fonctionnement

1. Le script récupère tous les produits approuvés (`status = 'approved'`)
2. Pour chaque produit, il vérifie si une traduction existe déjà
3. Si non, il traduit le titre et la description avec LibreTranslate
4. Les traductions sont stockées dans `product_translations`
5. Un délai de 500ms est appliqué entre chaque requête pour éviter le rate limiting

### Notes

- **Gratuit** : LibreTranslate est 100% gratuit et open-source
- **Rate limiting** : 500ms entre chaque traduction pour respecter les limites
- **Idempotent** : Peut être relancé sans problème (skip les traductions existantes)
- **Fallback** : En cas d'erreur, le texte original est conservé
