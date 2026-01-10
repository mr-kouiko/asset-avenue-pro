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

const PRICING_CONFIG: PricingConfig = {
  resolutions: {
    HD: { basePrice: 10 }, // 10$ pour HD (AI videos)
    '4K': { basePrice: 10 }, // 10$ pour 4K (AI videos)
  },
  licenses: {
    standard: { price: 15 }, // +15€ pour licence standard
    extended: { price: 45 }, // +45€ pour licence étendue  
    exclusive: { price: 299 }, // +299€ pour licence exclusive
  }
};

export const useVideoPricing = ({ type, files, selectedLicense }: VideoPricingParams) => {
  const { resolution, basePrice, licensePrice, totalPrice } = useMemo(() => {
    // Par défaut, pour les non-vidéos, utiliser l'ancien système
    if (type !== 'video') {
      const licensePrice = PRICING_CONFIG.licenses[selectedLicense as keyof typeof PRICING_CONFIG.licenses]?.price || 0;
      return {
        resolution: null,
        basePrice: 0,
        licensePrice,
        totalPrice: licensePrice
      };
    }

    // Détecter la résolution de la vidéo
    const originalVideoFile = files.find(f => f.is_original && f.file_type.startsWith('video/'));
    let detectedResolution: 'HD' | '4K' = 'HD'; // Défaut HD

    if (originalVideoFile) {
      // Essayer de détecter la résolution depuis le nom de fichier
      const fileName = originalVideoFile.file_name?.toLowerCase() || '';
      if (fileName.includes('4k') || fileName.includes('2160p') || fileName.includes('uhd')) {
        detectedResolution = '4K';
      } else if (originalVideoFile.metadata) {
        // Si on a des métadonnées, vérifier la résolution
        const width = originalVideoFile.metadata.width;
        const height = originalVideoFile.metadata.height;
        
        if (width >= 3840 || height >= 2160) {
          detectedResolution = '4K';
        }
      }
    }

    const basePrice = PRICING_CONFIG.resolutions[detectedResolution].basePrice;
    const licensePrice = PRICING_CONFIG.licenses[selectedLicense as keyof typeof PRICING_CONFIG.licenses]?.price || 0;
    const totalPrice = basePrice + licensePrice;

    return {
      resolution: detectedResolution,
      basePrice,
      licensePrice,
      totalPrice
    };
  }, [type, files, selectedLicense]);

  return {
    resolution,
    basePrice,
    licensePrice,
    totalPrice,
    isVideo: type === 'video'
  };
};