import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays, getYear, getMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Car, AlertTriangle, Gavel, Calendar, User, FileText, CheckCircle, XCircle, Download, Loader2, AlertCircle, ChevronRight, X, Gauge } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  release_date: string | null;
  outpost: string | null;
}

interface SoldierProfileDialogProps {
  soldier: Soldier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityLabels: Record<string, string> = {
  minor: 'קל',
  moderate: 'בינוני',
  severe: 'חמור'
};

const severityColors: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800'
};

type ActiveSection = 'none' | 'accidents' | 'punishments' | 'inspections' | 'attendance' | 'safety_scores';

export function SoldierProfileDialog({ soldier, open, onOpenChange }: SoldierProfileDialogProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('none');

  // Fetch accidents
  const { data: accidents = [], isLoading: accidentsLoading } = useQuery({
    queryKey: ['soldier-accidents', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('accidents')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('accident_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch punishments
  const { data: punishments = [], isLoading: punishmentsLoading } = useQuery({
    queryKey: ['soldier-punishments', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('punishments')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('punishment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch inspections
  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery({
    queryKey: ['soldier-inspections', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('inspection_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch attendance
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['soldier-attendance', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('event_attendance')
        .select('*, work_plan_events(title, event_date, category)')
        .eq('soldier_id', soldier.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch safety scores
  const { data: safetyScores = [], isLoading: safetyScoresLoading } = useQuery({
    queryKey: ['soldier-safety-scores', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('monthly_safety_scores')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('score_month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Reset active section when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setActiveSection('none');
    }
    onOpenChange(newOpen);
  };

  if (!soldier) return null;

  const isLoading = accidentsLoading || punishmentsLoading || inspectionsLoading || attendanceLoading || safetyScoresLoading;

  // Filter out "not_in_rotation" for attendance calculations
  const relevantAttendance = attendance.filter(a => a.status !== 'not_in_rotation');

  // Calculate statistics
  const attendanceRate = relevantAttendance.length > 0 
    ? Math.round((relevantAttendance.filter(a => a.attended || a.completed).length / relevantAttendance.length) * 100) 
    : 0;
  
  const avgInspectionScore = inspections.length > 0
    ? Math.round(inspections.reduce((sum, i) => sum + (i.total_score || 0), 0) / inspections.length)
    : 0;

  const severeAccidents = accidents.filter(a => a.severity === 'severe').length;
  const unexcusedAbsences = relevantAttendance.filter(a => !a.attended && !a.completed && (!a.absence_reason || a.absence_reason === 'נפקד')).length;

  // Generate alerts
  const alerts: { type: 'warning' | 'danger'; message: string; icon: string }[] = [];
  
  if (accidents.length >= 2) {
    alerts.push({ type: 'danger', message: `${accidents.length} תאונות - יש לתת תשומת לב לנהיגה בטוחה`, icon: 'car' });
  }
  if (severeAccidents > 0) {
    alerts.push({ type: 'danger', message: `${severeAccidents} תאונות חמורות - דורש ליווי צמוד`, icon: 'alert' });
  }
  if (punishments.length >= 2) {
    alerts.push({ type: 'warning', message: `${punishments.length} עונשים - יש לשים לב למשמעת`, icon: 'gavel' });
  }
  if (attendanceRate < 70 && relevantAttendance.length > 5) {
    alerts.push({ type: 'warning', message: `נוכחות נמוכה (${attendanceRate}%) - יש לוודא הגעה לתרגולים`, icon: 'calendar' });
  }
  if (avgInspectionScore < 60 && inspections.length > 0) {
    alerts.push({ type: 'warning', message: `ציון ממוצע נמוך (${avgInspectionScore}) - דורש תרגול נוסף`, icon: 'file' });
  }
  if (unexcusedAbsences >= 3) {
    alerts.push({ type: 'warning', message: `${unexcusedAbsences} היעדרויות ללא הצדקה`, icon: 'x' });
  }

  // License expiry alerts
  if (soldier.military_license_expiry) {
    const daysUntilExpiry = differenceInDays(parseISO(soldier.military_license_expiry), new Date());
    if (daysUntilExpiry < 0) {
      alerts.push({ type: 'danger', message: 'רישיון צבאי פג תוקף!', icon: 'alert' });
    } else if (daysUntilExpiry <= 30) {
      alerts.push({ type: 'warning', message: `רישיון צבאי יפוג בעוד ${daysUntilExpiry} ימים`, icon: 'alert' });
    }
  }
  if (soldier.civilian_license_expiry) {
    const daysUntilExpiry = differenceInDays(parseISO(soldier.civilian_license_expiry), new Date());
    if (daysUntilExpiry < 0) {
      alerts.push({ type: 'danger', message: 'רישיון אזרחי פג תוקף!', icon: 'alert' });
    } else if (daysUntilExpiry <= 30) {
      alerts.push({ type: 'warning', message: `רישיון אזרחי יפוג בעוד ${daysUntilExpiry} ימים`, icon: 'alert' });
    }
  }

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['פרופיל חייל - סיכום'],
      [''],
      ['שם מלא', soldier.full_name],
      ['מספר אישי', soldier.personal_number],
      ['עמדה', soldier.outpost || '-'],
      [''],
      ['סטטיסטיקות'],
      ['סה"כ תאונות', accidents.length],
      ['תאונות חמורות', severeAccidents],
      ['סה"כ עונשים', punishments.length],
      ['סה"כ ביקורות', inspections.length],
      ['ציון ממוצע בביקורות', avgInspectionScore],
      ['אחוז נוכחות', `${attendanceRate}%`],
      ['היעדרויות ללא סיבה', unexcusedAbsences],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'סיכום');

    // Accidents sheet
    if (accidents.length > 0) {
      const accidentsData = accidents.map(a => ({
        'תאריך': format(parseISO(a.accident_date), 'dd/MM/yyyy'),
        'חומרה': severityLabels[a.severity] || a.severity,
        'מיקום': a.location || '-',
        'רכב': a.vehicle_number || '-',
        'תיאור': a.description || '-',
        'הערות': a.notes || '-'
      }));
      const accidentsSheet = XLSX.utils.json_to_sheet(accidentsData);
      XLSX.utils.book_append_sheet(wb, accidentsSheet, 'תאונות');
    }

    // Punishments sheet
    if (punishments.length > 0) {
      const punishmentsData = punishments.map(p => ({
        'תאריך': format(parseISO(p.punishment_date), 'dd/MM/yyyy'),
        'עבירה': p.offense,
        'עונש': p.punishment,
        'שופט': p.judge,
        'הערות': p.notes || '-'
      }));
      const punishmentsSheet = XLSX.utils.json_to_sheet(punishmentsData);
      XLSX.utils.book_append_sheet(wb, punishmentsSheet, 'עונשים');
    }

    // Inspections sheet
    if (inspections.length > 0) {
      const inspectionsData = inspections.map(i => ({
        'תאריך': format(parseISO(i.inspection_date), 'dd/MM/yyyy'),
        'ציון כולל': i.total_score || 0,
        'מבקר': i.inspector_name,
        'מפקד': i.commander_name,
        'הערות': i.general_notes || '-'
      }));
      const inspectionsSheet = XLSX.utils.json_to_sheet(inspectionsData);
      XLSX.utils.book_append_sheet(wb, inspectionsSheet, 'ביקורות');
    }

    // Attendance sheet
    if (relevantAttendance.length > 0) {
      const attendanceData = relevantAttendance.map(a => ({
        'אירוע': a.work_plan_events?.title || '-',
        'תאריך': a.work_plan_events?.event_date ? format(parseISO(a.work_plan_events.event_date), 'dd/MM/yyyy') : '-',
        'סטטוס': a.attended ? 'נכח' : a.completed ? 'נכח בהשלמה' : 'נעדר',
        'סיבת היעדרות': a.absence_reason || '-',
      }));
      const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(wb, attendanceSheet, 'נוכחות');
    }

    XLSX.writeFile(wb, `פרופיל_${soldier.full_name}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const renderAccidentsList = () => (
    <ScrollArea className="h-[400px]">
      {accidents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>אין תאונות מתועדות</p>
        </div>
      ) : (
        <div className="space-y-3 pr-2">
          {accidents.map((accident) => (
            <Card key={accident.id} className="border-r-4 border-r-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold">
                    {format(parseISO(accident.accident_date), 'dd/MM/yyyy')}
                  </span>
                  <Badge className={severityColors[accident.severity] || 'bg-gray-100'}>
                    {severityLabels[accident.severity] || accident.severity}
                  </Badge>
                </div>
                {accident.location && (
                  <p className="text-sm text-muted-foreground">מיקום: {accident.location}</p>
                )}
                {accident.description && (
                  <p className="text-sm mt-1">{accident.description}</p>
                )}
                {accident.vehicle_number && (
                  <p className="text-xs text-muted-foreground mt-1">רכב: {accident.vehicle_number}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  const renderPunishmentsList = () => (
    <ScrollArea className="h-[400px]">
      {punishments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Gavel className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>אין עונשים מתועדים</p>
        </div>
      ) : (
        <div className="space-y-3 pr-2">
          {punishments.map((punishment) => (
            <Card key={punishment.id} className="border-r-4 border-r-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold">
                    {format(parseISO(punishment.punishment_date), 'dd/MM/yyyy')}
                  </span>
                  <Badge variant="outline">{punishment.punishment}</Badge>
                </div>
                <p className="text-sm font-medium">עבירה: {punishment.offense}</p>
                <p className="text-sm text-muted-foreground">שופט: {punishment.judge}</p>
                {punishment.notes && (
                  <p className="text-xs mt-1 text-muted-foreground">{punishment.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  const renderInspectionsList = () => (
    <ScrollArea className="h-[400px]">
      {inspections.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>אין ביקורות מתועדות</p>
        </div>
      ) : (
        <div className="space-y-3 pr-2">
          {inspections.map((inspection) => (
            <Card key={inspection.id} className="border-r-4 border-r-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold">
                    {format(parseISO(inspection.inspection_date), 'dd/MM/yyyy')}
                  </span>
                  <Badge 
                    className={`${
                      (inspection.total_score || 0) >= 80 
                        ? 'bg-green-100 text-green-800' 
                        : (inspection.total_score || 0) >= 60 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    ציון: {inspection.total_score || 0}
                  </Badge>
                </div>
                <p className="text-sm">מבקר: {inspection.inspector_name}</p>
                <p className="text-sm text-muted-foreground">מפקד: {inspection.commander_name}</p>
                {inspection.general_notes && (
                  <p className="text-xs mt-1 text-muted-foreground">{inspection.general_notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  const renderAttendanceList = () => {
    const hebrewMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    const monthlyMap = new Map<string, typeof relevantAttendance>();
    
    relevantAttendance.forEach(record => {
      if (!record.work_plan_events?.event_date) return;
      const date = parseISO(record.work_plan_events.event_date);
      const key = `${getYear(date)}-${getMonth(date)}`;
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, []);
      }
      monthlyMap.get(key)!.push(record);
    });

    const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) => {
      const [yearA, monthA] = a[0].split('-').map(Number);
      const [yearB, monthB] = b[0].split('-').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });

    return (
      <ScrollArea className="h-[400px]">
        {sortedMonths.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>אין נתוני נוכחות</p>
          </div>
        ) : (
          <div className="space-y-4 pr-2">
            {sortedMonths.map(([key, records]) => {
              const [year, month] = key.split('-').map(Number);
              const attended = records.filter(r => r.attended || r.completed).length;
              const absent = records.filter(r => !r.attended && !r.completed).length;
              
              return (
                <div key={key} className="border rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-l from-primary to-primary/80 px-4 py-2 flex items-center justify-between">
                    <span className="font-bold text-white">{hebrewMonths[month]} {year}</span>
                    <div className="flex gap-2">
                      <Badge className="bg-emerald-500 text-white text-xs">{attended} נכח</Badge>
                      <Badge className="bg-red-500 text-white text-xs">{absent} נעדר</Badge>
                    </div>
                  </div>
                  <div className="p-2 space-y-2">
                    {records.map((record) => (
                      <div 
                        key={record.id} 
                        className={`p-3 rounded-lg border-r-4 ${record.attended || record.completed ? 'border-r-emerald-500 bg-emerald-50' : 'border-r-red-500 bg-red-50'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-slate-800">
                                {record.work_plan_events?.title || 'אירוע'}
                              </span>
                              {record.work_plan_events?.event_date && (
                                <span className="text-sm text-slate-500">
                                  {format(parseISO(record.work_plan_events.event_date), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {record.attended ? (
                                <Badge className="bg-emerald-500 text-white text-xs">נכח</Badge>
                              ) : record.completed ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">נכח בהשלמה</Badge>
                              ) : (
                                <Badge className="bg-red-500 text-white text-xs">נעדר</Badge>
                              )}
                              {record.absence_reason && !record.attended && !record.completed && (
                                <span className="text-xs text-red-600 font-medium">סיבה: {record.absence_reason}</span>
                              )}
                            </div>
                            {record.completed && (
                              <p className="text-xs text-emerald-600 mt-1">
                                תאריך השלמה: {format(parseISO(record.created_at), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center">
                            {record.attended || record.completed ? (
                              <CheckCircle className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    );
  };

  const renderSafetyScoresList = () => (
    <ScrollArea className="h-[400px]">
      {safetyScores.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Gauge className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>אין ציוני בטיחות מתועדים</p>
        </div>
      ) : (
        <div className="space-y-3 pr-2">
          {safetyScores.map((score) => {
            const scoreColor = score.safety_score >= 75 ? 'border-r-emerald-500' :
              score.safety_score >= 60 ? 'border-r-yellow-500' : 'border-r-red-500';
            const scoreBg = score.safety_score >= 75 ? 'bg-green-100 text-green-800' :
              score.safety_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
            
            return (
              <Card key={score.id} className={`border-r-4 ${scoreColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">
                      {format(parseISO(score.score_month), 'MMMM yyyy', { locale: he })}
                    </span>
                    <Badge className={scoreBg}>
                      ציון: {score.safety_score}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>ק"מ: {score.kilometers || 0}</div>
                    <div>חריגות מהירות: {score.speed_violations || 0}</div>
                    <div>בלימות חדות: {score.harsh_braking || 0}</div>
                    <div>פניות חדות: {score.harsh_turns || 0}</div>
                    <div>האצות חדות: {score.harsh_accelerations || 0}</div>
                    <div>עקיפות מסוכנות: {score.illegal_overtakes || 0}</div>
                  </div>
                  {score.notes && (
                    <p className="text-xs mt-2 text-muted-foreground">{score.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'accidents': return 'תאונות';
      case 'punishments': return 'עונשים';
      case 'inspections': return 'ביקורות';
      case 'attendance': return 'נוכחות';
      case 'safety_scores': return 'ציוני בטיחות';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <User className="w-6 h-6" />
              <span>{soldier.full_name}</span>
              <Badge variant="outline">{soldier.personal_number}</Badge>
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
              <Download className="w-4 h-4 ml-2" />
              ייצוא
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeSection === 'none' ? (
          <>
            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  נקודות לתשומת לב
                </h3>
                {alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      alert.type === 'danger' 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {alerts.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">אין נקודות לתשומת לב - הנהג במצב תקין</span>
                </div>
              </div>
            )}

            {/* 4 Clickable Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className="bg-gradient-to-br from-red-50 to-orange-50 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setActiveSection('accidents')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <Car className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-red-700">{accidents.length}</div>
                        <div className="text-sm text-red-600">תאונות</div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setActiveSection('punishments')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Gavel className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-purple-700">{punishments.length}</div>
                        <div className="text-sm text-purple-600">עונשים</div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setActiveSection('inspections')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-blue-700">{avgInspectionScore}</div>
                        <div className="text-sm text-blue-600">ציון ממוצע ביקורות</div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setActiveSection('attendance')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-green-700">{attendanceRate}%</div>
                        <div className="text-sm text-green-600">נוכחות</div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-amber-50 to-yellow-50 border-0 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] col-span-2"
                onClick={() => setActiveSection('safety_scores')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Gauge className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-amber-700">
                          {safetyScores.length > 0 ? safetyScores[0].safety_score : '-'}
                        </div>
                        <div className="text-sm text-amber-600">ציון בטיחות אחרון ({safetyScores.length} רשומות)</div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Back button and title */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setActiveSection('none')}>
                <X className="w-4 h-4 ml-1" />
                חזרה
              </Button>
              <h3 className="text-lg font-bold">{getSectionTitle()}</h3>
            </div>

            {/* Render the appropriate list */}
            {activeSection === 'accidents' && renderAccidentsList()}
            {activeSection === 'punishments' && renderPunishmentsList()}
            {activeSection === 'inspections' && renderInspectionsList()}
            {activeSection === 'attendance' && renderAttendanceList()}
            {activeSection === 'safety_scores' && renderSafetyScoresList()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}