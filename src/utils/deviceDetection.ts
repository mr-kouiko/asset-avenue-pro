/**
 * Device Detection Utilities
 * Provides accurate device detection for media player optimization
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  supportsHLS: boolean;
  supportsWebM: boolean;
  supportsMP4: boolean;
  touchCapable: boolean;
}

/**
 * Comprehensive device detection
 * Used to apply device-specific media player optimizations
 */
export const detectDevice = (): DeviceInfo => {
  const userAgent = navigator.userAgent.toLowerCase();
  const standalone = (navigator as any).standalone;
  const isStandalone = standalone || window.matchMedia('(display-mode: standalone)').matches;
  
  // Mobile detection
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
  const isMobile = mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);
  const isTablet = tabletRegex.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  // OS detection
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  
  // Browser detection
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);
  
  // Touch capability
  const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Media format support detection
  const video = document.createElement('video');
  const supportsMP4 = video.canPlayType('video/mp4') !== '';
  const supportsWebM = video.canPlayType('video/webm') !== '';
  const supportsHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '' || 
                      video.canPlayType('application/x-mpegURL') !== '';
  
  const deviceInfo: DeviceInfo = {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    supportsHLS,
    supportsWebM,
    supportsMP4,
    touchCapable
  };
  
  console.log('🔍 Device detected:', deviceInfo);
  return deviceInfo;
};

/**
 * Get optimal media formats for current device
 */
export const getOptimalMediaFormats = (deviceInfo: DeviceInfo) => {
  const formats = {
    video: [] as string[],
    audio: [] as string[]
  };
  
  if (deviceInfo.isMobile) {
    // Mobile-optimized formats
    if (deviceInfo.isIOS) {
      formats.video = ['video/mp4', 'video/quicktime'];
      formats.audio = ['audio/mp4', 'audio/mpeg', 'audio/aac'];
    } else if (deviceInfo.isAndroid) {
      formats.video = ['video/mp4', 'video/webm'];
      formats.audio = ['audio/mpeg', 'audio/mp4', 'audio/webm'];
    } else {
      formats.video = ['video/mp4', 'video/webm'];
      formats.audio = ['audio/mpeg', 'audio/mp4'];
    }
  } else {
    // Desktop formats - full compatibility
    formats.video = [
      'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
      'video/webm; codecs="vp8,vorbis"',
      'video/quicktime',
      'video/ogg; codecs="theora,vorbis"'
    ];
    formats.audio = [
      'audio/mpeg; codecs="mp3"',
      'audio/mp4; codecs="mp4a.40.2"',
      'audio/aac; codecs="mp4a.40.2"',
      'audio/wav; codecs="1"',
      'audio/ogg; codecs="vorbis"',
      'audio/webm; codecs="vorbis"'
    ];
  }
  
  return formats;
};

/**
 * Get device-specific media player config
 */
export const getMediaPlayerConfig = (deviceInfo: DeviceInfo) => {
  return {
    // Autoplay settings
    autoplayAllowed: !deviceInfo.isMobile, // Mobile restricts autoplay
    
    // Control settings
    controlsAlwaysVisible: deviceInfo.isMobile,
    controlsAutoHide: !deviceInfo.isMobile,
    controlsAutoHideDelay: deviceInfo.isMobile ? 3000 : 2000,
    
    // Touch settings
    touchControls: deviceInfo.touchCapable,
    touchSeekSensitivity: deviceInfo.isMobile ? 2 : 1,
    
    // Loading settings
    preloadStrategy: deviceInfo.isMobile ? 'metadata' : 'auto',
    retryAttempts: deviceInfo.isMobile ? 3 : 2,
    retryDelay: deviceInfo.isMobile ? 1500 : 1000,
    
    // Quality settings
    preferredQuality: deviceInfo.isMobile ? 'medium' : 'high',
    adaptiveStreaming: deviceInfo.isMobile,
    
    // Buffer settings
    bufferSize: deviceInfo.isMobile ? 'small' : 'normal'
  };
};