import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Video, FileText, Link2, Loader2, Youtube, File } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumableUpload } from "@/lib/resumable-upload";
import {
  keepFilePickerGuardAfterSuccessfulUpload,
  markFilePickerOpen,
  scheduleFilePickerGuardClear,
} from "@/lib/file-picker-guard";

interface MediaUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  allowedTypes?: ("video" | "youtube" | "pdf" | "file")[];
  label?: string;
}

export function MediaUpload({ 
  value, 
  onChange, 
  bucket = "content-images", 
  folder = "media",
  allowedTypes = ["video", "youtube"],
  label = "העלאת מדיה"
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string>(value || "");
  const [urlInput, setUrlInput] = useState<string>(value?.includes("youtube") || value?.includes("youtu.be") ? value : "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.target.files?.[0];
    if (!file) {
      scheduleFilePickerGuardClear();
      return;
    }

    // Determine file type and validate
    const isVideo = file.type.startsWith('video/');
    const isPdf = file.type === 'application/pdf';
    
    if (isVideo && !allowedTypes.includes("video")) {
      toast.error("העלאת קבצי וידאו אינה מותרת כאן");
      scheduleFilePickerGuardClear();
      return;
    }
    
    if (isPdf && !allowedTypes.includes("pdf")) {
      toast.error("העלאת קבצי PDF אינה מותרת כאן");
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
      toast.success("הקובץ הועלה בהצלחה");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("שגיאה בהעלאת הקובץ");
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

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      toast.error("יש להזין קישור");
      return;
    }
    
    // Validate YouTube URL if youtube type is selected
    if (urlInput.includes("youtube") || urlInput.includes("youtu.be")) {
      setPreview(urlInput);
      onChange(urlInput);
      toast.success("הקישור נשמר בהצלחה");
    } else if (urlInput.startsWith("http")) {
      setPreview(urlInput);
      onChange(urlInput);
      toast.success("הקישור נשמר בהצלחה");
    } else {
      toast.error("יש להזין קישור תקין");
    }
  };

  const handleRemove = () => {
    setPreview("");
    setUrlInput("");
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

  const isPdfFile = (url: string) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf');
  };

  const isYouTubeUrl = (url: string) => {
    if (!url) return false;
    return url.includes("youtube") || url.includes("youtu.be");
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId[1]}`;
    }
    return url;
  };

  const getAcceptTypes = () => {
    const types: string[] = [];
    if (allowedTypes.includes("video")) types.push("video/*");
    if (allowedTypes.includes("pdf")) types.push("application/pdf");
    if (allowedTypes.includes("file")) types.push("*/*");
    return types.join(",");
  };

  // Determine which tab should be default based on current value
  const getDefaultTab = () => {
    if (isYouTubeUrl(preview)) return "youtube";
    if (isVideoFile(preview) || isPdfFile(preview)) return "file";
    if (allowedTypes.includes("file") || allowedTypes.includes("video") || allowedTypes.includes("pdf")) return "file";
    return "youtube";
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept={getAcceptTypes()}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-lg">
          {isVideoFile(preview) ? (
            <video 
              src={preview} 
              controls 
              className="w-full max-h-48 object-contain"
            />
          ) : isYouTubeUrl(preview) ? (
            <div className="aspect-video">
              <iframe
                src={getYouTubeEmbedUrl(preview)}
                className="w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : isPdfFile(preview) ? (
            <div className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">קובץ PDF</p>
                <p className="text-sm text-muted-foreground truncate">{preview.split('/').pop()}</p>
              </div>
            </div>
          ) : (
            <div className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Link2 className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">קישור חיצוני</p>
                <p className="text-sm text-muted-foreground truncate">{preview}</p>
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-3 left-3 w-9 h-9 rounded-xl shadow-lg"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Tabs defaultValue={getDefaultTab()} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12 bg-gradient-to-r from-muted/80 to-muted/60 rounded-xl">
            {(allowedTypes.includes("video") || allowedTypes.includes("pdf") || allowedTypes.includes("file")) && (
              <TabsTrigger value="file" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                <Upload className="w-4 h-4 ml-2" />
                העלאת קובץ
              </TabsTrigger>
            )}
            {allowedTypes.includes("youtube") && (
              <TabsTrigger value="youtube" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                <Youtube className="w-4 h-4 ml-2" />
                קישור YouTube
              </TabsTrigger>
            )}
          </TabsList>
          
          {(allowedTypes.includes("video") || allowedTypes.includes("pdf") || allowedTypes.includes("file")) && (
            <TabsContent value="file" className="mt-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer",
                  "bg-gradient-to-br from-card via-card/80 to-primary/5",
                  "hover:border-primary/50 hover:bg-primary/5 transition-all duration-300",
                  "border-border/50"
                )}
                onClick={openFilePicker}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-lg">
                    {allowedTypes.includes("video") ? (
                      <Video className="w-8 h-8 text-primary" />
                    ) : allowedTypes.includes("pdf") ? (
                      <FileText className="w-8 h-8 text-primary" />
                    ) : (
                      <File className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">לחץ להעלאת קובץ</p>
                    <p className="text-sm text-muted-foreground">
                      {allowedTypes.includes("video") && "MP4, WebM, MOV • "}
                      {allowedTypes.includes("pdf") && "PDF"}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          {allowedTypes.includes("youtube") && (
            <TabsContent value="youtube" className="mt-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 h-12 bg-card border-border/50 focus:border-primary/50 rounded-xl"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    onClick={handleUrlSubmit}
                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary to-accent shadow-lg"
                  >
                    שמור
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  הדבק קישור לסרטון מ-YouTube
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {!preview && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl border-2 hover:border-primary/50 hover:bg-primary/5 transition-all font-bold"
          onClick={openFilePicker}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              {uploadProgress > 0 ? `מעלה קובץ... ${uploadProgress}%` : "מעלה קובץ..."}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 ml-2" />
              העלאה מהמכשיר
            </>
          )}
        </Button>
      )}
    </div>
  );
}