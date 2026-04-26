import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';

interface WeeklyReportsChartProps {
  reports: Array<{ report_date: string }>;
}

export function WeeklyReportsChart({ reports }: WeeklyReportsChartProps) {
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeksAgo = subWeeks(now, 7);
    
    const weeks = eachWeekOfInterval(
      { start: weeksAgo, end: now },
      { weekStartsOn: 0 }
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
      const count = reports.filter((r) => {
        const reportDate = new Date(r.report_date);
        return reportDate >= weekStart && reportDate <= weekEnd;
      }).length;

      return {
        week: format(weekStart, 'dd/MM', { locale: he }),
        weekLabel: `${format(weekStart, 'dd/MM', { locale: he })} - ${format(weekEnd, 'dd/MM', { locale: he })}`,
        count,
      };
    });
  }, [reports]);

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
  const totalReports = weeklyData.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] rounded-3xl">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      
      <CardHeader className="pb-4 relative">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-lg" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <span className="font-black text-xl text-slate-800">דיווחים לפי שבוע</span>
              <p className="text-sm text-slate-500 font-medium">מגמת דיווחים ב-8 שבועות אחרונים</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-black text-primary">{totalReports} סה"כ</span>
            </div>
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="week" 
                tick={{ fill: 'hsl(var(--slate-600))', fontSize: 12, fontWeight: 600 }}
                axisLine={{ stroke: 'hsl(var(--slate-200))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--slate-500))', fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xl">
                        <p className="text-xs text-slate-500 mb-1 font-medium">{data.weekLabel}</p>
                        <p className="text-2xl font-black text-primary">{data.count} <span className="text-base font-bold text-slate-600">דיווחים</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`hsl(var(--primary) / ${0.4 + (entry.count / maxCount) * 0.6})`}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}