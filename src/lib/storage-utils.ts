import { supabase } from "@/integrations/supabase/client";

// Cache for signed URLs to avoid regenerating on every render
const signedUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache

/**
 * Extract the file path from various URL formats:
 * - Full signed URL: https://xxx.supabase.co/storage/v1/object/sign/bucket/path?token=xxx
 * - Public URL: https://xxx.supabase.co/storage/v1/object/public/bucket/path
 * - Just the path: uploads/filename.jpg
 */
export function extractFilePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null;
  
  // If it's just a path (no http), return as-is
  if (!urlOrPath.startsWith('http')) {
    return urlOrPath;
  }
  
  try {
    const url = new URL(urlOrPath);
    const pathname = url.pathname;
    
    // Try to extract path from signed URL format
    // /storage/v1/object/sign/bucket-name/path/to/file
    const signedMatch = pathname.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)/);
    if (signedMatch && signedMatch[1] === bucket) {
      return signedMatch[2];
    }
    
    // Try to extract path from public URL format
    // /storage/v1/object/public/bucket-name/path/to/file
    const publicMatch = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (publicMatch && publicMatch[1] === bucket) {
      return publicMatch[2];
    }
    
    // Could be a different bucket format or external URL
    return null;
  } catch {
    return null;
  }
}

/**
 * Get a fresh signed URL for a file in storage
 * Handles both raw paths and existing URLs
 */
export async function getSignedUrl(
  urlOrPath: string | null | undefined, 
  bucket: string = "content-images"
): Promise<string | null> {
  if (!urlOrPath) return null;
  
  // Extract the path from whatever format we received
  const filePath = extractFilePath(urlOrPath, bucket);
  
  // If we couldn't extract a path, maybe it's an external URL or different bucket
  // In that case, return the original URL
  if (!filePath) {
    return urlOrPath;
  }
  
  const cacheKey = `${bucket}:${filePath}`;
  
  // Check cache
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hour validity
    
    if (error || !data?.signedUrl) {
      console.error("Failed to create signed URL:", error);
      return urlOrPath; // Return original as fallback
    }
    
    // Cache the URL
    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expires: Date.now() + CACHE_DURATION
    });
    
    return data.signedUrl;
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return urlOrPath; // Return original as fallback
  }
}

/**
 * Upload a file and return just the path (not the signed URL)
 * This allows us to generate fresh signed URLs on demand
 */
export async function uploadFile(
  file: File,
  bucket: string = "content-images",
  folder: string = "uploads"
): Promise<{ path: string; signedUrl: string } | null> {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Return both the path for storage and a signed URL for immediate preview
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 60 * 60 * 24);

    if (signedError || !signedUrlData?.signedUrl) {
      throw signedError || new Error('Failed to generate signed URL');
    }

    return {
      path: fileName,
      signedUrl: signedUrlData.signedUrl
    };
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
}