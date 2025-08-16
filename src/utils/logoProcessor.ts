import { removeBackground, loadImageFromUrl } from './backgroundRemoval';

export const processLogoBackgroundRemoval = async (): Promise<string> => {
  try {
    console.log('Starting logo background removal...');
    
    // Load the current logo
    const logoUrl = '/lovable-uploads/08d52d12-e894-4f5c-ba7a-3b16e53a2b99.png';
    const imageElement = await loadImageFromUrl(logoUrl);
    
    // Remove background
    const processedBlob = await removeBackground(imageElement);
    
    // Create a download URL for the processed image
    const processedUrl = URL.createObjectURL(processedBlob);
    
    console.log('Logo background removal completed successfully');
    return processedUrl;
  } catch (error) {
    console.error('Error processing logo:', error);
    throw error;
  }
};

export const downloadProcessedLogo = (processedUrl: string, filename = 'visustock-logo-no-bg.png') => {
  const link = document.createElement('a');
  link.href = processedUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};