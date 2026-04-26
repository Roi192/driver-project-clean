import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ClipboardList, Calendar, MapPin, Car, Clock, Loader2, FileCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface Report {
  id: string;
  report_date: string;
  report_time: string;
  outpost: string;
  vehicle_number: string;
  shift_type: string;
  is_complete: boolean;
}

const shiftTypeMap: Record<string, string> = {
  morning: "משמרת בוקר",
  afternoon: "משמרת צהריים",
  evening: "משמרת ערב",
};

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("shift_reports")
          .select("id, report_date, report_time, outpost, vehicle_number, shift_type, is_complete")
          .eq("user_id", user.id)
          .order("report_date", { ascending: false });

        if (error) {
          console.error("Error fetching reports:", error);
        } else {
          setReports(data || []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Header */}
        <PageHeader
          icon={FileCheck}
          title="הדיווחים שלי"
          subtitle="היסטוריית הדיווחים שלך"
          badge="הדיווחים שלי"
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <ClipboardList className="w-10 h-10 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">אין דיווחים להצגה</p>
            <p className="text-sm text-muted-foreground mt-2">
              מלא טופס דיווח משמרת כדי לראות אותו כאן
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report, index) => (
              <div 
                key={report.id} 
                className="group relative overflow-hidden p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 hover:border-primary/40 hover:shadow-luxury transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <span className="font-bold text-lg">{formatDate(report.report_date)}</span>
                        <p className="text-sm text-muted-foreground">
                          {shiftTypeMap[report.shift_type] || report.shift_type}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      className={report.is_complete 
                        ? 'bg-green-500/20 text-green-600 border-green-500/30 font-bold' 
                        : 'bg-amber-500/20 text-amber-600 border-amber-500/30 font-bold'
                      }
                    >
                      {report.is_complete ? 'הושלם' : 'חלקי'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/20">
                      <Clock className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{report.report_time}</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/20">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{report.outpost}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/20">
                      <Car className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">רכב: {report.vehicle_number}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}