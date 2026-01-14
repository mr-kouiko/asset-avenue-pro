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
   * Uses ONLY pixel-based analysis - NO keyword detection.
   * 
   * Heuristics:
   * 1. Color distribution - illustrations have fewer unique colors (flat fills)
   * 2. Edge characteristics - illustrations have cleaner, sharper edges
   * 3. Flat region ratio - illustrations have large uniform color areas
   * 4. Saturation uniformity - illustrations have more uniform saturation
   * 5. Transparency - illustrations often have alpha channels
   */
  const detectIllustration = useCallback(async (
    imageUrl: string
  ): Promise<IllustrationDetectionResult | null> => {
    setIsDetecting(true);
    
    try {
      const indicators: string[] = [];
      let score = 0;
      
      // Analyze image pixels - the ONLY detection method
      const imageAnalysis = await analyzeImageCharacteristics(imageUrl);
      
      if (!imageAnalysis) {
        setIsDetecting(false);
        return null;
      }

      // === FLAT REGION RATIO (strongest indicator) ===
      // Illustrations have large flat-color areas, photos have texture everywhere
      if (imageAnalysis.flatRegionRatio > 0.6) {
        score += 0.35;
        indicators.push(`Very high flat-color areas (${(imageAnalysis.flatRegionRatio * 100).toFixed(0)}%)`);
      } else if (imageAnalysis.flatRegionRatio > 0.45) {
        score += 0.25;
        indicators.push(`High flat-color areas (${(imageAnalysis.flatRegionRatio * 100).toFixed(0)}%)`);
      } else if (imageAnalysis.flatRegionRatio > 0.3) {
        score += 0.1;
        indicators.push(`Moderate flat-color areas`);
      }
      
      // === UNIQUE COLOR RATIO ===
      // Illustrations use limited palettes, photos have millions of colors
      if (imageAnalysis.uniqueColorRatio < 0.08) {
        score += 0.25;
        indicators.push('Very limited color palette');
      } else if (imageAnalysis.uniqueColorRatio < 0.15) {
        score += 0.15;
        indicators.push('Limited color palette');
      } else if (imageAnalysis.uniqueColorRatio > 0.35) {
        // High color count strongly suggests photo
        score -= 0.15;
        indicators.push('High color variation (photo-like)');
      }
      
      // === EDGE SHARPNESS ===
      // Illustrations have crisp, defined edges; photos have soft gradients
      if (imageAnalysis.edgeSharpness > 0.75) {
        score += 0.2;
        indicators.push('Very sharp, clean edges');
      } else if (imageAnalysis.edgeSharpness > 0.5) {
        score += 0.1;
        indicators.push('Clean edges detected');
      } else if (imageAnalysis.edgeSharpness < 0.25) {
        // Very soft edges suggest photo
        score -= 0.1;
        indicators.push('Soft edges (photo-like)');
      }
      
      // === COLOR VARIANCE ===
      // Low variance in regions = solid fills (illustration)
      // High variance = texture/noise (photo)
      if (imageAnalysis.colorVariance < 15) {
        score += 0.2;
        indicators.push('Solid color regions (low variance)');
      } else if (imageAnalysis.colorVariance < 25) {
        score += 0.1;
        indicators.push('Relatively uniform colors');
      } else if (imageAnalysis.colorVariance > 50) {
        // High variance strongly suggests photo
        score -= 0.15;
        indicators.push('High texture/variance (photo-like)');
      }
      
      // === SATURATION UNIFORMITY ===
      // Illustrations have consistent saturation levels
      if (imageAnalysis.saturationUniformity > 0.7) {
        score += 0.15;
        indicators.push('Very uniform saturation');
      } else if (imageAnalysis.saturationUniformity > 0.5) {
        score += 0.08;
        indicators.push('Uniform saturation levels');
      }
      
      // === TRANSPARENCY ===
      // Transparency is common in illustrations/graphics
      if (imageAnalysis.hasTransparency) {
        score += 0.2;
        indicators.push('Image has transparency');
      }
      
      // === COMBINED SIGNALS ===
      // Strong illustration: flat regions + sharp edges + limited colors
      if (imageAnalysis.flatRegionRatio > 0.4 && 
          imageAnalysis.edgeSharpness > 0.45 && 
          imageAnalysis.uniqueColorRatio < 0.2) {
        score += 0.15;
        indicators.push('Combined digital art characteristics');
      }
      
      // Strong photo: high variance + many colors + soft edges
      if (imageAnalysis.colorVariance > 40 && 
          imageAnalysis.uniqueColorRatio > 0.25 && 
          imageAnalysis.edgeSharpness < 0.4) {
        score -= 0.2;
        indicators.push('Combined photographic characteristics');
      }
      
      // Clamp score to 0-1 range
      const confidence = Math.min(1, Math.max(0, score));
      
      // Threshold for illustration classification
      // 0.4 = need moderate evidence, not just any signal
      const isIllustration = confidence >= 0.4;
      
      console.log(`🎨 [PIXEL-DETECTION] Score: ${confidence.toFixed(2)}, Is Illustration: ${isIllustration}`);
      console.log(`🎨 [PIXEL-DETECTION] Raw values:`, {
        flatRegionRatio: imageAnalysis.flatRegionRatio.toFixed(3),
        uniqueColorRatio: imageAnalysis.uniqueColorRatio.toFixed(3),
        edgeSharpness: imageAnalysis.edgeSharpness.toFixed(3),
        colorVariance: imageAnalysis.colorVariance.toFixed(1),
        saturationUniformity: imageAnalysis.saturationUniformity.toFixed(3),
        hasTransparency: imageAnalysis.hasTransparency
      });
      console.log(`🎨 [PIXEL-DETECTION] Indicators:`, indicators);
      
      setIsDetecting(false);
      return {
        isIllustration,
        confidence,
        indicators
      };
      
    } catch (error) {
      console.error('🎨 [PIXEL-DETECTION] Error:', error);
      setIsDetecting(false);
      return null;
    }
  }, []);

  const detectIllustrationFromFile = useCallback(async (
    file: File
  ): Promise<IllustrationDetectionResult | null> => {
    const objectUrl = URL.createObjectURL(file);
    try {
      return await detectIllustration(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }, [detectIllustration]);

  return { detectIllustration, detectIllustrationFromFile, isDetecting };
};

/**
 * Analyzes image characteristics using canvas - pure pixel analysis
 */
async function analyzeImageCharacteristics(imageUrl: string): Promise<{
  uniqueColorRatio: number;
  edgeSharpness: number;
  colorVariance: number;
  saturationUniformity: number;
  hasTransparency: boolean;
  flatRegionRatio: number;
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
        
        // Use a larger sample size for better accuracy
        const maxDimension = 300;
        const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const totalPixels = canvas.width * canvas.height;
        
        // Analyze unique colors (sample every Nth pixel for performance)
        const colorSet = new Set<string>();
        const sampleRate = Math.max(1, Math.floor(totalPixels / 8000));
        let hasTransparency = false;
        let totalSaturation = 0;
        const saturations: number[] = [];
        
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Check transparency
          if (a < 250) {
            hasTransparency = true;
          }
          
          // Quantize colors to reduce noise (group similar colors)
          const qr = Math.floor(r / 24) * 24;
          const qg = Math.floor(g / 24) * 24;
          const qb = Math.floor(b / 24) * 24;
          colorSet.add(`${qr},${qg},${qb}`);
          
          // Calculate saturation
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          saturations.push(saturation);
          totalSaturation += saturation;
        }
        
        // Max possible quantized colors: (256/24)^3 ≈ 1331
        const uniqueColorRatio = colorSet.size / 1000;
        
        // Calculate color variance using regional sampling
        const regionSize = 8;
        let totalVariance = 0;
        let regionCount = 0;
        let flatRegionCount = 0;
        
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

            // Count "flat" regions: low variance = solid colors
            if (variance < 12) flatRegionCount++;
          }
        }
        
        const avgVariance = regionCount > 0 ? totalVariance / regionCount : 50;
        const flatRegionRatio = regionCount > 0 ? flatRegionCount / regionCount : 0;
        
        // Calculate edge sharpness using Sobel-like operator
        let strongEdgeCount = 0;
        let edgeCount = 0;
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            
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
            if (edge > 60) {
              strongEdgeCount++;
            }
            edgeCount++;
          }
        }
        
        const edgeSharpness = edgeCount > 0 ? Math.min(1, (strongEdgeCount / edgeCount) * 15) : 0;
        
        // Calculate saturation uniformity
        const avgSaturation = saturations.length > 0 ? totalSaturation / saturations.length : 0;
        const saturationVariance = saturations.length > 0 
          ? saturations.reduce((sum, s) => sum + Math.pow(s - avgSaturation, 2), 0) / saturations.length 
          : 0;
        const saturationUniformity = 1 - Math.min(1, saturationVariance * 8);
        
        resolve({
          uniqueColorRatio,
          edgeSharpness,
          colorVariance: avgVariance,
          saturationUniformity,
          hasTransparency,
          flatRegionRatio,
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
