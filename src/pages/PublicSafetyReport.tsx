import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle, Camera, Send, CheckCircle, X,
  Locate, Loader2, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import unitLogo from "@/assets/unit-logo.png";

// ─── Constants (matching internal form exactly) ─────────────────────────────

const BRIGADES = [
  { code: "binyamin", name: "חטיבת בנימין" },
  { code: "shomron",  name: "חטיבת שומרון" },
  { code: "efraim",   name: "חטיבת אפרים" },
  { code: "menashe",  name: "חטיבת מנשה" },
  { code: "etzion",   name: "חטיבת עציון" },
  { code: "yehuda",   name: "חטיבת יהודה" },
];

const SAFETY_CATEGORIES = [
  "בטיחות בדרכים",
  "בטיחות בנשק",
  'בטיחות בפע"ם',
  "בטיחות בשגרה",
  "בטיחות באש",
  'בטיחות באלפ"ה ותחמושת',
  'כמעט דו"צ',
  "בטיחות בעבודה",
  "בטיחות בחופשה",
];

const DRIVER_TYPES_PLANAG = [
  { value: "security", label: 'נהג בט"ש' },
  { value: "combat",   label: "נהג לוחם" },
  { value: "vehicle_officer", label: "נהג קצין רכב" },
  { value: "general",  label: "נהג אגפי" },
  { value: "other",    label: "אחר" },
];

const DRIVER_TYPES_BATTALION = [
  { value: "fighter", label: "נהג לוחם" },
  { value: "palsar",  label: 'נהג פלס"ם' },
  { value: "general", label: "נהג כללי" },
  { value: "security", label: 'נהג בט"ש' },
];

const VEHICLE_TYPES = [
  "דויד", "סוואנה", "טיגריס", "פנתר",
  "סיור קל", "מנהלה", "שופל", "אזרחי", "רכב אורגני", "אחר",
];

const VEHICLE_MODEL_TYPES = ["סיור קל", "מנהלה", "אזרחי", "רכב אורגני", "אחר"];

const POPULATION_TYPES = ["קבע", "סדיר", "מילואים", "אזרח"];

const EVENT_TYPES_ROAD = [
  { value: "accident",  label: "תאונה" },
  { value: "stuck",     label: "התחפרות" },
  { value: "rollover",  label: "התהפכות" },
  { value: "other",     label: "אחר" },
];

const SEVERITY_OPTIONS = [
  { value: "minor",    label: "קל" },
  { value: "moderate", label: "בינוני" },
  { value: "severe",   label: "חמור" },
];

const CULPABILITY_OPTIONS = ["אשם", "לא אשם"];

const DAMAGE_OPTIONS = [
  "יש נזק אין נפגעים",
  "יש נזק יש נפגעים",
  "אין נזק אין נפגעים",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface FwEntry { id: string; name: string; parent_id: string | null }
interface OutpostEntry { id: string; name: string; region: string | null }
interface FormData {
  brigade: string;
  safety_category: string;
  title: string;
  event_date: string;
  event_time: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  framework_type: string;
  department: string;
  battalion_name: string;
  company_name: string;
  region: string;
  outpost: string;
  involved_soldiers: string;
  description: string;
  event_outcomes: string;
  person_injury_severity: string;
  driver_type: string;
  driver_name: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_number: string;
  population_type: string;
  unit_activity_type: string;
  event_type: string;
  severity: string;
  culpability: string;
  damage_and_casualties: string;
  initial_lessons: string;
  reporter_name: string;
  reporter_phone: string;
}

interface ImagePreview { base64: string; name: string; type: string; preview: string }

const today = new Date().toISOString().split("T")[0];

const EMPTY: FormData = {
  brigade: "binyamin",
  safety_category: "",
  title: "",
  event_date: today,
  event_time: "",
  location_text: "",
  latitude: null,
  longitude: null,
  framework_type: "",
  department: "",
  battalion_name: "",
  company_name: "",
  region: "",
  outpost: "",
  involved_soldiers: "",
  description: "",
  event_outcomes: "",
  person_injury_severity: "",
  driver_type: "",
  driver_name: "",
  vehicle_type: "",
  vehicle_model: "",
  vehicle_number: "",
  population_type: "",
  unit_activity_type: "",
  event_type: "",
  severity: "minor",
  culpability: "",
  damage_and_casualties: "",
  initial_lessons: "",
  reporter_name: "",
  reporter_phone: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<ImagePreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL("image/jpeg", 0.78);
        resolve({ base64, name: file.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", preview: base64 });
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const isBattalionFw = (fw: string) => fw.startsWith("sector:");
const isMagavFw = (fw: string) => /מג.?ב/.test(fw);

// ─── Sub-components ─────────────────────────────────────────────────────────

const inputCls = "w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/60 transition-colors text-base";
const selCls = inputCls + " appearance-none cursor-pointer";
const errCls = " border-red-500";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-bold text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-400 mr-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Sel({ value, onChange, options, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder?: string; className?: string;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className={selCls + " " + className}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-4">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/60">
        <div className={`w-2.5 h-7 rounded-full ${color}`} />
        <h2 className="font-black text-base text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PublicSafetyReport() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [frameworks, setFrameworks] = useState<FwEntry[]>([]);
  const [outposts, setOutposts] = useState<OutpostEntry[]>([]);
  const [fwLoading, setFwLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  }, []);

  // ── Derived options (same logic as internal form) ───────────────────────
  const rootFws = frameworks.filter(f => !f.parent_id);
  const uniqueRegions = [...new Set(outposts.map(o => o.region).filter(Boolean))] as string[];

  const frameworkOptions = [
    ...rootFws.map(f => ({ value: f.name, label: f.name })),
    ...uniqueRegions.map(r => ({ value: `sector:${r}`, label: `גדוד ${r}` })),
    ...(rootFws.length === 0 && uniqueRegions.length === 0 ? [{ value: "other", label: "אחר" }] : []),
  ];

  const selectedFwParent = rootFws.find(f => f.name === form.framework_type);
  const deptOptions = selectedFwParent
    ? frameworks.filter(f => f.parent_id === selectedFwParent.id).map(f => ({ value: f.name, label: f.name }))
    : [];
  const hasDepts = deptOptions.length > 0;

  const isBattalion = isBattalionFw(form.framework_type);
  const isMagav = isMagavFw(form.framework_type);
  const isRoadSafety = form.safety_category === "בטיחות בדרכים";

  const regionOptions = uniqueRegions.map(r => ({ value: r, label: r }));
  const selectedRegion = isBattalion ? form.framework_type.replace("sector:", "") : form.region;
  const outpostOptions = outposts
    .filter(o => !selectedRegion || o.region === selectedRegion)
    .map(o => ({ value: o.name, label: o.name }));

  const driverTypes = isBattalion ? DRIVER_TYPES_BATTALION : DRIVER_TYPES_PLANAG;

  // ── Fetch form data when brigade changes ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFwLoading(true);
    setFrameworks([]);
    setOutposts([]);
    setForm(f => ({ ...f, framework_type: "", department: "", region: "", outpost: "" }));

    supabase.functions.invoke("submit-safety-report", {
      body: { action: "get_form_data", brigade: form.brigade },
    }).then(({ data }) => {
      if (cancelled) return;
      setFrameworks((data?.frameworks || []) as FwEntry[]);
      setOutposts((data?.outposts || []) as OutpostEntry[]);
    }).catch(() => {
      // fallback: no dynamic options
    }).finally(() => {
      if (!cancelled) setFwLoading(false);
    });

    return () => { cancelled = true; };
  }, [form.brigade]);

  // ── GPS capture ─────────────────────────────────────────────────────────
  const captureGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 12000, enableHighAccuracy: true },
    );
  };

  // ── Images ──────────────────────────────────────────────────────────────
  const addImages = async (files: FileList) => {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;
    const compressed = await Promise.all(Array.from(files).slice(0, remaining).map(compressImage));
    setImages(prev => [...prev, ...compressed]);
  };

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.safety_category) e.safety_category = "שדה חובה";
    if (!form.title.trim())    e.title = "שדה חובה";
    if (!form.event_date)      e.event_date = "שדה חובה";
    if (!form.event_time)      e.event_time = "שדה חובה";
    if (!form.location_text.trim()) e.location_text = "שדה חובה";
    if (!form.framework_type)  e.framework_type = "שדה חובה";
    if (!form.involved_soldiers.trim()) e.involved_soldiers = "שדה חובה";
    if (!form.description.trim())      e.description = "שדה חובה";
    if (!form.event_outcomes.trim())   e.event_outcomes = "שדה חובה";
    if (!form.person_injury_severity.trim()) e.person_injury_severity = "שדה חובה";
    if (!form.population_type)         e.population_type = "שדה חובה";
    if (!form.unit_activity_type.trim()) e.unit_activity_type = "שדה חובה";
    if (!form.severity)        e.severity = "שדה חובה";
    if (!form.culpability)     e.culpability = "שדה חובה";
    if (!form.damage_and_casualties) e.damage_and_casualties = "שדה חובה";
    if (!form.initial_lessons.trim()) e.initial_lessons = "שדה חובה";
    if (isRoadSafety) {
      if (!form.driver_type)    e.driver_type = "שדה חובה";
      if (!form.vehicle_type)   e.vehicle_type = "שדה חובה";
      if (!form.vehicle_number.trim()) e.vehicle_number = "שדה חובה";
      if (!form.event_type)     e.event_type = "שדה חובה";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const el = document.querySelector("[data-err=true]");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        images: images.map(({ base64, name, type }) => ({ base64, name, type })),
      };
      const { data, error } = await supabase.functions.invoke("submit-safety-report", { body: payload });
      if (error || data?.error) { setSubmitError(data?.error || error?.message || "שגיאה בשליחה. נסה שוב."); return; }
      setSubmitted(true);
    } catch { setSubmitError("שגיאת רשת. בדוק חיבור ונסה שוב."); }
    finally { setSubmitting(false); }
  };

  // ─── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white mb-3">הדיווח נשלח בהצלחה</h1>
          <p className="text-slate-400 mb-2">הדיווח התקבל ויועבר לגורמים הרלוונטיים.</p>
          {form.brigade === "binyamin" && (
            <p className="text-emerald-400 text-sm font-semibold">📲 הודעת WhatsApp נשלחה לקצין הבטיחות</p>
          )}
          {isRoadSafety && (
            <p className="text-blue-400 text-sm font-semibold mt-1">🚗 האירוע מופיע גם במעקב תאונות</p>
          )}
          <button
            onClick={() => { setForm(EMPTY); setImages([]); setSubmitted(false); }}
            className="mt-8 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all font-semibold"
          >
            דיווח נוסף
          </button>
        </div>
      </div>
    );
  }

  // ─── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-gold/20 px-4 py-3 flex items-center gap-3">
        <img src={unitLogo} alt="סמל" className="w-9 h-9 object-contain drop-shadow-lg" />
        <div>
          <p className="font-black text-sm text-white leading-tight">דיווח אירוע בטיחות</p>
          <p className="text-xs text-slate-400">מערכת Connect — ניתן לדיווח ללא כניסה למערכת</p>
        </div>
        <div className="mr-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-bold text-red-400">דיווח בטיחות</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-5 pb-32">

        {/* ── Section 1: פרטי האירוע ──────────────────────────────────────── */}
        <Section title="פרטי האירוע" color="bg-gradient-to-b from-red-500 to-rose-600">
          <Field label="חטיבה" required error={errors.brigade}>
            <Sel
              value={form.brigade}
              onChange={v => set("brigade", v)}
              options={BRIGADES.map(b => ({ value: b.code, label: b.name }))}
              className={errors.brigade ? errCls : ""}
            />
          </Field>

          <Field label="קטגוריית בטיחות" required error={errors.safety_category}>
            <div data-err={!!errors.safety_category || undefined}>
              <Sel
                value={form.safety_category}
                onChange={v => { set("safety_category", v); set("driver_type", ""); set("vehicle_type", ""); set("event_type", ""); }}
                options={SAFETY_CATEGORIES.map(c => ({ value: c, label: c }))}
                placeholder="בחר קטגוריית בטיחות"
                className={errors.safety_category ? errCls : ""}
              />
            </div>
          </Field>

          <Field label="כותרת" required error={errors.title}>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="הזן כותרת..."
              className={inputCls + (errors.title ? errCls : "")}
              data-err={!!errors.title || undefined}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך" required error={errors.event_date}>
              <input
                type="date"
                value={form.event_date}
                max={today}
                onChange={e => set("event_date", e.target.value)}
                className={inputCls + (errors.event_date ? errCls : "")}
                data-err={!!errors.event_date || undefined}
              />
            </Field>
            <Field label="שעה" required error={errors.event_time}>
              <input
                type="time"
                value={form.event_time}
                onChange={e => set("event_time", e.target.value)}
                className={inputCls + (errors.event_time ? errCls : "")}
                data-err={!!errors.event_time || undefined}
              />
            </Field>
          </div>

          <Field label="מיקום האירוע" required error={errors.location_text}>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.location_text}
                onChange={e => set("location_text", e.target.value)}
                placeholder="לדוגמה: כביש 60, צומת בית אל..."
                className={inputCls + " flex-1" + (errors.location_text ? errCls : "")}
                data-err={!!errors.location_text || undefined}
              />
              {isRoadSafety && (
                <button
                  type="button"
                  onClick={captureGPS}
                  disabled={gpsLoading}
                  title="קלוט מיקום GPS"
                  className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {gpsLoading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Locate className="w-5 h-5 text-primary" />}
                </button>
              )}
            </div>
            {isRoadSafety && form.latitude !== null && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                ✓ מיקום GPS נלכד ({form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)})
              </p>
            )}
            {isRoadSafety && form.latitude === null && (
              <p className="text-xs text-amber-400 mt-1">לחץ על הכפתור לקליטת מיקום GPS (מומלץ לבטיחות בדרכים)</p>
            )}
          </Field>
        </Section>

        {/* ── Section 2: מסגרת ─────────────────────────────────────────────── */}
        <Section title="מסגרת ויחידה" color="bg-gradient-to-b from-blue-500 to-blue-700">
          <Field label="מסגרת" required error={errors.framework_type}>
            {fwLoading
              ? <div className="flex items-center gap-2 py-3 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> טוען מסגרות...</div>
              : (
                <div data-err={!!errors.framework_type || undefined}>
                  <Sel
                    value={form.framework_type}
                    onChange={v => { set("framework_type", v); set("department", ""); set("region", ""); set("outpost", ""); set("battalion_name", ""); set("company_name", ""); }}
                    options={frameworkOptions}
                    placeholder="בחר מסגרת"
                    className={errors.framework_type ? errCls : ""}
                  />
                </div>
              )
            }
          </Field>

          {/* department: conditional — framework has children && not battalion */}
          {!isBattalion && hasDepts && (
            <Field label="אגף">
              <Sel
                value={form.department}
                onChange={v => set("department", v)}
                options={deptOptions}
                placeholder="בחר אגף"
              />
            </Field>
          )}

          {/* battalion_name: conditional — battalion sector, not magav */}
          {isBattalion && !isMagav && (
            <Field label="שם הגדוד">
              <input
                type="text"
                value={form.battalion_name}
                onChange={e => set("battalion_name", e.target.value)}
                placeholder="הזן שם גדוד..."
                className={inputCls}
              />
            </Field>
          )}

          {/* company_name: conditional — battalion or magav */}
          {(isBattalion || isMagav) && (
            <Field label="פלוגה / מסגרת / אגף">
              <input
                type="text"
                value={form.company_name}
                onChange={e => set("company_name", e.target.value)}
                placeholder="הזן שם פלוגה / מסגרת / אגף..."
                className={inputCls}
              />
            </Field>
          )}

          {/* region: conditional — battalion sector */}
          {isBattalion && regionOptions.length > 0 && (
            <Field label="גזרה">
              <Sel
                value={form.region}
                onChange={v => { set("region", v); set("outpost", ""); }}
                options={regionOptions}
                placeholder="בחר גזרה"
              />
            </Field>
          )}

          {/* outpost: conditional — battalion sector */}
          {isBattalion && outpostOptions.length > 0 && (
            <Field label="מוצב">
              <Sel
                value={form.outpost}
                onChange={v => set("outpost", v)}
                options={[{ value: 'מפג"ד', label: 'מפג"ד' }, ...outpostOptions]}
                placeholder="בחר מוצב"
              />
            </Field>
          )}
        </Section>

        {/* ── Section 3: תיאור האירוע ─────────────────────────────────────── */}
        <Section title="תיאור האירוע" color="bg-gradient-to-b from-amber-500 to-orange-600">
          <Field label="חיילים מעורבים" required error={errors.involved_soldiers}>
            <textarea
              value={form.involved_soldiers}
              onChange={e => set("involved_soldiers", e.target.value)}
              placeholder="פרט את החיילים המעורבים..."
              rows={3}
              className={inputCls + " resize-none" + (errors.involved_soldiers ? errCls : "")}
              data-err={!!errors.involved_soldiers || undefined}
            />
          </Field>

          <Field label="תיאור האירוע" required error={errors.description}>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="תיאור מפורט של האירוע..."
              rows={4}
              className={inputCls + " resize-none" + (errors.description ? errCls : "")}
              data-err={!!errors.description || undefined}
            />
          </Field>

          <Field label="תוצאות האירוע" required error={errors.event_outcomes}>
            <textarea
              value={form.event_outcomes}
              onChange={e => set("event_outcomes", e.target.value)}
              placeholder="פרט את תוצאות האירוע..."
              rows={3}
              className={inputCls + " resize-none" + (errors.event_outcomes ? errCls : "")}
              data-err={!!errors.event_outcomes || undefined}
            />
          </Field>

          <Field label="הערכת חומרת הפגיעה באדם ורכוש" required error={errors.person_injury_severity}>
            <textarea
              value={form.person_injury_severity}
              onChange={e => set("person_injury_severity", e.target.value)}
              placeholder="פרט את חומרת הפגיעה באדם וברכוש..."
              rows={3}
              className={inputCls + " resize-none" + (errors.person_injury_severity ? errCls : "")}
              data-err={!!errors.person_injury_severity || undefined}
            />
          </Field>

          <Field label="לקחים ראשונים" required error={errors.initial_lessons}>
            <textarea
              value={form.initial_lessons}
              onChange={e => set("initial_lessons", e.target.value)}
              placeholder="פרט לקחים ראשונים..."
              rows={3}
              className={inputCls + " resize-none" + (errors.initial_lessons ? errCls : "")}
              data-err={!!errors.initial_lessons || undefined}
            />
          </Field>
        </Section>

        {/* ── Section 4: בטיחות בדרכים (conditional) ─────────────────────── */}
        {isRoadSafety && (
          <Section title='פרטי בטיחות בדרכים' color="bg-gradient-to-b from-red-600 to-red-800">
            <Field label="סוג הנהג" required error={errors.driver_type}>
              <div data-err={!!errors.driver_type || undefined}>
                <Sel
                  value={form.driver_type}
                  onChange={v => set("driver_type", v)}
                  options={driverTypes}
                  placeholder="בחר סוג נהג"
                  className={errors.driver_type ? errCls : ""}
                />
              </div>
            </Field>

            <Field label="שם הנהג">
              <input
                type="text"
                value={form.driver_name}
                onChange={e => set("driver_name", e.target.value)}
                placeholder="הזן שם נהג..."
                className={inputCls}
              />
            </Field>

            <Field label="סוג הרכב" required error={errors.vehicle_type}>
              <div data-err={!!errors.vehicle_type || undefined}>
                <Sel
                  value={form.vehicle_type}
                  onChange={v => { set("vehicle_type", v); set("vehicle_model", ""); }}
                  options={VEHICLE_TYPES.map(v => ({ value: v, label: v }))}
                  placeholder="בחר סוג רכב"
                  className={errors.vehicle_type ? errCls : ""}
                />
              </div>
            </Field>

            {VEHICLE_MODEL_TYPES.includes(form.vehicle_type) && (
              <Field label="דגם הרכב">
                <input
                  type="text"
                  value={form.vehicle_model}
                  onChange={e => set("vehicle_model", e.target.value)}
                  placeholder="לדוגמה: הילקס, דימקס, ספארי..."
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="מספר רכב" required error={errors.vehicle_number}>
              <input
                type="text"
                value={form.vehicle_number}
                onChange={e => set("vehicle_number", e.target.value)}
                placeholder="הזן מספר רכב..."
                className={inputCls + (errors.vehicle_number ? errCls : "")}
                data-err={!!errors.vehicle_number || undefined}
              />
            </Field>

            <Field label="סוג האירוע" required error={errors.event_type}>
              <div data-err={!!errors.event_type || undefined}>
                <Sel
                  value={form.event_type}
                  onChange={v => set("event_type", v)}
                  options={EVENT_TYPES_ROAD}
                  placeholder="בחר סוג אירוע"
                  className={errors.event_type ? errCls : ""}
                />
              </div>
            </Field>
          </Section>
        )}

        {/* ── Section 5: פרטים נוספים ────────────────────────────────────── */}
        <Section title="פרטים נוספים" color="bg-gradient-to-b from-purple-500 to-violet-600">
          <Field label="סוג אוכלוסייה" required error={errors.population_type}>
            <div data-err={!!errors.population_type || undefined}>
              <Sel
                value={form.population_type}
                onChange={v => set("population_type", v)}
                options={POPULATION_TYPES.map(p => ({ value: p, label: p }))}
                placeholder="בחר סוג אוכלוסייה"
                className={errors.population_type ? errCls : ""}
              />
            </div>
          </Field>

          <Field label="סוג האירוע (פעילות היחידה)" required error={errors.unit_activity_type}>
            <input
              type="text"
              value={form.unit_activity_type}
              onChange={e => set("unit_activity_type", e.target.value)}
              placeholder="לדוגמה: סיור, מחסום, אימון..."
              className={inputCls + (errors.unit_activity_type ? errCls : "")}
              data-err={!!errors.unit_activity_type || undefined}
            />
          </Field>

          <Field label="חומרת האירוע" required error={errors.severity}>
            <Sel
              value={form.severity}
              onChange={v => set("severity", v)}
              options={SEVERITY_OPTIONS}
              className={errors.severity ? errCls : ""}
            />
          </Field>

          <Field label="סיווג האשמה" required error={errors.culpability}>
            <div data-err={!!errors.culpability || undefined}>
              <Sel
                value={form.culpability}
                onChange={v => set("culpability", v)}
                options={CULPABILITY_OPTIONS.map(c => ({ value: c, label: c }))}
                placeholder="בחר סיווג אשמה"
                className={errors.culpability ? errCls : ""}
              />
            </div>
          </Field>

          <Field label="נזק ונפגעים" required error={errors.damage_and_casualties}>
            <div data-err={!!errors.damage_and_casualties || undefined}>
              <Sel
                value={form.damage_and_casualties}
                onChange={v => set("damage_and_casualties", v)}
                options={DAMAGE_OPTIONS.map(d => ({ value: d, label: d }))}
                placeholder="בחר סיווג נזק ונפגעים"
                className={errors.damage_and_casualties ? errCls : ""}
              />
            </div>
          </Field>
        </Section>

        {/* ── Section 6: תמונות ───────────────────────────────────────────── */}
        <Section title="תמונות האירוע" color="bg-gradient-to-b from-teal-500 to-cyan-600">
          {images.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img.preview} alt={`תמונה ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-slate-600" />
                  <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 5 && (
            <>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => e.target.files && addImages(e.target.files)} />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-600 hover:border-primary/60 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 font-semibold">
                <Camera className="w-5 h-5" />
                {images.length === 0 ? "הוסף תמונות מהאירוע" : `הוסף עוד (${5 - images.length} נותרו)`}
              </button>
            </>
          )}
        </Section>

        {/* ── Section 7: פרטי מדווח ───────────────────────────────────────── */}
        <Section title="פרטי המדווח (לתיאום, אופציונלי)" color="bg-gradient-to-b from-slate-500 to-slate-600">
          <div className="grid grid-cols-2 gap-3">
            <Field label="שם המדווח">
              <input type="text" value={form.reporter_name} onChange={e => set("reporter_name", e.target.value)}
                placeholder="שם מלא" className={inputCls} />
            </Field>
            <Field label="טלפון">
              <input type="tel" value={form.reporter_phone} onChange={e => set("reporter_phone", e.target.value)}
                placeholder="05X-XXXXXXX" className={inputCls} inputMode="tel" />
            </Field>
          </div>
        </Section>

        {/* Error banner */}
        {submitError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />{submitError}
          </div>
        )}

        <p className="text-xs text-slate-500 text-center mb-4 px-2">
          הדיווח נשמר במערכת Connect ומועבר לקצין הבטיחות. במקרה חירום — פנה ישירות לחדר המצב.
        </p>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 right-0 left-0 bg-slate-900/95 backdrop-blur border-t border-slate-700/50 p-4 z-20">
        <button type="button" onClick={submit} disabled={submitting}
          className="w-full max-w-xl mx-auto flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg bg-gradient-to-l from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /> שולח דיווח...</>
            : <><Send className="w-5 h-5" /> שלח דיווח בטיחות</>}
        </button>
      </div>
    </div>
  );
}
