import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { r2Service } from '../../lib/r2-service';
import { log, trackError } from '../../lib/logger';

// Simple in-memory cache for signed URLs - permanent cache (no expiry)
const urlCache = new Map<string, string>();

interface R2ImageProps extends Omit<ImageProps, 'source'> {
  url: string;
  fallback?: React.ReactNode;
  onError?: (error: any) => void;
  onLoad?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'; // For backward compatibility
}

export default function R2Image({
  url,
  fallback,
  onError,
  onLoad,
  style,
  resizeMode,
  ...props
}: R2ImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const loadSignedUrl = async () => {
      // Removed debug log

      if (!url) {
        // Removed warn log
        setLoading(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      setError(false);

      try {
        // Check cache first - permanent cache (no expiry)
        const cached = urlCache.get(url);
        if (cached) {
          setSignedUrl(cached);
          setLoading(false);
          return;
        }

        // Check if it's already a signed URL or public URL
        if (url.includes('X-Amz-Algorithm') || url.includes('Signature')) {
          // Already a signed URL
          setSignedUrl(url);
          // Cache it permanently
          urlCache.set(url, url);
        } else {
          // Extract key from URL and generate signed URL
          const key = r2Service.extractKeyFromUrl(url);

          if (key) {
            const signed = await r2Service.getSignedUrl(key);

            if (!abortController.signal.aborted) {
              setSignedUrl(signed);
              // Cache the signed URL permanently
              urlCache.set(url, signed);
            }
          } else {
            // Fallback to original URL
            if (!abortController.signal.aborted) {
              setSignedUrl(url);
              urlCache.set(url, url);
            }
          }
        }
      } catch (err) {
        // Removed error log
        if (!abortController.signal.aborted) {
          setError(true);
          trackError(err as Error, 'R2Image', { url });
          onError?.(err);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSignedUrl();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [url, onError]);

  if (loading) {
    return (
      <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
        <MaterialIcons name="image" size={48} color="#9CA3AF" />
        <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>Loading...</Text>
      </View>
    );
  }

  if (error || !signedUrl) {
    return fallback || (
      <View style={[{ justifyContent: 'center', alignItems: 'center' }, style]}>
        <MaterialIcons name="broken-image" size={48} color="#EF4444" />
        <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>Failed to load</Text>
      </View>
    );
  }

  // Convert resizeMode to contentFit for Expo Image
  const getContentFit = (mode?: string) => {
    switch (mode) {
      case 'cover': return 'cover';
      case 'contain': return 'contain';
      case 'stretch': return 'fill';
      case 'repeat': return 'none';
      case 'center': return 'none';
      default: return 'cover';
    }
  };

  return (
    <Image
      {...props}
      source={{ uri: signedUrl }}
      style={style}
      contentFit={getContentFit(resizeMode)}
      onError={(e) => {
        // Removed error log
        setError(true);
        onError?.(e);
      }}
      onLoad={() => {
        // Removed debug log
        onLoad?.();
      }}
    />
  );
}
