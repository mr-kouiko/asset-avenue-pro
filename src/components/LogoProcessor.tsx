import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Download, Image as ImageIcon } from 'lucide-react';
import { processLogoBackgroundRemoval, downloadProcessedLogo } from '@/utils/logoProcessor';
import { toast } from 'sonner';

export const LogoProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  const handleRemoveBackground = async () => {
    try {
      setIsProcessing(true);
      toast.info('Starting background removal... This may take a moment.');
      
      const processedUrl = await processLogoBackgroundRemoval();
      setProcessedImageUrl(processedUrl);
      
      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to remove background. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedImageUrl) {
      downloadProcessedLogo(processedImageUrl);
      toast.success('Logo downloaded successfully!');
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Logo Background Removal</h2>
          <p className="text-muted-foreground">
            Remove the background from your VisuStock logo using AI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Logo */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Original Logo
            </h3>
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <img
                src="/lovable-uploads/08d52d12-e894-4f5c-ba7a-3b16e53a2b99.png"
                alt="Original VisuStock Logo"
                className="max-w-full h-auto mx-auto"
                style={{ maxHeight: '200px' }}
              />
            </div>
          </div>

          {/* Processed Logo */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Background Removed
            </h3>
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 min-h-[200px] flex items-center justify-center">
              {processedImageUrl ? (
                <img
                  src={processedImageUrl}
                  alt="VisuStock Logo - Background Removed"
                  className="max-w-full h-auto mx-auto"
                  style={{ maxHeight: '200px' }}
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Processed logo will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            onClick={handleRemoveBackground}
            disabled={isProcessing}
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Remove Background'
            )}
          </Button>

          {processedImageUrl && (
            <Button
              onClick={handleDownload}
              variant="outline"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground text-center space-y-1">
          <p>• The AI model will automatically detect and remove the background</p>
          <p>• Processing may take 30-60 seconds depending on image complexity</p>
          <p>• The result will be a PNG file with transparent background</p>
        </div>
      </div>
    </Card>
  );
};