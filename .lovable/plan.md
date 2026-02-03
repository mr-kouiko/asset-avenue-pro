
# Plan de correction : Disparition des uploads en cours

## Diagnostic du problème

L'analyse du code révèle **plusieurs causes probables** de la disparition des uploads en cours :

### Cause principale : Re-render du composant qui réinitialise l'état local

Le composant `SimpleFileUpload.tsx` stocke les fichiers en cours d'upload dans un état local React (`useState`). Si le composant parent (`FileUpload.tsx`) se re-render, le composant enfant peut être démonté et remonté, **perdant tout l'état des uploads en cours**.

**Problèmes identifiés :**

1. **FileUpload.tsx - Effet de bord potentiel (lignes 48-86)** :
   - Le `useEffect` d'initialisation charge les drafts et récupère les fichiers orphelins
   - Si `loadDrafts()` ou `recoverOrphanedUploads()` provoquent un re-render via `setDrafts()`, cela peut réinitialiser `SimpleFileUpload`

2. **useDraftManager.tsx - `setDrafts` dans `loadDrafts` (ligne 209)** :
   - Appeler `setDrafts(draftsWithFiles)` déclenche un re-render du parent
   - Si cela arrive pendant un upload, le composant `SimpleFileUpload` perd son état

3. **SimpleFileUpload.tsx - État local volatil (ligne 52)** :
   - `const [files, setFiles] = useState<UploadFile[]>([])` est réinitialisé à chaque remontage
   - Aucune persistance de l'état d'upload en cours

### Scénarios de reproduction

```text
1. Utilisateur sélectionne 5 fichiers → Upload démarre
2. Pendant l'upload, une fonction async (loadDrafts, recoverOrphanedUploads) termine
3. setDrafts() est appelé → FileUpload.tsx re-render
4. SimpleFileUpload est remonté → files = [] → Uploads "disparaissent"
```

---

## Solution proposée

### 1. Stabiliser le composant FileUpload avec useRef pour l'état critique

Empêcher les re-renders du parent de perturber les uploads en cours.

**Fichier : `src/pages/FileUpload.tsx`**

```typescript
// Ajouter une ref pour tracker si des uploads sont en cours
const isUploadingRef = useRef(false);

// Modifier handleFilesUploaded pour tracker l'état d'upload
const handleFilesUploaded = async (files: UploadedFileData[]) => {
  isUploadingRef.current = true;
  // ... logique existante ...
  isUploadingRef.current = false;
};

// Modifier l'initialisation pour ne pas recharger si upload en cours
useEffect(() => {
  if (hasInitialized.current || isUploadingRef.current) return;
  // ...
}, []);
```

### 2. Ajouter une clé stable au composant SimpleFileUpload

Empêcher le remontage accidentel du composant.

**Fichier : `src/pages/FileUpload.tsx`**

```tsx
// Utiliser une clé stable basée sur le session/user pour éviter les remontages
<SimpleFileUpload 
  key="simple-file-upload-stable"  // Clé fixe pour éviter remontage
  onFilesUploaded={handleFilesUploaded} 
  maxFiles={100} 
  maxFileSize={1000} 
/>
```

### 3. Mémoriser les callbacks avec useCallback stable

Éviter que les changements de référence des callbacks ne provoquent des re-renders.

**Fichier : `src/pages/FileUpload.tsx`**

```typescript
// Utiliser useCallback avec dépendances stables
const handleFilesUploaded = useCallback(async (files: UploadedFileData[]) => {
  // Utiliser refs au lieu de state pour les valeurs qui changent
}, [ensureDraftExists]);  // Dépendances minimales
```

### 4. Différer les mises à jour d'état non-critiques

Éviter les `setDrafts` pendant les uploads.

**Fichier : `src/hooks/useDraftManager.tsx`**

```typescript
// Option: retourner les données sans setDrafts si demandé
const loadDrafts = useCallback(async (options?: { skipStateUpdate?: boolean }): Promise<DraftProduct[]> => {
  // ...
  if (!options?.skipStateUpdate) {
    setDrafts(draftsWithFiles);
  }
  return draftsWithFiles;
}, []);
```

### 5. Ajouter une protection anti-remontage dans SimpleFileUpload

Persister l'état d'upload en cours dans sessionStorage comme backup.

**Fichier : `src/components/SimpleFileUpload.tsx`**

```typescript
// Sauvegarder l'état des uploads actifs
useEffect(() => {
  if (files.some(f => f.status === 'uploading' || f.status === 'processing')) {
    sessionStorage.setItem('activeUploads', JSON.stringify(
      files.filter(f => f.status !== 'completed').map(f => ({
        id: f.id,
        name: f.file.name,
        progress: f.progress,
        status: f.status
      }))
    ));
  }
}, [files]);

// Avertir l'utilisateur si des uploads étaient en cours
useEffect(() => {
  const saved = sessionStorage.getItem('activeUploads');
  if (saved) {
    const activeUploads = JSON.parse(saved);
    if (activeUploads.length > 0) {
      toast.warning(`⚠️ ${activeUploads.length} upload(s) interrompu(s) - veuillez réessayer`);
      sessionStorage.removeItem('activeUploads');
    }
  }
}, []);
```

---

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/pages/FileUpload.tsx` | Ajouter `isUploadingRef`, clé stable, mémorisation callbacks |
| `src/components/SimpleFileUpload.tsx` | Backup sessionStorage, protection anti-remontage |
| `src/hooks/useDraftManager.tsx` | Option `skipStateUpdate` pour `loadDrafts` |

---

## Résumé technique

Le problème vient d'un **re-render du composant parent** pendant les uploads, causé par des mises à jour d'état asynchrones (`setDrafts`). La solution consiste à :

1. **Stabiliser les références** des composants et callbacks
2. **Différer les mises à jour d'état** non-critiques pendant les uploads
3. **Ajouter un backup sessionStorage** pour détecter les interruptions
4. **Utiliser des refs** pour tracker l'état d'upload sans provoquer de re-renders
