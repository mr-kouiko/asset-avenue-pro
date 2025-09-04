import React from 'react';

interface VideoWatermarkProps {
  className?: string;
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ 
  className = "absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
}) => {
  return (
    <div className={className}>
      <img 
        src="https://kdgfpophpoqugtuvfxqx.supabase.co/storage/v1/object/public/LOGO%20DE%20WATERMARKING/Blue%20Modern%20Sound%20Studio%20Logo%20(3).png"
        alt=""
        className="w-auto h-auto opacity-80"
        style={{ 
          width: '20vmin',
          height: 'auto',
          maxWidth: '40%',
          maxHeight: '40%',
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};