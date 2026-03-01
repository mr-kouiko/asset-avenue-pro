/**
 * Get a proxied URL for videos to bypass CORS restrictions.
 * This enables client-side video processing (canvas drawing, blob fetching)
 * by routing through an edge function that adds proper CORS headers.
 */

const SUPABASE_URL = "https://kdgfpophpoqugtuvfxqx.supabase.co";

/**
 * Check if a URL needs CORS proxying (Supabase storage or R2)
 */
export function needsCorsProxy(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    
    // Check for Supabase storage URLs
    if (hostname.includes('supabase.co') && url.includes('/storage/')) {
      return true;
    }
    
    // Check for R2 URLs (direct or via custom CDN domain)
    if (hostname.includes('r2.cloudflarestorage.com') || hostname.startsWith('pub-')) {
      return true;
    }
    
    // Check for VisuStock CDN (R2 custom domain)
    if (hostname === 'cdn.visustock.com') {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Get the proxied URL for a video. This routes the request through
 * our edge function which adds proper CORS headers.
 * 
 * @param videoUrl - The original video URL
 * @returns The proxied URL that can be used for cross-origin canvas operations
 */
export function getProxiedVideoUrl(videoUrl: string): string {
  if (!videoUrl || !needsCorsProxy(videoUrl)) {
    return videoUrl;
  }
  
  const encodedUrl = encodeURIComponent(videoUrl);
  return `${SUPABASE_URL}/functions/v1/proxy-video?url=${encodedUrl}`;
}

/**
 * Fetch video as blob through the proxy to avoid CORS issues.
 * This is useful for video processing operations that require blob access.
 * 
 * @param videoUrl - The original video URL
 * @returns Promise resolving to a blob URL that can be used without CORS restrictions
 */
export async function fetchVideoAsBlob(videoUrl: string): Promise<string> {
  const proxyUrl = getProxiedVideoUrl(videoUrl);
  
  console.log('[videoProxy] Fetching video through proxy:', videoUrl);
  
  const response = await fetch(proxyUrl, { mode: 'cors' });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  console.log('[videoProxy] Video blob received, size:', blob.size);
  
  return URL.createObjectURL(blob);
}
