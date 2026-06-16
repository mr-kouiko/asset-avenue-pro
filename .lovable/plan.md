## Problème confirmé

Dans `src/components/AudioHeroPlayer.tsx` (fonction `handleDownloadWatermarked`), le watermark est mixé via un `GainNode` à `0.8` pendant que la piste principale joue à pleine échelle (pas de gain appliqué → ~1.0). Résultat : le watermark est noyé sous la musique dans le WAV téléchargé, alors que dans le lecteur web (`useAudioWatermark`) il joue via un `<audio>` séparé à `WATERMARK_RELATIVE_VOLUME * mainVolume = 1.0 * volume`, donc beaucoup plus audible.

## Correctif proposé

Dans `handleDownloadWatermarked` :

1. **Baisser légèrement la piste principale** via un `GainNode` (ex. `0.7`) pour faire de la place au watermark (ducking statique).
2. **Monter le watermark** à `1.0` (au lieu de `0.8`).
3. Optionnel : démarrer le premier watermark à `t = 2s` (déjà le cas) et garder l'intervalle de 15s.

Effet : ratio watermark/musique passe de ~0.8 à ~1.43 → watermark clairement audible dans le fichier téléchargé, cohérent avec le rendu du lecteur web.

Aucun autre fichier modifié, aucune logique métier touchée, pas de changement DB.

## Détails techniques

```ts
// Main source avec gain réduit
const mainGain = offlineContext.createGain();
mainGain.gain.value = 0.7;
mainSource.connect(mainGain).connect(offlineContext.destination);

// Watermark à volume plein
gainNode.gain.value = 1.0;
```
