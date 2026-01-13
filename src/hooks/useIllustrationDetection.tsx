import { useState, useCallback } from 'react';

interface IllustrationDetectionResult {
  isIllustration: boolean;
  confidence: number;
  indicators: string[];
}

interface DetectionOptions {
  fileName?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

// Keywords that strongly indicate illustration/artwork content
const ILLUSTRATION_KEYWORDS = [
  // Style keywords
  'illustration', 'illust', 'drawing', 'artwork', 'art-', 
  'vector', 'design', 'cartoon', 'comic', 'icon', 'logo',
  'graphic', 'sketch', 'digital-art', 'digitalart', 'painted',
  'paint', 'anime', 'manga', 'clipart', 'hand-drawn', 'handdrawn',
  // Artistic style keywords (pop art, etc.)
  'pop art', 'popart', 'pop-art', 'retro', 'stylized', 'artistic',
  'abstract', 'surreal', 'fantasy', 'watercolor', 'oil painting',
  'acrylic', 'pastel', 'charcoal', 'pencil drawing', 'ink drawing',
  'graffiti', 'street art', 'concept art', 'character design',
  'storyboard', 'comic style', 'comic book', 'graphic novel',
  'minimalist', 'flat design', 'isometric', 'low poly', '3d render',
  'cgi', 'digital painting', 'matte painting', 'pixel art', 'voxel',
  'bold graphics', 'bold colors', 'vibrant colors', 'neon', 
  'geometric', 'psychedelic', 'trippy', 'kaleidoscope',
  'art deco', 'art nouveau', 'bauhaus', 'cubism', 'impressionist',
  'expressionist', 'modernist', 'contemporary art', 'fine art',
  // Animation/motion graphics keywords
  'animation', 'animated', 'motion graphics', 'motion design',
  // Vector/graphic specific
  'vector style', 'vector art', 'svg', 'eps', 'ai file',
  'infographic', 'diagram', 'chart design', 'icon set',
  // Character/creature art
  'character art', 'creature design', 'monster design', 'mascot',
  'avatar', 'portrait illustration', 'caricature'
];

// Check if text contains illustration keywords
const checkTextForIllustrationKeywords = (text: string): { found: string[]; score: number } => {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  for (const keyword of ILLUSTRATION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      found.push(keyword);
    }
  }
  
  // Score based on number of keywords found (diminishing returns)
  const score = found.length > 0 ? Math.min(0.6, 0.25 + (found.length - 1) * 0.1) : 0;
  
  return { found, score };
};

export const useIllustrationDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);

  /**
   * Analyzes an image to determine if it's an illustration vs a photograph.
   * Uses multiple heuristics:
   * 1. Title/description/tags keyword analysis (strongest indicator)
   * 2. Filename keyword hints
   * 3. Color distribution - illustrations typically have fewer unique colors
   * 4. Edge characteristics - illustrations have cleaner, sharper edges
   * 5. Color gradients - photos have smoother gradients, illustrations have flat colors
   */
  const detectIllustration = useCallback(async (
    imageUrl: string, 
    fileNameOrOptions?: string | DetectionOptions
  ): Promise<IllustrationDetectionResult | null> => {
    setIsDetecting(true);
    
    // Normalize options
    const options: DetectionOptions = typeof fileNameOrOptions === 'string' 
      ? { fileName: fileNameOrOptions }
      : fileNameOrOptions || {};
    
    try {
      const indicators: string[] = [];
      let score = 0;
      
      // Heuristic 1: Check title for illustration keywords (HIGH PRIORITY)
      if (options.title) {
        const titleCheck = checkTextForIllustrationKeywords(options.title);
        if (titleCheck.found.length > 0) {
          score += titleCheck.score;
          indicators.push(`Title contains: ${titleCheck.found.slice(0, 3).join(', ')}`);
          console.log(`🎨 [ILLUSTRATION-DETECTION] Title keywords found: ${titleCheck.found.join(', ')}`);
        }
      }
      
      // Heuristic 2: Check description for illustration keywords
      if (options.description) {
        const descCheck = checkTextForIllustrationKeywords(options.description);
        if (descCheck.found.length > 0) {
          score += descCheck.score * 0.8; // Slightly less weight than title
          indicators.push(`Description contains: ${descCheck.found.slice(0, 3).join(', ')}`);
          console.log(`🎨 [ILLUSTRATION-DETECTION] Description keywords found: ${descCheck.found.join(', ')}`);
        }
      }
      
      // Heuristic 3: Check tags for illustration keywords (HIGHEST PRIORITY for tags)
      if (options.tags && options.tags.length > 0) {
        const tagsText = options.tags.join(' ');
        const tagsCheck = checkTextForIllustrationKeywords(tagsText);
        if (tagsCheck.found.length > 0) {
          // Tags are very reliable - if user tagged it with art styles, trust them
          score += Math.min(0.7, tagsCheck.score * 1.2);
          indicators.push(`Tags contain: ${tagsCheck.found.slice(0, 4).join(', ')}`);
          console.log(`🎨 [ILLUSTRATION-DETECTION] Tag keywords found: ${tagsCheck.found.join(', ')}`);
        }
      }
      
      // Heuristic 4: Check filename for illustration hints
      if (options.fileName) {
        const lowerName = options.fileName.toLowerCase();
        
        // SVG files are always illustrations
        if (lowerName.endsWith('.svg')) {
          setIsDetecting(false);
          return {
            isIllustration: true,
            confidence: 1.0,
            indicators: ['SVG format detected - vector illustration']
          };
        }
        
        const fileCheck = checkTextForIllustrationKeywords(lowerName);
        if (fileCheck.found.length > 0) {
          score += 0.3;
          indicators.push(`Filename contains "${fileCheck.found[0]}"`);
        }
      }
      
      // Heuristic 5: Analyze image pixels (only if we don't have strong text signals)
      // Skip expensive pixel analysis if we already have high confidence from metadata
      if (score < 0.5) {
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
          
          // NEW: High saturation with high edge sharpness often indicates digital art
          if (imageAnalysis.edgeSharpness > 0.5 && imageAnalysis.saturationUniformity > 0.4) {
            score += 0.1;
            indicators.push('Digital art characteristics detected');
          }
        }
      } else {
        indicators.push('High confidence from metadata - pixel analysis skipped');
      }
      
      // Clamp score to 0-1 range
      const confidence = Math.min(1, Math.max(0, score));
      const isIllustration = confidence >= 0.4;
      
      console.log(`🎨 [ILLUSTRATION-DETECTION] File: ${options.fileName}, Score: ${confidence.toFixed(2)}, Is Illustration: ${isIllustration}`);
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
