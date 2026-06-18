## Pourquoi le logo n'est pas utilisé

Le composant `src/components/VideoWatermark.tsx` (le seul overlay watermark vidéo depuis la suppression du pipeline FFmpeg) génère un SVG inline avec le **texte** "VISUSTOCK" répété en diagonale. Il n'a jamais référencé d'image/logo — aucun `<img>`, aucun import d'asset. C'est purement du texte CSS, donc le PNG d'`imgur.com/UsTmDOl.png` n'est utilisé nulle part.

## Plan : remplacer le texte par le logo VisuStock

1. **Télécharger le logo** depuis `https://i.imgur.com/UsTmDOl.png` et l'enregistrer comme asset local `src/assets/watermark-logo.png` (asset bundlé, pas de dépendance imgur en runtime).

2. **Réécrire `VideoWatermark.tsx`** pour tuiler ce logo au lieu du SVG texte :
   - Import ES6 du PNG.
   - `backgroundImage: url(logo)`, `backgroundRepeat: repeat`, `backgroundSize` adapté à la taille (`thumbnail` ~140px, `normal` ~200px, `large` ~260px).
   - Rotation diagonale : appliquer `transform: rotate(-28deg) scale(1.4)` sur un div interne (le scale évite les bords vides après rotation).
   - Opacité ~0.30 (thumbnail), 0.25 (normal/large) via `opacity` sur le div tuilé.
   - Conserver `mix-blend-mode: overlay`, `pointer-events: none`, `position: absolute inset-0`, `z-20`.
   - Garder la même API (`size`, `className`) pour ne rien casser dans `WatermarkedVideoThumbnail`, `WatermarkedGallery`, `UniversalVideoPlayer`, `VideoPlayer`, `MediaPlayer`, `ProductDetail`.
   - La prop `text` devient inutile — la retirer (ou l'ignorer silencieusement).

3. **Vérifier le rendu** sur :
   - Carte marketplace (hover vidéo → `WatermarkedVideoThumbnail`).
   - Page produit vidéo (player principal).
   - Galerie plein écran (`WatermarkedGallery`).

## Points à confirmer

- **Couleur du logo** : le PNG d'imgur est-il déjà en blanc/clair adapté à `mix-blend-mode: overlay` sur des vidéos sombres et claires ? Si le logo est multicolore ou sombre, je peux soit le convertir en version blanche semi-transparente, soit passer en `mix-blend-mode: difference` pour qu'il reste lisible sur tous les fonds.
- **Densité** : préférez-vous un seul gros logo centré (style Shutterstock) ou le motif diagonal répété actuel (style Adobe Stock) — mais avec le logo ?
