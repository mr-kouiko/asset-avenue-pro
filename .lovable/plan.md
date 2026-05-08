## Objectif

Reconnecter le service Render `ffmpeg-api-mjba` au repo GitHub Lovable (au lieu de `mr-kouiko/ffmpeg-api`) pour que toute modification du code FFmpeg dans Lovable se déploie automatiquement.

## Étapes côté Render (à faire par toi)

1. Va sur https://dashboard.render.com → ouvre le service **ffmpeg-api-mjba**.
2. Onglet **Settings** → section **Build & Deploy** → **Repository** → clique **Disconnect**.
3. Clique **Connect a repository** → choisis le compte GitHub où Lovable a poussé le projet → sélectionne le repo Lovable (probablement `mr-kouiko/visustock` ou nom similaire — le repo principal Lovable, pas `mr-kouiko/ffmpeg-api`).
4. Configure :
   - **Branch** : `main`
   - **Root Directory** : `docker/ffmpeg-api`
   - **Dockerfile Path** : `Dockerfile` (relatif au root directory)
   - **Auto-Deploy** : `Yes`
5. Vérifie l'onglet **Environment** → la variable `FFMPEG_API_KEY` doit toujours être présente (sinon, regénère-la avec `openssl rand -hex 32` et ajoute-la aussi dans les secrets Supabase Lovable).
6. Clique **Save Changes** → Render lance automatiquement un nouveau déploiement à partir du code Lovable.

## Vérification après déploiement

Une fois Render passé en "Live", je testerai (depuis le sandbox) :

- `GET https://ffmpeg-api-mjba.onrender.com/health` → doit retourner `{"status":"ok","ffmpeg":true}`
- `POST /thumbnail` sans body → doit retourner `"videoUrl is required"` (et non `"No URL provided"`)
- `POST /process` sans header Bearer → doit retourner `401 Unauthorized`

Si les 3 réponses sont correctes, le code Lovable est bien déployé.

## Étapes finales côté Lovable (après confirmation)

1. Vérifier les secrets Supabase :
   - `FFMPEG_API_URL` = `https://ffmpeg-api-mjba.onrender.com`
   - `FFMPEG_API_KEY` = même valeur que sur Render
2. Tester depuis l'admin :
   - `Admin → Settings → Regenerate Video Thumbnails` (sur 1-2 vidéos d'abord).
   - `Admin → Video Backfill → Dry Run` puis backfill réel.
3. Si OK, le système de previews 720p watermarkées et de thumbnails est opérationnel et **toute future modif Lovable de `docker/ffmpeg-api/server.js` se déploiera automatiquement sur Render**.

## Ce que tu peux faire si tu ne trouves pas le bon repo Lovable

Dis-moi le nom exact du repo Lovable (visible dans l'onglet GitHub de Lovable, menu **+** → GitHub), je te guide pas à pas.
