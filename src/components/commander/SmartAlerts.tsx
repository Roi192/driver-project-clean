import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  CreditCard, 
  UserX, 
  ClipboardX, 
  Car,
  ChevronLeft,
  Shield,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Gauge
} from 'lucide-react';
import { differenceInDays, differenceInMonths, parseISO, isAfter, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: 'license' | 'attendance' | 'inspection' | 'accident' | 'procedure' | 'event' | 'defensive' | 'accident_trend' | 'correct_driving' | 'safety_score';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count?: number;
  link: string;
}

interface Soldier {
  id: string;
  full_name: string;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  is_active: boolean | null;
  defensive_driving_passed: boolean | null;
  correct_driving_in_service_date: string | null;
}

interface Accident {
  id: string;
  driver_name: string | null;
  severity: string | null;
  accident_date: string;
}

interface Inspection {
  id: string;
  total_score: number | null;
  soldier_id: string;
}

interface EventAttendance {
  id: string;
  soldier_id: string;
  status: string;
}

interface WorkPlanEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
}

interface ShiftReport {
  id: string;
  is_complete: boolean;
  report_date: string;
}

export function SmartAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setIsLoading(true);
    const alertsList: Alert[] = [];
    const today = new Date();

    try {
      // 1. Check license expiry
      const { data: soldiers } = await supabase
        .from('soldiers')
        .select('id, full_name, military_license_expiry, civilian_license_expiry, is_active, defensive_driving_passed, correct_driving_in_service_date')
        .eq('is_active', true);

      if (soldiers) {
        const expiredLicenses: string[] = [];
        const expiringLicenses: string[] = [];
        let expiredCorrectDrivingCount = 0;
        let expiringCorrectDrivingCount = 0;
        let noDefensiveDrivingCount = 0;

        soldiers.forEach((soldier: Soldier) => {
          const militaryExpiry = soldier.military_license_expiry ? parseISO(soldier.military_license_expiry) : null;
          const civilianExpiry = soldier.civilian_license_expiry ? parseISO(soldier.civilian_license_expiry) : null;

          // Check defensive driving
          if (!soldier.defensive_driving_passed) {
            noDefensiveDrivingCount++;
          }

          // Check correct driving in service (valid for 12 months)
          if (soldier.correct_driving_in_service_date) {
            const correctDrivingDate = parseISO(soldier.correct_driving_in_service_date);
            const monthsSince = differenceInMonths(today, correctDrivingDate);
            if (monthsSince > 12) {
              expiredCorrectDrivingCount++;
            } else if (monthsSince >= 10) {
              expiringCorrectDrivingCount++;
            }
          } else {
            expiredCorrectDrivingCount++;
          }

          [militaryExpiry, civilianExpiry].forEach((expiry) => {
            if (expiry) {
              const daysUntil = differenceInDays(expiry, today);
              if (daysUntil < 0) {
                if (!expiredLicenses.includes(soldier.full_name)) {
                  expiredLicenses.push(soldier.full_name);
                }
              } else if (daysUntil <= 30) {
                if (!expiringLicenses.includes(soldier.full_name)) {
                  expiringLicenses.push(soldier.full_name);
                }
              }
            }
          });
        });

        if (expiredLicenses.length > 0) {
          alertsList.push({
            id: 'expired-licenses',
            type: 'license',
            severity: 'critical',
            title: 'רישיונות פגי תוקף',
            description: `${expiredLicenses.length} נהגים עם רישיון שפג תוקפו`,
            count: expiredLicenses.length,
            link: '/soldiers-control'
          });
        }

        if (expiringLicenses.length > 0) {
          alertsList.push({
            id: 'expiring-licenses',
            type: 'license',
            severity: 'warning',
            title: 'רישיונות עומדים לפוג',
            description: `${expiringLicenses.length} נהגים עם רישיון שיפוג ב-30 יום הקרובים`,
            count: expiringLicenses.length,
            link: '/soldiers-control'
          });
        }

        // Alert for soldiers without defensive driving
        if (noDefensiveDrivingCount > 0) {
          alertsList.push({
            id: 'no-defensive-driving',
            type: 'defensive',
            severity: 'info',
            title: 'חסר נהיגה מונעת',
            description: `${noDefensiveDrivingCount} נהגים שלא עברו נהיגה מונעת`,
            count: noDefensiveDrivingCount,
            link: '/soldiers-control'
          });
        }

        // Alert for correct driving in service
        if (expiredCorrectDrivingCount > 0) {
          alertsList.push({
            id: 'expired-correct-driving',
            type: 'correct_driving',
            severity: 'critical',
            title: 'נהיגה נכונה פגה',
            description: `${expiredCorrectDrivingCount} נהגים שנהיגה נכונה בשירות פגה או חסרה`,
            count: expiredCorrectDrivingCount,
            link: '/fitness-report'
          });
        }

        if (expiringCorrectDrivingCount > 0) {
          alertsList.push({
            id: 'expiring-correct-driving',
            type: 'correct_driving',
            severity: 'warning',
            title: 'נהיגה נכונה עומדת לפוג',
            description: `${expiringCorrectDrivingCount} נהגים שנהיגה נכונה בשירות תפוג בקרוב`,
            count: expiringCorrectDrivingCount,
            link: '/fitness-report'
          });
        }
      }

      // 2. Check attendance issues - soldiers with high absences this month
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('soldier_id, status')
        .gte('created_at', firstDayOfMonth.toISOString());

      if (attendance) {
        const absenceCountByDriver: Record<string, number> = {};
        attendance.forEach((record: EventAttendance) => {
          if (record.status === 'absent') {
            absenceCountByDriver[record.soldier_id] = (absenceCountByDriver[record.soldier_id] || 0) + 1;
          }
        });

        const highAbsenceDrivers = Object.values(absenceCountByDriver).filter(count => count >= 2).length;
        if (highAbsenceDrivers > 0) {
          alertsList.push({
            id: 'high-absences',
            type: 'attendance',
            severity: 'warning',
            title: 'היעדרויות מרובות',
            description: `${highAbsenceDrivers} נהגים עם 2+ היעדרויות החודש`,
            count: highAbsenceDrivers,
            link: '/attendance-tracking'
          });
        }
      }

      // 3. Check low inspection scores
      const { data: inspections } = await supabase
        .from('inspections')
        .select('id, total_score, soldier_id')
        .lt('total_score', 70)
        .gte('inspection_date', firstDayOfMonth.toISOString().split('T')[0]);

      if (inspections && inspections.length > 0) {
        alertsList.push({
          id: 'low-inspections',
          type: 'inspection',
          severity: 'warning',
          title: 'ביקורות עם ציון נמוך',
          description: `${inspections.length} ביקורות מתחת ל-70 נקודות החודש`,
          count: inspections.length,
          link: '/inspections'
        });
      }

      // 4. Check accident trend - compare this month to last month
      const thisMonthStart = startOfMonth(today);
      const thisMonthEnd = endOfMonth(today);
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const lastMonthEnd = endOfMonth(subMonths(today, 1));

      const { data: accidents } = await supabase
        .from('accidents')
        .select('id, driver_name, severity, accident_date');

      if (accidents && accidents.length > 0) {
        const thisMonthAccidents = accidents.filter((a: Accident) => {
          const accidentDate = parseISO(a.accident_date);
          return accidentDate >= thisMonthStart && accidentDate <= thisMonthEnd;
        });

        const lastMonthAccidents = accidents.filter((a: Accident) => {
          const accidentDate = parseISO(a.accident_date);
          return accidentDate >= lastMonthStart && accidentDate <= lastMonthEnd;
        });

        const difference = thisMonthAccidents.length - lastMonthAccidents.length;

        if (difference > 0) {
          alertsList.push({
            id: 'accident-trend',
            type: 'accident_trend',
            severity: difference >= 3 ? 'critical' : 'warning',
            title: 'עלייה בתאונות',
            description: `${difference} תאונות יותר מחודש קודם (${thisMonthAccidents.length} החודש לעומת ${lastMonthAccidents.length} בחודש שעבר)`,
            count: difference,
            link: '/accidents-tracking'
          });
        }

        // Still show severe accidents if any
        const severeAccidents = thisMonthAccidents.filter((a: Accident) => a.severity === 'severe');
        if (severeAccidents.length > 0) {
          alertsList.push({
            id: 'severe-accidents',
            type: 'accident',
            severity: 'critical',
            title: 'תאונות חמורות החודש',
            description: `${severeAccidents.length} תאונות חמורות החודש`,
            count: severeAccidents.length,
            link: '/accidents-tracking'
          });
        }
      }

      // 5. Check upcoming events this week
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
      const { data: upcomingEvents } = await supabase
        .from('work_plan_events')
        .select('id, title, event_date, status')
        .gte('event_date', today.toISOString().split('T')[0])
        .lte('event_date', weekEnd.toISOString().split('T')[0])
        .eq('status', 'pending');

      if (upcomingEvents && upcomingEvents.length > 0) {
        alertsList.push({
          id: 'upcoming-events',
          type: 'event',
          severity: 'info',
          title: 'אירועים השבוע',
          description: `${upcomingEvents.length} אירועים מתוכננים השבוע`,
          count: upcomingEvents.length,
          link: '/annual-work-plan'
        });
      }

      // 6. Check incomplete shift reports from yesterday
      const yesterday = addDays(today, -1).toISOString().split('T')[0];
      const { data: incompleteReports } = await supabase
        .from('shift_reports')
        .select('id, is_complete, report_date')
        .eq('report_date', yesterday)
        .eq('is_complete', false);

      if (incompleteReports && incompleteReports.length > 0) {
        alertsList.push({
          id: 'incomplete-reports',
          type: 'procedure',
          severity: 'warning',
          title: 'דוחות לא הושלמו',
          description: `${incompleteReports.length} דוחות משמרת מאתמול לא הושלמו`,
          count: incompleteReports.length,
          link: '/admin'
        });
      }

      // 7. Check for low safety scores
      const { data: lowSafetyScoreSoldiers } = await supabase
        .from('soldiers')
        .select('id, full_name, current_safety_score, consecutive_low_months, safety_status')
        .eq('is_active', true)
        .lt('current_safety_score', 75);

      if (lowSafetyScoreSoldiers && lowSafetyScoreSoldiers.length > 0) {
        const suspendedDrivers = lowSafetyScoreSoldiers.filter(s => 
          s.safety_status === 'suspended' || (s.consecutive_low_months || 0) >= 3
        );
        const needsTestDrivers = lowSafetyScoreSoldiers.filter(s => 
          s.safety_status !== 'suspended' && (s.consecutive_low_months || 0) === 2
        );
        const needsTalkDrivers = lowSafetyScoreSoldiers.filter(s => 
          s.safety_status !== 'suspended' && (s.consecutive_low_months || 0) < 2
        );

        if (suspendedDrivers.length > 0) {
          alertsList.push({
            id: 'suspended-safety',
            type: 'safety_score',
            severity: 'critical',
            title: 'נהגים מושעים',
            description: `${suspendedDrivers.length} נהגים מושעים מהנהיגה עקב ציון נמוך 3 חודשים ברציפות`,
            count: suspendedDrivers.length,
            link: '/soldiers-control'
          });
        }

        if (needsTestDrivers.length > 0) {
          alertsList.push({
            id: 'safety-needs-test',
            type: 'safety_score',
            severity: 'warning',
            title: 'דורשים מבחן שליטה',
            description: `${needsTestDrivers.length} נהגים עם ציון נמוך 2 חודשים ברציפות - דורשים בירור ומבחן`,
            count: needsTestDrivers.length,
            link: '/soldiers-control'
          });
        }

        if (needsTalkDrivers.length > 0) {
          alertsList.push({
            id: 'safety-needs-talk',
            type: 'safety_score',
            severity: 'info',
            title: 'דורשים שיחת בירור',
            description: `${needsTalkDrivers.length} נהגים עם ציון בטיחות מתחת ל-75`,
            count: needsTalkDrivers.length,
            link: '/soldiers-control'
          });
        }
      }

    } catch (error) {
      console.error('Error fetching alerts:', error);
    }

    setAlerts(alertsList);
    setIsLoading(false);
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'license': return CreditCard;
      case 'attendance': return UserX;
      case 'inspection': return ClipboardX;
      case 'accident': return Car;
      case 'accident_trend': return TrendingUp;
      case 'procedure': return FileText;
      case 'event': return Calendar;
      case 'defensive': return Clock;
      case 'correct_driving': return Car;
      case 'safety_score': return Gauge;
      default: return AlertTriangle;
    }
  };

  const getSeverityStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-danger/10',
          border: 'border-danger/30',
          icon: 'text-danger',
          text: 'text-danger',
          glow: 'shadow-[0_0_30px_rgba(var(--danger),0.15)]'
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/30',
          icon: 'text-warning',
          text: 'text-amber-700',
          glow: 'shadow-[0_0_20px_rgba(var(--warning),0.1)]'
        };
      default:
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/30',
          icon: 'text-primary',
          text: 'text-primary',
          glow: ''
        };
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-20 bg-slate-200/50 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-success/10 border border-success/30 p-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent" />
        <Shield className="w-12 h-12 text-success mx-auto mb-3" />
        <h3 className="font-bold text-success text-lg">אין התראות פעילות</h3>
        <p className="text-sm text-success/80 mt-1">כל המדדים תקינים</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-danger/20 to-warning/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-danger" />
        </div>
        <div>
          <h2 className="font-black text-lg text-slate-800">התראות חכמות</h2>
          <p className="text-sm text-slate-500">{alerts.length} פריטים לתשומת לב</p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = getAlertIcon(alert.type);
          const styles = getSeverityStyles(alert.severity);
          
          return (
            <Link
              key={alert.id}
              to={alert.link}
              className={cn(
                "group relative block overflow-hidden rounded-2xl border p-4 transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-lg",
                styles.bg,
                styles.border,
                styles.glow
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Shimmer on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              <div className="relative flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  styles.bg
                )}>
                  <Icon className={cn("w-6 h-6", styles.icon)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("font-bold", styles.text)}>
                      {alert.title}
                    </h3>
                    {alert.count && (
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-bold",
                        styles.bg,
                        styles.text
                      )}>
                        {alert.count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {alert.description}
                  </p>
                </div>

                <ChevronLeft className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2",
                  styles.icon
                )} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}