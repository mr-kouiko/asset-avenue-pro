import React from 'react';

interface VideoWatermarkProps {
  className?: string;
  size?: 'normal' | 'large' | 'thumbnail';
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ 
  className = "absolute inset-0 z-20 pointer-events-none flex items-center justify-center",
  size = 'normal'
}) => {
  // Define sizes for different contexts
  // Tight black drop shadow (80% opacity, small blur) creates a border effect for white backgrounds
  const tightShadow = 'drop-shadow(0 1px 1px rgba(0,0,0,0.2)) drop-shadow(0 -1px 1px rgba(0,0,0,0.2)) drop-shadow(1px 0 1px rgba(0,0,0,0.2)) drop-shadow(-1px 0 1px rgba(0,0,0,0.2))';
  
  const getSizeStyle = () => {
    switch (size) {
      case 'thumbnail':
        // 3x size for marketplace thumbnails - covers large portion
        return {
          width: '60%',
          height: 'auto',
          maxWidth: '80%',
          maxHeight: '80%',
          objectFit: 'contain' as const,
          filter: `${tightShadow} drop-shadow(0 4px 12px rgba(0,0,0,0.45))`,
          opacity: 1
        };
      case 'large':
        // 2x size for enlarged previews
        return {
          width: '40%',
          height: 'auto',
          maxWidth: '60%',
          maxHeight: '60%',
          objectFit: 'contain' as const,
          filter: `${tightShadow} drop-shadow(0 3px 10px rgba(0,0,0,0.35))`,
          opacity: 1
        };
      case 'normal':
      default:
        // Normal size for detailed view and fullscreen
        return {
          width: '20%',
          height: 'auto',
          maxWidth: '40%',
          maxHeight: '40%',
          objectFit: 'contain' as const,
          filter: `${tightShadow} drop-shadow(0 2px 8px rgba(0,0,0,0.28))`,
          opacity: 0.96
        };
    }
  };

  return (
    <div className={className}>
      <img 
        src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png"
        alt=""
        className="w-auto h-auto"
        style={getSizeStyle()}
      />
    </div>
  );
};