
Objectif (répondre à ta question)
- Oui, les vendeurs uploaderont les gros fichiers vers le stockage “de ta plateforme” (Cloudflare R2 dans l’approche choisie).
- Non, ils n’ont pas besoin d’un compte Cloudflare, ni d’accès à ton dashboard Cloudflare.
- Et surtout: ce n’est pas “ton serveur” qui reçoit 134MB/2GB puis renvoie. Le flux est “navigateur du vendeur → Cloudflare R2” en direct, grâce à des URLs signées temporaires que TON backend (Edge Function) génère. Donc:
  - pas de bande passante/CPU serveur chez toi pour le transfert,
  - seulement du stockage/ops chez R2 (et c’est normal pour une marketplace, comme YouTube/Amazon/etc).

Pourquoi “Chunk 1 upload failed after retry” arrive (analyse basée sur le code actuel)
1) Header interdit côté navigateur
- Dans `StreamingUploadHandler.uploadToR2Chunked()`, le PUT part envoie:
  - `Content-Length: ...`
- En navigateur, `Content-Length` est un “forbidden header”. Résultat typique: `TypeError: Failed to fetch` dès la première requête PUT (donc “Chunk/Part 1” tombe systématiquement, même avant que la signature/TTL n’ait une chance d’être en cause).

2) CORS R2 potentiellement pas correctement configuré
- Même avec un code parfait, le PUT cross-origin vers `https://<accountId>.r2.cloudflarestorage.com/...` nécessite une CORS policy sur le bucket R2.
- Sans CORS: le navigateur bloque (souvent “Failed to fetch”), ce qui ressemble exactement à un échec du premier chunk.
- En plus, pour lire l’ETag (obligatoire pour `CompleteMultipartUpload`), il faut `ExposeHeaders: ["ETag"]`. Sans ça, tu peux uploader mais ton JS ne verra pas l’ETag.

3) Risque d’expiration (TTL) si on pré-génère toutes les URLs
- L’Edge Function renvoie une liste de URLs pré-signées pour toutes les parts (`presignedUrls`) avec `X-Amz-Expires=3600`.
- Pour un très gros fichier / connexion lente, les URLs des parts “tardives” peuvent expirer avant utilisation.
- Aujourd’hui, on ne régénère une URL que “en cas de retry” (retryCount > 0). Si une URL est simplement expirée au moment où on l’utilise (sans qu’il y ait eu un retry préalable), on va échouer.

Ce que je propose (solution production-grade, sans “forcer les vendeurs à avoir Cloudflare”)
A) Corriger immédiatement la cause la plus probable des échecs “part 1”
1. Retirer `Content-Length` des headers côté navigateur
- Laisser le navigateur gérer la longueur. Ne jamais set `Content-Length` manuellement.
- Garder le PUT le plus simple possible (souvent: pas de headers du tout, ou juste `Content-Type` si nécessaire).

2. Améliorer les logs/erreurs client pour distinguer:
- CORS/network (`TypeError: Failed to fetch`)
- erreur HTTP 403/400 (signature, permissions, URL invalid)
- absence d’ETag (CORS ExposeHeaders manquant)

B) Solidifier la stratégie “URLs signées fraîches” (anti-expiration + retry robuste)
1. Ne plus pré-générer toutes les URLs de parts dans `initiate`
- Changer le protocole:
  - `initiate` renvoie seulement: `uploadId`, `objectKey`, `expiresInDefault`
  - Le client appelle `get-part-url` juste avant chaque PUT (ou par batch).
- Avantages:
  - chaque chunk a une URL fraîche (tu as ta “confirmation” demandée),
  - pas de risque d’expiration pendant que l’utilisateur upload,
  - payload plus petit, moins de mémoire.

2. Retry: toujours régénérer l’URL avant un retry
- Actuellement c’est déjà fait sur retryCount > 0, mais on le rend systématique et on ajoute une règle:
  - si HTTP 403/SignatureDoesNotMatch → régénération immédiate + retry
  - si TypeError réseau/CORS → message clair + retry exponentiel

C) Valider la compatibilité multipart R2 (chunk size / partNumber / headers)
1. Chunk size
- R2/S3 multipart: min 5MB par part (sauf la dernière).
- Garder 10MB est compatible.
- Pour gros fichiers (≥1GB), proposer 16MB ou 32MB pour réduire le nombre de parts (meilleure perf + moins d’ETags à gérer).
- Ajouter une logique adaptative basée sur la taille totale (et éventuellement la vitesse réseau).

2. Part numbers
- Déjà 1-indexé côté client (`uploadPart(j+1)`), conforme.
- On s’assure que l’ordre de `CompleteMultipartUpload` est trié (déjà fait côté Edge Function).

3. Headers envoyés au PUT
- Recommandation: aucun header custom (sauf éventuellement `Content-Type`).
- Ne jamais envoyer `Content-Range` (pas utilisé en multipart S3).
- Ne jamais forcer `Content-Length`.

D) CORS R2: checklist exacte (indispensable pour direct-from-browser)
Action à faire dans Cloudflare Dashboard > R2 > Bucket > CORS:
- AllowedOrigins: mettre au minimum tes domaines (preview + prod), idéalement pas `*` en prod si tu veux verrouiller.
  - `https://asset-avenue-pro.lovable.app`
  - `https://id-preview--16f1c953-e544-4d64-89fe-944c9700640e.lovable.app`
  - (et ton vrai domaine si tu en as un)
- AllowedMethods: `PUT`, `GET`, `HEAD`
- AllowedHeaders: au moins `content-type` (et éventuellement `*` si tu veux simplifier)
- ExposeHeaders: `ETag`
- MaxAgeSeconds: 3600

E) UX / Résilience “marketplace-grade”
1. Progress précis
- Passer d’un progress “par parts complétées” à “bytes uploadés”, pour un progress fluide.
- Calculer speed/time remaining sur bytes réellement envoyés.

2. Pause / Resume (au moins dans la session)
- Conserver en mémoire:
  - `uploadId`, `objectKey`
  - mapping `partNumber → ETag` pour les parts déjà envoyées
- Pause: stop lancement des nouvelles parts + AbortController sur les fetch en cours.
- Resume: reprendre uniquement les parts manquantes.

3. (Option avancée) Resume après refresh / crash
- Stocker l’état dans `sessionStorage`/`indexedDB`.
- Ajouter une action Edge Function `list-parts` (appel API S3 ListParts signé côté serveur) pour reconstruire l’état même si le navigateur a perdu les ETags.

Fichiers à modifier (quand tu approuves l’implémentation)
- `src/components/media/StreamingUploadHandler.tsx`
  - supprimer `Content-Length`
  - ajuster headers PUT
  - basculer en “get-part-url juste-in-time”
  - instrumentation erreurs + progress bytes
- `supabase/functions/r2-presigned-upload/index.ts`
  - modifier `initiate` pour ne plus renvoyer toutes les URLs (ou garder backward-compatible via flag)
  - éventuellement augmenter TTL par défaut (ex: 6h) et/ou rendre TTL paramétrable
  - ajouter `list-parts` si on fait la reprise avancée
  - renforcer CORS headers côté function (pour les calls depuis le navigateur vers Supabase Functions)
- (Optionnel) centraliser l’upload large dans un hook partagé si plusieurs composants uploadent des gros fichiers.

Plan de validation (preuve que c’est “production-grade”)
1) Test CORS: depuis le navigateur vendeur, un PUT part doit retourner 200 + ETag lisible (response.headers.get('ETag') non null).
2) Test retry:
- simuler coupure réseau / throttle, vérifier que:
  - un retry régénère bien une URL (`get-part-url`) et réussit,
  - la progression reprend sans repartir de zéro.
3) Test TTL:
- lancer un upload long, vérifier que les parts envoyées tardivement utilisent des URLs récentes (générées juste avant envoi).
4) Test part-size:
- fichier ~134MB, puis ~1-2GB, vérifier min 5MB ok et nombre de parts acceptable.
5) Test UX:
- progress fluide, temps restant plausible, pause/resume fonctionne.

Point important (business/architecture)
- Dans une marketplace, que les uploads aillent vers “ton stockage” est la norme. L’alternative “chaque vendeur apporte son propre S3/R2” est possible, mais c’est un produit complètement différent (onboarding vendeur avec clés, risques de suppression, quotas, uniformité CDN, support client, etc.). Si tu veux cette option “BYO storage”, je peux faire un plan séparé, mais ce n’est pas la solution standard pour stabiliser les uploads.

Questions de clarification (pour verrouiller la bonne direction)
1) Tu confirmes que tu veux un stockage centralisé géré par la plateforme (VisuStock) et pas un stockage “par vendeur” ?
2) Pour la CORS policy R2, tu préfères:
   - “verrouillée” (uniquement tes domaines), ou
   - “ouverte” (`*`) pour démarrer plus vite ?
