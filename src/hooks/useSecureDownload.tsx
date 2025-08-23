import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SecureDownloadResult {
  downloadToken: string;
  expiresAt: string;
}

export const useSecureDownload = () => {
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const generateDownloadToken = async (contentFileId: string): Promise<SecureDownloadResult | null> => {
    setIsGeneratingToken(true);
    
    try {
      const { data, error } = await supabase.rpc('create_secure_download_token', {
        content_file_id_param: contentFileId
      });

      if (error) {
        console.error('Token generation error:', error);
        toast.error(`Failed to generate download token: ${error.message}`);
        return null;
      }

      if (!data || data.length === 0) {
        toast.error('No download token received');
        return null;
      }

      return {
        downloadToken: data[0].download_token,
        expiresAt: data[0].expires_at
      };

    } catch (error) {
      console.error('Download token generation failed:', error);
      toast.error('Failed to generate download token');
      return null;
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const downloadFile = async (downloadToken: string, filename?: string) => {
    setIsDownloading(true);

    try {
      const response = await fetch(
        `https://kdgfpophpoqugtuvfxqx.supabase.co/functions/v1/secure-download?token=${downloadToken}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Download failed with status ${response.status}`);
      }

      // Get filename from response headers or use provided filename
      const contentDisposition = response.headers.get('content-disposition');
      const responseFilename = contentDisposition
        ? contentDisposition.match(/filename="(.+)"/)?.[1]
        : filename || 'download';

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = responseFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      toast.success('File downloaded successfully!');

    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const secureDownload = async (contentFileId: string, filename?: string) => {
    // Step 1: Generate secure download token
    const tokenResult = await generateDownloadToken(contentFileId);
    
    if (!tokenResult) {
      return;
    }

    // Step 2: Use token to download file
    await downloadFile(tokenResult.downloadToken, filename);
  };

  return {
    secureDownload,
    generateDownloadToken,
    downloadFile,
    isGeneratingToken,
    isDownloading,
    isProcessing: isGeneratingToken || isDownloading
  };
};