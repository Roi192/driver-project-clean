import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  CalendarCheck, 
  ClipboardCheck, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  Gavel
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface KPI {
  id: string;
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
}

interface Soldier {
  id: string;
  full_name: string;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  is_active: boolean | null;
}

interface MonthlyTrendData {
  month: string;
  count: number;
  avgScore?: number;
}

export function KPICards() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    readyDrivers: Soldier[];
    notReadyDrivers: Soldier[];
    attendanceRecords: { soldier: Soldier; attended: number; total: number }[];
    accidentTrend: MonthlyTrendData[];
    punishmentTrend: MonthlyTrendData[];
    inspectionTrend: MonthlyTrendData[];
  }>({
    readyDrivers: [],
    notReadyDrivers: [],
    attendanceRecords: [],
    accidentTrend: [],
    punishmentTrend: [],
    inspectionTrend: []
  });

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    setIsLoading(true);
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get last 6 months for trends
    const sixMonthsAgo = subMonths(today, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(today) });

    try {
      // 1. Driver readiness percentage - based on valid licenses only
      const { data: soldiers } = await supabase
        .from('soldiers')
        .select('id, full_name, military_license_expiry, civilian_license_expiry, is_active')
        .eq('is_active', true);

      let readyDriversList: Soldier[] = [];
      let notReadyDriversList: Soldier[] = [];
      let totalDrivers = soldiers?.length || 0;

      if (soldiers) {
        soldiers.forEach((soldier: Soldier) => {
          const militaryExpiry = soldier.military_license_expiry ? parseISO(soldier.military_license_expiry) : null;
          const civilianExpiry = soldier.civilian_license_expiry ? parseISO(soldier.civilian_license_expiry) : null;
          
          const militaryValid = !militaryExpiry || differenceInDays(militaryExpiry, today) > 0;
          const civilianValid = !civilianExpiry || differenceInDays(civilianExpiry, today) > 0;
          
          if (militaryValid && civilianValid) {
            readyDriversList.push(soldier);
          } else {
            notReadyDriversList.push(soldier);
          }
        });
      }

      const readinessPercent = totalDrivers > 0 
        ? Math.round((readyDriversList.length / totalDrivers) * 100) 
        : 0;

      // 2. Monthly attendance percentage
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('soldier_id, status')
        .gte('created_at', firstDayOfMonth.toISOString())
        .neq('status', 'not_in_rotation');

      let attendedCount = 0;
      let totalAttendance = attendance?.length || 0;
      const attendanceByDriver: Record<string, { attended: number; total: number }> = {};

      if (attendance) {
        attendance.forEach((record) => {
          if (!attendanceByDriver[record.soldier_id]) {
            attendanceByDriver[record.soldier_id] = { attended: 0, total: 0 };
          }
          attendanceByDriver[record.soldier_id].total++;
          if (record.status === 'attended' || record.status === 'makeup_completed') {
            attendedCount++;
            attendanceByDriver[record.soldier_id].attended++;
          }
        });
      }

      const attendancePercent = totalAttendance > 0 
        ? Math.round((attendedCount / totalAttendance) * 100) 
        : 0;

      const attendanceRecords = Object.entries(attendanceByDriver).map(([soldierId, data]) => {
        const soldier = soldiers?.find(s => s.id === soldierId);
        return {
          soldier: soldier || { id: soldierId, full_name: 'לא ידוע', military_license_expiry: null, civilian_license_expiry: null, is_active: true },
          attended: data.attended,
          total: data.total
        };
      }).sort((a, b) => (a.attended / a.total) - (b.attended / b.total));

      // 3. Average inspection score this month
      const { data: inspections } = await supabase
        .from('inspections')
        .select('id, total_score, soldier_id, inspection_date')
        .order('inspection_date', { ascending: false });

      let avgScore = 0;
      let monthlyInspections = 0;
      if (inspections && inspections.length > 0) {
        const thisMonthInspections = inspections.filter(i => 
          parseISO(i.inspection_date) >= firstDayOfMonth
        );
        monthlyInspections = thisMonthInspections.length;
        if (thisMonthInspections.length > 0) {
          avgScore = Math.round(
            thisMonthInspections.reduce((sum, i) => sum + (i.total_score || 0), 0) / thisMonthInspections.length
          );
        }
      }

      // Build inspection trend data
      const inspectionTrend: MonthlyTrendData[] = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthInspections = (inspections || []).filter(i => {
          const date = parseISO(i.inspection_date);
          return date >= monthStart && date <= monthEnd;
        });
        const avg = monthInspections.length > 0 
          ? Math.round(monthInspections.reduce((sum, i) => sum + (i.total_score || 0), 0) / monthInspections.length)
          : 0;
        return {
          month: format(month, 'MMM', { locale: he }),
          count: monthInspections.length,
          avgScore: avg
        };
      });

      // 4. Accidents trend
      const { data: accidents } = await supabase
        .from('accidents')
        .select('id, accident_date')
        .order('accident_date', { ascending: false });

      const monthlyAccidents = (accidents || []).filter(a => 
        parseISO(a.accident_date) >= firstDayOfMonth
      ).length;

      const accidentTrend: MonthlyTrendData[] = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthAccidents = (accidents || []).filter(a => {
          const date = parseISO(a.accident_date);
          return date >= monthStart && date <= monthEnd;
        });
        return {
          month: format(month, 'MMM', { locale: he }),
          count: monthAccidents.length
        };
      });

      // Calculate accident trend (compare last 2 months)
      const lastMonthAccidents = accidentTrend[accidentTrend.length - 1]?.count || 0;
      const prevMonthAccidents = accidentTrend[accidentTrend.length - 2]?.count || 0;
      const accidentTrendDir = lastMonthAccidents < prevMonthAccidents ? 'up' : lastMonthAccidents > prevMonthAccidents ? 'down' : 'neutral';

      // 5. Punishments trend
      const { data: punishments } = await supabase
        .from('punishments')
        .select('id, punishment_date')
        .order('punishment_date', { ascending: false });

      const monthlyPunishments = (punishments || []).filter(p => 
        parseISO(p.punishment_date) >= firstDayOfMonth
      ).length;

      const punishmentTrend: MonthlyTrendData[] = months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthPunishments = (punishments || []).filter(p => {
          const date = parseISO(p.punishment_date);
          return date >= monthStart && date <= monthEnd;
        });
        return {
          month: format(month, 'MMM', { locale: he }),
          count: monthPunishments.length
        };
      });

      // Calculate punishment trend
      const lastMonthPunishments = punishmentTrend[punishmentTrend.length - 1]?.count || 0;
      const prevMonthPunishments = punishmentTrend[punishmentTrend.length - 2]?.count || 0;
      const punishmentTrendDir = lastMonthPunishments < prevMonthPunishments ? 'up' : lastMonthPunishments > prevMonthPunishments ? 'down' : 'neutral';

      setDetailData({
        readyDrivers: readyDriversList,
        notReadyDrivers: notReadyDriversList,
        attendanceRecords,
        accidentTrend,
        punishmentTrend,
        inspectionTrend
      });

      setKpis([
        {
          id: 'readiness',
          label: 'כשירות נהגים',
          value: readinessPercent,
          suffix: '%',
          icon: Users,
          trend: readinessPercent >= 90 ? 'up' : readinessPercent >= 70 ? 'neutral' : 'down',
          color: readinessPercent >= 90 ? 'success' : readinessPercent >= 70 ? 'warning' : 'danger'
        },
        {
          id: 'attendance',
          label: 'נוכחות חודשית',
          value: attendancePercent,
          suffix: '%',
          icon: CalendarCheck,
          trend: attendancePercent >= 80 ? 'up' : attendancePercent >= 60 ? 'neutral' : 'down',
          color: attendancePercent >= 80 ? 'success' : attendancePercent >= 60 ? 'warning' : 'danger'
        },
        {
          id: 'inspections',
          label: 'ממוצע ביקורות',
          value: avgScore || '-',
          icon: ClipboardCheck,
          trend: avgScore >= 80 ? 'up' : avgScore >= 60 ? 'neutral' : 'down',
          color: avgScore >= 80 ? 'success' : avgScore >= 60 ? 'warning' : 'danger'
        },
        {
          id: 'accidents',
          label: 'מגמת תאונות',
          value: monthlyAccidents,
          icon: AlertTriangle,
          trend: accidentTrendDir,
          color: accidentTrendDir === 'up' ? 'success' : accidentTrendDir === 'neutral' ? 'warning' : 'danger'
        },
        {
          id: 'punishments',
          label: 'מגמת עונשים',
          value: monthlyPunishments,
          icon: Gavel,
          trend: punishmentTrendDir,
          color: punishmentTrendDir === 'up' ? 'success' : punishmentTrendDir === 'neutral' ? 'warning' : 'danger'
        },
        {
          id: 'inspection_count',
          label: 'כמות ביקורות',
          value: monthlyInspections,
          icon: ClipboardCheck,
          trend: monthlyInspections >= 10 ? 'up' : monthlyInspections >= 5 ? 'neutral' : 'down',
          color: monthlyInspections >= 10 ? 'success' : monthlyInspections >= 5 ? 'warning' : 'danger'
        }
      ]);

    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }

    setIsLoading(false);
  };

  const getColorStyles = (color: KPI['color']) => {
    switch (color) {
      case 'success':
        return {
          bg: 'from-success/20 to-success/5',
          icon: 'text-success',
          text: 'text-success',
          border: 'border-success/30'
        };
      case 'warning':
        return {
          bg: 'from-warning/20 to-warning/5',
          icon: 'text-warning',
          text: 'text-amber-700',
          border: 'border-warning/30'
        };
      case 'danger':
        return {
          bg: 'from-danger/20 to-danger/5',
          icon: 'text-danger',
          text: 'text-danger',
          border: 'border-danger/30'
        };
      default:
        return {
          bg: 'from-primary/20 to-primary/5',
          icon: 'text-primary',
          text: 'text-primary',
          border: 'border-primary/30'
        };
    }
  };

  const TrendIcon = ({ trend }: { trend?: KPI['trend'] }) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-danger" />;
      default:
        return <Minus className="w-4 h-4 text-warning" />;
    }
  };

  const renderDetailContent = () => {
    switch (selectedKPI) {
      case 'readiness':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-emerald-700 mb-2">נהגים כשירים ({detailData.readyDrivers.length})</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {detailData.readyDrivers.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                      <span className="font-medium text-slate-700">{s.full_name}</span>
                      <Badge className="bg-emerald-500 text-white">כשיר</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div>
              <h4 className="font-bold text-red-700 mb-2">נהגים לא כשירים ({detailData.notReadyDrivers.length})</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {detailData.notReadyDrivers.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div>
                        <span className="font-medium text-slate-700">{s.full_name}</span>
                        <div className="text-xs text-red-600 mt-1">
                          {s.military_license_expiry && differenceInDays(parseISO(s.military_license_expiry), new Date()) < 0 && (
                            <span>רשיון צבאי פג • </span>
                          )}
                          {s.civilian_license_expiry && differenceInDays(parseISO(s.civilian_license_expiry), new Date()) < 0 && (
                            <span>רשיון אזרחי פג</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-red-500 text-white">לא כשיר</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {detailData.attendanceRecords.map(record => {
                const percent = Math.round((record.attended / record.total) * 100);
                return (
                  <div key={record.soldier.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">{record.soldier.full_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{record.attended}/{record.total}</span>
                      <Badge className={cn(
                        "text-white",
                        percent >= 80 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-red-500"
                      )}>
                        {percent}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        );
      case 'inspections':
      case 'inspection_count':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">מגמת ביקורות ב-6 חודשים אחרונים</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={detailData.inspectionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ direction: 'rtl', fontSize: 12 }}
                    formatter={(value: number, name: string) => [value, name === 'count' ? 'כמות' : 'ממוצע']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" name="כמות" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-48">
              <p className="text-sm text-slate-600 mb-2">ממוצע ציונים</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailData.inspectionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ direction: 'rtl', fontSize: 12 }}
                    formatter={(value: number) => [value, 'ממוצע']}
                  />
                  <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'accidents':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">מגמת תאונות ב-6 חודשים אחרונים</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailData.accidentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ direction: 'rtl' }}
                    formatter={(value: number) => [value, 'תאונות']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} dot={{ r: 5, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                {detailData.accidentTrend[detailData.accidentTrend.length - 1]?.count || 0} תאונות החודש
                {detailData.accidentTrend[detailData.accidentTrend.length - 2] && (
                  <span className={cn(
                    "mr-2",
                    (detailData.accidentTrend[detailData.accidentTrend.length - 1]?.count || 0) < 
                    (detailData.accidentTrend[detailData.accidentTrend.length - 2]?.count || 0) 
                      ? "text-emerald-600" : "text-red-600"
                  )}>
                    ({(detailData.accidentTrend[detailData.accidentTrend.length - 1]?.count || 0) - 
                      (detailData.accidentTrend[detailData.accidentTrend.length - 2]?.count || 0) >= 0 ? '+' : ''}
                    {(detailData.accidentTrend[detailData.accidentTrend.length - 1]?.count || 0) - 
                      (detailData.accidentTrend[detailData.accidentTrend.length - 2]?.count || 0)} מהחודש הקודם)
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      case 'punishments':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">מגמת עונשים ב-6 חודשים אחרונים</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={detailData.punishmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ direction: 'rtl' }}
                    formatter={(value: number) => [value, 'עונשים']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: '#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                {detailData.punishmentTrend[detailData.punishmentTrend.length - 1]?.count || 0} עונשים החודש
                {detailData.punishmentTrend[detailData.punishmentTrend.length - 2] && (
                  <span className={cn(
                    "mr-2",
                    (detailData.punishmentTrend[detailData.punishmentTrend.length - 1]?.count || 0) < 
                    (detailData.punishmentTrend[detailData.punishmentTrend.length - 2]?.count || 0) 
                      ? "text-emerald-600" : "text-red-600"
                  )}>
                    ({(detailData.punishmentTrend[detailData.punishmentTrend.length - 1]?.count || 0) - 
                      (detailData.punishmentTrend[detailData.punishmentTrend.length - 2]?.count || 0) >= 0 ? '+' : ''}
                    {(detailData.punishmentTrend[detailData.punishmentTrend.length - 1]?.count || 0) - 
                      (detailData.punishmentTrend[detailData.punishmentTrend.length - 2]?.count || 0)} מהחודש הקודם)
                  </span>
                )}
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getKPITitle = () => {
    switch (selectedKPI) {
      case 'readiness': return 'פירוט כשירות נהגים';
      case 'attendance': return 'פירוט נוכחות חודשית';
      case 'inspections': return 'מגמת ממוצע ביקורות';
      case 'accidents': return 'מגמת תאונות';
      case 'punishments': return 'מגמת עונשים';
      case 'inspection_count': return 'מגמת כמות ביקורות';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-28 bg-slate-200/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800">מדדי ביצוע</h2>
            <p className="text-sm text-slate-500">לחץ לפירוט מלא</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const styles = getColorStyles(kpi.color);
            
            return (
              <div
                key={kpi.id}
                onClick={() => setSelectedKPI(kpi.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm cursor-pointer",
                  "border p-4 transition-all duration-300",
                  "hover:shadow-lg hover:scale-[1.02]",
                  styles.border
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-50",
                  styles.bg
                )} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 shadow-sm",
                      styles.border
                    )}>
                      <Icon className={cn("w-5 h-5", styles.icon)} />
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={kpi.trend} />
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className={cn("text-3xl font-black", styles.text)}>
                      {kpi.value}
                      {kpi.suffix && <span className="text-lg">{kpi.suffix}</span>}
                    </p>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      {kpi.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={() => setSelectedKPI(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{getKPITitle()}</DialogTitle>
          </DialogHeader>
          {renderDetailContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}