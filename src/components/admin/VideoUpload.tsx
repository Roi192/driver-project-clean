import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resumableUpload } from "@/lib/resumable-upload";
import { cn } from "@/lib/utils";
import {
  keepFilePickerGuardAfterSuccessfulUpload,
  markFilePickerOpen,
  scheduleFilePickerGuardClear,
} from "@/lib/file-picker-guard";

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export function VideoUpload({ 
  value, 
  onChange, 
  bucket = "content-images", 
  folder = "videos" 
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string>(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.target.files?.[0];
    if (!file) {
      scheduleFilePickerGuardClear();
      return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error("יש להעלות קובץ וידאו בלבד (MP4, WebM, OGG, MOV, AVI)");
      scheduleFilePickerGuardClear();
      return;
    }


    setUploading(true);
    setUploadProgress(0);

    try {
      const result = await resumableUpload({
        bucket,
        folder,
        file,
        onProgress: (percentage) => setUploadProgress(percentage),
      });

      setPreview(result.signedUrl);
      keepFilePickerGuardAfterSuccessfulUpload();
      onChange(result.path);
      toast.success("הסרטון הועלה בהצלחה");
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error("שגיאה בהעלאת הסרטון");
      scheduleFilePickerGuardClear();
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const openFilePicker = () => {
    markFilePickerOpen();
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isVideoFile = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && isVideoFile(preview) ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-secondary/20">
          <video 
            src={preview} 
            controls 
            className="w-full max-h-48 object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 w-8 h-8 rounded-full"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-secondary/20 p-4">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            <span className="text-sm truncate flex-1">{preview}</span>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="w-8 h-8 rounded-full"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed border-border/50 rounded-xl p-6 text-center",
            "hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
          )}
          onClick={openFilePicker}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              לחץ להעלאת קובץ וידאו
            </p>
            <p className="text-xs text-muted-foreground/70">
              MP4, WebM, MOV
            </p>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={openFilePicker}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            {uploadProgress > 0 ? `מעלה סרטון... ${uploadProgress}%` : "מעלה סרטון..."}
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 ml-2" />
            {preview ? "החלף סרטון" : "העלה סרטון"}
          </>
        )}
      </Button>
    </div>
  );
}