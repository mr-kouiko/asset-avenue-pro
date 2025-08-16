import { removeBackground, loadImageFromUrl } from './backgroundRemoval';

export const processAndSaveLogoWithoutBackground = async (): Promise<string> => {
  try {
    console.log('Processing logo to remove background...');
    
    // Load the current logo
    const logoUrl = '/lovable-uploads/08d52d12-e894-4f5c-ba7a-3b16e53a2b99.png';
    const imageElement = await loadImageFromUrl(logoUrl);
    
    // Remove background
    const processedBlob = await removeBackground(imageElement);
    
    // Create a download URL for the processed image
    const processedUrl = URL.createObjectURL(processedBlob);
    
    console.log('Logo processed successfully:', processedUrl);
    return processedUrl;
  } catch (error) {
    console.error('Error processing logo:', error);
    throw error;
  }
};