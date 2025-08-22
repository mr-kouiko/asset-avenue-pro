import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  touchCapable: boolean;
  supportsHLS: boolean;
  supportsWebM: boolean;
  supportsMP4: boolean;
}

/**
 * React hook for comprehensive device detection
 * Optimized for media player compatibility
 */
export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    // Server-side rendering fallback
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isIOS: false,
        isAndroid: false,
        isSafari: false,
        isChrome: false,
        isFirefox: false,
        touchCapable: false,
        supportsHLS: false,
        supportsWebM: false,
        supportsMP4: false,
      };
    }

    const userAgent = navigator.userAgent.toLowerCase();
    
    // Device type detection
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

    return {
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isFirefox,
      touchCapable,
      supportsHLS,
      supportsWebM,
      supportsMP4,
    };
  });

  useEffect(() => {
    // Update device info on mount and resize
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const tabletRegex = /ipad|android(?!.*mobile)|tablet/i;
      const isMobile = mobileRegex.test(userAgent) && !tabletRegex.test(userAgent);
      const isTablet = tabletRegex.test(userAgent);
      const isDesktop = !isMobile && !isTablet;
      
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      
      const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
      const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);
      const isFirefox = /firefox/.test(userAgent);
      
      const touchCapable = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      const video = document.createElement('video');
      const supportsMP4 = video.canPlayType('video/mp4') !== '';
      const supportsWebM = video.canPlayType('video/webm') !== '';
      const supportsHLS = video.canPlayType('application/vnd.apple.mpegurl') !== '' || 
                         video.canPlayType('application/x-mpegURL') !== '';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        isFirefox,
        touchCapable,
        supportsHLS,
        supportsWebM,
        supportsMP4,
      });
      
      console.log('🔍 Device detected:', {
        isMobile,
        isTablet,
        isDesktop,
        isIOS,
        isAndroid,
        browser: isSafari ? 'Safari' : isChrome ? 'Chrome' : isFirefox ? 'Firefox' : 'Other',
        touchCapable,
        mediaSupport: { supportsMP4, supportsWebM, supportsHLS }
      });
    };

    updateDeviceInfo();
    
    // Listen for orientation changes on mobile
    if (deviceInfo.isMobile) {
      window.addEventListener('orientationchange', updateDeviceInfo);
      window.addEventListener('resize', updateDeviceInfo);
      
      return () => {
        window.removeEventListener('orientationchange', updateDeviceInfo);
        window.removeEventListener('resize', updateDeviceInfo);
      };
    }
  }, [deviceInfo.isMobile]);

  return deviceInfo;
};

/**
 * Get optimal media player configuration based on device
 */
export const getMediaPlayerConfig = (deviceInfo: DeviceInfo) => {
  return {
    // Autoplay settings - respect mobile restrictions
    autoplayAllowed: !deviceInfo.isMobile,
    
    // Control settings
    controlsAlwaysVisible: deviceInfo.isMobile,
    controlsAutoHide: !deviceInfo.isMobile,
    controlsAutoHideDelay: deviceInfo.isMobile ? 3000 : 2000,
    
    // Touch settings
    touchControls: deviceInfo.touchCapable,
    touchSeekSensitivity: deviceInfo.isMobile ? 2 : 1,
    
    // Loading settings
    preloadStrategy: deviceInfo.isMobile ? 'metadata' : 'auto',
    retryAttempts: 3,
    retryDelay: deviceInfo.isMobile ? 1500 : 1000,
    
    // Quality settings
    preferredQuality: deviceInfo.isMobile ? 'medium' : 'high',
    adaptiveStreaming: deviceInfo.isMobile,
    
    // Buffer settings
    bufferSize: deviceInfo.isMobile ? 'small' : 'normal',
    
    // URL expiry settings
    signedUrlExpiry: 24 * 60 * 60, // 24 hours in seconds
    useFallbackUrl: true
  };
};