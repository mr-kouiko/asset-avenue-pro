import { usePayPalSubscription } from './usePayPalSubscription';

/**
 * Infinity subscription grants unlimited downloads for these content types only:
 *   - Photos  (type 'image', category 'photo')
 *   - Audio   (type 'audio', category 'audio')
 *   - Vectors (type 'vector', category 'vector')
 *
 * NOT eligible: video, vfx, ebook.
 */
export const INFINITY_ELIGIBLE_TYPES = new Set(['image', 'photo', 'audio', 'vector']);

export function isInfinityEligibleType(
  type?: string | null,
  categoryName?: string | null
): boolean {
  const t = (type || '').toLowerCase();
  const c = (categoryName || '').toLowerCase();
  return INFINITY_ELIGIBLE_TYPES.has(t) || INFINITY_ELIGIBLE_TYPES.has(c);
}

/**
 * Hook: true iff the current user has an active Infinity subscription AND
 * the (optional) asset type/category is Infinity-eligible.
 */
export function useInfinityAccess(type?: string | null, categoryName?: string | null) {
  const { subscribed, subscription, loading } = usePayPalSubscription();

  const isActive =
    subscribed && subscription?.plan_type === 'infinity' && subscription?.status === 'active';

  const eligible = isInfinityEligibleType(type, categoryName);

  return {
    loading,
    isInfinityActive: !!isActive,
    isEligibleType: eligible,
    hasInfinityAccess: !!isActive && eligible,
  };
}
