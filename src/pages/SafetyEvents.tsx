import { useState, useEffect } from "react";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { getSignedUrl } from "@/lib/storage-utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeckCard } from "@/components/shared/DeckCard";
import { ArrowRight, Flag, MapPin, Users, Calendar, Plus, Pencil, Trash2, Loader2, Play, FileText, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig, FormValues } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StorageImage } from "@/components/shared/StorageImage";
import flagInvestigationThumbnail from "@/assets/flag-investigation-thumbnail.png";
import monthlySummaryThumbnail from "@/assets/monthly-summary-thumbnail.png";
import { REGIONS, OUTPOSTS } from "@/lib/constants";

type View = "categories" | "items" | "itemDetail";
type ContentCategory = "flag_investigations" | "sector_events" | "neighbor_events" | "monthly_summaries";

interface SafetyContent {
  id: string;
  title: string;
  description: string | null;
  category: ContentCategory;
  image_url: string | null;
  video_url: string | null;
  file_url: string | null;
  event_date: string | null;
  latitude: number | null;
  longitude: number | null;
  event_type: string | null;
  driver_type: string | null;
  region: string | null;
  outpost: string | null;
  soldier_id: string | null;
  driver_name: string | null;
  vehicle_number: string | null;
  severity: string | null;
}

const categories = [
  { 
    id: "flag_investigations" as ContentCategory, 
    label: "תחקירי דגל", 
    icon: Flag, 
    description: "סרטוני תחקירים ולקחים",
    contentType: "video"
  },
  { 
    id: "sector_events" as ContentCategory, 
    label: "אירועים בגזרה", 
    icon: MapPin, 
    description: "אירועים שהתרחשו בגזרתנו",
    contentType: "image"
  },
  { 
    id: "neighbor_events" as ContentCategory, 
    label: "אירועים בגזרות שכנות", 
    icon: Users, 
    description: "אירועים מגזרות אחרות",
    contentType: "image"
  },
  { 
    id: "monthly_summaries" as ContentCategory, 
    label: "סיכומי חודש", 
    icon: Calendar, 
    description: "סיכומים חודשיים",
    contentType: "mixed"
  },
];

const categoryLabels: Record<ContentCategory, string> = {
  flag_investigations: "תחקירי דגל",
  sector_events: "אירועים בגזרה",
  neighbor_events: "אירועים בגזרות שכנות",
  monthly_summaries: "סיכומי חודש",
};

const EVENT_TYPES = [
  { value: "accident", label: "תאונה" },
  { value: "stuck", label: "התחפרות" },
  { value: "other", label: "אחר" },
] as const;

const DRIVER_TYPES = [
  { value: "security", label: 'נהג בט"ש' },
  { value: "combat", label: "נהג גדוד" },
] as const;

const SEVERITY_TYPES = [
  { value: "minor", label: "קל" },
  { value: "moderate", label: "בינוני" },
  { value: "severe", label: "חמור" },
] as const;

const SAFETY_EVENTS_DRAFT_KEY = "safetyEvents:activeDialogDraft";
const SAFETY_EVENTS_DRAFT_MAX_AGE_MS = 15 * 60 * 1000;

interface SafetyEventDialogDraft {
  mode: "add" | "edit";
  category: ContentCategory;
  formData: FormValues;
  selectedItem: SafetyContent | null;
  updatedAt: number;
}

const isContentCategory = (value: unknown): value is ContentCategory =>
  value === "flag_investigations" ||
  value === "sector_events" ||
  value === "neighbor_events" ||
  value === "monthly_summaries";

const readSafetyEventDraft = (): SafetyEventDialogDraft | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawDraft = window.sessionStorage.getItem(SAFETY_EVENTS_DRAFT_KEY);
    if (!rawDraft) return null;

    const draft = JSON.parse(rawDraft) as Partial<SafetyEventDialogDraft>;
    if (!isContentCategory(draft.category) || !draft.formData || !draft.updatedAt) return null;
    if (Date.now() - draft.updatedAt > SAFETY_EVENTS_DRAFT_MAX_AGE_MS) return null;

    return draft as SafetyEventDialogDraft;
  } catch {
    return null;
  }
};

const writeSafetyEventDraft = (draft: Omit<SafetyEventDialogDraft, "updatedAt">) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    SAFETY_EVENTS_DRAFT_KEY,
    JSON.stringify({ ...draft, updatedAt: Date.now() })
  );
};

const clearSafetyEventDraft = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SAFETY_EVENTS_DRAFT_KEY);
};

const forceDialogOpenAfterMobileUpload = (reopenDialog: () => void) => {
  reopenDialog();
  window.setTimeout(reopenDialog, 150);
  window.setTimeout(reopenDialog, 800);
  window.setTimeout(reopenDialog, 2_000);
  window.setTimeout(reopenDialog, 5_000);
};

const toText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const toNullableText = (value: unknown): string | null => {
  const text = toText(value).trim();
  return text || null;
};

const createEmptyFormData = (fields: FieldConfig[]): FormValues =>
  fields.reduce<FormValues>((acc, field) => {
    acc[field.name] = "";
    return acc;
  }, {});

const getFields = (category: ContentCategory, soldiers: { id: string; full_name: string; personal_number: string }[] = []): FieldConfig[] => {
  const baseFields: FieldConfig[] = [
    { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
    { name: "event_date", label: "תאריך", type: "date", placeholder: "בחר תאריך" },
    { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט..." },
  ];

  if (category === "flag_investigations") {
    return [
      ...baseFields,
      { name: "image_url", label: "תמונה ממוזערת", type: "image", imagePickerMode: "file", imageAccept: "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" },
      { name: "video_url", label: "סרטון (קובץ / YouTube / קישור)", type: "media", mediaTypes: ["video", "youtube", "file"] },
    ];
  }

  if (category === "sector_events" || category === "neighbor_events") {
    // For sector events, add event type and driver type selection
    const sectorFields: FieldConfig[] = [
      { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
      { name: "event_date", label: "תאריך", type: "date", placeholder: "בחר תאריך" },
      { 
        name: "region", 
        label: "גזרה", 
        type: "select",
        options: REGIONS.map(r => ({ value: r, label: r })),
        placeholder: "בחר גזרה"
      },
      { 
        name: "outpost", 
        label: "מוצב", 
        type: "select",
        options: OUTPOSTS.map(o => ({ value: o, label: o })),
        placeholder: "בחר מוצב"
      },
      { 
        name: "event_type", 
        label: "סוג אירוע", 
        type: "select",
        options: EVENT_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר סוג אירוע"
      },
      { 
        name: "driver_type", 
        label: "סוג נהג", 
        type: "select",
        options: DRIVER_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר סוג נהג"
      },
      { 
        name: "soldier_id", 
        label: "בחר חייל", 
        type: "select",
        options: soldiers.map(s => ({ value: s.id, label: `${s.full_name} (${s.personal_number})` })),
        placeholder: "בחר חייל מהרשימה",
        dependsOn: { field: "driver_type", value: "security" }
      },
      { 
        name: "driver_name", 
        label: "שם הנהג", 
        type: "text",
        placeholder: "הזן שם נהג...",
        dependsOn: { field: "driver_type", value: "combat" }
      },
      { name: "vehicle_number", label: "מספר רכב צבאי", type: "text", placeholder: "הזן מספר רכב..." },
      { 
        name: "severity", 
        label: "חומרת האירוע", 
        type: "select",
        options: SEVERITY_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר חומרה"
      },
      { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט..." },
      { name: "image_url", label: "תמונה", type: "image", imagePickerMode: "file", imageAccept: "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" },
      { name: "file_url", label: "קובץ PDF", type: "media", mediaTypes: ["pdf", "file"] },
      { name: "video_url", label: "סרטון (קובץ / YouTube)", type: "media", mediaTypes: ["video", "youtube"] },
      { name: "get_location", label: "מיקום נוכחי", type: "location", latField: "latitude", lngField: "longitude" },
      { name: "map_picker", label: "דקירה במפה", type: "map_picker", latField: "latitude", lngField: "longitude" },
      { name: "latitude", label: "קו רוחב", type: "text", placeholder: "31.9" },
      { name: "longitude", label: "קו אורך", type: "text", placeholder: "35.2" },
    ];
    return sectorFields;
  }

  if (category === "monthly_summaries") {
    return [
      ...baseFields,
      { name: "video_url", label: "סרטון (קובץ / YouTube)", type: "media", mediaTypes: ["video", "youtube"] },
      { name: "image_url", label: "תמונה", type: "image", imagePickerMode: "file", imageAccept: "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" },
      { name: "file_url", label: "קובץ PDF", type: "media", mediaTypes: ["pdf", "file"] },
    ];
  }

  return baseFields;
};

export default function SafetyEvents() {
  const { canEditSafetyEvents: canEdit, canDelete } = useAuth();
  const [view, setView] = useState<View>("categories");
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<SafetyContent | null>(null);
  const [items, setItems] = useState<SafetyContent[]>([]);
  const [soldiers, setSoldiers] = useState<{ id: string; full_name: string; personal_number: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addDraftData, setAddDraftData] = useState<FormValues | null>(null);
  const [editDraftData, setEditDraftData] = useState<FormValues | null>(null);

  // Fetch soldiers for the dropdown
  useEffect(() => {
    const fetchSoldiers = async () => {
      const { data, error } = await supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name");
      
      if (!error && data) {
        setSoldiers(data);
      }
    };
    fetchSoldiers();
  }, []);

  const fetchItems = async (category: ContentCategory) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("safety_content")
      .select("*")
      .eq("category", category)
      .order("event_date", { ascending: false });

    if (error) {
      toast.error("שגיאה בטעינת התוכן");
      console.error(error);
    } else {
      setItems(data as SafetyContent[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const draft = readSafetyEventDraft();
    if (!draft) return;

    setSelectedCategory(draft.category);
    setView("items");
    fetchItems(draft.category);

    if (draft.mode === "edit" && draft.selectedItem) {
      setSelectedItem({ ...draft.selectedItem, ...draft.formData } as SafetyContent);
      setEditDraftData(draft.formData);
      setEditDialogOpen(true);
    } else {
      setAddDraftData(draft.formData);
      setAddDialogOpen(true);
    }
    toast.info("שחזרתי את הטופס אחרי בחירת התמונה");
    // Run once on page load; fetchItems is intentionally not a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddDialog = () => {
    if (!selectedCategory) return;

    const initialFormData = createEmptyFormData(getFields(selectedCategory, soldiers));
    writeSafetyEventDraft({ mode: "add", category: selectedCategory, formData: initialFormData, selectedItem: null });
    setAddDraftData(initialFormData);
    setAddDialogOpen(true);
  };

  const openEditDialog = (item: SafetyContent) => {
    if (!selectedCategory) return;

    const initialFormData = { ...item } as FormValues;
    setSelectedItem(item);
    setEditDraftData(initialFormData);
    writeSafetyEventDraft({ mode: "edit", category: selectedCategory, formData: initialFormData, selectedItem: item });
    setEditDialogOpen(true);
  };

  const handleAdd = async (data: FormValues) => {
    if (!selectedCategory) return;
    setIsSubmitting(true);

    // Parse and validate coordinates - must be in valid range for Israel
    let latitude = toText(data.latitude) ? parseFloat(toText(data.latitude)) : null;
    let longitude = toText(data.longitude) ? parseFloat(toText(data.longitude)) : null;
    
    // Validate coordinates are in reasonable range (Israel is roughly lat: 29-34, lng: 34-36)
    if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      console.warn("Invalid latitude:", data.latitude, "-> resetting to null");
      latitude = null;
    }
    if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      console.warn("Invalid longitude:", data.longitude, "-> resetting to null");
      longitude = null;
    }
    
    const title = toText(data.title);
    const eventType = toNullableText(data.event_type);
    const driverType = toNullableText(data.driver_type);
    const eventDate = toNullableText(data.event_date);
    const description = toNullableText(data.description);
    const selectedSoldierId = toNullableText(data.soldier_id);

    // Validation: if it's a sector/neighbor event with security driver, require soldier selection
    // so the event can be synced to the soldier's profile (טבלת שליטה)
    if ((selectedCategory === "sector_events" || selectedCategory === "neighbor_events") &&
        driverType === "security" && !selectedSoldierId) {
      toast.error("יש לבחור חייל מהרשימה כדי לסנכרן את האירוע לטבלת השליטה");
      setIsSubmitting(false);
      return;
    }

    const insertData = {
      title,
      category: selectedCategory,
      description,
      event_date: eventDate,
      image_url: toNullableText(data.image_url),
      video_url: toNullableText(data.video_url),
      file_url: toNullableText(data.file_url),
      latitude,
      longitude,
      event_type: eventType,
      driver_type: driverType,
      region: toNullableText(data.region),
      outpost: toNullableText(data.outpost),
      soldier_id: driverType === "security" ? toNullableText(data.soldier_id) : null,
      driver_name: driverType === "combat" ? toNullableText(data.driver_name) : null,
      vehicle_number: toNullableText(data.vehicle_number),
      severity: toText(data.severity) || 'minor',
    };

    const { error } = await supabase.from("safety_content").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת התוכן");
      console.error(error);
    } else {
      toast.success("התוכן נוסף בהצלחה");
      clearSafetyEventDraft();
      setAddDraftData(null);
      
      // Sync to safety_events table for map display in "Know The Area"
      // For sector_events and neighbor_events - sync if it has location
      if ((selectedCategory === "sector_events" || selectedCategory === "neighbor_events") && latitude && longitude) {
        // Map event types to valid safety_events categories
        // Valid categories: 'accident' | 'fire' | 'vehicle' | 'weapon' | 'other'
        const eventCategory = eventType === "accident" ? "accident" : "other";
        await supabase.from("safety_events").insert([{
          title,
          description,
          category: eventCategory,
          event_date: eventDate,
          latitude,
          longitude,
          region: toNullableText(data.region),
        }]);
      }

      // Sync to accidents table (טבלת שליטה) for any sector/neighbor event
      if (selectedCategory === "sector_events" || selectedCategory === "neighbor_events") {
        const accidentPayload = {
          accident_date: eventDate || new Date().toISOString().slice(0, 10),
          driver_type: driverType === "combat" ? "combat" : "security",
          soldier_id: driverType === "security" ? selectedSoldierId : null,
          driver_name: driverType === "combat" ? toNullableText(data.driver_name) : null,
          vehicle_number: toNullableText(data.vehicle_number),
          incident_type: eventType,
          severity: toText(data.severity) || 'minor',
          location: toNullableText(data.outpost) || toNullableText(data.region),
          description: description || title,
          status: 'open',
        };
        const { error: accErr } = await supabase.from("accidents").insert([accidentPayload]);
        if (accErr) {
          console.error("accidents sync error:", accErr);
          toast.warning("האירוע נשמר אך הסנכרון לטבלת השליטה נכשל");
        } else if (selectedSoldierId) {
          toast.success("האירוע סונכרן לפרופיל החייל בטבלת השליטה");
        }
      }

      setAddDialogOpen(false);
      fetchItems(selectedCategory);
    }
    setIsSubmitting(false);
  };

  const handleEdit = async (data: FormValues) => {
    if (!selectedItem) return;
    setIsSubmitting(true);

    // Parse and validate coordinates - must be in valid range for Israel
    let latitude = toText(data.latitude) ? parseFloat(toText(data.latitude)) : null;
    let longitude = toText(data.longitude) ? parseFloat(toText(data.longitude)) : null;
    
    // Validate coordinates are in reasonable range (Israel is roughly lat: 29-34, lng: 34-36)
    if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      console.warn("Invalid latitude:", data.latitude, "-> resetting to null");
      latitude = null;
    }
    if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      console.warn("Invalid longitude:", data.longitude, "-> resetting to null");
      longitude = null;
    }
    
    const title = toText(data.title);
    const eventType = toNullableText(data.event_type);
    const driverType = toNullableText(data.driver_type);
    const eventDate = toNullableText(data.event_date);
    const description = toNullableText(data.description);

    const updateData = {
      title,
      description,
      event_date: eventDate,
      image_url: toNullableText(data.image_url),
      video_url: toNullableText(data.video_url),
      file_url: toNullableText(data.file_url),
      latitude,
      longitude,
      event_type: eventType,
      driver_type: driverType,
      region: toNullableText(data.region),
      outpost: toNullableText(data.outpost),
      soldier_id: driverType === "security" ? toNullableText(data.soldier_id) : null,
      driver_name: driverType === "combat" ? toNullableText(data.driver_name) : null,
      vehicle_number: toNullableText(data.vehicle_number),
      severity: toText(data.severity) || 'minor',
    };

    const selectedSoldierIdEdit = toNullableText(data.soldier_id);
    if ((selectedCategory === "sector_events" || selectedCategory === "neighbor_events") &&
        driverType === "security" && !selectedSoldierIdEdit) {
      toast.error("יש לבחור חייל מהרשימה כדי לסנכרן את האירוע לטבלת השליטה");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("safety_content")
      .update(updateData)
      .eq("id", selectedItem.id);

    if (error) {
      toast.error("שגיאה בעדכון התוכן");
      console.error(error);
    } else {
      toast.success("התוכן עודכן בהצלחה");
      clearSafetyEventDraft();
      setEditDraftData(null);
      
      // Sync to safety_events table for map display when coordinates are added/updated
      if ((selectedCategory === "sector_events" || selectedCategory === "neighbor_events") && latitude && longitude) {
        const eventCategory = eventType === "accident" ? "accident" : "other";
        
        // Check if this event already exists in safety_events (by matching title and approximate date)
        const { data: existingEvent } = await supabase
          .from("safety_events")
          .select("id")
          .eq("title", title)
          .maybeSingle();
        
        if (existingEvent) {
          // Update existing
          await supabase.from("safety_events").update({
            title,
            description,
            category: eventCategory,
            event_date: eventDate,
            latitude,
            longitude,
            region: toNullableText(data.region),
          }).eq("id", existingEvent.id);
        } else {
          // Insert new
          await supabase.from("safety_events").insert([{
            title,
            description,
            category: eventCategory,
            event_date: eventDate,
            latitude,
            longitude,
            region: toNullableText(data.region),
          }]);
        }
      }

      // Sync to accidents table (טבלת שליטה)
      if (selectedCategory === "sector_events" || selectedCategory === "neighbor_events") {
        const accidentPayload = {
          accident_date: eventDate || new Date().toISOString().slice(0, 10),
          driver_type: driverType === "combat" ? "combat" : "security",
          soldier_id: driverType === "security" ? toNullableText(data.soldier_id) : null,
          driver_name: driverType === "combat" ? toNullableText(data.driver_name) : null,
          vehicle_number: toNullableText(data.vehicle_number),
          incident_type: eventType,
          severity: toText(data.severity) || 'minor',
          location: toNullableText(data.outpost) || toNullableText(data.region),
          description: description || title,
        };

        // Try to find an existing matching accident (by description / title)
        const { data: existingAccident } = await supabase
          .from("accidents")
          .select("id")
          .eq("description", description || title || "")
          .maybeSingle();

        if (existingAccident) {
          await supabase.from("accidents").update(accidentPayload).eq("id", existingAccident.id);
        } else {
          await supabase.from("accidents").insert([{ ...accidentPayload, status: 'open' }]);
        }
      }

      setEditDialogOpen(false);
      if (selectedCategory) {
        fetchItems(selectedCategory);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);

    // Delete associated files from storage
    await deleteStorageFiles([selectedItem.image_url, selectedItem.file_url], "content-images");

    const { error } = await supabase
      .from("safety_content")
      .delete()
      .eq("id", selectedItem.id);

    if (error) {
      toast.error("שגיאה במחיקת התוכן");
      console.error(error);
    } else {
      toast.success("התוכן נמחק בהצלחה");
      setDeleteDialogOpen(false);
      setView("items");
      setSelectedItem(null);
      if (selectedCategory) {
        fetchItems(selectedCategory);
      }
    }
    setIsSubmitting(false);
  };

  const handleCategorySelect = async (categoryId: ContentCategory) => {
    setSelectedCategory(categoryId);
    await fetchItems(categoryId);
    setView("items");
  };

  const handleItemSelect = (item: SafetyContent) => {
    setSelectedItem(item);
    setView("itemDetail");
  };

  const goBack = () => {
    if (view === "itemDetail") {
      setView("items");
      setSelectedItem(null);
    } else if (view === "items") {
      setView("categories");
      setSelectedCategory(null);
      setItems([]);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId[1]}`;
    }
    return url;
  };

  const renderHeader = () => {
    if (view === "categories") {
      return (
        <PageHeader
          icon={Flag}
          title="אירועי בטיחות ותחקירים"
          subtitle="צפה בתחקירים ואירועים מהשטח"
          badge="אירועי בטיחות"
        />
      );
    }

    const categoryLabel = categoryLabels[selectedCategory!];

    return (
      <div className="mb-6 animate-slide-up">
        <Button variant="ghost" onClick={goBack} className="mb-4 hover:bg-primary/10 rounded-xl gap-2 text-foreground">
          <ArrowRight className="w-5 h-5" />
          חזרה
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30">
              <Flag className="w-4 h-4 text-primary" />
              <h1 className="text-xl font-black text-foreground">
                {view === "items" ? categoryLabel : selectedItem?.title}
              </h1>
            </div>
            {view === "itemDetail" && selectedItem?.event_date && (
              <p className="text-sm text-primary font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(selectedItem.event_date)}
              </p>
            )}
          </div>
          {canEdit && view === "items" && (
            <Button 
              size="sm" 
              onClick={openAddDialog} 
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          )}
          {(canEdit || canDelete) && view === "itemDetail" && (
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => selectedItem && openEditDialog(selectedItem)}
                  className="rounded-xl"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === "categories") {
      return (
        <div className="grid gap-4">
          {categories.map((category, index) => (
            <DeckCard
              key={category.id}
              icon={category.icon}
              title={category.label}
              description={category.description}
              onClick={() => handleCategorySelect(category.id)}
              className={`animate-slide-up stagger-${index + 1}`}
            />
          ))}
        </div>
      );
    }

    if (view === "items") {
      if (loading) {
        return (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
            </div>
          </div>
        );
      }

      if (items.length === 0) {
        return (
          <div className="text-center py-12 animate-slide-up">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <Flag className="w-10 h-10 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">אין תוכן להצגה</p>
            {canEdit && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף" להוספת תוכן חדש
              </p>
            )}
          </div>
        );
      }

      // For flag_investigations and monthly_summaries, use video card style
      const isVideoStyle = selectedCategory === "flag_investigations" || selectedCategory === "monthly_summaries";
      const defaultThumbnail = selectedCategory === "flag_investigations" ? flagInvestigationThumbnail : monthlySummaryThumbnail;

      if (isVideoStyle) {
        return (
          <div className="grid gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-luxury transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${(index + 2) * 50}ms` }}
                onClick={() => handleItemSelect(item)}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {(canEdit || canDelete) && (
                  <div className="absolute top-3 left-3 z-10 flex gap-2">
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="w-9 h-9 rounded-xl backdrop-blur-sm bg-card/80 border border-border/30 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(item);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="w-9 h-9 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="relative">
                  {item.image_url ? (
                    <StorageImage
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-44 object-cover"
                      fallback={<img src={defaultThumbnail} alt={item.title} className="w-full h-44 object-cover" />}
                    />
                  ) : (
                    <img src={defaultThumbnail} alt={item.title} className="w-full h-44 object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/50 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-emblem group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-8 h-8 text-primary-foreground mr-[-3px]" />
                      </div>
                    </div>
                  </div>
                  {item.event_date && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-bold flex items-center gap-1.5 border border-border/30">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {formatDate(item.event_date)}
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // For sector_events and neighbor_events, use existing card style
      return (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-500 animate-slide-up p-4"
              style={{ animationDelay: `${(index + 2) * 50}ms` }}
              onClick={() => handleItemSelect(item)}
            >
              <div className="flex gap-4">
                {item.image_url ? (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border/30">
                    <StorageImage 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      fallback={
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                          <MapPin className="w-8 h-8 text-primary" />
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 border border-border/30">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold mb-1 truncate text-slate-800 group-hover:text-primary transition-colors">{item.title}</h3>
                    {item.latitude && item.longitude && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center" title="כולל מיקום">
                        <MapPin className="w-3 h-3 text-green-600" />
                      </div>
                    )}
                  </div>
                  {item.event_date && (
                    <p className="text-sm text-primary font-medium mb-2">
                      {formatDate(item.event_date)}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Item Detail View
    if (view === "itemDetail" && selectedItem) {
      const isYouTube = selectedItem.video_url && (selectedItem.video_url.includes('youtube.com') || selectedItem.video_url.includes('youtu.be'));
      const isStorageVideo = selectedItem.video_url && !isYouTube;
      const isStorageFile = selectedItem.file_url && !selectedItem.file_url.startsWith('http');

      const openStorageVideo = async () => {
        if (!selectedItem.video_url) return;
        try {
          const freshUrl = await getSignedUrl(selectedItem.video_url, "content-images");
          if (freshUrl) {
            window.open(freshUrl, "_blank");
          } else {
            toast.error("שגיאה בפתיחת הסרטון");
          }
        } catch {
          toast.error("שגיאה בפתיחת הסרטון");
        }
      };

      const openStorageFile = async () => {
        if (!selectedItem.file_url) return;
        try {
          const freshUrl = await getSignedUrl(selectedItem.file_url, "content-images");
          if (freshUrl) {
            window.open(freshUrl, "_blank");
          } else {
            toast.error("שגיאה בפתיחת הקובץ");
          }
        } catch {
          toast.error("שגיאה בפתיחת הקובץ");
        }
      };

      return (
        <div className="space-y-6 animate-fade-in">
          {/* YouTube Video Player */}
          {isYouTube && (
            <div className="glass-card p-4 overflow-hidden">
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(selectedItem.video_url!)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          )}

          {/* Storage Video - open with fresh signed URL */}
          {isStorageVideo && (
            <button
              onClick={openStorageVideo}
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 group w-full text-right"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Play className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-800">צפה בסרטון</p>
                <p className="text-sm text-muted-foreground">לחץ לפתיחה בחלון חדש</p>
              </div>
            </button>
          )}

          {/* Image */}
          {selectedItem.image_url && (
            <div className="glass-card p-4">
              <StorageImage 
                src={selectedItem.image_url} 
                alt={selectedItem.title}
                className="w-full rounded-xl"
              />
            </div>
          )}

          {/* Content */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-black mb-3 text-slate-800">{selectedItem.title}</h2>
            {selectedItem.event_date && (
              <p className="text-sm text-primary font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedItem.event_date)}
              </p>
            )}
            {selectedItem.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg">
                {selectedItem.description}
              </p>
            )}
          </div>

          {/* Location */}
          {selectedItem.latitude && selectedItem.longitude && (
            <a
              href={`https://www.google.com/maps?q=${selectedItem.latitude},${selectedItem.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-800">הצג מיקום במפה</p>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.latitude.toFixed(6)}, {selectedItem.longitude.toFixed(6)}
                </p>
              </div>
            </a>
          )}

          {/* PDF Link - with fresh signed URL for storage files */}
          {selectedItem.file_url && (
            isStorageFile ? (
              <button
                onClick={openStorageFile}
                className="glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 group w-full text-right"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <FileText className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">צפה בקובץ PDF</p>
                  <p className="text-sm text-muted-foreground">לחץ לפתיחה בחלון חדש</p>
                </div>
              </button>
            ) : (
              <a 
                href={selectedItem.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <FileText className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">צפה בקובץ PDF</p>
                  <p className="text-sm text-muted-foreground">לחץ לפתיחה בחלון חדש</p>
                </div>
              </a>
            )
          )}
        </div>
      );
    }

    return null;
  };

  const fields = selectedCategory ? getFields(selectedCategory, soldiers) : [];

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-lg mx-auto">
        {renderHeader()}
        {renderContent()}
      </div>

      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title={`הוספת ${categoryLabels[selectedCategory!] || 'תוכן'}`}
        fields={fields}
        initialData={addDraftData || undefined}
        onSubmit={handleAdd}
        onFormChange={(formData) => {
          if (!selectedCategory) return;
          setAddDraftData(formData);
          writeSafetyEventDraft({ mode: "add", category: selectedCategory, formData, selectedItem: null });
        }}
        onAfterFileUploadChange={() => forceDialogOpenAfterMobileUpload(() => setAddDialogOpen(true))}
        onCancel={() => {
          clearSafetyEventDraft();
          setAddDraftData(null);
        }}
        submitLabel="הוספה"
        isLoading={isSubmitting}
      />

      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title={`עריכת ${categoryLabels[selectedCategory!] || 'תוכן'}`}
        fields={fields}
        initialData={editDraftData || selectedItem || undefined}
        onSubmit={handleEdit}
        onFormChange={(formData) => {
          if (!selectedCategory || !selectedItem) return;
          setEditDraftData(formData);
          writeSafetyEventDraft({ mode: "edit", category: selectedCategory, formData, selectedItem });
        }}
        onAfterFileUploadChange={() => forceDialogOpenAfterMobileUpload(() => setEditDialogOpen(true))}
        onCancel={() => {
          clearSafetyEventDraft();
          setEditDraftData(null);
        }}
        submitLabel="עדכון"
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת תוכן"
        description={`האם אתה בטוח שברצונך למחוק את "${selectedItem?.title}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}