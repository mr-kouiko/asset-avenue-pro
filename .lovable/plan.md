Plan de rollback ciblé pour la modification liée au produit “blue screen”.

1. Ne pas annuler toute l’architecture vidéo
- Je ne toucherai pas au gros changement “sans Render/FFmpeg” sauf demande explicite.
- Je ne réactiverai pas l’ancien blocage “watermarked MP4 preview required”.

2. Supprimer la rectification documentaire ajoutée après l’épisode blue video
- Retirer `.lovable/plan.md`, qui contient le plan/diagnostic lié au produit `highway-aerial...` et mentionne l’ancien modèle avec preview obligatoire.
- Ce fichier peut semer la confusion car il contredit l’architecture actuelle où les vidéos peuvent être lues depuis l’original avec watermark CSS.

3. Revenir sur le comportement dangereux introduit/renforcé autour de cet épisode si présent
- Vérifier `src/hooks/useProductDetail.tsx` pour éviter qu’un produit vidéo cassé bloque la logique d’upload/publication.
- Garder le fallback vidéo original actuel si c’est l’architecture validée, mais ne pas remettre de garde qui exige `preview_path`.

4. Corriger le vrai risque visible dans le publish vidéo
- Dans `src/hooks/useProductManager.tsx`, conserver `preview_path = null` pour les vidéos, mais éviter que la détection de dimensions (`getVideoDimensions(submission.file.url)`) fasse échouer la publication si le navigateur ne peut pas décoder le fichier.
- La détection est déjà dans un `try/catch`, donc je vérifierai seulement qu’aucune erreur non capturée ne remonte.

5. Vérification
- Confirmer que plus aucun code ne contient le message “Video preview not ready — cannot publish”.
- Confirmer que la publication vidéo n’exige pas `preview_path`.
- Si l’upload échoue encore, il faudra lire le message exact du toast ou les logs réseau du nouvel essai, car la suppression du produit blue screen seule ne peut pas casser l’upload.

Effet attendu : supprimer la dernière trace/rectification liée au diagnostic blue video sans réintroduire l’ancien pipeline FFmpeg/preview MP4.