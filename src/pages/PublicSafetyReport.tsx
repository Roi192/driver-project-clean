import { useState, useRef, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  AlertTriangle, Camera, Send, CheckCircle, X,
  Locate, Loader2, ChevronDown, Map as MapIcon, Satellite,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import unitLogo from "@/assets/unit-logo.png";

// ─── Constants ───────────────────────────────────────────────────────────────

const BRIGADES = [
  { code: "binyamin", name: "חטיבת בנימין" },
  { code: "shomron",  name: "חטיבת שומרון" },
  { code: "efraim",   name: "חטיבת אפרים" },
  { code: "menashe",  name: "חטיבת מנשה" },
  { code: "etzion",   name: "חטיבת עציון" },
  { code: "yehuda",   name: "חטיבת יהודה" },
];

const SAFETY_CATEGORIES = [
  "בטיחות בדרכים", "בטיחות בנשק", 'בטיחות בפע"ם', "בטיחות בשגרה",
  "בטיחות באש", 'בטיחות באלפ"ה ותחמושת', 'כמעט דו"צ', "בטיחות בעבודה", "בטיחות בחופשה",
];

const DRIVER_TYPES_PLANAG = [
  { value: "security",        label: 'נהג בט"ש' },
  { value: "combat",          label: "נהג לוחם" },
  { value: "vehicle_officer", label: "נהג קצין רכב" },
  { value: "general",         label: "נהג אגפי" },
  { value: "other",           label: "אחר" },
];

const DRIVER_TYPES_BATTALION = [
  { value: "fighter",  label: "נהג לוחם" },
  { value: "palsar",   label: 'נהג פלס"ם' },
  { value: "general",  label: "נהג כללי" },
  { value: "security", label: 'נהג בט"ש' },
];

const VEHICLE_TYPES       = ["דויד","סוואנה","טיגריס","פנתר","סיור קל","מנהלה","שופל","אזרחי","רכב אורגני","אחר"];
const VEHICLE_MODEL_TYPES = ["סיור קל","מנהלה","אזרחי","רכב אורגני","אחר"];
const POPULATION_TYPES    = ["קבע","סדיר","מילואים","אזרח"];

const EVENT_TYPES_ROAD = [
  { value: "accident", label: "תאונה" }, { value: "stuck",    label: "התחפרות" },
  { value: "rollover", label: "התהפכות" }, { value: "other",   label: "אחר" },
];

const SEVERITY_OPTIONS = [
  { value: "minor",    label: "קל" },
  { value: "moderate", label: "בינוני" },
  { value: "severe",   label: "חמור" },
];

const CULPABILITY_OPTIONS = ["אשם", "לא אשם"];
const DAMAGE_OPTIONS = ["יש נזק אין נפגעים","יש נזק יש נפגעים","אין נזק אין נפגעים"];

// ─── Apple design tokens ─────────────────────────────────────────────────────
// Used as inline strings so they survive Tailwind's purge

const C = {
  bg:        "#000000",
  card:      "#1C1C1E",
  card2:     "#2C2C2E",
  fill:      "rgba(118,118,128,0.14)",
  fillFocus: "rgba(118,118,128,0.22)",
  sep:       "#38383A",
  label2:    "#8E8E93",
  label3:    "#48484A",
  red:       "#FF3B30",
  green:     "#30D158",
  font:      "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
};

// ─── Leaflet setup ───────────────────────────────────────────────────────────

const TILE_URLS = {
  map:       "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
const DEFAULT_CENTER: [number, number] = [31.88, 35.22];

const RED_PIN = new L.DivIcon({
  html: `<div style="width:20px;height:20px;background:${C.red};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.5)"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10], className: "",
});

// ─── Map sub-components ──────────────────────────────────────────────────────

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
    ...({ tap(e: L.LeafletMouseEvent) { onPick(e.latlng.lat, e.latlng.lng); } } as Record<string, unknown>),
  });
  return null;
}

function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    if (!position) return;
    const key = position.join(",");
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo(position, 15, { duration: 0.5 });
  }, [position, map]);
  return null;
}

function InlineMapPicker({
  lat, lng, onPick, onGPS, gpsLoading,
}: {
  lat: number | null; lng: number | null;
  onPick: (lat: number, lng: number) => void;
  onGPS: () => void; gpsLoading: boolean;
}) {
  const [isSatellite, setIsSatellite] = useState(false);
  const position: [number, number] | null = lat !== null && lng !== null ? [lat, lng] : null;

  const overlayBtn: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "6px 12px", borderRadius: 12, border: "1px solid rgba(84,84,88,0.65)",
    background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)",
    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: C.font, boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  };

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.sep}` }}>
      <div style={{ height: 260 }}>
        <MapContainer
          {...({ tap: true, tapTolerance: 25 } as Record<string, unknown>)}
          center={position ?? DEFAULT_CENTER}
          zoom={position ? 15 : 10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          maxBounds={[[29.5, 34.2], [33.3, 35.9]]}
          maxBoundsViscosity={1.0}
          minZoom={8}
        >
          <TileLayer url={TILE_URLS[isSatellite ? "satellite" : "map"]} />
          <MapClickHandler onPick={onPick} />
          <FlyToPosition position={position} />
          {position && <Marker position={position} icon={RED_PIN} />}
        </MapContainer>
      </div>

      {/* Satellite toggle */}
      <button type="button" onClick={() => setIsSatellite(s => !s)}
        style={{ ...overlayBtn, position: "absolute", top: 10, right: 10, zIndex: 1000 }}>
        {isSatellite
          ? <MapIcon style={{ width: 13, height: 13 }} />
          : <Satellite style={{ width: 13, height: 13 }} />}
        {isSatellite ? "מפה" : "לוויין"}
      </button>

      {/* GPS button */}
      <button type="button" onClick={onGPS} disabled={gpsLoading}
        style={{ ...overlayBtn, position: "absolute", bottom: position ? 46 : 10, right: 10, zIndex: 1000, opacity: gpsLoading ? 0.5 : 1 }}>
        {gpsLoading
          ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
          : <Locate style={{ width: 13, height: 13, color: C.red }} />}
        {gpsLoading ? "מאתר..." : "מיקום נוכחי"}
      </button>

      {/* Instruction overlay when no pin */}
      {!position && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", zIndex: 999, pointerEvents: "none",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
            borderRadius: 12, padding: "8px 16px", border: `1px solid ${C.sep}`,
            color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
          }}>
            לחץ על המפה לסימון מיקום
          </div>
        </div>
      )}

      {/* Coordinates bar */}
      {position && (
        <div style={{
          padding: "8px 16px", background: "rgba(0,0,0,0.88)",
          borderTop: `1px solid ${C.sep}`, display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.green, fontFamily: "monospace" }}>
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </span>
          <span style={{ fontSize: 11, color: C.label3, marginRight: "auto" }}>מיקום מסומן ✓</span>
        </div>
      )}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface FwEntry { id: string; name: string; parent_id: string | null }
interface OutpostEntry { id: string; name: string; region: string | null }

interface FormData {
  brigade: string; safety_category: string; title: string;
  event_date: string; event_time: string; location_text: string;
  latitude: number | null; longitude: number | null;
  framework_type: string; department: string; battalion_name: string;
  company_name: string; region: string; outpost: string;
  involved_soldiers: string; description: string; event_outcomes: string;
  person_injury_severity: string; driver_type: string; driver_name: string;
  vehicle_type: string; vehicle_model: string; vehicle_number: string;
  population_type: string; unit_activity_type: string; event_type: string;
  severity: string; culpability: string; damage_and_casualties: string;
  initial_lessons: string; reporter_name: string;
}

interface ImagePreview { base64: string; name: string; type: string; preview: string }

const today = new Date().toISOString().split("T")[0];

const EMPTY: FormData = {
  brigade: "binyamin", safety_category: "", title: "",
  event_date: today, event_time: "", location_text: "",
  latitude: null, longitude: null, framework_type: "", department: "",
  battalion_name: "", company_name: "", region: "", outpost: "",
  involved_soldiers: "", description: "", event_outcomes: "",
  person_injury_severity: "", driver_type: "", driver_name: "",
  vehicle_type: "", vehicle_model: "", vehicle_number: "",
  population_type: "", unit_activity_type: "", event_type: "",
  severity: "minor", culpability: "", damage_and_casualties: "",
  initial_lessons: "", reporter_name: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
const isMagavFw    = (fw: string) => /מג.?ב/.test(fw);

// ─── Apple-style design components ───────────────────────────────────────────

// Section = iOS grouped section: label above, dark card, dividers between rows
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontSize: 12, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.06em", color: C.label2, padding: "0 4px", marginBottom: 8,
      }}>
        {title}
      </p>
      <div style={{
        background: C.card, borderRadius: 16, overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

// Row = a field row inside a Section card, with a bottom separator
function Row({ label, required, error, children, noBorder }: {
  label: string; required?: boolean; error?: string;
  children: React.ReactNode; noBorder?: boolean;
}) {
  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: noBorder ? "none" : `0.5px solid ${C.sep}`,
    }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 500,
        color: C.label2, marginBottom: 8,
      }}>
        {label}{required && <span style={{ color: C.red, marginRight: 4 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ color: C.red, fontSize: 12, marginTop: 6, fontWeight: 500 }}>{error}</p>
      )}
    </div>
  );
}

// Apple-style input
const iStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: C.fill, border: "none", borderRadius: 10,
  padding: "10px 14px", fontSize: 15, color: "#fff",
  fontFamily: C.font, outline: "none", transition: "background 0.15s",
  WebkitAppearance: "none",
};

function SfInput(props: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  const { hasError, style, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...rest}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
      style={{
        ...iStyle,
        background: focused ? C.fillFocus : C.fill,
        outline: hasError ? `2px solid ${C.red}` : focused ? `2px solid rgba(255,59,48,0.45)` : "none",
        ...style,
      }}
    />
  );
}

function SfTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  const { hasError, style, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...rest}
      onFocus={e => { setFocused(true); onFocus?.(e); }}
      onBlur={e => { setFocused(false); onBlur?.(e); }}
      style={{
        ...iStyle,
        resize: "none",
        background: focused ? C.fillFocus : C.fill,
        outline: hasError ? `2px solid ${C.red}` : focused ? `2px solid rgba(255,59,48,0.45)` : "none",
        ...style,
      }}
    />
  );
}

function SfSelect({ value, onChange, options, placeholder, hasError }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...iStyle,
          paddingLeft: 36,
          appearance: "none",
          cursor: "pointer",
          background: focused ? C.fillFocus : C.fill,
          outline: hasError ? `2px solid ${C.red}` : focused ? `2px solid rgba(255,59,48,0.45)` : "none",
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown style={{
        position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
        width: 16, height: 16, color: C.label2, pointerEvents: "none",
      }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicSafetyReport() {
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [images, setImages]         = useState<ImagePreview[]>([]);
  const [errors, setErrors]         = useState<Partial<Record<keyof FormData, string>>>({});
  const [imageError, setImageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [frameworks, setFrameworks]   = useState<FwEntry[]>([]);
  const [outposts, setOutposts]       = useState<OutpostEntry[]>([]);
  const [fwLoading, setFwLoading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  }, []);

  const rootFws       = frameworks.filter(f => !f.parent_id);
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
  const hasDepts    = deptOptions.length > 0;
  const isBattalion = isBattalionFw(form.framework_type);
  const isMagav     = isMagavFw(form.framework_type);
  const isRoadSafety = form.safety_category === "בטיחות בדרכים";

  const regionOptions  = uniqueRegions.map(r => ({ value: r, label: r }));
  const selectedRegion = isBattalion ? form.framework_type.replace("sector:", "") : form.region;
  const outpostOptions = outposts
    .filter(o => !selectedRegion || o.region === selectedRegion)
    .map(o => ({ value: o.name, label: o.name }));
  const driverTypes = isBattalion ? DRIVER_TYPES_BATTALION : DRIVER_TYPES_PLANAG;

  useEffect(() => {
    let cancelled = false;
    setFwLoading(true);
    setFrameworks([]); setOutposts([]);
    setForm(f => ({ ...f, framework_type: "", department: "", region: "", outpost: "" }));

    supabase.functions.invoke("submit-safety-report", {
      body: { action: "get_form_data", brigade: form.brigade },
    }).then(({ data }) => {
      if (cancelled) return;
      setFrameworks((data?.frameworks || []) as FwEntry[]);
      setOutposts((data?.outposts || []) as OutpostEntry[]);
    }).catch(() => {}).finally(() => { if (!cancelled) setFwLoading(false); });

    return () => { cancelled = true; };
  }, [form.brigade]);

  const captureGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude })); setGpsLoading(false); },
      () => setGpsLoading(false),
      { timeout: 12000, enableHighAccuracy: true },
    );
  }, []);

  const addImages = async (files: FileList) => {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;
    const compressed = await Promise.all(Array.from(files).slice(0, remaining).map(compressImage));
    setImages(prev => {
      const next = [...prev, ...compressed];
      if (next.length > 0) setImageError("");
      return next;
    });
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.safety_category)               e.safety_category = "שדה חובה";
    if (!form.title.trim())                  e.title = "שדה חובה";
    if (!form.event_date)                    e.event_date = "שדה חובה";
    if (!form.event_time)                    e.event_time = "שדה חובה";
    if (!form.location_text.trim())          e.location_text = "שדה חובה";
    if (!form.framework_type)                e.framework_type = "שדה חובה";
    if (!form.involved_soldiers.trim())      e.involved_soldiers = "שדה חובה";
    if (!form.description.trim())            e.description = "שדה חובה";
    if (!form.event_outcomes.trim())         e.event_outcomes = "שדה חובה";
    if (!form.person_injury_severity.trim()) e.person_injury_severity = "שדה חובה";
    if (!form.population_type)               e.population_type = "שדה חובה";
    if (!form.unit_activity_type.trim())     e.unit_activity_type = "שדה חובה";
    if (!form.severity)                      e.severity = "שדה חובה";
    if (!form.culpability)                   e.culpability = "שדה חובה";
    if (!form.damage_and_casualties)         e.damage_and_casualties = "שדה חובה";
    if (!form.initial_lessons.trim())        e.initial_lessons = "שדה חובה";
    if (isRoadSafety) {
      if (!form.driver_type)           e.driver_type = "שדה חובה";
      if (!form.vehicle_type)          e.vehicle_type = "שדה חובה";
      if (!form.vehicle_number.trim()) e.vehicle_number = "שדה חובה";
      if (!form.event_type)            e.event_type = "שדה חובה";
    }
    const hasImgErr = images.length === 0;
    setImageError(hasImgErr ? "יש לצרף תמונה אחת לפחות" : "");
    setErrors(e);
    if (Object.keys(e).length > 0 || hasImgErr) {
      document.querySelector("[data-err=true]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0 && !hasImgErr;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true); setSubmitError("");
    try {
      const { data, error } = await supabase.functions.invoke("submit-safety-report", {
        body: { ...form, images: images.map(({ base64, name, type }) => ({ base64, name, type })) },
      });
      if (error || data?.error) { setSubmitError(data?.error || error?.message || "שגיאה בשליחה. נסה שוב."); return; }
      setSubmitted(true);
    } catch { setSubmitError("שגיאת רשת. בדוק חיבור ונסה שוב."); }
    finally { setSubmitting(false); }
  };

  // ─── Success screen ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: C.font }} dir="rtl">
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ position: "relative", width: 96, height: 96, margin: "0 auto 24px" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(48,209,88,0.2)", borderRadius: "50%", filter: "blur(20px)" }} />
            <div style={{ position: "relative", width: 96, height: 96, background: "linear-gradient(135deg,#30D158,#25A244)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(48,209,88,0.4)" }}>
              <CheckCircle style={{ width: 48, height: 48, color: "#fff" }} />
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 8 }}>הדיווח נשלח בהצלחה</h1>
          <p style={{ fontSize: 15, color: C.label2, marginBottom: 4 }}>הדיווח התקבל ויועבר לגורמים הרלוונטיים.</p>
          {form.brigade === "binyamin" && (
            <p style={{ fontSize: 14, color: C.green, fontWeight: 600, marginTop: 8 }}>📲 הודעת WhatsApp נשלחה לקצין הבטיחות</p>
          )}
          {isRoadSafety && (
            <p style={{ fontSize: 14, color: "#64D2FF", fontWeight: 600, marginTop: 4 }}>🚗 האירוע מופיע גם במעקב תאונות</p>
          )}
          {form.latitude !== null && (
            <p style={{ fontSize: 14, color: "#64D2FF", fontWeight: 600, marginTop: 4 }}>📍 המיקום מסומן במפת הכר את הגזרה</p>
          )}
          <button
            onClick={() => { setForm(EMPTY); setImages([]); setSubmitted(false); setImageError(""); }}
            style={{
              marginTop: 32, padding: "12px 28px", borderRadius: 14, border: `1px solid ${C.sep}`,
              background: C.card, color: C.label2, fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: C.font,
            }}
          >
            דיווח נוסף
          </button>
        </div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: C.font }} dir="rtl">

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "0.5px solid rgba(84,84,88,0.65)",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <img src={unitLogo} alt="סמל" style={{ width: 36, height: 36, objectFit: "contain" }} />
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>דיווח אירוע בטיחות</p>
          <p style={{ fontSize: 12, color: C.label2 }}>ניתן לדיווח ללא כניסה למערכת</p>
        </div>
        <div style={{
          marginRight: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 20,
          background: "rgba(255,59,48,0.12)", border: "1px solid rgba(255,59,48,0.3)",
        }}>
          <AlertTriangle style={{ width: 13, height: 13, color: C.red }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>בטיחות</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 120px" }}>

        {/* ══ פרטי האירוע ══════════════════════════════════════════════════ */}
        <Section title="פרטי האירוע">
          <Row label="חטיבה" required>
            <SfSelect
              value={form.brigade}
              onChange={v => set("brigade", v)}
              options={BRIGADES.map(b => ({ value: b.code, label: b.name }))}
            />
          </Row>

          <Row label="קטגוריית בטיחות" required error={errors.safety_category}>
            <div data-err={!!errors.safety_category || undefined}>
              <SfSelect
                value={form.safety_category}
                onChange={v => { set("safety_category", v); set("driver_type", ""); set("vehicle_type", ""); set("event_type", ""); }}
                options={SAFETY_CATEGORIES.map(c => ({ value: c, label: c }))}
                placeholder="בחר קטגוריית בטיחות"
                hasError={!!errors.safety_category}
              />
            </div>
          </Row>

          <Row label="כותרת" required error={errors.title}>
            <SfInput
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="הזן כותרת..."
              hasError={!!errors.title}
              data-err={!!errors.title || undefined}
            />
          </Row>

          {/* Date + Time as a single row split in two */}
          <div style={{ padding: "12px 16px", borderBottom: `0.5px solid ${C.sep}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.label2, marginBottom: 8 }}>
                תאריך<span style={{ color: C.red, marginRight: 4 }}>*</span>
              </label>
              <SfInput
                type="date"
                value={form.event_date}
                max={today}
                onChange={e => set("event_date", e.target.value)}
                hasError={!!errors.event_date}
                data-err={!!errors.event_date || undefined}
              />
              {errors.event_date && <p style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{errors.event_date}</p>}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.label2, marginBottom: 8 }}>
                שעה<span style={{ color: C.red, marginRight: 4 }}>*</span>
              </label>
              <SfInput
                type="time"
                value={form.event_time}
                onChange={e => set("event_time", e.target.value)}
                hasError={!!errors.event_time}
                data-err={!!errors.event_time || undefined}
              />
              {errors.event_time && <p style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{errors.event_time}</p>}
            </div>
          </div>

          <Row label="תיאור מיקום האירוע" required error={errors.location_text}>
            <SfInput
              type="text"
              value={form.location_text}
              onChange={e => set("location_text", e.target.value)}
              placeholder="לדוגמה: כביש 60, צומת בית אל..."
              hasError={!!errors.location_text}
              data-err={!!errors.location_text || undefined}
            />
          </Row>

          {/* Inline map */}
          <div style={{ padding: "12px 16px" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.label2, marginBottom: 8 }}>
              סימון מיקום במפה
              <span style={{ fontSize: 11, color: C.label3, fontWeight: 400, marginRight: 8 }}>לחץ על המפה לדקירה מדויקת</span>
            </label>
            <InlineMapPicker
              lat={form.latitude}
              lng={form.longitude}
              onPick={(lat, lng) => { set("latitude", lat); set("longitude", lng); }}
              onGPS={captureGPS}
              gpsLoading={gpsLoading}
            />
          </div>
        </Section>

        {/* ══ מסגרת ════════════════════════════════════════════════════════ */}
        <Section title="מסגרת ויחידה">
          <Row label="מסגרת" required error={errors.framework_type}>
            {fwLoading
              ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.label2, fontSize: 14, padding: "4px 0" }}>
                  <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                  טוען מסגרות...
                </div>
              )
              : (
                <div data-err={!!errors.framework_type || undefined}>
                  <SfSelect
                    value={form.framework_type}
                    onChange={v => { set("framework_type", v); set("department", ""); set("region", ""); set("outpost", ""); set("battalion_name", ""); set("company_name", ""); }}
                    options={frameworkOptions}
                    placeholder="בחר מסגרת"
                    hasError={!!errors.framework_type}
                  />
                </div>
              )
            }
          </Row>

          {!isBattalion && hasDepts && (
            <Row label="אגף">
              <SfSelect value={form.department} onChange={v => set("department", v)} options={deptOptions} placeholder="בחר אגף" />
            </Row>
          )}
          {isBattalion && !isMagav && (
            <Row label="שם הגדוד">
              <SfInput type="text" value={form.battalion_name} onChange={e => set("battalion_name", e.target.value)} placeholder="הזן שם גדוד..." />
            </Row>
          )}
          {(isBattalion || isMagav) && (
            <Row label="פלוגה / מסגרת / אגף">
              <SfInput type="text" value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="הזן שם פלוגה / מסגרת / אגף..." />
            </Row>
          )}
          {isBattalion && regionOptions.length > 0 && (
            <Row label="גזרה">
              <SfSelect value={form.region} onChange={v => { set("region", v); set("outpost", ""); }} options={regionOptions} placeholder="בחר גזרה" />
            </Row>
          )}
          {isBattalion && outpostOptions.length > 0 && (
            <Row label="מוצב" noBorder>
              <SfSelect value={form.outpost} onChange={v => set("outpost", v)} options={[{ value: 'מפג"ד', label: 'מפג"ד' }, ...outpostOptions]} placeholder="בחר מוצב" />
            </Row>
          )}
        </Section>

        {/* ══ תיאור האירוע ══════════════════════════════════════════════════ */}
        <Section title="תיאור האירוע">
          <Row label="חיילים מעורבים" required error={errors.involved_soldiers}>
            <SfTextarea value={form.involved_soldiers} onChange={e => set("involved_soldiers", e.target.value)}
              placeholder="פרט את החיילים המעורבים..." rows={3}
              hasError={!!errors.involved_soldiers} data-err={!!errors.involved_soldiers || undefined} />
          </Row>
          <Row label="תיאור האירוע" required error={errors.description}>
            <SfTextarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="תיאור מפורט של האירוע..." rows={4}
              hasError={!!errors.description} data-err={!!errors.description || undefined} />
          </Row>
          <Row label="תוצאות האירוע" required error={errors.event_outcomes}>
            <SfTextarea value={form.event_outcomes} onChange={e => set("event_outcomes", e.target.value)}
              placeholder="פרט את תוצאות האירוע..." rows={3}
              hasError={!!errors.event_outcomes} data-err={!!errors.event_outcomes || undefined} />
          </Row>
          <Row label="הערכת חומרת הפגיעה באדם ורכוש" required error={errors.person_injury_severity}>
            <SfTextarea value={form.person_injury_severity} onChange={e => set("person_injury_severity", e.target.value)}
              placeholder="פרט את חומרת הפגיעה באדם וברכוש..." rows={3}
              hasError={!!errors.person_injury_severity} data-err={!!errors.person_injury_severity || undefined} />
          </Row>
          <Row label="לקחים ראשונים" required error={errors.initial_lessons} noBorder>
            <SfTextarea value={form.initial_lessons} onChange={e => set("initial_lessons", e.target.value)}
              placeholder="פרט לקחים ראשונים..." rows={3}
              hasError={!!errors.initial_lessons} data-err={!!errors.initial_lessons || undefined} />
          </Row>
        </Section>

        {/* ══ בטיחות בדרכים (conditional) ══════════════════════════════════ */}
        {isRoadSafety && (
          <Section title="פרטי בטיחות בדרכים">
            <Row label="סוג הנהג" required error={errors.driver_type}>
              <div data-err={!!errors.driver_type || undefined}>
                <SfSelect value={form.driver_type} onChange={v => set("driver_type", v)}
                  options={driverTypes} placeholder="בחר סוג נהג" hasError={!!errors.driver_type} />
              </div>
            </Row>
            <Row label="שם הנהג">
              <SfInput type="text" value={form.driver_name} onChange={e => set("driver_name", e.target.value)} placeholder="הזן שם נהג..." />
            </Row>
            <Row label="סוג הרכב" required error={errors.vehicle_type}>
              <div data-err={!!errors.vehicle_type || undefined}>
                <SfSelect value={form.vehicle_type} onChange={v => { set("vehicle_type", v); set("vehicle_model", ""); }}
                  options={VEHICLE_TYPES.map(v => ({ value: v, label: v }))} placeholder="בחר סוג רכב" hasError={!!errors.vehicle_type} />
              </div>
            </Row>
            {VEHICLE_MODEL_TYPES.includes(form.vehicle_type) && (
              <Row label="דגם הרכב">
                <SfInput type="text" value={form.vehicle_model} onChange={e => set("vehicle_model", e.target.value)} placeholder="לדוגמה: הילקס, דימקס, ספארי..." />
              </Row>
            )}
            <Row label="מספר רכב" required error={errors.vehicle_number}>
              <SfInput type="text" value={form.vehicle_number} onChange={e => set("vehicle_number", e.target.value)}
                placeholder="הזן מספר רכב..." hasError={!!errors.vehicle_number} data-err={!!errors.vehicle_number || undefined} />
            </Row>
            <Row label="סוג האירוע" required error={errors.event_type} noBorder>
              <div data-err={!!errors.event_type || undefined}>
                <SfSelect value={form.event_type} onChange={v => set("event_type", v)}
                  options={EVENT_TYPES_ROAD} placeholder="בחר סוג אירוע" hasError={!!errors.event_type} />
              </div>
            </Row>
          </Section>
        )}

        {/* ══ פרטים נוספים ══════════════════════════════════════════════════ */}
        <Section title="פרטים נוספים">
          <Row label="סוג אוכלוסייה" required error={errors.population_type}>
            <div data-err={!!errors.population_type || undefined}>
              <SfSelect value={form.population_type} onChange={v => set("population_type", v)}
                options={POPULATION_TYPES.map(p => ({ value: p, label: p }))} placeholder="בחר סוג אוכלוסייה" hasError={!!errors.population_type} />
            </div>
          </Row>
          <Row label="סוג האירוע (פעילות היחידה)" required error={errors.unit_activity_type}>
            <SfInput type="text" value={form.unit_activity_type} onChange={e => set("unit_activity_type", e.target.value)}
              placeholder="לדוגמה: סיור, מחסום, אימון..." hasError={!!errors.unit_activity_type}
              data-err={!!errors.unit_activity_type || undefined} />
          </Row>
          <Row label="חומרת האירוע" required error={errors.severity}>
            <SfSelect value={form.severity} onChange={v => set("severity", v)} options={SEVERITY_OPTIONS} hasError={!!errors.severity} />
          </Row>
          <Row label="סיווג האשמה" required error={errors.culpability}>
            <div data-err={!!errors.culpability || undefined}>
              <SfSelect value={form.culpability} onChange={v => set("culpability", v)}
                options={CULPABILITY_OPTIONS.map(c => ({ value: c, label: c }))} placeholder="בחר סיווג אשמה" hasError={!!errors.culpability} />
            </div>
          </Row>
          <Row label="נזק ונפגעים" required error={errors.damage_and_casualties} noBorder>
            <div data-err={!!errors.damage_and_casualties || undefined}>
              <SfSelect value={form.damage_and_casualties} onChange={v => set("damage_and_casualties", v)}
                options={DAMAGE_OPTIONS.map(d => ({ value: d, label: d }))} placeholder="בחר סיווג נזק ונפגעים" hasError={!!errors.damage_and_casualties} />
            </div>
          </Row>
        </Section>

        {/* ══ תמונות ════════════════════════════════════════════════════════ */}
        <Section title="תמונות האירוע">
          <div style={{ padding: "16px" }} data-err={!!imageError || undefined}>
            {images.length > 0 && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={img.preview} alt={`תמונה ${i + 1}`}
                      style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 12 }} />
                    <button type="button" onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      style={{
                        position: "absolute", top: -8, right: -8,
                        width: 24, height: 24, borderRadius: "50%",
                        background: C.red, border: "2px solid #000",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}>
                      <X style={{ width: 12, height: 12, color: "#fff" }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 5 && (
              <>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => { if (e.target.files) { addImages(e.target.files); e.target.value = ""; } }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100%", height: 56, borderRadius: 14, cursor: "pointer",
                    border: `2px dashed ${imageError ? "rgba(255,59,48,0.6)" : "rgba(118,118,128,0.35)"}`,
                    background: imageError ? "rgba(255,59,48,0.06)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    fontSize: 15, fontWeight: 600, fontFamily: C.font,
                    color: imageError ? C.red : C.label2,
                    transition: "all 0.15s",
                  }}>
                  <Camera style={{ width: 20, height: 20 }} />
                  {images.length === 0 ? "הוסף תמונה (חובה)" : `הוסף עוד (${5 - images.length} נותרו)`}
                </button>
              </>
            )}
            {imageError && (
              <p style={{ color: C.red, fontSize: 12, marginTop: 8, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle style={{ width: 12, height: 12 }} />{imageError}
              </p>
            )}
            <p style={{ fontSize: 11, color: C.label3, marginTop: 8 }}>חובה לצרף תמונה אחת לפחות</p>
          </div>
        </Section>

        {/* ══ פרטי מדווח ════════════════════════════════════════════════════ */}
        <Section title="פרטי המדווח — אופציונלי">
          <Row label="שם המדווח" noBorder>
            <SfInput type="text" value={form.reporter_name} onChange={e => set("reporter_name", e.target.value)} placeholder="שם מלא" />
          </Row>
        </Section>

        {/* Error banner */}
        {submitError && (
          <div style={{
            marginBottom: 16, padding: "14px 16px", borderRadius: 14,
            background: "rgba(255,59,48,0.1)", border: `1px solid rgba(255,59,48,0.35)`,
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 14, fontWeight: 600, color: C.red,
          }}>
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />{submitError}
          </div>
        )}

        <p style={{ fontSize: 12, color: C.label3, textAlign: "center", padding: "0 8px" }}>
          הדיווח נשמר במערכת Connect ומועבר לקצין הבטיחות. במקרה חירום — פנה ישירות לחדר המצב.
        </p>
      </div>

      {/* ── Sticky submit button ── */}
      <div style={{
        position: "fixed", bottom: 0, right: 0, left: 0, zIndex: 20,
        background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px) saturate(180%)",
        borderTop: "0.5px solid rgba(84,84,88,0.65)",
        padding: "16px",
      }}>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", maxWidth: 560, margin: "0 auto",
            height: 54, borderRadius: 14,
            background: submitting ? "rgba(255,59,48,0.5)" : C.red,
            border: "none", cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 17, fontWeight: 600, color: "#fff",
            fontFamily: C.font,
            boxShadow: submitting ? "none" : "0 4px 20px rgba(255,59,48,0.4)",
            transition: "all 0.2s",
          }}>
          {submitting
            ? <><Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} /> שולח דיווח...</>
            : <><Send style={{ width: 20, height: 20 }} /> שלח דיווח בטיחות</>}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        select option { background: #1C1C1E; color: #fff; }
        ::placeholder { color: #48484A !important; }
      `}</style>
    </div>
  );
}
