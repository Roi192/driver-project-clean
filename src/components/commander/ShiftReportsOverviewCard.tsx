import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Users, ChevronLeft, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { he } from "date-fns/locale";

interface ShiftReport {
  id: string;
  report_date: string;
  report_time: string | null;
  outpost: string | null;
  driver_name: string | null;
  vehicle_number: string | null;
  shift_type: string | null;
  is_complete: boolean | null;
  created_at: string;
}

const shiftTypeLabels: Record<string, string> = {
  morning: "בוקר",
  afternoon: "צהריים",
  evening: "ערב",
};

export function ShiftReportsOverviewCard() {
  const { brigade, isDivisionAdmin } = useAuth();
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [brigade, isDivisionAdmin]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("shift_reports")
        .select("id, report_date, report_time, outpost, driver_name, vehicle_number, shift_type, is_complete, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!isDivisionAdmin && brigade) query = query.eq("brigade", brigade);

      const { data, error } = await query;
      if (error) throw error;
      setReports((data || []) as ShiftReport[]);
    } catch (error) {
      console.error("Error fetching shift reports overview:", error);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  const recentReports = useMemo(() => {
    const since = subDays(new Date(), 30);
    return reports.filter((report) => new Date(report.created_at) >= since);
  }, [reports]);

  const latestReports = reports.slice(0, 8);
  const uniqueDrivers = new Set(reports.map((report) => report.driver_name).filter(Boolean)).size;
  const completeReports = reports.filter((report) => report.is_complete).length;

  return (
    <>
      <Card
        className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 group"
        onClick={() => setDialogOpen(true)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-2xl" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span>טפסי פתיחת משמרת</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </CardTitle>
        </CardHeader>

        <CardContent className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3">
                <div className="text-2xl font-black text-primary">{reports.length}</div>
                <div className="text-xs text-slate-600 font-medium">סה״כ</div>
              </div>
              <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3">
                <div className="text-2xl font-black text-accent">{recentReports.length}</div>
                <div className="text-xs text-slate-600 font-medium">30 יום</div>
              </div>
              <div className="rounded-2xl bg-success/10 border border-success/20 p-3">
                <div className="text-2xl font-black text-success">{uniqueDrivers}</div>
                <div className="text-xs text-slate-600 font-medium">נהגים</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              טפסי פתיחת משמרת אחרונים
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 mt-2">
            <Badge className="justify-center bg-primary/10 text-primary border-0">{reports.length} סה״כ</Badge>
            <Badge className="justify-center bg-accent/10 text-accent border-0">{recentReports.length} ב־30 יום</Badge>
            <Badge className="justify-center bg-success/10 text-success border-0">{completeReports} מלאים</Badge>
          </div>

          {latestReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">אין טפסי פתיחת משמרת בחטיבה שנבחרה</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {latestReports.map((report) => (
                <div key={report.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        {report.driver_name || "נהג ללא שם"}
                      </div>
                      <div className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {report.outpost || "ללא מוצב"}
                      </div>
                    </div>
                    {report.is_complete && <CheckCircle2 className="w-5 h-5 text-success" />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{format(new Date(report.report_date), "dd/MM/yyyy", { locale: he })}</span>
                    {report.shift_type && <span>• משמרת {shiftTypeLabels[report.shift_type] || report.shift_type}</span>}
                    {report.vehicle_number && <span>• רכב {report.vehicle_number}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(report.created_at), "HH:mm", { locale: he })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full mt-2" onClick={() => (window.location.href = "/admin")}>כל הדיווחים</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}