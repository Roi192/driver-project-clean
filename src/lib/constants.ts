export const OUTPOSTS = [
  "כוכב יעקב",
  "רמה",
  "ענתות",
  "בית אל",
  "עפרה",
  "מבו\"ש",
  "עטרת",
  "חורש ירון",
  "נווה יאיר",
  "רנתיס",
  "מכבים",
  "חשמונאים",
] as const;

export const REGIONS = [
  "ארץ בנימין",
  "גבעת בנימין",
  "טלמונים",
  "מכבים",
] as const;

// Region to outposts mapping
export const REGION_OUTPOSTS: Record<string, string[]> = {
  "ארץ בנימין": ["בית אל", "עפרה", 'מבו"ש', "עטרת"],
  "טלמונים": ["חורש ירון", "נווה יאיר", "רנתיס"],
  "גבעת בנימין": ["כוכב יעקב", "רמה", "ענתות"],
  "מכבים": ["מכבים", "חשמונאים"],
};

// Get region from outpost
export const getRegionFromOutpost = (outpost: string): string | null => {
  for (const [region, outposts] of Object.entries(REGION_OUTPOSTS)) {
    if (outposts.includes(outpost)) {
      return region;
    }
  }
  return null;
};

export const SHIFT_TYPES = [
  "משמרת בוקר",
  "משמרת צהריים",
  "משמרת ערב",
] as const;

export const COMBAT_EQUIPMENT = [
  "ווסט קרמי",
  "קסדה",
  "נשק אישי",
  "מחסניות",
] as const;

export const PRE_MOVEMENT_CHECKS = [
  "בדיקת שמן מנוע",
  "בדיקת נוזל קירור",
  "בדיקת נוזל בלמים",
  "בדיקת מים לוישרים",
  "אומים",
  "לחץ אוויר",
  "נורות בלוח שעונים",
  'שפ"ם - ניקוי שמשות פנסים מראות',
  "בדיקת נזילות ומכות",
] as const;

export const DRIVER_TOOLS = [
  "ג'ק ומוט לג'ק",
  "מפתח גלגלים",
  "משולש אזהרה",
  "אפודה זוהרת",
  "מטף",
  "רשיון רכב",
] as const;

export const DRILLS = [
  "תרגולת ירידה לשול",
  "תרגולת התהפכות",
  "תרגולת שריפה",
] as const;

export const VEHICLE_PHOTOS = [
  { id: "front", label: "תמונת חזית של הרכב" },
  { id: "left", label: "תמונת צד שמאל של הרכב" },
  { id: "right", label: "תמונת צד ימין של הרכב" },
  { id: "back", label: "תמונה אחורית של הרכב" },
  { id: "steering", label: "תמונה של הגה הרכב" },
] as const;

export const MONTHS_HEB = [
  { value: 1, label: "ינואר" },
  { value: 2, label: "פברואר" },
  { value: 3, label: "מרץ" },
  { value: 4, label: "אפריל" },
  { value: 5, label: "מאי" },
  { value: 6, label: "יוני" },
  { value: 7, label: "יולי" },
  { value: 8, label: "אוגוסט" },
  { value: 9, label: "ספטמבר" },
  { value: 10, label: "אוקטובר" },
  { value: 11, label: "נובמבר" },
  { value: 12, label: "דצמבר" },
] as const;

export type Outpost = typeof OUTPOSTS[number];
export type Region = typeof REGIONS[number];
export type ShiftType = typeof SHIFT_TYPES[number];
export type DrillType = typeof DRILLS[number];