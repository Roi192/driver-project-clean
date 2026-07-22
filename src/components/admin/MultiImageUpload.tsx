import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getSignedUrl } from "@/lib/storage-utils";
import { resumableUpload } from "@/lib/resumable-upload";
import {
  clearFilePickerState,
  extendFilePickerGuard,
  keepFilePickerGuardAfterSuccessfulUpload,
  markFilePickerClosed,
  markFilePickerOpen,
  scheduleFilePickerGuardClear,
} from "@/lib/file-picker-guard";

interface MultiImageUploadProps {
  value?: string; // JSON array string: ["path1","path2",...]
  onChange: (value: string) => void;
  bucket?: string;
  folder?: string;
  accept?: string;
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

const getFileExtension = (fileName: string) => fileName.split(".").pop()?.toLowerCase() || "";

const getImageMimeType = (extension: string) => {
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";
  return "image/jpeg";
};

const isAcceptedImageFile = (file: File) => {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.has(getFileExtension(file.name));
};

const normalizeImageFile = (file: File) => {
  if (file.type.startsWith("image/")) return file;
  const extension = getFileExtension(file.name);
  return new File([file], file.name, { type: getImageMimeType(extension) });
};

const parsePaths = (value?: string): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Legacy single-path value
    if (value.trim()) return [value.trim()];
  }
  return [];
};

export function MultiImageUpload({
  value,
  onChange,
  bucket = "content-images",
  folder = "uploads",
  accept = "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif",
}: MultiImageUploadProps) {
  const [paths, setPaths] = useState<string[]>(() => parsePaths(value));
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync incoming value to paths
  useEffect(() => {
    setPaths(parsePaths(value));
  }, [value]);

  // Load signed URLs for all paths
  useEffect(() => {
    let mounted = true;
    async function loadPreviews() {
      const newPreviews: Record<string, string> = {};
      for (const path of paths) {
        if (!previews[path]) {
          const signed = await getSignedUrl(path, bucket);
          if (signed) newPreviews[path] = signed;
        } else {
          newPreviews[path] = previews[path];
        }
      }
      if (mounted) setPreviews(newPreviews);
    }
    if (paths.length > 0) loadPreviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, bucket]);

  useEffect(() => {
    const keepGuard = () => {
      extendFilePickerGuard(8_000);
      scheduleFilePickerGuardClear(8_000);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") keepGuard();
    };
    window.addEventListener("focus", keepGuard);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", keepGuard);
      document.removeEventListener("visibilitychange", onVisibility);
      clearFilePickerState();
    };
  }, []);

  const uploadFile = async (file: File) => {
    extendFilePickerGuard();
    setUploading(true);
    const normalized = normalizeImageFile(file);
    try {
      const result = await resumableUpload({ bucket, folder, file: normalized });
      keepFilePickerGuardAfterSuccessfulUpload();
      const newPaths = [...paths, result.path];
      setPaths(newPaths);
      setPreviews(prev => ({ ...prev, [result.path]: result.signedUrl }));
      onChange(JSON.stringify(newPaths));
      toast.success("התמונה הועלתה בהצלחה");
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "שגיאה בהעלאת התמונה";
      toast.error(message);
      scheduleFilePickerGuardClear();
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.target.files || []);
    markFilePickerClosed();
    if (!files.length) {
      scheduleFilePickerGuardClear();
      return;
    }
    for (const file of files) {
      if (!isAcceptedImageFile(file)) {
        toast.error("אנא בחר קובץ תמונה");
        continue;
      }
      await uploadFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openFilePicker = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    markFilePickerOpen();
    extendFilePickerGuard(60_000);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const removeImage = (path: string) => {
    const newPaths = paths.filter(p => p !== path);
    setPaths(newPaths);
    onChange(newPaths.length > 0 ? JSON.stringify(newPaths) : "");
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {paths.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {paths.map((path) => (
            <div key={path} className="relative rounded-lg overflow-hidden border border-border">
              {previews[path] ? (
                <img src={previews[path]} alt="" className="w-full h-28 object-cover" />
              ) : (
                <div className="w-full h-28 bg-muted flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(path)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/80 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={openFilePicker}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
        ) : paths.length > 0 ? (
          <Plus className="h-4 w-4 ml-2" />
        ) : (
          <ImageIcon className="h-4 w-4 ml-2" />
        )}
        {uploading ? "מעלה תמונה..." : paths.length > 0 ? "הוסף תמונה נוספת" : "העלה תמונות"}
      </Button>
    </div>
  );
}
