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
import { BRIGADES, BRIGADE_CODES, getBrigade, DIVISION_BRIGADE_CODE, DIVISION_LABEL } from "@/lib/brigades";
import { useFrameworks } from "@/hooks/useFrameworks";
import { useBrigadeOutposts } from "@/hooks/useBrigadeOutposts";

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
  framework_type: string | null;
  department: string | null;
  battalion_name: string | null;
  sector: string | null;
  region: string | null;
  outpost: string | null;
  soldier_id: string | null;
  driver_name: string | null;
  vehicle_number: string | null;
  severity: string | null;
  event_time: string | null;
  company_name: string | null;
  involved_soldiers: string | null;
  event_outcomes: string | null;
  person_injury_severity: string | null;
  property_damage_severity: string | null;
  vehicle_type: string | null;
  unit_activity_type: string | null;
  initial_lessons: string | null;
  location_text: string | null;
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
  { value: "rollover", label: "התהפכות" },
  { value: "other", label: "אחר" },
] as const;

const DRIVER_TYPES = [
  { value: "security", label: 'נהג בט"ש' },
  { value: "combat", label: "נהג גדוד" },
  { value: "vehicle_officer", label: "נהג קצין רכב" },
  { value: "general", label: "נהג אגפי" },
  { value: "other", label: "אחר" },
] as const;

const DRIVER_TYPES_BATTALION = [
  { value: "fighter", label: "נהג לוחם" },
  { value: "palsar", label: 'נהג פלס"ם' },
  { value: "general", label: "נהג כללי" },
  { value: "security", label: 'נהג בט"ש' },
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

const getFields = (
  category: ContentCategory,
  soldiers: { id: string; full_name: string; personal_number: string }[] = [],
  showBrigadeSelector = false,
  includeDivisionOption = false,
  frameworkOptions: { value: string; label: string }[] = [],
  frameworkNamesWithDepts: string[] = [],
  departmentOptions: { value: string; label: string }[] = [],
  regionOptions: { value: string; label: string }[] = [],
  outpostOptions: { value: string; label: string }[] = [],
  battalionFrameworkValues: string[] = [],
  outpostsData: { name: string; region: string | null; brigade?: string }[] = [],
  allFrameworks: import("@/hooks/useFrameworks").Framework[] = [],
  myBrigade = "",
  isBattalionUser = false,
): FieldConfig[] => {
  const brigadeField: FieldConfig = {
    name: "brigade",
    label: "חטיבה (החטיבה שבה התרחש האירוע)",
    type: "select",
    options: [
      ...(includeDivisionOption ? [{ value: DIVISION_BRIGADE_CODE, label: DIVISION_LABEL }] : []),
      ...BRIGADE_CODES.map((c) => ({ value: c, label: BRIGADES[c].name })),
    ],
    placeholder: "בחר חטיבה",
    required: true,
  };
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
    const isBattalionFwFn = (fw: string) => fw.startsWith("sector:");
    const isMagavFwFn    = (fw: string) => fw.includes("מגב");

    const sectorFields: FieldConfig[] = [
      // ── 1. כותרת ────────────────────────────────────────────────────────────
      { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
      // ── 2. חטיבה (conditional) ───────────────────────────────────────────────
      ...(showBrigadeSelector ? [brigadeField] : []),
      // ── 3. תאריך ────────────────────────────────────────────────────────────
      { name: "event_date", label: "תאריך", type: "date", placeholder: "בחר תאריך", required: true },
      // ── 4. שעה ──────────────────────────────────────────────────────────────
      { name: "event_time", label: "שעה", type: "time", placeholder: "HH:MM" },
      // ── 5. מיקום האירוע (תיאור מלל) ─────────────────────────────────────────
      { name: "location_text", label: "מיקום האירוע", type: "text", placeholder: "לדוגמה: כביש 60, צומת בית אל..." },
      // ── 6. מסגרת ────────────────────────────────────────────────────────────
      {
        name: "framework_type",
        label: "מסגרת",
        type: "select",
        required: true,
        dynamicOptions: (formData) => {
          const selectedBrigade = String(formData.brigade || myBrigade || "");
          const planagFws = allFrameworks.filter(f =>
            !f.parent_id && f.is_active &&
            (!selectedBrigade || f.brigade === selectedBrigade)
          );
          const planagOpts = planagFws.map(f => ({ value: f.name, label: f.name }));
          const brigadeOutposts = selectedBrigade
            ? outpostsData.filter(o => o.brigade === selectedBrigade)
            : outpostsData;
          const regions = [...new Set(brigadeOutposts.map(o => o.region).filter(Boolean))] as string[];
          const battalionOpts = regions.map(r => ({ value: `sector:${r}`, label: `גדוד ${r}` }));
          const combined = [...planagOpts, ...battalionOpts];
          return combined.length > 0 ? combined : [{ value: "other", label: "אחר" }];
        },
        placeholder: "בחר מסגרת",
      },
      // ── 6. אגף (conditional: מפח"ט ומסגרות עם ילדים) ──────────────────────
      {
        name: "department",
        label: "אגף",
        type: "select",
        dynamicOptions: (formData) => {
          const fw = String(formData.framework_type || "");
          if (!fw || isBattalionFwFn(fw)) return [];
          const selectedBrigade = String(formData.brigade || myBrigade || "");
          const parent = allFrameworks.find(f => f.name === fw && !f.parent_id && f.is_active && (!selectedBrigade || f.brigade === selectedBrigade));
          if (!parent) return departmentOptions;
          const children = allFrameworks.filter(f => f.parent_id === parent.id && f.is_active);
          return children.length > 0 ? children.map(c => ({ value: c.name, label: c.name })) : [];
        },
        placeholder: "בחר אגף",
        condition: (formData) => {
          const fw = String(formData.framework_type || "");
          if (!fw || isBattalionFwFn(fw)) return false;
          const selectedBrigade = String(formData.brigade || myBrigade || "");
          const parent = allFrameworks.find(f => f.name === fw && !f.parent_id && f.is_active && (!selectedBrigade || f.brigade === selectedBrigade));
          if (!parent) return false;
          return allFrameworks.some(f => f.parent_id === parent.id && f.is_active);
        },
      },
      // ── 7. שם הגדוד (conditional: גדוד גזרתי) ──────────────────────────────
      {
        name: "battalion_name",
        label: "שם הגדוד",
        type: "text",
        placeholder: "הזן שם גדוד...",
        condition: (formData) => isBattalionFwFn(String(formData.framework_type || "")),
      },
      // ── 8. פלוגה / מסגרת / אגף (conditional: גדוד גזרתי OR מגב) ───────────
      {
        name: "company_name",
        label: "פלוגה / מסגרת / אגף",
        type: "text",
        placeholder: "הזן שם פלוגה / מסגרת / אגף...",
        condition: (formData) => {
          const fw = String(formData.framework_type || "");
          return isBattalionFwFn(fw) || isMagavFwFn(fw);
        },
      },
      // ── 9. גזרה (conditional: גדוד גזרתי) ──────────────────────────────────
      {
        name: "region",
        label: "גזרה",
        type: "select",
        dynamicOptions: (formData) => {
          const selectedBrigade = String(formData.brigade || myBrigade || "");
          const brigadeOutposts = selectedBrigade
            ? outpostsData.filter(o => o.brigade === selectedBrigade)
            : outpostsData;
          const regions = [...new Set(brigadeOutposts.map(o => o.region).filter(Boolean))] as string[];
          return regions.length > 0 ? regions.map(r => ({ value: r, label: r })) : [{ value: "other", label: "אחר" }];
        },
        placeholder: "בחר גזרה",
        condition: (formData) => isBattalionFwFn(String(formData.framework_type || "")),
      },
      // ── 10. מוצב (conditional: גדוד גזרתי) ─────────────────────────────────
      {
        name: "outpost",
        label: "מוצב",
        type: "select",
        dynamicOptions: (formData) => {
          const fw = String(formData.framework_type || "");
          const selectedBrigade = String(formData.brigade || myBrigade || "");
          const isBattalionFw = isBattalionFwFn(fw);
          const region = isBattalionFw ? fw.replace("sector:", "") : String(formData.region || "");
          const brigadeOutposts = selectedBrigade
            ? outpostsData.filter(o => o.brigade === selectedBrigade)
            : outpostsData;
          const filtered = region
            ? brigadeOutposts.filter(o => o.region === region)
            : brigadeOutposts;
          const outpostOpts = filtered.map(o => ({ value: o.name, label: o.name }));
          if (isBattalionFw) outpostOpts.unshift({ value: "מפג\"ד", label: 'מפג"ד' });
          return outpostOpts.length > 0 ? outpostOpts : [{ value: "other", label: "אחר" }];
        },
        condition: (formData) => isBattalionFwFn(String(formData.framework_type || "")),
        placeholder: "בחר מוצב",
      },
      // ── 11. חיילים מעורבים ───────────────────────────────────────────────────
      { name: "involved_soldiers", label: "חיילים מעורבים", type: "textarea", placeholder: "פרט את החיילים המעורבים..." },
      // ── 13. תיאור האירוע ─────────────────────────────────────────────────────
      { name: "description", label: "תיאור האירוע", type: "textarea", placeholder: "תיאור מפורט של האירוע...", required: !isBattalionUser },
      // ── 14. תוצאות האירוע ────────────────────────────────────────────────────
      { name: "event_outcomes", label: "תוצאות האירוע", type: "textarea", placeholder: "פרט את תוצאות האירוע..." },
      // ── 15. הערכת חומרת הפגיעה (שדה מלל משולב) ────────────────────────────
      {
        name: "person_injury_severity",
        label: "הערכת חומרת הפגיעה באדם ורכוש",
        type: "textarea",
        placeholder: "פרט את חומרת הפגיעה באדם וברכוש...",
      },
      // ── 17. סוג הנהג ─────────────────────────────────────────────────────────
      {
        name: "driver_type",
        label: "סוג הנהג",
        type: "select",
        dynamicOptions: (formData) => {
          if (isBattalionFwFn(String(formData.framework_type || ""))) {
            return [...DRIVER_TYPES_BATTALION];
          }
          return [...DRIVER_TYPES];
        },
        placeholder: "בחר סוג נהג",
      },
      {
        name: "soldier_id",
        label: "בחר חייל",
        type: "select",
        options: soldiers.map(s => ({ value: s.id, label: `${s.full_name} (${s.personal_number})` })),
        placeholder: "בחר חייל מהרשימה",
        dependsOn: { field: "driver_type", value: "security" },
      },
      {
        name: "driver_name",
        label: "שם הנהג",
        type: "text",
        placeholder: "הזן שם נהג...",
        dependsOn: { field: "driver_type", value: ["combat", "vehicle_officer", "fighter", "palsar", "general", "other"] },
      },
      // ── 18. סוג הרכב ─────────────────────────────────────────────────────────
      { name: "vehicle_type", label: "סוג הרכב", type: "text", placeholder: "הזן סוג רכב..." },
      // ── 19. מספר רכב ─────────────────────────────────────────────────────────
      { name: "vehicle_number", label: "מספר רכב", type: "text", placeholder: "הזן מספר רכב..." },
      // ── 20. סוג האירוע (פעילות היחידה) ──────────────────────────────────────
      { name: "unit_activity_type", label: "סוג האירוע (פעילות היחידה)", type: "text", placeholder: "לדוגמה: סיור, מחסום, אימון..." },
      // ── 20ב. סוג האירוע (תאונה/התחפרות/התהפכות) ─────────────────────────────
      {
        name: "event_type",
        label: "סוג האירוע",
        type: "select",
        required: true,
        options: [
          { value: "accident", label: "תאונה" },
          { value: "stuck", label: "התחפרות" },
          { value: "rollover", label: "התהפכות" },
          { value: "other", label: "אחר" },
        ],
        placeholder: "בחר סוג אירוע",
      },
      // ── 21. חומרת האירוע ─────────────────────────────────────────────────────
      {
        name: "severity",
        label: "חומרת האירוע",
        type: "select",
        options: SEVERITY_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר חומרה",
        required: true,
      },
      // ── 22. לקחים ראשונים ────────────────────────────────────────────────────
      { name: "initial_lessons", label: "לקחים ראשונים", type: "textarea", placeholder: "פרט לקחים ראשונים..." },
      // ── 23. דקירת מיקום במפה ────────────────────────────────────────────────
      { name: "get_location", label: "מיקום נוכחי (GPS)", type: "location", latField: "latitude", lngField: "longitude" },
      { name: "map_picker", label: "בחר מיקום במפה", type: "map_picker", latField: "latitude", lngField: "longitude" },
      // ── 24. הוספת תמונות ─────────────────────────────────────────────────────
      { name: "image_url", label: "הוספת תמונות", type: "image", imagePickerMode: "file", imageAccept: "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" },
      { name: "file_url", label: "קובץ PDF", type: "media", mediaTypes: ["pdf", "file"] },
      { name: "video_url", label: "סרטון", type: "media", mediaTypes: ["video", "youtube"] },
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { canEditSafetyEvents: canEdit, canDelete, brigade: userBrigade, userType, isDivisionAdmin, realIsDivisionAdmin, isBattalion } = useAuth() as any;
  const isBattalionUser = userType === 'battalion' || isBattalion;
  const myBrigade = userBrigade || 'binyamin';
  const showBrigadeSelector = isBattalionUser || realIsDivisionAdmin;
  const includeDivisionOption = realIsDivisionAdmin;

  // Battalion user's registered battalion name (for pre-filling)
  const [userBattalionName, setUserBattalionName] = useState<string>("");
  useEffect(() => {
    if (!isBattalionUser) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("profiles" as any).select("battalion_name").eq("user_id", user.id).maybeSingle() as Promise<{ data: { battalion_name?: string } | null; error: unknown }>)
        .then(({ data }) => { if (data?.battalion_name) setUserBattalionName(data.battalion_name); });
    });
  }, [isBattalionUser]);

  // Load all frameworks and outposts when brigade selector is shown (battalion/division users)
  // so the form can dynamically filter by the selected brigade
  const { frameworks: allFrameworks, getChildren } = useFrameworks(showBrigadeSelector ? undefined : myBrigade);
  const { outposts: allOutposts } = useBrigadeOutposts(null, showBrigadeSelector);

  // For non-brigade-selector users, filter to their own brigade
  const myOutposts = showBrigadeSelector ? allOutposts : allOutposts.filter(o => o.brigade === myBrigade);

  // Static computed for non-brigade-selector users (used in submit handler)
  const uniqueRegions = [...new Set(myOutposts.map(o => o.region).filter(Boolean))] as string[];
  const frameworkNamesWithDepts = allFrameworks
    .filter(f => !f.parent_id && f.is_active && f.brigade === myBrigade && getChildren(f.id).length > 0)
    .map(f => f.name);
  const departmentOptions = allFrameworks
    .filter(f => !f.parent_id && f.is_active && f.brigade === myBrigade)
    .flatMap(f => getChildren(f.id))
    .map(d => ({ value: d.name, label: d.name }));
  const regionOptions = uniqueRegions.map(r => ({ value: r, label: r }));
  const outpostOptions = myOutposts.map(o => ({ value: o.name, label: o.name }));
  const outpostsData = allOutposts;

  // frameworkOptions / battalionFrameworkValues are now dynamic (computed per selected brigade in form)
  // These are only used as fallback for non-brigade-selector cases
  const myRootFrameworks = allFrameworks.filter(f => !f.parent_id && f.is_active && f.brigade === myBrigade);
  const frameworkOptions = [
    ...myRootFrameworks.map(f => ({ value: f.name, label: f.name })),
    ...uniqueRegions.map(r => ({ value: `sector:${r}`, label: `גדוד ${r}` })),
  ];
  const battalionFrameworkValues = uniqueRegions.map(r => `sector:${r}`);

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
  // Division-admin only: filter event list by specific brigade (or 'division' = מפאו"ג)
  const [divisionBrigadeFilter, setDivisionBrigadeFilter] = useState<string>("all");

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
    // Brigade-aware filtering for divisional safety events:
    // - sector_events  -> only items from MY brigade
    // - neighbor_events -> items from OTHER brigades that were tagged as sector_events
    //                      (so they appear here as "אירועים בגזרות שכנות")
    // - other categories (flag_investigations / monthly_summaries) -> unchanged (cross-brigade content)
    // Division admins see everything.
    let query = supabase.from("safety_content").select("*");

    if (category === "neighbor_events") {
      // Pull sector events from other brigades
      query = query.eq("category", "sector_events");
      if (!isDivisionAdmin) {
        query = query.neq("brigade", myBrigade);
      }
    } else {
      query = query.eq("category", category);
      if (category === "sector_events" && !isDivisionAdmin) {
        query = query.eq("brigade", myBrigade);
      }
    }

    const { data, error } = await query.order("event_date", { ascending: false });

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

    const builtFields = getFields(selectedCategory, soldiers, showBrigadeSelector, includeDivisionOption, frameworkOptions, frameworkNamesWithDepts, departmentOptions, regionOptions, outpostOptions, battalionFrameworkValues, outpostsData, allFrameworks, myBrigade, isBattalionUser);
    const initialFormData = {
      ...createEmptyFormData(builtFields),
      ...(isBattalionUser && userBattalionName ? { battalion_name: userBattalionName } : {}),
    };
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

    // Determine which brigade this event belongs to.
    // - Battalion (ta'am) users move between brigades, so they pick brigade per-event from the form.
    // - Everyone else stamps with their own brigade.
    // - Editing in "neighbor_events" is not allowed (it's a derived view of other brigades' events).
    if (selectedCategory === "neighbor_events") {
      toast.error("אירועים בגזרות שכנות מוזנים ע\"י החטיבה שאליה האירוע שייך");
      setIsSubmitting(false);
      return;
    }
    const targetBrigade = showBrigadeSelector
      ? (toNullableText(data.brigade) || (realIsDivisionAdmin ? DIVISION_BRIGADE_CODE : myBrigade))
      : myBrigade;

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

    // Extract region from battalion framework if applicable
    const selectedFw = toText(data.framework_type);
    const isBattalionFw = selectedFw.startsWith("sector:");
    const resolvedRegion = isBattalionFw
      ? selectedFw.replace("sector:", "")
      : toNullableText(data.region);
    const battalionNameValue = isBattalionFw ? toNullableText(data.battalion_name) : null;

    // Required-field validation for sector events
    if (selectedCategory === "sector_events") {
      const missing: string[] = [];
      if (!eventDate) missing.push("תאריך");
      if (showBrigadeSelector && !toNullableText(data.brigade)) missing.push("חטיבה");
      if (!eventType) missing.push("סוג אירוע");
      if (!driverType) missing.push("סוג נהג");
      if (!toNullableText(data.vehicle_number)) missing.push("מספר רכב");
      if (!toNullableText(data.severity)) missing.push("חומרת אירוע");
      if (!latitude || !longitude) missing.push("מיקום (דקירה במפה או מיקום נוכחי)");
      if (!toNullableText(data.framework_type)) missing.push("מסגרת");
      if (!isBattalionUser && !description) missing.push("תיאור");
      if (missing.length) {
        toast.error(`חסרים שדות חובה: ${missing.join(", ")}`);
        setIsSubmitting(false);
        return;
      }
    }

    // Validation: if it's a sector/neighbor event with security driver, require soldier selection
    // so the event can be synced to the soldier's profile (טבלת שליטה)
    if (selectedCategory === "sector_events" && driverType === "security" && !selectedSoldierId) {
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
      framework_type: isBattalionFw ? "battalion" : toNullableText(data.framework_type),
      department: toNullableText(data.department),
      battalion_name: battalionNameValue,
      sector: isBattalionFw ? resolvedRegion : null,
      region: resolvedRegion,
      outpost: toNullableText(data.outpost),
      soldier_id: driverType === "security" ? toNullableText(data.soldier_id) : null,
      driver_name: driverType !== "security" ? toNullableText(data.driver_name) : null,
      vehicle_number: toNullableText(data.vehicle_number),
      severity: toText(data.severity) || 'minor',
      brigade: targetBrigade,
      event_time: toNullableText(data.event_time),
      company_name: toNullableText(data.company_name),
      involved_soldiers: toNullableText(data.involved_soldiers),
      event_outcomes: toNullableText(data.event_outcomes),
      person_injury_severity: toNullableText(data.person_injury_severity),
      property_damage_severity: toNullableText(data.property_damage_severity),
      vehicle_type: toNullableText(data.vehicle_type),
      unit_activity_type: toNullableText(data.unit_activity_type),
      initial_lessons: toNullableText(data.initial_lessons),
      location_text: toNullableText(data.location_text),
    };

    const { error } = await supabase.from("safety_content").insert([insertData]);

    if (error) {
      console.error("Error adding safety content:", error);
      const e = error as { message?: string; details?: string; hint?: string };
      const msg = e?.message || e?.details || e?.hint || JSON.stringify(error);
      toast.error(`שגיאה בהוספת התוכן: ${msg}`);
    } else {
      toast.success("התוכן נוסף בהצלחה");
      clearSafetyEventDraft();
      setAddDraftData(null);
      
      // Sync to safety_events table for map display in "Know The Area"
      // For sector_events and neighbor_events - sync if it has location
      if (selectedCategory === "sector_events" && latitude && longitude) {
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
          brigade: targetBrigade,
        }]);
      }

      // Sync to accidents table (טבלת שליטה) for any sector/neighbor event
      if (selectedCategory === "sector_events") {
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
          brigade: targetBrigade,
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

    const editFw = toText(data.framework_type);
    const isEditBattalionFw = editFw.startsWith("sector:");
    const editResolvedRegion = isEditBattalionFw ? editFw.replace("sector:", "") : toNullableText(data.region);

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
      framework_type: isEditBattalionFw ? "battalion" : toNullableText(data.framework_type),
      department: toNullableText(data.department),
      battalion_name: isEditBattalionFw ? toNullableText(data.battalion_name) : null,
      sector: isEditBattalionFw ? editResolvedRegion : null,
      region: editResolvedRegion,
      outpost: toNullableText(data.outpost),
      soldier_id: driverType === "security" ? toNullableText(data.soldier_id) : null,
      driver_name: driverType !== "security" ? toNullableText(data.driver_name) : null,
      vehicle_number: toNullableText(data.vehicle_number),
      severity: toText(data.severity) || 'minor',
      event_time: toNullableText(data.event_time),
      company_name: toNullableText(data.company_name),
      involved_soldiers: toNullableText(data.involved_soldiers),
      event_outcomes: toNullableText(data.event_outcomes),
      person_injury_severity: toNullableText(data.person_injury_severity),
      property_damage_severity: toNullableText(data.property_damage_severity),
      vehicle_type: toNullableText(data.vehicle_type),
      unit_activity_type: toNullableText(data.unit_activity_type),
      initial_lessons: toNullableText(data.initial_lessons),
      location_text: toNullableText(data.location_text),
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
      console.error("Error updating safety content:", error);
      const eu = error as { message?: string; details?: string; hint?: string };
      toast.error(`שגיאה בעדכון התוכן: ${eu?.message || eu?.details || eu?.hint || JSON.stringify(error)}`);
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

      const displayedItems = (isDivisionAdmin && divisionBrigadeFilter !== "all")
        ? items.filter((it: any) => (it.brigade || "binyamin") === divisionBrigadeFilter)
        : items;

      const filterBar = isDivisionAdmin && (selectedCategory === "sector_events" || selectedCategory === "neighbor_events") ? (
        <div className="mb-4 flex items-center gap-2 flex-wrap glass-card p-3">
          <span className="text-sm font-semibold text-slate-800">סינון לפי חטיבה:</span>
          <select
            value={divisionBrigadeFilter}
            onChange={(e) => setDivisionBrigadeFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm"
          >
            <option value="all">כל החטיבות</option>
            <option value={DIVISION_BRIGADE_CODE}>{DIVISION_LABEL}</option>
            {BRIGADE_CODES.map((c) => (
              <option key={c} value={c}>{BRIGADES[c].name}</option>
            ))}
          </select>
          <span className="text-xs text-slate-600 mr-auto">{displayedItems.length} אירועים</span>
        </div>
      ) : null;

      if (displayedItems.length === 0) {
        return (
          <>
            {filterBar}
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
          </>
        );
      }

      // For flag_investigations and monthly_summaries, use video card style
      const isVideoStyle = selectedCategory === "flag_investigations" || selectedCategory === "monthly_summaries";
      const defaultThumbnail = selectedCategory === "flag_investigations" ? flagInvestigationThumbnail : monthlySummaryThumbnail;

      if (isVideoStyle) {
        return (
          <div className="grid gap-4">
            {filterBar}
            {displayedItems.map((item, index) => (
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
          {filterBar}
          {displayedItems.map((item, index) => (
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

  const fields = selectedCategory ? getFields(selectedCategory, soldiers, showBrigadeSelector, includeDivisionOption, frameworkOptions, frameworkNamesWithDepts, departmentOptions, regionOptions, outpostOptions, battalionFrameworkValues, outpostsData, allFrameworks, myBrigade, isBattalionUser) : [];

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