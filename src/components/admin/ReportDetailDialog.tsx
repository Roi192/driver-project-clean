import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Truck, 
  User, 
  Calendar, 
  Clock, 
  MapPin,
  Shield,
  FileText,
  Image,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { COMBAT_EQUIPMENT, PRE_MOVEMENT_CHECKS, DRIVER_TOOLS } from "@/lib/constants";
import { StorageImage } from "@/components/shared/StorageImage";

interface ShiftReport {
  id: string;
  report_date: string;
  report_time: string;
  outpost: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: string;
  is_complete: boolean;
  created_at: string;
  emergency_procedure_participation: boolean;
  commander_briefing_attendance: boolean;
  work_card_completed: boolean;
  has_ceramic_vest: boolean;
  has_helmet: boolean;
  has_personal_weapon: boolean;
  has_ammunition: boolean;
  pre_movement_checks_completed: boolean;
  pre_movement_items_checked?: string[] | null;
  driver_tools_checked: boolean;
  driver_tools_items_checked?: string[] | null;
  descent_drill_completed: boolean;
  rollover_drill_completed: boolean;
  fire_drill_completed: boolean;
  safety_vulnerabilities?: string;
  vardim_procedure_explanation?: string;
  vardim_points?: string;
  photo_front?: string;
  photo_left?: string;
  photo_right?: string;
  photo_back?: string;
  photo_steering_wheel?: string;
}

interface ReportDetailDialogProps {
  report: ShiftReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shiftTypeMap: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
};

const CheckItem = ({ label, checked }: { label: string; checked: boolean }) => (
  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white border border-slate-100">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {checked ? (
      <CheckCircle className="w-5 h-5 text-emerald-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )}
  </div>
);

interface DetailedChecklistProps {
  title: string;
  allItems: readonly string[];
  checkedItems: string[] | null | undefined;
  icon: React.ElementType;
}

const DetailedChecklist = ({ title, allItems, checkedItems, icon: Icon }: DetailedChecklistProps) => {
  const checked = checkedItems || [];
  const missingItems = allItems.filter(item => !checked.includes(item));
  const hasAll = missingItems.length === 0;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-700 flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </h4>
        {hasAll ? (
          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">הושלם</Badge>
        ) : (
          <Badge className="bg-red-50 text-red-600 border-red-200">חסר {missingItems.length}</Badge>
        )}
      </div>
      
      <div className="space-y-1.5">
        {allItems.map((item) => {
          const isChecked = checked.includes(item);
          return (
            <div 
              key={item} 
              className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                isChecked ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
              }`}
            >
              <span className={isChecked ? 'text-slate-700' : 'text-red-700 font-medium'}>
                {item}
              </span>
              {isChecked ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600 font-bold">חסר</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function ReportDetailDialog({ report, open, onOpenChange }: ReportDetailDialogProps) {
  if (!report) return null;

  const photos = [
    { label: "חזית הרכב", url: report.photo_front },
    { label: "צד שמאל", url: report.photo_left },
    { label: "צד ימין", url: report.photo_right },
    { label: "אחורי הרכב", url: report.photo_back },
    { label: "הגה הרכב", url: report.photo_steering_wheel },
  ].filter(p => p.url);

  // Build combat equipment checked items based on boolean flags
  const combatEquipmentChecked: string[] = [];
  if (report.has_ceramic_vest) combatEquipmentChecked.push("ווסט קרמי");
  if (report.has_helmet) combatEquipmentChecked.push("קסדה");
  if (report.has_personal_weapon) combatEquipmentChecked.push("נשק אישי");
  if (report.has_ammunition) combatEquipmentChecked.push("מחסניות");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-2xl rounded-3xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg">פרטי דיווח</span>
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            צפייה בפרטי הדיווח המלאים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* פרטים כלליים */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              פרטים כלליים
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">נהג:</span>
                <span className="font-bold text-slate-800">{report.driver_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">מוצב:</span>
                <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">{report.outpost}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">רכב:</span>
                <span className="font-bold text-slate-800">{report.vehicle_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">משמרת:</span>
                <Badge className="bg-accent/10 text-accent border-accent/20 font-bold">{shiftTypeMap[report.shift_type] || report.shift_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">תאריך:</span>
                <span className="font-bold text-slate-800">
                  {format(new Date(report.report_date), 'dd/MM/yyyy', { locale: he })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">שעה:</span>
                <span className="font-bold text-slate-800">{report.report_time?.slice(0, 5)}</span>
              </div>
            </div>
          </div>

          {/* תדריכים */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4">תדריכים</h3>
            <div className="space-y-2">
              <CheckItem label="השתתפות בנוהל קרה" checked={report.emergency_procedure_participation} />
              <CheckItem label='השתתפות בתדריך ותחקיר ע"י דרג ממונה' checked={report.commander_briefing_attendance} />
              <CheckItem label="מילוי כרטיס עבודה וחתימה" checked={report.work_card_completed} />
            </div>
          </div>

          {/* ציוד קרבי - עם פירוט */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              ציוד קרבי
            </h3>
            <DetailedChecklist 
              title="ציוד לחימה"
              allItems={COMBAT_EQUIPMENT}
              checkedItems={combatEquipmentChecked}
              icon={Shield}
            />
          </div>

          {/* בדיקות רכב - עם פירוט */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              בדיקות רכב
            </h3>
            <div className="space-y-6">
              <DetailedChecklist 
                title='בדיקות טל"ת לפני תנועה'
                allItems={PRE_MOVEMENT_CHECKS}
                checkedItems={report.pre_movement_items_checked}
                icon={Truck}
              />
              
              <Separator className="bg-slate-200" />
              
              <DetailedChecklist 
                title="כלי נהג"
                allItems={DRIVER_TOOLS}
                checkedItems={report.driver_tools_items_checked}
                icon={Shield}
              />
            </div>
          </div>

          {/* תרגולות */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="font-black text-slate-800 mb-4">תרגולות</h3>
            <div className="space-y-2">
              <CheckItem label="תרגולת ירידה לשול" checked={report.descent_drill_completed} />
              <CheckItem label="תרגולת התהפכות" checked={report.rollover_drill_completed} />
              <CheckItem label="תרגולת שריפה" checked={report.fire_drill_completed} />
            </div>
          </div>

          {/* שדות טקסט */}
          {(report.safety_vulnerabilities || report.vardim_procedure_explanation || report.vardim_points) && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-black text-slate-800 mb-4">מידע נוסף</h3>
              {report.safety_vulnerabilities && (
                <div className="mb-4">
                  <h4 className="text-sm text-slate-500 mb-2 font-medium">נקודות תורפה בטיחותיות</h4>
                  <p className="text-sm text-slate-800 bg-white p-4 rounded-xl border border-slate-200">{report.safety_vulnerabilities}</p>
                </div>
              )}
              {report.vardim_procedure_explanation && (
                <div className="mb-4">
                  <h4 className="text-sm text-slate-500 mb-2 font-medium">הסבר נוהל ורדים</h4>
                  <p className="text-sm text-slate-800 bg-white p-4 rounded-xl border border-slate-200">{report.vardim_procedure_explanation}</p>
                </div>
              )}
              {report.vardim_points && (
                <div>
                  <h4 className="text-sm text-slate-500 mb-2 font-medium">נקודות ורדים</h4>
                  <p className="text-sm text-slate-800 bg-white p-4 rounded-xl border border-slate-200">{report.vardim_points}</p>
                </div>
              )}
            </div>
          )}

          {/* תמונות */}
          {photos.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                תמונות הרכב
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-xs text-slate-500 font-medium">{photo.label}</p>
                    <StorageImage
                      src={photo.url}
                      bucket="shift-photos"
                      alt={photo.label}
                      className="w-full h-32 object-cover rounded-xl border border-slate-200"
                      showLoader={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}