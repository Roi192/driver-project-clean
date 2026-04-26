import { useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/storage-utils";

/**
 * Hook to get a fresh signed URL for a storage item
 * Handles expired URLs by regenerating them on demand
 */
export function useSignedUrl(
  urlOrPath: string | null | undefined,
  bucket: string = "content-images"
): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUrl() {
      if (!urlOrPath) {
        setUrl(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const signedUrl = await getSignedUrl(urlOrPath, bucket);
      
      if (mounted) {
        setUrl(signedUrl);
        setLoading(false);
      }
    }

    fetchUrl();

    return () => {
      mounted = false;
    };
  }, [urlOrPath, bucket]);

  return { url, loading };
}