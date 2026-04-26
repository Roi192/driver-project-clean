import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sun, Sunset, Moon, ChevronLeft, MapPin, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { OUTPOSTS } from '@/lib/constants';

interface ShiftReport {
  id: string;
  report_date: string;
  outpost: string;
  shift_type: string;
}

interface ShiftStatsCardProps {
  reports: ShiftReport[];
}

const shiftConfig = {
  morning: { label: 'בוקר', icon: Sun, color: 'text-amber-500', bgColor: 'from-amber-400 to-orange-500', lightBg: 'bg-amber-50' },
  afternoon: { label: 'צהריים', icon: Sunset, color: 'text-orange-500', bgColor: 'from-orange-400 to-red-500', lightBg: 'bg-orange-50' },
  evening: { label: 'ערב', icon: Moon, color: 'text-indigo-500', bgColor: 'from-indigo-400 to-purple-500', lightBg: 'bg-indigo-50' },
};

export function ShiftStatsCard({ reports }: ShiftStatsCardProps) {
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const shiftStats = useMemo(() => {
    const todayReports = reports.filter((r) => r.report_date === today);
    
    const stats = {
      morning: {
        count: todayReports.filter((r) => r.shift_type === 'morning').length,
        outposts: new Set(todayReports.filter((r) => r.shift_type === 'morning').map((r) => r.outpost)),
      },
      afternoon: {
        count: todayReports.filter((r) => r.shift_type === 'afternoon').length,
        outposts: new Set(todayReports.filter((r) => r.shift_type === 'afternoon').map((r) => r.outpost)),
      },
      evening: {
        count: todayReports.filter((r) => r.shift_type === 'evening').length,
        outposts: new Set(todayReports.filter((r) => r.shift_type === 'evening').map((r) => r.outpost)),
      },
    };

    return stats;
  }, [reports, today]);

  const getMissingOutposts = (shiftType: string) => {
    const reportedOutposts = shiftStats[shiftType as keyof typeof shiftStats]?.outposts || new Set();
    return OUTPOSTS.filter((outpost) => !reportedOutposts.has(outpost));
  };

  const getReportedOutposts = (shiftType: string) => {
    const reportedOutposts = shiftStats[shiftType as keyof typeof shiftStats]?.outposts || new Set();
    return OUTPOSTS.filter((outpost) => reportedOutposts.has(outpost));
  };

  const handleShiftClick = (shiftType: string) => {
    setSelectedShift(shiftType);
    setIsOpen(true);
  };

  return (
    <>
      {Object.entries(shiftConfig).map(([key, config], index) => {
        const Icon = config.icon;
        const stats = shiftStats[key as keyof typeof shiftStats];
        
        return (
          <Card
            key={key}
            className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_50px_rgba(0,0,0,0.12)] transition-all duration-500 cursor-pointer rounded-3xl hover:scale-[1.02] animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => handleShiftClick(key)}
          >
            {/* Gradient overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${config.bgColor} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${config.bgColor} rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
                    <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${config.bgColor} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors">{stats.count} נהגים</p>
                    <p className="text-sm text-slate-500 font-medium">משמרת {config.label} היום</p>
                  </div>
                </div>
                <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSelectedShift(null);
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
            <DialogTitle className="flex items-center gap-3">
              {selectedShift && (
                <>
                  {(() => {
                    const config = shiftConfig[selectedShift as keyof typeof shiftConfig];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.bgColor} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-lg">משמרת {config.label} - היום</span>
                        <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                      </>
                    );
                  })()}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {selectedShift && (
              <div className="p-6 space-y-6">
                {/* Missing Outposts */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-destructive">
                    <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <span className="font-black text-base">מוצבים שלא דיווחו ({getMissingOutposts(selectedShift).length})</span>
                  </div>
                  {getMissingOutposts(selectedShift).length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                      <p className="font-bold">כל המוצבים דיווחו במשמרת זו!</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                    {getMissingOutposts(selectedShift).map((outpost, i) => (
                        <div
                          key={outpost}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-destructive border border-destructive/40 animate-slide-up"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-white">{outpost}</span>
                          <Badge className="mr-auto rounded-xl font-bold bg-white/20 text-white border-white/30">
                            לא דיווח
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reported Outposts */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <span className="font-black text-base">מוצבים שדיווחו ({getReportedOutposts(selectedShift).length})</span>
                  </div>
                  {getReportedOutposts(selectedShift).length === 0 ? (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-2xl">
                      <p className="font-medium">אין דיווחים במשמרת זו עדיין</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {getReportedOutposts(selectedShift).map((outpost, i) => (
                        <div
                          key={outpost}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 animate-slide-up"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-emerald-600" />
                          </div>
                          <span className="font-bold text-slate-800">{outpost}</span>
                          <Badge className="mr-auto rounded-xl font-bold bg-emerald-100 text-emerald-700 border-emerald-300">
                            דיווח
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}