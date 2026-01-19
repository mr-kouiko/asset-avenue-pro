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
      console.log('Initiating secure download with token...');
      
      // Step 1: Get the signed download URL from the secure edge function
      // Note: secure-download has verify_jwt=true, so we must call it via supabase.functions
      // to ensure the user's JWT is included.
      const { data, error } = await supabase.functions.invoke(
        `secure-download?token=${encodeURIComponent(downloadToken)}`,
        { method: 'GET' }
      );

      if (error) {
        const status = (error as any)?.context?.status;
        let errorData: any = null;
        try {
          errorData = await (error as any)?.context?.json?.();
        } catch {
          // ignore
        }

        // Provide specific error messages based on status code
        let errorMessage = errorData?.error || error.message || 'Download failed';

        if (status === 401) {
          errorMessage = 'Please sign in again to download your file.';
        } else if (status === 403) {
          errorMessage = 'Access denied. Your download link may have expired or already been used.';
        } else if (status === 404) {
          errorMessage = 'Download not found. The file may have been removed.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        }

        console.error('Download endpoint error:', { status, errorData, error });
        throw new Error(errorMessage);
      }

      console.log('Received download data:', { fileName: data?.fileName, fileSize: data?.fileSize });

      if (!data?.downloadUrl) {
        throw new Error('No download URL received from server');
      }

      // Step 3: Use the signed URL to download the actual file
      console.log('Downloading file from signed URL...');
      const fileResponse = await fetch(data.downloadUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to download file. The download link may have expired.');
      }

      // Step 4: Create blob and trigger download
      console.log('Creating download blob...');
      const blob = await fileResponse.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = data.fileName || filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
      
      console.log('Download completed successfully');
      toast.success('File downloaded successfully!');

    } catch (error) {
      console.error('Download failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(errorMessage);
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