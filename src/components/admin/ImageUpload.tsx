import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getSignedUrl } from "@/lib/storage-utils";
import { resumableUpload } from "@/lib/resumable-upload";
import { isNativePlatform, takePhotoNative } from "@/lib/capacitor-camera";
import {
  clearFilePickerState,
  extendFilePickerGuard,
  keepFilePickerGuardAfterSuccessfulUpload,
  markFilePickerClosed,
  markFilePickerOpen,
  scheduleFilePickerGuardClear,
} from "@/lib/file-picker-guard";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  pickerMode?: "auto" | "file";
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

export function ImageUpload({ 
  value, 
  onChange, 
  bucket = "content-images",
  folder = "uploads",
  pickerMode = "auto",
  accept = "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (selectedFile: File) => {
    extendFilePickerGuard();
    setUploading(true);

    const file = normalizeImageFile(selectedFile);

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    try {
      const result = await resumableUpload({
        bucket,
        folder,
        file,
      });

      setPreview(result.signedUrl);
      URL.revokeObjectURL(localPreview);
      // Store the file path (not the signed URL) so we can regenerate URLs later
      keepFilePickerGuardAfterSuccessfulUpload();
      onChange(result.path);
      toast.success("התמונה הועלתה בהצלחה");
    } catch (error: unknown) {
      URL.revokeObjectURL(localPreview);
      setPreview(value ? await getSignedUrl(value, bucket) : null);
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "שגיאה בהעלאת התמונה";
      toast.error(message);
      scheduleFilePickerGuardClear();
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = async (event?: React.MouseEvent<HTMLElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    markFilePickerOpen();
    // Safari iOS aggressively freezes/reloads the page while the picker is open.
    // Extend the guard well beyond the default to survive returning from the picker.
    extendFilePickerGuard(60_000);

    if (pickerMode === "auto" && isNativePlatform()) {
      try {
        const file = await takePhotoNative();
        if (!file) {
          scheduleFilePickerGuardClear();
          return;
        }
        await uploadFile(file);
      } catch (error: unknown) {
        console.error("Native image picker error:", error);
        const message = error instanceof Error ? error.message : "שגיאה בפתיחת התמונות בנייד";
        toast.error(message);
        scheduleFilePickerGuardClear();
      }
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fileInputRef.current?.click();
  };

  // Generate signed URL for preview when value changes
  useEffect(() => {
    let mounted = true;
    
    async function loadPreview() {
      if (!value) {
        setPreview(null);
        return;
      }
      
      const signedUrl = await getSignedUrl(value, bucket);
      if (mounted && signedUrl) {
        setPreview(signedUrl);
      }
    }
    
    loadPreview();
    
    return () => {
      mounted = false;
    };
  }, [value, bucket]);

  useEffect(() => {
    const keepDialogProtectedAfterPickerReturn = () => {
      extendFilePickerGuard(8_000);
      scheduleFilePickerGuardClear(8_000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        keepDialogProtectedAfterPickerReturn();
      }
    };

    window.addEventListener("focus", keepDialogProtectedAfterPickerReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", keepDialogProtectedAfterPickerReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearFilePickerState();
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    markFilePickerClosed();

    // Guard: user cancelled file picker (no file selected)
    if (!file) {
      scheduleFilePickerGuardClear();
      return;
    }

    // Validate file type
    if (!isAcceptedImageFile(file)) {
      toast.error("אנא בחר קובץ תמונה");
      scheduleFilePickerGuardClear();
      return;
    }

    await uploadFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-40 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div 
          onClick={openFilePicker}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">מעלה תמונה...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">לחץ להעלאת תמונה</span>
              <span className="text-xs text-muted-foreground">PNG, JPG</span>
            </div>
          )}
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
        ) : (
          <Upload className="h-4 w-4 ml-2" />
        )}
        {preview ? "החלף תמונה" : "העלה תמונה"}
      </Button>
    </div>
  );
}