/**
 * Get a proxied URL for videos to bypass CORS restrictions.
 * All internal Supabase / R2 URLs are routed through the visustock.com edge
 * worker so nothing in the DOM or network tab reveals backend infrastructure.
 */

const SITE_ORIGIN = "https://visustock.com";

/**
 * Check if a URL needs CORS proxying (Supabase storage or R2)
 */
export function needsCorsProxy(url: string): boolean {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;
    if (hostname.endsWith("supabase.co") && url.includes("/storage/")) return true;
    if (hostname.endsWith("r2.cloudflarestorage.com") || hostname.startsWith("pub-")) return true;
    if (hostname === "cdn.visustock.com") return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Route the original URL through our own visustock.com proxy endpoint so
 * the client only ever sees the visustock.com domain.
 */
export function getProxiedVideoUrl(videoUrl: string): string {
  if (!videoUrl || !needsCorsProxy(videoUrl)) return videoUrl;
  const encoded = encodeURIComponent(videoUrl);
  return `${SITE_ORIGIN}/api/proxy-video?url=${encoded}`;
}

/**
 * Fetch video as blob through the proxy to avoid CORS issues.
 */
export async function fetchVideoAsBlob(videoUrl: string): Promise<string> {
  const proxyUrl = getProxiedVideoUrl(videoUrl);
  const response = await fetch(proxyUrl, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
