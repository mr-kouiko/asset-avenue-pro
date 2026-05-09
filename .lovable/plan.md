# Synchroniser Render avec le code FFmpeg de Lovable

## Constat

Le repo GitHub `mr-kouiko/visite-now-agency-site` (connecté à Render) contient un `server.js` **totalement différent** de celui maintenu dans Lovable (`docker/ffmpeg-api/server.js`):

- Pas de route `/process` (donc pas de previews 720p watermarkées)
- Pas d'authentification Bearer (`FFMPEG_API_KEY` non vérifié)
- Pas de validation qualité (luma, scènes, anti-frames noires)
- Utilise `fluent-ffmpeg` au lieu de `execFile` natif

Render déploie fidèlement ce repo — le problème n'est pas Render, c'est que **le bon code n'est pas dans ce repo**.

## Deux options (à choisir)

### Option A — Recommandée: Connecter Render au repo Lovable

Avantage: chaque modif Lovable de `docker/ffmpeg-api/` se déploie automatiquement sur Render. Plus jamais de désync.

Étapes côté Render:
1. Render Dashboard → service `ffmpeg-api-mjba` → Settings → Build & Deploy
2. Repository → **Disconnect** → **Connect a repository**
3. Choisir le repo GitHub Lovable (visible dans Lovable → menu **+** → GitHub — c'est le repo principal du projet VisuStock, **pas** `visite-now-agency-site`)
4. Configurer:
   - Branch: `main`
   - Root Directory: `docker/ffmpeg-api`
   - Dockerfile Path: `Dockerfile`
   - Auto-Deploy: Yes
5. Vérifier Environment → `FFMPEG_API_KEY` toujours présent
6. Save → Manual Deploy

### Option B — Remplacer le contenu du repo `visite-now-agency-site`

Avantage: pas de reconfig Render. Inconvénient: il faudra **recopier manuellement** chaque future modif Lovable.

Étapes:
1. Dans `visite-now-agency-site/ffmpeg-api/`, remplacer:
   - `server.js` → contenu de `docker/ffmpeg-api/server.js` (565 lignes, fourni par Lovable)
   - `package.json` → contenu de `docker/ffmpeg-api/package.json` (dépendances: `express`, `uuid` uniquement)
   - `Dockerfile` → contenu de `docker/ffmpeg-api/Dockerfile`
2. Push sur `main` → Render redéploie automatiquement
3. Vérifier Render → Environment → `FFMPEG_API_KEY` présent (sinon `openssl rand -hex 32` puis l'ajouter aussi dans Supabase secrets Lovable)

## Vérification après déploiement (je la fais)

```
GET  /health    → {"status":"ok","ffmpeg":true}      (et non juste {"status":"ok"})
POST /thumbnail → 401 Unauthorized                    (sans Bearer)
POST /process   → 401 Unauthorized                    (sans Bearer — et non 404)
```

Si les 3 réponses sont OK, le code Lovable est en prod et je pourrai lancer le backfill des previews.

## Question pour toi

Laquelle des deux options préfères-tu? (Option A est de loin la plus saine sur le long terme.)
