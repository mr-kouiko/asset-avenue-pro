## Constat

Le pipeline serveur (`docker/ffmpeg-api` `/process`) encode déjà la vidéo entière (capée à 60s, ce qui = la limite d'upload du projet → donc équivalent à "vidéo complète"). Le client (`useVideoPreviewGenerator.ts`) cible déjà `video.duration` complet.

**Mais** le diagnostic du tour précédent a montré que ~6 previews vidéo sur 8 échantillonnées sont des MP4 d'**1 seule frame (0.033s, 60–96 KB)** — résidus d'anciennes générations côté navigateur où MediaRecorder s'est arrêté prématurément. Ces fichiers passent quand même le filtre marketplace (`preview_quality='preview_available'`) et c'est ce qui donne l'impression que "la preview ne joue pas" sur des produits comme `elephantrock-alula-saudiarabia-desert-rockformation`.

La règle voulue : **chaque preview watermarkée doit faire la même durée que l'original (cap 60s)**.

## Plan

### 1. Nouvelle Edge Function `audit-broken-previews`
- Liste tous les `content_files` vidéo avec `preview_path` non-null
- Pour chaque preview : `HEAD` → si `Content-Length < 200 KB`, télécharge les premiers 256 KB et appelle un nouveau `POST /probe` du Docker FFmpeg API qui renvoie `{ duration, width, height }`
- Si `previewDuration < sourceDuration - 1s` OU `previewDuration < 2s` → `UPDATE content_files SET preview_path = NULL, preview_quality = NULL WHERE id = ...`
- Le trigger DB existant repassera automatiquement la submission en `processing_preview`
- Rapport JSON : `{ scanned, broken, reset, kept }`

### 2. Endpoint `POST /probe` dans `docker/ffmpeg-api/server.js`
Wrapper léger autour de `ffprobe -show_entries format=duration:stream=width,height` à partir d'une URL distante (téléchargement partiel via Range si possible), retourne `{ duration, width, height, sizeBytes }`.

### 3. Filet de sécurité dans `batch-backfill-previews/index.ts` (ligne 245)
Remplacer `if (videoBytes.length < 1000)` par :
- minimum **200 KB**
- ET `ffprobe` local (le Docker `/process` renvoie déjà l'en-tête `X-Preview-Duration` et `X-Source-Duration` → exposer aussi `X-Source-Duration` côté Docker, et rejeter en Edge Function si `preview < source - 1s`)

Bonus : passer la `Source-Duration` cible explicitement au Docker `/process` pour qu'il échoue plutôt que de tronquer.

### 4. UI Admin
Dans `AdminVideoBackfill.tsx`, ajouter un bouton **« 1. Audit & Reset Broken Previews »** au-dessus du bouton de backfill existant, avec progression (scanned/broken/reset). L'admin clique ensuite sur **« 2. Backfill Missing Previews »** déjà en place pour relancer la génération full-length serveur.

### 5. Vérification
- Re-tester `elephantrock-alula-saudiarabia-desert-rockformation` : preview doit jouer du début à la fin de la vidéo originale
- Re-échantillonner 10 produits vidéo aléatoires, confirmer `previewDuration ≈ sourceDuration` partout
- Compter en SQL : `SELECT COUNT(*) FROM content_files WHERE preview_path IS NOT NULL AND … (size proxy)` → 0 cassée

## Fichiers touchés

- **Nouveau** : `supabase/functions/audit-broken-previews/index.ts`
- **Modif** : `docker/ffmpeg-api/server.js` (ajout `/probe`, header `X-Source-Duration`)
- **Modif** : `supabase/functions/batch-backfill-previews/index.ts` (validation taille + durée minimale = source - 1s)
- **Modif** : `src/components/admin/AdminVideoBackfill.tsx` (bouton + progression audit)

Aucune migration SQL, aucune modif marketplace/UI publique. Pas de changement de la logique d'upload (déjà full-length côté client + serveur).