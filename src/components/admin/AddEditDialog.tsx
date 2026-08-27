import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Crosshair } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { MultiImageUpload } from "./MultiImageUpload";
import { VideoUpload } from "./VideoUpload";
import { MediaUpload } from "./MediaUpload";
import { MapPicker } from "./MapPicker";
import { toast } from "sonner";
import { isFilePickerGuardActive } from "@/lib/file-picker-guard";

export type FieldValue = unknown;
export type FormValues = Record<string, FieldValue>;

const toInputString = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "select" | "pill_choice" | "number" | "image" | "multi_image" | "video" | "media" | "location" | "date" | "map_picker";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  dynamicOptions?: (formData: FormValues) => { value: string; label: string }[];
  mediaTypes?: ("video" | "youtube" | "pdf" | "file")[];
  imagePickerMode?: "auto" | "file";
  imageAccept?: string;
  // For location type - names of lat/lng fields to update
  latField?: string;
  lngField?: string;
  // Conditional display based on another field's value
  dependsOn?: {
    field: string;
    value: string | string[];
  };
  // Dynamic condition function (overrides dependsOn if both present)
  condition?: (formData: FormValues) => boolean;
}

interface AddEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, unknown> | object;
  onSubmit: (data: FormValues) => Promise<void>;
  onFormChange?: (data: FormValues) => void;
  onAfterFileUploadChange?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

export function AddEditDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialData,
  onSubmit,
  onFormChange,
  onAfterFileUploadChange,
  onCancel,
  submitLabel,
  isLoading,
}: AddEditDialogProps) {
  const [formData, setFormData] = useState<FormValues>({});
  const [gettingLocation, setGettingLocation] = useState(false);

  // Only reset form when dialog opens or initialData changes, NOT when fields change
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...(initialData as Record<string, unknown>) });
      } else {
        const defaultData: FormValues = {};
        fields.forEach((field) => {
          defaultData[field.name] = "";
        });
        setFormData(defaultData);
      }
    }
    // 'fields' intentionally excluded — we don't want to reset the form when callers re-create the array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (name: string, value: FieldValue) => {
    const nextData = { ...formData, [name]: value };
    setFormData(nextData);
    onFormChange?.(nextData);
  };

  const handleLocationChange = (latField: string, lngField: string, lat: number, lng: number) => {
    setFormData((prev) => {
      const nextData = {
        ...prev,
        [latField]: lat.toFixed(6),
        [lngField]: lng.toFixed(6),
      };
      onFormChange?.(nextData);
      return nextData;
    });
  };

  const getCurrentLocation = (latField: string, lngField: string) => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationChange(latField, lngField, position.coords.latitude, position.coords.longitude);
          toast.success("המיקום נקלט בהצלחה!");
          setGettingLocation(false);
        },
        (error) => {
          console.error("Location error:", error);
          toast.error("לא ניתן לקבל מיקום. אנא בדוק את הרשאות המיקום.");
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("הדפדפן אינו תומך במיקום");
      setGettingLocation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      const fileInputIsActive =
        typeof document !== "undefined" &&
        document.activeElement?.tagName === "INPUT" &&
        (document.activeElement as HTMLInputElement).type === "file";

      // Prevent dialog from closing when mobile browsers return from gallery/camera.
      if (!value && (fileInputIsActive || isFilePickerGuardActive())) return;

      onOpenChange(value);
    }}>
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card via-card/98 to-primary/5 border-2 border-primary/20 shadow-2xl rounded-3xl"
        onInteractOutside={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          if (isFilePickerGuardActive()) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="pb-4 border-b border-border/30">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {fields.filter((field) => {
            // condition function takes priority over dependsOn
            if (field.condition) return field.condition(formData);
            if (!field.dependsOn) return true;
            const dependentValue = formData[field.dependsOn.field];
            if (Array.isArray(field.dependsOn.value)) {
              return field.dependsOn.value.includes(toInputString(dependentValue));
            }
            return dependentValue === field.dependsOn.value;
          }).map((field, index) => (
            <div 
              key={field.name} 
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Label htmlFor={field.name} className="text-base font-bold text-foreground">
                {field.label}
                {field.required && <span className="text-destructive mr-1">*</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={toInputString(formData[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="min-h-[100px] bg-white text-slate-800 border-2 border-border/50 focus:border-primary/50 rounded-xl transition-all resize-none"
                />
              ) : field.type === "select" ? (
                <Select
                  value={toInputString(formData[field.name])}
                  onValueChange={(value) => handleChange(field.name, value)}
                >
                  <SelectTrigger className="h-12 bg-white text-slate-800 border-2 border-border/50 focus:border-primary/50 rounded-xl">
                    <SelectValue placeholder={field.placeholder || "בחר..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-border/50 rounded-xl">
                    {(field.dynamicOptions ? field.dynamicOptions(formData) : (field.options || [])).map((option) => (
                      <SelectItem key={option.value} value={option.value} className="rounded-lg text-slate-700">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "pill_choice" ? (
                <div className="flex gap-2">
                  {(field.options || []).map((option) => {
                    const isSelected = toInputString(formData[field.name]) === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          handleChange(field.name, option.value);
                          // Clear lat/lng when "not in sector" is chosen
                          if (field.name === "in_brigade_sector" && option.value === "no") {
                            setFormData((prev) => {
                              const next = { ...prev, [field.name]: option.value, latitude: "", longitude: "" };
                              onFormChange?.(next);
                              return next;
                            });
                          }
                        }}
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 10,
                          border: isSelected ? "2px solid transparent" : "2px solid rgba(0,0,0,0.12)",
                          cursor: "pointer",
                          background: isSelected
                            ? option.value === "yes" ? "#16a34a" : "#374151"
                            : "rgba(0,0,0,0.04)",
                          color: isSelected ? "#fff" : "#374151",
                          fontSize: 14,
                          fontWeight: 600,
                          transition: "all 0.15s",
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : field.type === "image" ? (
                <ImageUpload
                  value={toInputString(formData[field.name])}
                  onChange={(url) => {
                    handleChange(field.name, url);
                    onAfterFileUploadChange?.();
                  }}
                  pickerMode={field.imagePickerMode}
                  accept={field.imageAccept}
                />
              ) : field.type === "multi_image" ? (
                <MultiImageUpload
                  value={toInputString(formData[field.name])}
                  onChange={(val) => {
                    handleChange(field.name, val);
                    onAfterFileUploadChange?.();
                  }}
                  accept={field.imageAccept}
                />
              ) : field.type === "video" ? (
                <VideoUpload
                  value={toInputString(formData[field.name])}
                  onChange={(url) => handleChange(field.name, url)}
                />
              ) : field.type === "media" ? (
                <MediaUpload
                  value={toInputString(formData[field.name])}
                  onChange={(url) => handleChange(field.name, url)}
                  allowedTypes={field.mediaTypes || ["video", "youtube"]}
                />
              ) : field.type === "location" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={gettingLocation}
                  onClick={() => getCurrentLocation(field.latField || "latitude", field.lngField || "longitude")}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 gap-2 font-bold"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Crosshair className="w-5 h-5" />
                  )}
                  {gettingLocation ? "מקבל מיקום..." : "הוסף מיקום בזמן אמת"}
                </Button>
              ) : field.type === "map_picker" ? (
                <div className={`rounded-xl overflow-hidden border-2 transition-all ${
                  toInputString(formData[field.latField || "latitude"])
                    ? "border-green-500 shadow-md shadow-green-500/20"
                    : "border-orange-400 shadow-md shadow-orange-400/20"
                }`}>
                  {!toInputString(formData[field.latField || "latitude"]) && (
                    <div className="bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>יש לדקור נקודה במפה — שדה חובה</span>
                    </div>
                  )}
                  {toInputString(formData[field.latField || "latitude"]) && (
                    <div className="bg-green-50 dark:bg-green-950/30 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                      <span>✅</span>
                      <span>מיקום נבחר</span>
                    </div>
                  )}
                <MapPicker
                  latitude={toInputString(formData[field.latField || "latitude"])}
                  longitude={toInputString(formData[field.lngField || "longitude"])}
                  onLocationSelect={(lat, lng) => {
                    handleLocationChange(field.latField || "latitude", field.lngField || "longitude", lat, lng);
                  }}
                />
                </div>
              ) : field.type === "date" ? (
                <Input
                  id={field.name}
                  type="date"
                  value={toInputString(formData[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="h-12 bg-white text-slate-800 border-2 border-border/50 focus:border-primary/50 rounded-xl transition-all"
                />
              ) : (
                <Input
                  id={field.name}
                  type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
                  placeholder={field.placeholder}
                  value={toInputString(formData[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="h-12 bg-white text-slate-800 border-2 border-border/50 focus:border-primary/50 rounded-xl transition-all"
                />
              )}
            </div>
          ))}
          <DialogFooter className="pt-4 border-t border-border/30 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
              className="flex-1 h-12 rounded-xl border-2 font-bold hover:bg-muted/50"
            >
              ביטול
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
              {submitLabel || (initialData ? "עדכון" : "הוספה")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}