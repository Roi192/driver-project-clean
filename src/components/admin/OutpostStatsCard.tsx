import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ChevronDown, ChevronUp, Sparkles, TrendingUp } from 'lucide-react';
import { OUTPOSTS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ShiftReport {
  id: string;
  outpost: string;
  report_date: string;
  driver_name: string;
  shift_type: string;
}

interface OutpostStatsCardProps {
  reports: ShiftReport[];
}

export function OutpostStatsCard({ reports }: OutpostStatsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOutpost, setSelectedOutpost] = useState<string | null>(null);

  // Calculate reports per outpost
  const outpostStats = OUTPOSTS.map(outpost => {
    const outpostReports = reports.filter(r => r.outpost === outpost);
    return {
      name: outpost,
      count: outpostReports.length,
      reports: outpostReports,
    };
  }).sort((a, b) => b.count - a.count);

  const totalOutpostsWithReports = outpostStats.filter(o => o.count > 0).length;
  const maxCount = Math.max(...outpostStats.map(o => o.count), 1);

  return (
    <Card className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] col-span-2 rounded-3xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-slate-50/50 transition-colors rounded-t-3xl"
        onClick={() => {
          setIsExpanded(!isExpanded);
          setSelectedOutpost(null);
        }}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-lg opacity-50" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <MapPin className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <span className="font-black text-lg text-slate-800">סטטיסטיקות לפי מוצב</span>
              <p className="text-sm text-slate-500 font-medium">צפה בדיווחים לפי מיקום</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-0 font-bold rounded-xl px-3">{totalOutpostsWithReports} מוצבים פעילים</Badge>
            {isExpanded ? (
              <ChevronUp className="w-6 h-6 text-slate-400" />
            ) : (
              <ChevronDown className="w-6 h-6 text-slate-400" />
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-2 pb-6 space-y-4">
          {selectedOutpost ? (
            <div className="space-y-4 animate-slide-up">
              <button
                onClick={() => setSelectedOutpost(null)}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                ← חזרה לכל המוצבים
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-black text-slate-800">{selectedOutpost}</span>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {outpostStats.find(o => o.name === selectedOutpost)?.reports.map((report, i) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800">{report.driver_name}</div>
                        <div className="text-sm text-slate-500">
                          {new Date(report.report_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-xl font-bold">
                        {report.shift_type === 'morning' ? 'בוקר' : 
                         report.shift_type === 'afternoon' ? 'צהריים' : 'ערב'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
              {outpostStats.map((outpost, i) => (
                <button
                  key={outpost.name}
                  onClick={() => setSelectedOutpost(outpost.name)}
                  className={cn(
                    "group/item relative p-4 rounded-2xl text-right transition-all duration-300",
                    "bg-slate-50 hover:bg-primary/5 border border-slate-200 hover:border-primary/30",
                    "hover:shadow-lg hover:scale-[1.02] animate-slide-up"
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 rounded-b-2xl overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                      style={{ width: `${(outpost.count / maxCount) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-sm text-slate-700">{outpost.name}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-black text-primary">{outpost.count}</span>
                    <span className="text-xs text-slate-500 font-medium">דיווחים</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}