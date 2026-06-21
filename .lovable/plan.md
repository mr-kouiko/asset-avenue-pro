## Objectif
Ne plus afficher le contenu Pexels (section "Free Stock — Powered by Pexels") sur `/marketplace`. Le contenu Pexels restera uniquement accessible via la page dédiée `/free-stock-library`.

## Changements

**`src/pages/Marketplace.tsx`**
- Supprimer le bloc de rendu "Pexels Free Stock" (lignes ~377–391) et l'indicateur de chargement Pexels juste en dessous.
- Supprimer l'appel à `usePexelsSearch` et toutes les variables associées (`pexelsItems`, `pexelsLoading`, etc.).
- Supprimer les imports devenus inutiles (`PexelsCard`, `usePexelsSearch`, `Globe` si plus utilisé, `Separator` si plus utilisé).
- Ajuster la logique `showSectionHeaders` qui ne dépendra plus que de la coexistence Premium + Free Creator.
- Conserver les sections "Premium Assets" et "Free Creator Assets" inchangées.

## Hors scope
- `/free-stock-library` n'est pas touchée (Pexels y reste visible).
- Aucun changement backend, aucune modification du redirect `?price=free` → `/free-stock-library`.
- Aucune modification de l'onglet "Free Stock" de la home (qui montre déjà du contenu interne `useFreeContent`, pas Pexels).

## Vérification
- Charger `/marketplace` (toutes catégories + onglet vidéos) : aucune carte Pexels, aucun header "Free Stock — Powered by Pexels", aucun loader Pexels.
- Charger `/free-stock-library` : Pexels toujours présent.
