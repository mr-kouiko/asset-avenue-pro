## Objectif

Supprimer toute la détection AI automatique :
- Plus de scan dans le navigateur pendant l'upload (modèles ONNX, SightEngine, Gemini fallback).
- Plus d'appel à l'edge function `scan-content` après publication.
- Les nouvelles soumissions passent directement en `pending_review` (modération admin manuelle classique).

On **garde** :
- La déclaration AI du vendeur (champ `ai_declaration` sur le formulaire).
- L'affichage côté admin des anciens résultats `detection_results` (historique non détruit).
- Les tables `detection_results` et statuts existants en DB (aucune migration destructive).

## Changements

### 1. `src/hooks/useProductManager.tsx`
- Remplacer `status: 'pending_scan'` par `status: 'pending_review'` aux deux endroits (création + update du draft).
- Supprimer tout le bloc « Trigger server-side AI content scan » (lignes ~331-353), incluant le `fetch` vers `scan-content`.

### 2. `src/components/SimpleFileUpload.tsx`
- Retirer les imports `useAIImageDetection` / `useAIVideoDetection` et leurs hooks.
- Supprimer le bloc « AUTOMATIC AI DETECTION » (lignes ~443-507).
- Forcer `isAiGenerated = false` et `aiConfidence = 0` (valeurs neutres), ou simplement ne plus passer ces champs dans la suite (vérifier qu'ils restent optionnels en aval — sinon mettre `false`).
- Retirer le statut intermédiaire `'detecting-ai'`.

### 3. `src/pages/ProductManagement.tsx`
- Retirer imports `useAIImageDetection` / `useAIVideoDetection`.
- Supprimer la fonction `handleReanalyzeAI` et le bouton « Re-analyze » associé dans le JSX (à localiser par recherche `handleReanalyzeAI` / `isReanalyzing`).
- Retirer les états `isDetectingImage`, `isDetectingVideo`, `isReanalyzing` s'ils ne servent plus.

### 4. Hooks supprimés
- `src/hooks/useAIImageDetection.tsx` → supprimer.
- `src/hooks/useAIVideoDetection.tsx` → supprimer.

### 5. Edge functions désactivées (code conservé, plus appelé)
- `supabase/functions/scan-content/` : laisser le code en place pour ne rien casser, mais le client ne l'appelle plus.
- `supabase/functions/retry-pending-scans/` : devient inutile. Option A (recommandée) : la laisser dormante. Option B : la supprimer via `supabase--delete_edge_functions`. → On choisit A pour limiter le risque.
- Aucune modification de `supabase/config.toml`.

## Hors périmètre (intentionnel)

- On ne touche pas à la queue admin `AdminModerationQueue` ni à `AdminIntegrityPanel` : ils continuent d'afficher correctement les soumissions et les anciens scores. Les nouvelles soumissions arriveront simplement en `pending_review` sans `detection_results`, ce que l'UI gère déjà (`score != null ? ... : 'n/a'`).
- On ne supprime ni la table `detection_results` ni les statuts `pending_scan` / `scan_failed` / `*_ai_assisted` en DB (préservation de l'historique).
- La déclaration vendeur (`ai_declaration`) reste collectée et stockée.

## Vérification après build

1. Upload d'une image → pas d'étape « detecting-ai », arrive en `pending_review` côté admin.
2. Pas d'appel réseau à `/functions/v1/scan-content` dans Network.
3. Anciennes soumissions avec scores existants restent affichées correctement dans la queue admin.
