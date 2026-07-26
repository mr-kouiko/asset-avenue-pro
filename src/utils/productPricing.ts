/**
 * VisuStock marketplace pricing rules.
 * Single source of truth — used by publish flow AND validated by tests.
 * The database has NO default price; the app MUST always compute one.
 */

export type PricingInput = {
  mimeType?: string | null;
  fileName?: string | null;
  isFreeContent?: boolean;
};

export const PRICE_VIDEO = 20.00;
export const PRICE_VFX = 20.00;
export const PRICE_VECTOR = 4.99;
export const PRICE_AUDIO = 4.99;
export const PRICE_PDF = 3.99;
export const PRICE_IMAGE = 2.99;
export const PRICE_DEFAULT = 2.99;

export function computeProductPrice(input: PricingInput): number {
  if (input.isFreeContent) return 0;

  const mime = (input.mimeType || '').toLowerCase();
  const name = (input.fileName || '').toLowerCase();

  const isArchive = mime.includes('rar') || mime.includes('zip')
    || name.endsWith('.rar') || name.endsWith('.zip');
  const isVector = mime === 'image/svg+xml' || name.endsWith('.svg');
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');
  const isImage = mime.startsWith('image/') && !isVector;

  if (isVideo) return PRICE_VIDEO;
  if (isArchive) return PRICE_VFX;
  if (isVector) return PRICE_VECTOR;
  if (isAudio) return PRICE_AUDIO;
  if (isPdf) return PRICE_PDF;
  if (isImage) return PRICE_IMAGE;
  return PRICE_DEFAULT;
}

/** Throws if price is invalid. Used as final safeguard before DB insert. */
export function assertValidPrice(price: unknown): asserts price is number {
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    throw new Error(
      `Publish blocked: invalid product price (${String(price)}). This should never happen — please retry.`
    );
  }
}
