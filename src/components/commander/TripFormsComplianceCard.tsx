import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Home, Users, CheckCircle2, XCircle, ChevronLeft, Loader2, Calendar, MapPin, RefreshCw } from "lucide-react";
import { format, startOfWeek, endOfWeek, getDay, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Soldier {
  id: string;
  full_name: string;
  outpost: string | null;
  rotation_group: string | null;
}

interface SoldierComplianceInfo {
  soldier: Soldier;
  hasSubmittedForm: boolean;
  rotationLabel: string;
}

const ROTATION_LABELS: Record<string, string> = {
  a_sunday: "סבב א׳ - ראשון",
  a_monday: "סבב א׳ - שני",
  b_sunday: "סבב ב׳ - ראשון",
  b_monday: "סבב ב׳ - שני",
};

/**
 * Determine which rotation groups are "on duty" this week.
 * Week A and Week B alternate. We use ISO week number to determine parity.
 * Sunday groups enter on Sunday, Monday groups enter on Monday.
 */
function getActiveRotationGroups(): string[] {
  const today = new Date();
  // Get the ISO week number to determine A vs B week
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  
  const isWeekA = weekNumber % 2 === 0;
  const weekLetter = isWeekA ? "a" : "b";
  
  return [`${weekLetter}_sunday`, `${weekLetter}_monday`];
}

export function TripFormsComplianceCard() {
  const [soldiers, setSoldiers] = useState<SoldierComplianceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "submitted" | "pending">("all");

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    try {
      const activeGroups = getActiveRotationGroups();
      
      // Fetch all active soldiers in the active rotation groups
      const { data: soldiersData, error: soldiersError } = await supabase
        .from("soldiers")
        .select("id, full_name, outpost, rotation_group")
        .eq("is_active", true)
        .in("rotation_group", activeGroups);

      if (soldiersError) {
        console.error("Error fetching soldiers:", soldiersError);
        return;
      }

      if (!soldiersData || soldiersData.length === 0) {
        setSoldiers([]);
        setLoading(false);
        return;
      }

      // Get trip forms for this week (Sunday to Saturday)
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      const { data: tripFormsData } = await supabase
        .from("trip_forms")
        .select("soldier_name, form_date")
        .gte("form_date", format(weekStart, "yyyy-MM-dd"))
        .lte("form_date", format(weekEnd, "yyyy-MM-dd"));

      // Create a set of soldier names who submitted forms (normalized)
      const submittedNames = new Set(
        (tripFormsData || []).map(form => form.soldier_name.trim().toLowerCase())
      );

      // Build the compliance list
      const complianceList: SoldierComplianceInfo[] = soldiersData.map(soldier => ({
        soldier,
        hasSubmittedForm: submittedNames.has(soldier.full_name.trim().toLowerCase()),
        rotationLabel: ROTATION_LABELS[soldier.rotation_group || ""] || soldier.rotation_group || "לא משויך",
      }));

      // Sort: pending first, then alphabetically
      complianceList.sort((a, b) => {
        if (a.hasSubmittedForm !== b.hasSubmittedForm) {
          return a.hasSubmittedForm ? 1 : -1;
        }
        return a.soldier.full_name.localeCompare(b.soldier.full_name, "he");
      });

      setSoldiers(complianceList);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSoldiers = () => {
    if (filterType === "submitted") return soldiers.filter(s => s.hasSubmittedForm);
    if (filterType === "pending") return soldiers.filter(s => !s.hasSubmittedForm);
    return soldiers;
  };

  const submittedCount = soldiers.filter(s => s.hasSubmittedForm).length;
  const pendingCount = soldiers.filter(s => !s.hasSubmittedForm).length;
  const totalCount = soldiers.length;
  const activeGroups = getActiveRotationGroups();
  const activeGroupLabels = activeGroups.map(g => ROTATION_LABELS[g] || g).join(" / ");

  if (loading) {
    return (
      <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 group"
        onClick={() => setDialogOpen(true)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-full blur-2xl" />
        
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <span>תדריכי יציאה השבוע</span>
                <div className="flex items-center gap-1 text-xs text-slate-500 font-normal mt-0.5">
                  <RefreshCw className="w-3 h-3" />
                  {activeGroupLabels}
                </div>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative">
          {totalCount === 0 ? (
            <div className="text-center py-4">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">אין חיילים בסבב פעיל השבוע</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                    <Users className="w-7 h-7 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-800">{totalCount}</div>
                    <div className="text-sm text-slate-500">חיילים מצופים</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-700">הזינו טופס</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{submittedCount}</div>
                </div>
                
                <div className="flex-1 p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-red-700">לא הזינו</span>
                  </div>
                  <div className="text-2xl font-black text-red-600">{pendingCount}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-5 bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
            <DialogTitle className="text-white text-lg font-bold">
              תדריכי יציאה השבוע
            </DialogTitle>
            <p className="text-white/80 text-sm">
              סבב פעיל: {activeGroupLabels}
            </p>
          </DialogHeader>
          
          <div className="p-4 border-b border-slate-100">
            <div className="flex gap-2">
              <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")} className="flex-1 rounded-lg">
                הכל ({totalCount})
              </Button>
              <Button variant={filterType === "submitted" ? "default" : "outline"} size="sm" onClick={() => setFilterType("submitted")} className="flex-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3 ml-1 text-emerald-500" />
                הזינו ({submittedCount})
              </Button>
              <Button variant={filterType === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilterType("pending")} className="flex-1 rounded-lg">
                <XCircle className="w-3 h-3 ml-1 text-red-500" />
                חסר ({pendingCount})
              </Button>
            </div>
          </div>
          
          <ScrollArea className="max-h-[55vh]">
            <div className="p-4 space-y-2">
              {getFilteredSoldiers().length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">לא נמצאו חיילים</p>
                </div>
              ) : (
                getFilteredSoldiers().map(info => (
                  <div
                    key={info.soldier.id}
                    className={cn(
                      "p-3 rounded-xl border transition-colors",
                      info.hasSubmittedForm ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {info.hasSubmittedForm ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800">{info.soldier.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {info.soldier.outpost && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {info.soldier.outpost}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <RefreshCw className="w-3 h-3" />
                            {info.rotationLabel}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          info.hasSubmittedForm ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}
                      >
                        {info.hasSubmittedForm ? "הזין" : "חסר"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}