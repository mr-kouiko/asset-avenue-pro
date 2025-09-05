import React, { useState } from 'react';
import { VideoWatermark } from './VideoWatermark';

interface WatermarkedGalleryProps {
  items: Array<{
    id: string;
    type: 'image' | 'video';
    previewUrl: string;
    fullscreenUrl: string;
    title: string;
  }>;
}

export const WatermarkedGallery: React.FC<WatermarkedGalleryProps> = ({ items }) => {
  const [fullscreenItem, setFullscreenItem] = useState<string | null>(null);

  const openFullscreen = (itemId: string) => {
    setFullscreenItem(itemId);
  };

  const closeFullscreen = () => {
    setFullscreenItem(null);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="relative group cursor-pointer" onClick={() => openFullscreen(item.id)}>
            {item.type === 'image' ? (
              <img
                src={item.previewUrl}
                alt={item.title}
                className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
              />
            ) : (
              <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <video
                  src={item.previewUrl}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
                {/* Always show large watermark on video thumbnails */}
                <VideoWatermark size="thumbnail" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                View Fullscreen
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeFullscreen}
        >
          {(() => {
            const item = items.find(i => i.id === fullscreenItem);
            if (!item) return null;
            
            return item.type === 'image' ? (
              <img
                src={item.fullscreenUrl}
                alt={item.title}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="relative max-w-full max-h-full">
                <video
                  src={item.fullscreenUrl}
                  controls
                  className="max-w-full max-h-full"
                  onClick={(e) => e.stopPropagation()}
                  autoPlay
                />
                {/* Always show normal watermark in fullscreen */}
                <VideoWatermark size="normal" />
              </div>
            );
          })()}
          
          <button
            onClick={closeFullscreen}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};