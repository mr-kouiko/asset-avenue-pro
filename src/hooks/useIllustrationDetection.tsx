import { useState, useCallback } from 'react';

interface IllustrationDetectionResult {
  isIllustration: boolean;
  confidence: number;
  indicators: string[];
}

export const useIllustrationDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);

  /**
   * Analyzes an image to determine if it's an illustration vs a photograph.
   * Uses multiple heuristics:
   * 1. Color distribution - illustrations typically have fewer unique colors
   * 2. Edge characteristics - illustrations have cleaner, sharper edges
   * 3. Color gradients - photos have smoother gradients, illustrations have flat colors
   * 4. File metadata hints from name
   */
  const detectIllustration = useCallback(async (
    imageUrl: string, 
    fileName?: string
  ): Promise<IllustrationDetectionResult | null> => {
    setIsDetecting(true);
    
    try {
      const indicators: string[] = [];
      let score = 0;
      
      // Heuristic 1: Check filename for illustration hints
      if (fileName) {
        const lowerName = fileName.toLowerCase();
        const illustrationKeywords = [
          'illustration', 'illust', 'drawing', 'artwork', 'art-', 
          'vector', 'design', 'cartoon', 'comic', 'icon', 'logo',
          'graphic', 'sketch', 'digital-art', 'digitalart', 'painted',
          'paint', 'anime', 'manga', 'clipart', 'hand-drawn', 'handdrawn'
        ];
        
        for (const keyword of illustrationKeywords) {
          if (lowerName.includes(keyword)) {
            score += 0.3;
            indicators.push(`Filename contains "${keyword}"`);
            break;
          }
        }
        
        // SVG files are always illustrations
        if (lowerName.endsWith('.svg')) {
          setIsDetecting(false);
          return {
            isIllustration: true,
            confidence: 1.0,
            indicators: ['SVG format detected - vector illustration']
          };
        }
      }
      
      // Heuristic 2: Analyze image pixels
      const imageAnalysis = await analyzeImageCharacteristics(imageUrl);
      
      if (imageAnalysis) {
        // Low unique color ratio suggests illustration (flat colors)
        if (imageAnalysis.uniqueColorRatio < 0.15) {
          score += 0.25;
          indicators.push('Limited color palette (flat colors)');
        }
        
        // High edge contrast suggests illustration (sharp lines)
        if (imageAnalysis.edgeSharpness > 0.7) {
          score += 0.2;
          indicators.push('Sharp, clean edges detected');
        }
        
        // Low color variance in regions suggests illustration (solid fills)
        if (imageAnalysis.colorVariance < 20) {
          score += 0.2;
          indicators.push('Solid color regions detected');
        }
        
        // High saturation uniformity suggests illustration
        if (imageAnalysis.saturationUniformity > 0.6) {
          score += 0.15;
          indicators.push('Uniform saturation levels');
        }
        
        // Check for transparency (common in illustrations)
        if (imageAnalysis.hasTransparency) {
          score += 0.2;
          indicators.push('Image has transparency');
        }
      }
      
      // Clamp score to 0-1 range
      const confidence = Math.min(1, Math.max(0, score));
      const isIllustration = confidence >= 0.4;
      
      console.log(`🎨 [ILLUSTRATION-DETECTION] File: ${fileName}, Score: ${confidence.toFixed(2)}, Is Illustration: ${isIllustration}`);
      console.log(`🎨 [ILLUSTRATION-DETECTION] Indicators:`, indicators);
      
      setIsDetecting(false);
      return {
        isIllustration,
        confidence,
        indicators
      };
      
    } catch (error) {
      console.error('🎨 [ILLUSTRATION-DETECTION] Error:', error);
      setIsDetecting(false);
      return null;
    }
  }, []);

  return { detectIllustration, isDetecting };
};

/**
 * Analyzes image characteristics using canvas
 */
async function analyzeImageCharacteristics(imageUrl: string): Promise<{
  uniqueColorRatio: number;
  edgeSharpness: number;
  colorVariance: number;
  saturationUniformity: number;
  hasTransparency: boolean;
} | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        
        // Use a smaller sample size for performance
        const maxDimension = 200;
        const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const totalPixels = canvas.width * canvas.height;
        
        // Analyze unique colors (sample every Nth pixel for performance)
        const colorSet = new Set<string>();
        const sampleRate = Math.max(1, Math.floor(totalPixels / 5000));
        let hasTransparency = false;
        let totalSaturation = 0;
        const saturations: number[] = [];
        
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Check transparency
          if (a < 255) {
            hasTransparency = true;
          }
          
          // Quantize colors to reduce noise (group similar colors)
          const qr = Math.floor(r / 32) * 32;
          const qg = Math.floor(g / 32) * 32;
          const qb = Math.floor(b / 32) * 32;
          colorSet.add(`${qr},${qg},${qb}`);
          
          // Calculate saturation
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          saturations.push(saturation);
          totalSaturation += saturation;
        }
        
        const sampledPixels = Math.ceil(totalPixels / sampleRate);
        const uniqueColorRatio = colorSet.size / 256; // Normalized against max possible quantized colors
        
        // Calculate color variance using regional sampling
        const regionSize = 10;
        let totalVariance = 0;
        let regionCount = 0;
        
        for (let ry = 0; ry < canvas.height - regionSize; ry += regionSize) {
          for (let rx = 0; rx < canvas.width - regionSize; rx += regionSize) {
            const regionColors: number[] = [];
            for (let y = ry; y < ry + regionSize && y < canvas.height; y++) {
              for (let x = rx; x < rx + regionSize && x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4;
                const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                regionColors.push(gray);
              }
            }
            
            // Calculate variance for this region
            const mean = regionColors.reduce((a, b) => a + b, 0) / regionColors.length;
            const variance = regionColors.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / regionColors.length;
            totalVariance += variance;
            regionCount++;
          }
        }
        
        const avgVariance = regionCount > 0 ? totalVariance / regionCount : 50;
        
        // Calculate edge sharpness using Sobel-like operator
        let edgeSum = 0;
        let edgeCount = 0;
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            const leftIdx = (y * canvas.width + (x - 1)) * 4;
            const rightIdx = (y * canvas.width + (x + 1)) * 4;
            const topIdx = ((y - 1) * canvas.width + x) * 4;
            const bottomIdx = ((y + 1) * canvas.width + x) * 4;
            
            const leftGray = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
            const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
            const topGray = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
            const bottomGray = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
            
            const gx = Math.abs(rightGray - leftGray);
            const gy = Math.abs(bottomGray - topGray);
            const edge = Math.sqrt(gx * gx + gy * gy);
            
            // Count strong edges (sharp transitions)
            if (edge > 50) {
              edgeSum += edge > 100 ? 1 : 0.5;
            }
            edgeCount++;
          }
        }
        
        const edgeSharpness = edgeCount > 0 ? Math.min(1, edgeSum / (edgeCount * 0.1)) : 0;
        
        // Calculate saturation uniformity
        const avgSaturation = totalSaturation / saturations.length;
        const saturationVariance = saturations.reduce((sum, s) => sum + Math.pow(s - avgSaturation, 2), 0) / saturations.length;
        const saturationUniformity = 1 - Math.min(1, saturationVariance * 10);
        
        resolve({
          uniqueColorRatio,
          edgeSharpness,
          colorVariance: avgVariance,
          saturationUniformity,
          hasTransparency
        });
        
      } catch (error) {
        console.error('Image analysis error:', error);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image for analysis');
      resolve(null);
    };
    
    img.src = imageUrl;
  });
}
