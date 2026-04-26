import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ShiftReport {
  id: string;
  report_date: string;
  report_time: string;
  outpost: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: string;
  is_complete: boolean;
  emergency_procedure_participation: boolean;
  commander_briefing_attendance: boolean;
  work_card_completed: boolean;
  has_ceramic_vest: boolean;
  has_helmet: boolean;
  has_personal_weapon: boolean;
  has_ammunition: boolean;
  pre_movement_checks_completed: boolean;
  pre_movement_items_checked?: string[];
  driver_tools_checked: boolean;
  driver_tools_items_checked?: string[];
  descent_drill_completed: boolean;
  rollover_drill_completed: boolean;
  fire_drill_completed: boolean;
  safety_vulnerabilities?: string;
  vardim_procedure_explanation?: string;
  vardim_points?: string;
}

interface ExportButtonProps {
  reports: ShiftReport[];
}

const shiftTypeMap: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
};

// Combat equipment items - must match form exactly
const COMBAT_EQUIPMENT_LABELS = ['ווסט קרמי', 'קסדה', 'נשק אישי', 'מחסניות'];

// Pre-movement checks - must match form exactly
const PRE_MOVEMENT_LABELS = [
  'בדיקת שמן', 'בדיקת נוזל קירור', 'בדיקת נוזל בלמים', 'בדיקת מים לוישרים',
  'אומים', 'לחץ אוויר', 'נורות בלוח שעונים', 'שפ"ם - ניקוי שמשות פנסים מראות',
  'בדיקת נזילות ומכות'
];

// Driver tools - must match form exactly
const DRIVER_TOOLS_LABELS = [
  "ג'ק ומוט לג'ק", 'מפתח גלגלים', 'משולש אזהרה', 'אפודה זוהרת', 'מטף', 'רשיון רכב'
];

// Drills - must match form exactly
const DRILLS_LABELS = ['תרגולת ירידה לשול', 'תרגולת התהפכות', 'תרגולת שריפה'];

function getCombatEquipmentDetail(report: ShiftReport): string {
  const missing: string[] = [];
  if (!report.has_ceramic_vest) missing.push('ווסט קרמי');
  if (!report.has_helmet) missing.push('קסדה');
  if (!report.has_personal_weapon) missing.push('נשק אישי');
  if (!report.has_ammunition) missing.push('מחסניות');
  
  if (missing.length === 0) return 'הכל תקין';
  return `חסר: ${missing.join(', ')}`;
}

function getPreMovementDetail(report: ShiftReport): string {
  if (report.pre_movement_checks_completed) return 'הכל תקין';
  
  // If we have the specific items checked, calculate what's missing
  const checkedItems = report.pre_movement_items_checked || [];
  const missingItems = PRE_MOVEMENT_LABELS.filter(item => !checkedItems.includes(item));
  
  if (missingItems.length === 0) return 'הכל תקין';
  if (missingItems.length === PRE_MOVEMENT_LABELS.length) return 'לא בוצע';
  return `חסר: ${missingItems.join(', ')}`;
}

function getDriverToolsDetail(report: ShiftReport): string {
  if (report.driver_tools_checked) return 'הכל תקין';
  
  // If we have the specific items checked, calculate what's missing
  const checkedItems = report.driver_tools_items_checked || [];
  const missingItems = DRIVER_TOOLS_LABELS.filter(item => !checkedItems.includes(item));
  
  if (missingItems.length === 0) return 'הכל תקין';
  if (missingItems.length === DRIVER_TOOLS_LABELS.length) return 'לא בוצע';
  return `חסר: ${missingItems.join(', ')}`;
}

function getDrillsDetail(report: ShiftReport): string {
  const missing: string[] = [];
  if (!report.descent_drill_completed) missing.push('ירידה לשול');
  if (!report.rollover_drill_completed) missing.push('התהפכות');
  if (!report.fire_drill_completed) missing.push('שריפה');
  
  if (missing.length === 0) return 'הכל בוצע';
  return `לא בוצע: ${missing.join(', ')}`;
}

export function ExportButton({ reports }: ExportButtonProps) {
  const handleExport = () => {
    if (reports.length === 0) {
      toast.error('אין דיווחים לייצוא');
      return;
    }

    // Transform data for Excel
    const excelData = reports.map((report) => ({
      'תאריך': new Date(report.report_date).toLocaleDateString('he-IL'),
      'שעה': report.report_time,
      'מוצב': report.outpost,
      'שם הנהג': report.driver_name,
      'מספר רכב': report.vehicle_number,
      'משמרת': shiftTypeMap[report.shift_type] || report.shift_type,
      'הושלם': report.is_complete ? 'כן' : 'לא',
      'השתתפות בנוהל קרה': report.emergency_procedure_participation ? 'בוצע' : 'לא בוצע',
      'תדריך ותחקיר': report.commander_briefing_attendance ? 'בוצע' : 'לא בוצע',
      'כרטיס עבודה': report.work_card_completed ? 'בוצע' : 'לא בוצע',
      'ציוד לחימה': getCombatEquipmentDetail(report),
      'טיפול לפני תנועה (טל"ת)': getPreMovementDetail(report),
      'כלי נהג': getDriverToolsDetail(report),
      'תרגולות': getDrillsDetail(report),
      'פגיעויות בטיחות': report.safety_vulnerabilities || '',
      'הסבר נוהל ורדים': report.vardim_procedure_explanation || '',
      'נקודות ורדים': report.vardim_points || '',
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // תאריך
      { wch: 8 },  // שעה
      { wch: 15 }, // מוצב
      { wch: 15 }, // שם הנהג
      { wch: 12 }, // מספר רכב
      { wch: 8 },  // משמרת
      { wch: 6 },  // הושלם
      { wch: 15 }, // השתתפות בנוהל קרה
      { wch: 15 }, // תדריך ותחקיר
      { wch: 12 }, // כרטיס עבודה
      { wch: 35 }, // ציוד לחימה
      { wch: 20 }, // טיפול לפני תנועה
      { wch: 15 }, // כלי נהג
      { wch: 35 }, // תרגולות
      { wch: 30 }, // פגיעויות בטיחות
      { wch: 30 }, // הסבר נוהל ורדים
      { wch: 30 }, // נקודות ורדים
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'דיווחים');

    // Generate filename with date
    const today = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
    const filename = `דיווחי_נהגים_${today}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
    toast.success('הקובץ הורד בהצלחה');
  };

  return (
    <Button 
      onClick={handleExport}
      variant="outline"
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      ייצוא לאקסל
    </Button>
  );
}