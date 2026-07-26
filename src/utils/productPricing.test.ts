import { describe, it, expect } from 'vitest';
import {
  computeProductPrice,
  assertValidPrice,
  PRICE_VIDEO,
  PRICE_VFX,
  PRICE_VECTOR,
  PRICE_AUDIO,
  PRICE_PDF,
  PRICE_IMAGE,
  PRICE_DEFAULT,
} from './productPricing';

describe('computeProductPrice — marketplace pricing rules', () => {
  it('free content is always 0', () => {
    expect(computeProductPrice({ mimeType: 'video/mp4', fileName: 'x.mp4', isFreeContent: true })).toBe(0);
    expect(computeProductPrice({ mimeType: 'image/jpeg', fileName: 'x.jpg', isFreeContent: true })).toBe(0);
  });

  it('videos = $20', () => {
    expect(computeProductPrice({ mimeType: 'video/mp4', fileName: 'clip.mp4' })).toBe(PRICE_VIDEO);
    expect(computeProductPrice({ mimeType: 'video/quicktime', fileName: 'clip.mov' })).toBe(PRICE_VIDEO);
    expect(PRICE_VIDEO).toBe(20.00);
  });

  it('VFX archives (zip/rar) = $20', () => {
    expect(computeProductPrice({ mimeType: 'application/zip', fileName: 'pack.zip' })).toBe(PRICE_VFX);
    expect(computeProductPrice({ mimeType: 'application/x-rar-compressed', fileName: 'pack.rar' })).toBe(PRICE_VFX);
    expect(computeProductPrice({ mimeType: '', fileName: 'PACK.ZIP' })).toBe(PRICE_VFX);
    expect(PRICE_VFX).toBe(20.00);
  });

  it('vectors (SVG) = $4.99', () => {
    expect(computeProductPrice({ mimeType: 'image/svg+xml', fileName: 'icon.svg' })).toBe(PRICE_VECTOR);
    expect(computeProductPrice({ mimeType: '', fileName: 'icon.SVG' })).toBe(PRICE_VECTOR);
    expect(PRICE_VECTOR).toBe(4.99);
  });

  it('audio = $4.99', () => {
    expect(computeProductPrice({ mimeType: 'audio/mpeg', fileName: 'song.mp3' })).toBe(PRICE_AUDIO);
    expect(computeProductPrice({ mimeType: 'audio/wav', fileName: 'song.wav' })).toBe(PRICE_AUDIO);
    expect(PRICE_AUDIO).toBe(4.99);
  });

  it('PDFs = $3.99', () => {
    expect(computeProductPrice({ mimeType: 'application/pdf', fileName: 'book.pdf' })).toBe(PRICE_PDF);
    expect(PRICE_PDF).toBe(3.99);
  });

  it('images = $2.99', () => {
    expect(computeProductPrice({ mimeType: 'image/jpeg', fileName: 'a.jpg' })).toBe(PRICE_IMAGE);
    expect(computeProductPrice({ mimeType: 'image/png', fileName: 'a.png' })).toBe(PRICE_IMAGE);
    expect(computeProductPrice({ mimeType: 'image/webp', fileName: 'a.webp' })).toBe(PRICE_IMAGE);
    expect(PRICE_IMAGE).toBe(2.99);
  });

  it('unknown types fall back to default (never NULL)', () => {
    const p = computeProductPrice({ mimeType: '', fileName: '' });
    expect(typeof p).toBe('number');
    expect(p).toBe(PRICE_DEFAULT);
  });

  it('never returns null/undefined/NaN for any reasonable input', () => {
    const inputs = [
      { mimeType: null, fileName: null },
      { mimeType: undefined, fileName: undefined },
      { mimeType: 'garbage/type', fileName: 'file.xyz' },
    ];
    for (const i of inputs) {
      const p = computeProductPrice(i as any);
      expect(p).not.toBeNull();
      expect(p).not.toBeUndefined();
      expect(Number.isNaN(p)).toBe(false);
      expect(p).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('assertValidPrice — publish safeguard', () => {
  it('accepts valid non-negative numbers', () => {
    expect(() => assertValidPrice(0)).not.toThrow();
    expect(() => assertValidPrice(2.99)).not.toThrow();
    expect(() => assertValidPrice(20)).not.toThrow();
  });

  it('rejects null/undefined/NaN/negative to prevent bad publishes', () => {
    expect(() => assertValidPrice(null)).toThrow();
    expect(() => assertValidPrice(undefined)).toThrow();
    expect(() => assertValidPrice(NaN)).toThrow();
    expect(() => assertValidPrice(-1)).toThrow();
    expect(() => assertValidPrice('2.99' as any)).toThrow();
  });
});
