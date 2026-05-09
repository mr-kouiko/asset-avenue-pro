Le service Render visible sur la capture est encore configuré comme une app Node/Bun (`WEB SERVICE Node`, log `Running 'yarn start'`). Pour ce projet, Render doit déployer le Dockerfile situé dans `docker/ffmpeg-api` du repo `mr-kouiko/asset-avenue-pro`.

Plan d’action côté Render :

1. Ouvrir Render → service `ffmpeg-api` → `Settings`.
2. Dans `Build & Deploy`, vérifier/remplacer le repo par :
   - `mr-kouiko/asset-avenue-pro`
   - branche `main`
3. Corriger la configuration de build :
   - Runtime / Environment : `Docker` et non `Node`
   - Root Directory : `docker/ffmpeg-api`
   - Dockerfile Path : `Dockerfile`
   - Build Command : vide
   - Start Command : vide
4. Dans `Environment`, garder/ajouter :
   - `FFMPEG_API_KEY`
5. Sauvegarder puis lancer :
   - `Manual Deploy` → `Clear build cache & deploy`
6. Quand le deploy est `Live`, je relancerai les tests attendus :
   - `GET /health` doit retourner `{"status":"ok","ffmpeg":true}`
   - `POST /thumbnail` sans Bearer doit retourner `401`
   - `POST /process` sans Bearer doit retourner `401`

Point important : si Render ne permet pas de changer le runtime Node vers Docker sur ce service existant, il faut créer un nouveau Web Service Docker depuis `mr-kouiko/asset-avenue-pro`, avec `Root Directory = docker/ffmpeg-api`, puis utiliser sa nouvelle URL comme `FFMPEG_API_URL` dans Supabase.