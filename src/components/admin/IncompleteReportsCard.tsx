import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, ChevronUp, Shield, Wrench, Target, Eye, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ShiftReport {
  id: string;
  report_date: string;
  report_time?: string;
  outpost: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: string;
  is_complete?: boolean;
  created_at?: string;
  has_ceramic_vest: boolean;
  has_helmet: boolean;
  has_personal_weapon: boolean;
  has_ammunition: boolean;
  pre_movement_checks_completed: boolean;
  driver_tools_checked: boolean;
  descent_drill_completed: boolean;
  rollover_drill_completed: boolean;
  fire_drill_completed: boolean;
  emergency_procedure_participation?: boolean;
  commander_briefing_attendance?: boolean;
  work_card_completed?: boolean;
  safety_vulnerabilities?: string;
  vardim_procedure_explanation?: string;
  vardim_points?: string;
  photo_front?: string;
  photo_left?: string;
  photo_right?: string;
  photo_back?: string;
  photo_steering_wheel?: string;
}

interface IncompleteReportsCardProps {
  reports: ShiftReport[];
  onViewReport?: (report: any) => void;
}

interface MissingItem {
  category: string;
  icon: React.ElementType;
  items: string[];
}

function getMissingItems(report: ShiftReport): MissingItem[] {
  const missing: MissingItem[] = [];

  const missingCombat: string[] = [];
  if (!report.has_ceramic_vest) missingCombat.push('ווסט קרמי');
  if (!report.has_helmet) missingCombat.push('קסדה');
  if (!report.has_personal_weapon) missingCombat.push('נשק אישי');
  if (!report.has_ammunition) missingCombat.push('מחסניות');
  
  if (missingCombat.length > 0) {
    missing.push({ category: 'ציוד לחימה', icon: Shield, items: missingCombat });
  }

  const missingChecks: string[] = [];
  if (!report.pre_movement_checks_completed) missingChecks.push('טיפול לפני תנועה (טל"ת)');
  if (!report.driver_tools_checked) missingChecks.push('כלי נהג');
  
  if (missingChecks.length > 0) {
    missing.push({ category: 'בדיקות רכב', icon: Wrench, items: missingChecks });
  }

  const missingDrills: string[] = [];
  if (!report.descent_drill_completed) missingDrills.push('תרגולת ירידה לשול');
  if (!report.rollover_drill_completed) missingDrills.push('תרגולת התהפכות');
  if (!report.fire_drill_completed) missingDrills.push('תרגולת שריפה');
  
  if (missingDrills.length > 0) {
    missing.push({ category: 'תרגולות', icon: Target, items: missingDrills });
  }

  const notCompletedBriefings: string[] = [];
  if (report.emergency_procedure_participation === false) notCompletedBriefings.push('נוהל קרה');
  if (report.commander_briefing_attendance === false) notCompletedBriefings.push('תדריך ותחקיר');
  if (report.work_card_completed === false) notCompletedBriefings.push('כרטיס עבודה');
  
  if (notCompletedBriefings.length > 0) {
    missing.push({ category: 'לא בוצע', icon: AlertTriangle, items: notCompletedBriefings });
  }

  return missing;
}

const shiftTypeMap: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
};

export function IncompleteReportsCard({ reports, onViewReport }: IncompleteReportsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const incompleteReports = reports.filter(report => {
    const missing = getMissingItems(report);
    return missing.length > 0;
  });

  return (
    <Card className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] col-span-2 rounded-3xl animate-slide-up" style={{ animationDelay: '0.25s' }}>
      {/* Warning gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
      
      <CardHeader 
        className="cursor-pointer hover:bg-amber-50/50 transition-colors rounded-t-3xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/40 to-orange-500/40 rounded-2xl blur-lg animate-pulse" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <span className="font-black text-lg text-slate-800">דיווחים עם חוסרים</span>
              <p className="text-sm text-slate-500 font-medium">
                חסר ציוד לחימה / כלי נהג / טל"ת / תרגולות
              </p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-100 text-amber-700 border-0 font-black rounded-xl px-4 text-base">
              {incompleteReports.length}
            </Badge>
            {isExpanded ? (
              <ChevronUp className="w-6 h-6 text-slate-400" />
            ) : (
              <ChevronDown className="w-6 h-6 text-slate-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-6">
          {incompleteReports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="font-bold text-lg text-emerald-700">אין דיווחים עם חוסרים</p>
              <p className="text-sm text-emerald-600 mt-1">כל הנהגים מילאו את כל הפרטים הנדרשים</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {incompleteReports.map((report, i) => {
                const missingItems = getMissingItems(report);
                return (
                  <div 
                    key={report.id} 
                    className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-4 animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-700 border-0 font-bold rounded-xl">
                          {report.vehicle_number}
                        </Badge>
                        <span className="font-black text-slate-800">{report.driver_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <span>{format(new Date(report.report_date), 'dd/MM/yyyy', { locale: he })}</span>
                          <span>•</span>
                          <span>{report.outpost}</span>
                          <span>•</span>
                          <span>משמרת {shiftTypeMap[report.shift_type]}</span>
                        </div>
                        {onViewReport && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewReport(report as any);
                            }}
                            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Missing Items */}
                    <div className="flex flex-wrap gap-2">
                      {missingItems.map((category, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20">
                          <category.icon className="w-4 h-4 text-destructive" />
                          <span className="text-xs font-bold text-destructive">
                            {category.category}: {category.items.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}