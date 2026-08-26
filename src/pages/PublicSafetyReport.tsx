import { useState, useRef, useCallback } from "react";
import {
  AlertTriangle, MapPin, Camera, Send, CheckCircle, X,
  Locate, Loader2, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import unitLogo from "@/assets/unit-logo.png";

const BRIGADES = [
  { code: "binyamin", name: "חטיבת בנימין" },
  { code: "shomron",  name: "חטיבת שומרון" },
  { code: "efraim",   name: "חטיבת אפרים" },
  { code: "menashe",  name: "חטיבת מנשה" },
  { code: "etzion",   name: "חטיבת עציון" },
  { code: "yehuda",   name: "חטיבת יהודה" },
];

const SAFETY_CATEGORIES = [
  "תאונת דרכים",
  "ירי בשגגה / רשלנות נשק",
  "פציעת נשק",
  "נפילה / חבלה",
  "שריפה",
  "אובדן כלי נשק",
  "פגיעה בנפש",
  "אירוע ביטחוני",
  "תאונת אימון",
  "מחלה / תשישות",
  "תאונת רכב בלי נהיגה",
  "אחר",
];

const VEHICLE_TYPES = [
  'ג\'יפ',
  'ניידת / ג\'יפ משוריין',
  'נגמש',
  'רכב קל',
  'משאית',
  'אוטובוס',
  'רכב מיוחד',
  'אחר',
];

const FRAMEWORK_OPTIONS = [
  { value: "planag", label: 'פלנ"ג' },
  { value: "battalion", label: "גדוד תע\"ם" },
  { value: "maphatch", label: 'מפח"ט' },
  { value: "other", label: "אחר" },
];

interface ImagePreview {
  base64: string;
  name: string;
  type: string;
  preview: string;
}

interface FormData {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  severity: string;
  safety_category: string;
  brigade: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  framework_type: string;
  battalion_name: string;
  department: string;
  company_name: string;
  involved_soldiers: string;
  driver_name: string;
  vehicle_number: string;
  vehicle_type: string;
  reporter_name: string;
  reporter_phone: string;
}

const today = new Date().toISOString().split("T")[0];

const empty: FormData = {
  title: "",
  description: "",
  event_date: today,
  event_time: "",
  severity: "minor",
  safety_category: "",
  brigade: "binyamin",
  location_text: "",
  latitude: null,
  longitude: null,
  framework_type: "",
  battalion_name: "",
  department: "",
  company_name: "",
  involved_soldiers: "",
  driver_name: "",
  vehicle_number: "",
  vehicle_type: "",
  reporter_name: "",
  reporter_phone: "",
};

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
        canvas.width = width;
        canvas.height = height;
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

const Field = ({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-slate-300 mb-1.5">
      {label}{required && <span className="text-red-400 mr-1">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  "w-full bg-slate-800/70 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary/70 focus:bg-slate-800 transition-colors text-base";

const selectClass = inputClass + " appearance-none cursor-pointer";

const SectionHeader = ({
  color, title, icon: Icon,
}: { color: string; title: string; icon: React.ElementType }) => (
  <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/60`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <h2 className="font-black text-base text-white">{title}</h2>
  </div>
);

export default function PublicSafetyReport() {
  const [form, setForm] = useState<FormData>(empty);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  }, []);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = "שדה חובה";
    if (!form.description.trim()) e.description = "שדה חובה";
    if (!form.event_date) e.event_date = "שדה חובה";
    if (!form.brigade) e.brigade = "שדה חובה";
    if (!errors) return true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  const addImages = async (files: FileList) => {
    const remaining = 3 - images.length;
    if (remaining <= 0) return;
    const toProcess = Array.from(files).slice(0, remaining);
    const compressed = await Promise.all(toProcess.map(compressImage));
    setImages(prev => [...prev, ...compressed]);
  };

  const removeImage = (i: number) => setImages(prev => prev.filter((_, j) => j !== i));

  const submit = async () => {
    if (!validate()) {
      const firstErr = document.querySelector("[data-err]");
      firstErr?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        ...form,
        images: images.map(({ base64, name, type }) => ({ base64, name, type })),
      };

      const { data, error } = await supabase.functions.invoke("submit-safety-report", {
        body: payload,
      });

      if (error || data?.error) {
        setSubmitError(data?.error || error?.message || "שגיאה בשליחה. נסה שוב.");
        return;
      }

      setSubmitted(true);
    } catch (e) {
      setSubmitError("שגיאת רשת. בדוק חיבור ונסה שוב.");
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="text-emerald-400 text-sm font-semibold">
              📲 הודעת WhatsApp נשלחת לקצין הבטיחות
            </p>
          )}
          <button
            onClick={() => { setForm(empty); setImages([]); setSubmitted(false); }}
            className="mt-8 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all font-semibold"
          >
            דיווח נוסף
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white" dir="rtl">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-gold/20 px-4 py-3 flex items-center gap-3">
        <img src={unitLogo} alt="סמל" className="w-9 h-9 object-contain drop-shadow-lg" />
        <div>
          <p className="font-black text-sm text-white leading-tight">דיווח אירוע בטיחות</p>
          <p className="text-xs text-slate-400">מערכת Connect — איו&quot;ש</p>
        </div>
        <div className="mr-auto flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-bold text-red-400">לדיווח בלבד</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 pb-32">

        {/* Section 1 — Event details */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-4">
          <SectionHeader color="bg-gradient-to-br from-red-500 to-rose-600" title="פרטי האירוע" icon={AlertTriangle} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך האירוע" required>
              <input
                type="date"
                value={form.event_date}
                max={today}
                onChange={e => set("event_date", e.target.value)}
                className={inputClass + (errors.event_date ? " border-red-500" : "")}
                data-err={errors.event_date ? true : undefined}
              />
              {errors.event_date && <p className="text-red-400 text-xs mt-1">{errors.event_date}</p>}
            </Field>
            <Field label="שעה (אופציונלי)">
              <input
                type="time"
                value={form.event_time}
                onChange={e => set("event_time", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="חומרת האירוע" required>
            <div className="relative">
              <select
                value={form.severity}
                onChange={e => set("severity", e.target.value)}
                className={selectClass}
              >
                <option value="minor">🟡 קל</option>
                <option value="moderate">🟠 בינוני</option>
                <option value="severe">🔴 חמור</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          <Field label="סוג האירוע">
            <div className="relative">
              <select
                value={form.safety_category}
                onChange={e => set("safety_category", e.target.value)}
                className={selectClass}
              >
                <option value="">בחר סוג (אופציונלי)</option>
                {SAFETY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          <Field label="חטיבה" required>
            <div className="relative">
              <select
                value={form.brigade}
                onChange={e => set("brigade", e.target.value)}
                className={selectClass + (errors.brigade ? " border-red-500" : "")}
              >
                {BRIGADES.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>
        </div>

        {/* Section 2 — Description */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-4">
          <SectionHeader color="bg-gradient-to-br from-amber-500 to-orange-600" title="תיאור האירוע" icon={AlertTriangle} />

          <Field label="כותרת קצרה" required>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder='למשל: "תאונת דרכים בכביש 60 ליד עופרה"'
              className={inputClass + (errors.title ? " border-red-500" : "")}
              data-err={errors.title ? true : undefined}
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </Field>

          <Field label="תיאור מלא של האירוע" required>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="תאר את האירוע בפירוט: מה קרה, כיצד, מה הנסיבות..."
              rows={5}
              className={inputClass + " resize-none" + (errors.description ? " border-red-500" : "")}
              data-err={errors.description ? true : undefined}
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
          </Field>

          <Field label="מיקום האירוע">
            <div className="flex gap-2">
              <input
                type="text"
                value={form.location_text}
                onChange={e => set("location_text", e.target.value)}
                placeholder='למשל: "כביש 60 קמ׳ 45 ליד הצומת"'
                className={inputClass + " flex-1"}
              />
              <button
                type="button"
                onClick={captureGPS}
                disabled={gpsLoading}
                title="קלוט מיקום GPS"
                className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {gpsLoading
                  ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  : <Locate className="w-5 h-5 text-primary" />}
              </button>
            </div>
            {form.latitude !== null && (
              <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                מיקום GPS נלכד ✓ ({form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)})
              </p>
            )}
          </Field>
        </div>

        {/* Section 3 — Unit */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-4">
          <SectionHeader color="bg-gradient-to-br from-blue-500 to-blue-700" title="פרטי מסגרת ויחידה" icon={MapPin} />

          <Field label="מסגרת">
            <div className="relative">
              <select
                value={form.framework_type}
                onChange={e => set("framework_type", e.target.value)}
                className={selectClass}
              >
                <option value="">בחר (אופציונלי)</option>
                {FRAMEWORK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>

          {form.framework_type === "battalion" && (
            <Field label="שם הגדוד">
              <input
                type="text"
                value={form.battalion_name}
                onChange={e => set("battalion_name", e.target.value)}
                placeholder='למשל: "גדוד 71"'
                className={inputClass}
              />
            </Field>
          )}

          {form.framework_type === "maphatch" && (
            <Field label="אגף במפח&quot;ט">
              <input
                type="text"
                value={form.department}
                onChange={e => set("department", e.target.value)}
                placeholder='למשל: "לוגיסטיקה", "אג"מ"'
                className={inputClass}
              />
            </Field>
          )}

          <Field label="שם הפלוגה / כוח">
            <input
              type="text"
              value={form.company_name}
              onChange={e => set("company_name", e.target.value)}
              placeholder='למשל: "פלוגה ב׳", "צוות כ״ב"'
              className={inputClass}
            />
          </Field>
        </div>

        {/* Section 4 — Involved / Vehicle */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-4">
          <SectionHeader color="bg-gradient-to-br from-purple-500 to-violet-600" title="מעורבים ורכב" icon={AlertTriangle} />

          <Field label="שמות המעורבים">
            <input
              type="text"
              value={form.involved_soldiers}
              onChange={e => set("involved_soldiers", e.target.value)}
              placeholder='שמות + מ.א. של החיילים המעורבים'
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="שם הנהג / הפצוע">
              <input
                type="text"
                value={form.driver_name}
                onChange={e => set("driver_name", e.target.value)}
                placeholder="שם מלא"
                className={inputClass}
              />
            </Field>
            <Field label="מספר רכב">
              <input
                type="text"
                value={form.vehicle_number}
                onChange={e => set("vehicle_number", e.target.value)}
                placeholder='מס׳ לוחית'
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="סוג רכב">
            <div className="relative">
              <select
                value={form.vehicle_type}
                onChange={e => set("vehicle_type", e.target.value)}
                className={selectClass}
              >
                <option value="">בחר (אופציונלי)</option>
                {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>
        </div>

        {/* Section 5 — Images */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-4">
          <SectionHeader color="bg-gradient-to-br from-teal-500 to-cyan-600" title="תמונות (אופציונלי, עד 3)" icon={Camera} />

          {images.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={img.preview}
                    alt={`תמונה ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 3 && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && addImages(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-600 hover:border-primary/60 text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Camera className="w-5 h-5" />
                {images.length === 0 ? "הוסף תמונות מהאירוע" : `הוסף עוד (${3 - images.length} נותרו)`}
              </button>
            </>
          )}
        </div>

        {/* Section 6 — Reporter */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 mb-6">
          <SectionHeader color="bg-gradient-to-br from-slate-500 to-slate-600" title="פרטי המדווח (לתיאום)" icon={Send} />
          <p className="text-xs text-slate-500 mb-4">אופציונלי — לשם יצירת קשר במידת הצורך</p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="שם המדווח">
              <input
                type="text"
                value={form.reporter_name}
                onChange={e => set("reporter_name", e.target.value)}
                placeholder="שם מלא"
                className={inputClass}
              />
            </Field>
            <Field label="טלפון">
              <input
                type="tel"
                value={form.reporter_phone}
                onChange={e => set("reporter_phone", e.target.value)}
                placeholder="05X-XXXXXXX"
                className={inputClass}
                inputMode="tel"
              />
            </Field>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {submitError}
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 text-center mb-4 px-2">
          הדיווח נשמר במערכת Connect ומועבר לקצין הבטיחות. במקרה חירום — פנה ישירות לחדר המצב.
        </p>
      </div>

      {/* Sticky submit button */}
      <div className="fixed bottom-0 right-0 left-0 bg-slate-900/95 backdrop-blur border-t border-slate-700/50 p-4 z-20">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full max-w-xl mx-auto flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg bg-gradient-to-l from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white shadow-lg shadow-red-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting
            ? <><Loader2 className="w-5 h-5 animate-spin" /> שולח דיווח...</>
            : <><Send className="w-5 h-5" /> שלח דיווח בטיחות</>}
        </button>
      </div>
    </div>
  );
}
