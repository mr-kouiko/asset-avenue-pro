
# Plan de correction : Message "uploads interrompus" erroné

## Diagnostic

Le message "2 uploads interrompus" apparaît à cause d'un **bug de timing** dans le système de backup sessionStorage :

### Scénario problématique

```text
1. Uploads démarrent → sessionStorage contient 2 fichiers actifs
2. Parent re-render → SimpleFileUpload est remonté
3. Nouveau composant monte avec files = []
4. useEffect de récupération lit sessionStorage → Trouve 2 fichiers
5. Affiche "2 uploads interrompus" MAIS ces uploads se sont peut-être terminés correctement
```

### Cause racine

Le nettoyage du sessionStorage dépend du state `files` qui est **réinitialisé à vide** lors d'un remontage. Le composant ne peut pas distinguer :
- Un vrai crash/interruption (fichiers non terminés)
- Un remontage après uploads réussis (fichiers terminés côté serveur)

## Solution proposée

### 1. Vérifier si les fichiers existent vraiment avant d'afficher l'avertissement

Modifier l'effet de récupération pour vérifier dans la base de données si les fichiers ont été uploadés avec succès.

**Fichier : `src/components/SimpleFileUpload.tsx`**

```typescript
// ANTI-REMOUNT PROTECTION: Warn user ONLY if uploads were truly interrupted
useEffect(() => {
  const checkInterruptedUploads = async () => {
    const saved = sessionStorage.getItem(ACTIVE_UPLOADS_KEY);
    if (!saved) return;
    
    try {
      const activeUploads = JSON.parse(saved);
      if (activeUploads.length === 0) {
        sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
        return;
      }
      
      // CRITICAL: Check if these uploads actually completed
      // If they exist in uploaded_files table, they weren't truly interrupted
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
        return;
      }
      
      // Query recent uploads to see if these files completed
      const recentTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // Last 10 mins
      const { data: recentFiles } = await supabase
        .from('uploaded_files')
        .select('file_name')
        .eq('user_id', user.id)
        .gte('created_at', recentTime);
      
      const completedNames = new Set((recentFiles || []).map(f => f.file_name));
      const trulyInterrupted = activeUploads.filter(
        (u: { name: string }) => !completedNames.has(u.name)
      );
      
      if (trulyInterrupted.length > 0) {
        toast.warning(`⚠️ ${trulyInterrupted.length} upload(s) interrompu(s) - veuillez réessayer`);
      }
    } catch (e) {
      console.error('Failed to verify interrupted uploads:', e);
    }
    
    // Always clear after checking
    sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
  };
  
  checkInterruptedUploads();
}, []);
```

### 2. Ajouter un timestamp au backup pour éviter les faux positifs

**Fichier : `src/components/SimpleFileUpload.tsx`**

```typescript
// BACKUP: Save active uploads with timestamp
useEffect(() => {
  const activeUploads = files.filter(f => 
    f.status === 'uploading' || f.status === 'processing' || 
    f.status === 'detecting-ai' || f.status === 'checking-duplicate'
  );
  
  if (activeUploads.length > 0) {
    sessionStorage.setItem(ACTIVE_UPLOADS_KEY, JSON.stringify({
      timestamp: Date.now(),
      files: activeUploads.map(f => ({
        id: f.id,
        name: f.file.name,
        progress: f.progress,
        status: f.status
      }))
    }));
  } else {
    sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
  }
}, [files]);
```

### 3. Ignorer les backups trop anciens

```typescript
// Dans checkInterruptedUploads:
const backupData = JSON.parse(saved);
const backupAge = Date.now() - (backupData.timestamp || 0);

// Ignore backups older than 10 minutes (uploads likely completed or abandoned)
if (backupAge > 10 * 60 * 1000) {
  sessionStorage.removeItem(ACTIVE_UPLOADS_KEY);
  return;
}
```

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/components/SimpleFileUpload.tsx` | Vérification DB avant avertissement, timestamp backup, expiration |

## Résumé

Le problème vient du fait que le système de protection affiche un avertissement **sans vérifier** si les uploads ont réellement échoué. La solution :

1. **Vérifier dans la base de données** si les fichiers existent avant d'alerter l'utilisateur
2. **Ajouter un timestamp** au backup pour ignorer les données périmées
3. **Toujours nettoyer** le sessionStorage après vérification
