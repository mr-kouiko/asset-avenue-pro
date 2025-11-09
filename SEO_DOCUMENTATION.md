# Documentation SEO - VisuStock

## 🎯 Vue d'ensemble

Le système SEO de VisuStock est entièrement automatisé et optimisé pour le référencement Google, Bing, et les réseaux sociaux. Toutes les pages sont configurées avec :

- ✅ Balises meta SEO (title, description, keywords)
- ✅ Open Graph pour les partages sociaux (Facebook, LinkedIn)
- ✅ Twitter Cards
- ✅ Balises hreflang pour le multilingue (FR/EN)
- ✅ Schema.org / JSON-LD pour les rich snippets
- ✅ URLs canoniques
- ✅ Sitemap.xml
- ✅ Robots.txt optimisé

---

## 🚀 Comment ajouter le SEO à une nouvelle page ?

### Étape 1 : Importer le hook useSEO

```typescript
import { useSEO } from '@/hooks/useSEO';
import { useLanguage } from '@/contexts/LanguageContext';
```

### Étape 2 : Appeler useSEO dans votre composant

```typescript
const MyNewPage = () => {
  const { language } = useLanguage();

  // Configuration SEO
  useSEO({
    title: language === 'en' 
      ? "Page Title in English - VisuStock"
      : "Titre de la Page en Français - VisuStock",
    description: language === 'en'
      ? "English description for search engines (max 160 characters)"
      : "Description française pour les moteurs de recherche (max 160 caractères)",
    type: 'website', // ou 'article' ou 'product'
    image: 'https://visustock.com/path/to/image.jpg', // Optionnel
    author: 'Author Name', // Optionnel
    tags: ['tag1', 'tag2'], // Optionnel
    price: 29.99, // Optionnel (pour les produits uniquement)
    currency: 'EUR' // Optionnel (pour les produits uniquement)
  });

  return (
    <div>
      {/* Votre contenu de page */}
    </div>
  );
};
```

### Étape 3 : C'est tout ! 🎉

Le hook `useSEO` gère automatiquement :
- La mise à jour du `<title>` de la page
- Toutes les balises meta (description, keywords, author)
- Les balises Open Graph pour Facebook/LinkedIn
- Les Twitter Cards
- Les balises **hreflang** (FR/EN) automatiquement
- L'URL canonique
- Le schema.org (JSON-LD) si c'est un produit

---

## 📖 Options disponibles pour useSEO

```typescript
interface SEOConfig {
  title: string;              // REQUIS - Titre de la page (max 60 caractères)
  description: string;        // REQUIS - Description (max 160 caractères)
  image?: string;             // Optionnel - Image pour Open Graph (1200x630px recommandé)
  type?: 'website' | 'article' | 'product'; // Type de contenu (défaut: 'website')
  author?: string;            // Optionnel - Auteur du contenu
  publishedTime?: string;     // Optionnel - Date de publication (format ISO)
  tags?: string[];            // Optionnel - Tags/mots-clés
  price?: number;             // Optionnel - Prix (pour type='product' uniquement)
  currency?: string;          // Optionnel - Devise (défaut: 'EUR')
  noindex?: boolean;          // Optionnel - Empêcher l'indexation (défaut: false)
}
```

---

## 🌍 Gestion automatique du multilingue

Le système gère automatiquement les balises `hreflang` pour le SEO multilingue :

```html
<!-- Généré automatiquement -->
<link rel="alternate" hreflang="fr" href="https://visustock.com/fr/page" />
<link rel="alternate" hreflang="en" href="https://visustock.com/en/page" />
<link rel="alternate" hreflang="x-default" href="https://visustock.com/fr/page" />
```

**Important** : 
- La langue par défaut (x-default) est toujours le français
- Les URLs sont automatiquement détectées depuis `location.pathname`
- Le système génère les versions FR et EN de chaque page

---

## 🖼️ Optimisation des images

Toutes les images doivent avoir des attributs `alt` descriptifs :

```tsx
// ❌ MAUVAIS
<img src="/image.jpg" />

// ✅ BON
<img 
  src="/image.jpg" 
  alt="Description détaillée de l'image avec mots-clés"
  loading="lazy"
/>
```

### Lazy Loading automatique

Pour les images sous le fold (non visibles immédiatement), utilisez `loading="lazy"` :

```tsx
<img 
  src="/hero-image.jpg" 
  alt="Image hero"
  // Pas de loading="lazy" pour les images au-dessus du fold
/>

<img 
  src="/gallery-image.jpg" 
  alt="Image de galerie"
  loading="lazy"  // Pour les images en dessous
/>
```

---

## 📄 Structure des pages pour le SEO

### Balises sémantiques HTML5

Utilisez **toujours** les balises sémantiques :

```tsx
<main>
  <header>
    <h1>Titre principal de la page (un seul H1 par page)</h1>
  </header>

  <section>
    <h2>Section 1</h2>
    <p>Contenu...</p>
  </section>

  <article>
    <h2>Article</h2>
    <p>Contenu de l'article...</p>
  </article>

  <aside>
    <h2>Sidebar</h2>
  </aside>
</main>

<footer>
  <nav>
    <a href="/page1">Lien 1</a>
  </nav>
</footer>
```

### Hiérarchie des titres

```
H1 - Titre principal (UN SEUL par page)
├── H2 - Sections principales
│   ├── H3 - Sous-sections
│   │   └── H4 - Détails
│   └── H3 - Autres sous-sections
└── H2 - Autres sections
```

---

## 🗺️ Sitemap.xml

Le sitemap est situé à `/public/sitemap.xml` et contient toutes les pages publiques du site.

### Ajouter une nouvelle page au sitemap

Éditez `public/sitemap.xml` et ajoutez :

```xml
<!-- Nouvelle page -->
<url>
  <loc>https://visustock.com/fr/nouvelle-page</loc>
  <xhtml:link rel="alternate" hreflang="fr" href="https://visustock.com/fr/nouvelle-page"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://visustock.com/en/nouvelle-page"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://visustock.com/fr/nouvelle-page"/>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>

<url>
  <loc>https://visustock.com/en/nouvelle-page</loc>
  <xhtml:link rel="alternate" hreflang="fr" href="https://visustock.com/fr/nouvelle-page"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://visustock.com/en/nouvelle-page"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://visustock.com/fr/nouvelle-page"/>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

### Priorités recommandées

- `1.0` - Page d'accueil
- `0.9` - Marketplace / Pages principales
- `0.8` - Pages de catégories
- `0.7` - Pages de contenu
- `0.6` - Pages support/contact
- `0.5` - Pages légales
- `0.3` - Pages secondaires

### Fréquence de changement

- `hourly` - Marketplace (contenu dynamique)
- `daily` - Pages d'accueil
- `weekly` - Pages de catégories, pricing
- `monthly` - Pages support, légales
- `yearly` - Pages rarement modifiées

---

## 🤖 Robots.txt

Le fichier `public/robots.txt` est configuré pour :
- Autoriser tous les robots sur les pages publiques
- Bloquer les pages privées (dashboard, admin, checkout, cart)
- Référencer le sitemap.xml

```
User-agent: *
Allow: /

Disallow: /dashboard
Disallow: /admin
Disallow: /checkout
Disallow: /cart

Sitemap: https://visustock.com/sitemap.xml
```

---

## 📊 Schema.org / JSON-LD

Le système génère automatiquement les données structurées selon le type de page :

### Type 'website' (pages générales)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "VisuStock",
  "url": "https://visustock.com",
  "description": "...",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://visustock.com/marketplace?search={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### Type 'product' (pages produits)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Nom du produit",
  "description": "...",
  "image": "URL de l'image",
  "brand": {
    "@type": "Brand",
    "name": "VisuStock"
  },
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  },
  "creator": {
    "@type": "Person",
    "name": "Nom de l'auteur"
  }
}
```

---

## ✅ Checklist pour une nouvelle page SEO-friendly

- [ ] Importer et utiliser `useSEO` avec titre et description bilingues
- [ ] Titre optimisé (max 60 caractères, inclut mots-clés)
- [ ] Description optimisée (max 160 caractères, appel à l'action)
- [ ] Un seul `<h1>` par page avec le mot-clé principal
- [ ] Structure sémantique HTML5 (`<main>`, `<section>`, `<article>`, etc.)
- [ ] Toutes les images ont des attributs `alt` descriptifs
- [ ] Images en dessous du fold avec `loading="lazy"`
- [ ] Ajouter la page au `sitemap.xml` (FR et EN)
- [ ] Vérifier les balises hreflang (générées automatiquement)
- [ ] Tester avec Google Search Console / Bing Webmaster Tools
- [ ] Tester le partage sur Facebook/Twitter avec leurs debuggers

---

## 🔍 Outils de test SEO

### Google
- **Search Console** : https://search.google.com/search-console
- **Rich Results Test** : https://search.google.com/test/rich-results
- **Mobile-Friendly Test** : https://search.google.com/test/mobile-friendly

### Facebook
- **Sharing Debugger** : https://developers.facebook.com/tools/debug/

### Twitter
- **Card Validator** : https://cards-dev.twitter.com/validator

### Autres
- **PageSpeed Insights** : https://pagespeed.web.dev/
- **GTmetrix** : https://gtmetrix.com/
- **Lighthouse** (intégré dans Chrome DevTools)

---

## 🎓 Bonnes pratiques SEO

### Titres de page
- **Max 60 caractères** (sinon tronqué dans Google)
- Inclure le **mot-clé principal** au début
- Inclure le nom de la marque : "Titre - VisuStock"
- Unique pour chaque page

### Descriptions
- **Max 160 caractères** (sinon tronqué)
- Inclure un **appel à l'action**
- Résumer le contenu de la page
- Unique pour chaque page

### Images
- Format WebP ou JPEG optimisé
- Taille max 1 Mo par image
- Alt text descriptif avec mots-clés naturels
- Lazy loading pour images sous le fold

### Performance
- First Contentful Paint (FCP) < 1.8s
- Largest Contentful Paint (LCP) < 2.5s
- Cumulative Layout Shift (CLS) < 0.1
- Total Blocking Time (TBT) < 200ms

---

## 📞 Support

Pour toute question sur le SEO, contactez l'équipe technique ou consultez :
- [Google Search Central](https://developers.google.com/search)
- [Moz SEO Guide](https://moz.com/beginners-guide-to-seo)
- [Ahrefs Blog](https://ahrefs.com/blog/)

---

**Dernière mise à jour** : Janvier 2025  
**Responsable SEO** : Équipe VisuStock
