import { useMemo } from 'react';

interface VideoPricingParams {
  type: string;
  files: Array<{
    file_type: string;
    metadata?: any;
    file_name?: string;
    is_original: boolean;
  }>;
  selectedLicense: string;
  isAiGenerated?: boolean;
}

interface PricingConfig {
  resolutions: {
    HD: { basePrice: number; };
    '4K': { basePrice: number; };
  };
  licenses: {
    standard: { price: number; };
    extended: { price: number; };
    exclusive: { price: number; };
  };
}

const AI_VIDEO_BASE_PRICE = 10; // Fixed $10 for AI-generated videos

const PRICING_CONFIG: PricingConfig = {
  resolutions: {
    HD: { basePrice: 25 }, // $25 for HD (non-AI videos)
    '4K': { basePrice: 50 }, // $50 for 4K (non-AI videos)
  },
  licenses: {
    standard: { price: 15 }, // +$15 for standard license
    extended: { price: 45 }, // +$45 for extended license  
    exclusive: { price: 299 }, // +$299 for exclusive license
  }
};

export const useVideoPricing = ({ type, files, selectedLicense, isAiGenerated = false }: VideoPricingParams) => {
  const { resolution, basePrice, licensePrice, totalPrice } = useMemo(() => {
    // For non-videos, use license-only pricing
    if (type !== 'video') {
      const licensePrice = PRICING_CONFIG.licenses[selectedLicense as keyof typeof PRICING_CONFIG.licenses]?.price || 0;
      return {
        resolution: null,
        basePrice: 0,
        licensePrice,
        totalPrice: licensePrice
      };
    }

    // Detect video resolution
    const originalVideoFile = files.find(f => f.is_original && f.file_type.startsWith('video/'));
    let detectedResolution: 'HD' | '4K' = 'HD'; // Default HD

    if (originalVideoFile) {
      // Try to detect resolution from filename
      const fileName = originalVideoFile.file_name?.toLowerCase() || '';
      if (fileName.includes('4k') || fileName.includes('2160p') || fileName.includes('uhd')) {
        detectedResolution = '4K';
      } else if (originalVideoFile.metadata) {
        // Check metadata for resolution
        const width = originalVideoFile.metadata.width;
        const height = originalVideoFile.metadata.height;
        
        if (width >= 3840 || height >= 2160) {
          detectedResolution = '4K';
        }
      }
    }

    // AI videos have fixed $10 price, non-AI use resolution-based pricing
    const basePrice = isAiGenerated 
      ? AI_VIDEO_BASE_PRICE 
      : PRICING_CONFIG.resolutions[detectedResolution].basePrice;
    
    const licensePrice = PRICING_CONFIG.licenses[selectedLicense as keyof typeof PRICING_CONFIG.licenses]?.price || 0;
    const totalPrice = basePrice + licensePrice;

    return {
      resolution: detectedResolution,
      basePrice,
      licensePrice,
      totalPrice
    };
  }, [type, files, selectedLicense, isAiGenerated]);

  return {
    resolution,
    basePrice,
    licensePrice,
    totalPrice,
    isVideo: type === 'video'
  };
};