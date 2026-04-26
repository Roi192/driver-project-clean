import { useState, useEffect } from "react";
import { getSignedUrl } from "@/lib/storage-utils";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2 } from "lucide-react";

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  bucket?: string;
  fallback?: React.ReactNode;
  showLoader?: boolean;
}

/**
 * Image component that automatically handles signed URLs for private storage
 * Regenerates signed URLs if they've expired
 */
export function StorageImage({ 
  src, 
  bucket = "content-images",
  fallback,
  showLoader = true,
  className,
  alt,
  ...props 
}: StorageImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadImage() {
      if (!src) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const url = await getSignedUrl(src, bucket);
        if (mounted) {
          setSignedUrl(url);
        }
      } catch (err) {
        console.error("Failed to get signed URL:", err);
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src, bucket]);

  if (!src) {
    return fallback ? <>{fallback}</> : null;
  }

  if (loading && showLoader) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt || ""}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
}