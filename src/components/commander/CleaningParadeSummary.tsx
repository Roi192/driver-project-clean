import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addDays, isToday, isBefore, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Camera, 
  User, 
  CalendarDays, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Maximize2,
  Building2,
  Loader2,
  Image
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OUTPOSTS } from "@/lib/constants";

interface SoldierAssignment {
  soldier_id: string;
  soldier_name: string;
  items: {
    item_id: string;
    item_name: string;
    deadline_time: string | null;
    has_submitted: boolean;
    is_completed: boolean;
    photos: { url: string; item_name: string }[];
  }[];
  total_items: number;
  completed_items: number;
  has_submitted: boolean;
}

interface OutpostData {
  outpost: string;
  soldiers: SoldierAssignment[];
  total_soldiers: number;
  completed_soldiers: number;
}

interface DayData {
  day: number;
  day_label: string;
  outposts: OutpostData[];
  total_completed: number;
  total_missing: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "ראשון", short: "א'" },
  { value: 1, label: "שני", short: "ב'" },
  { value: 2, label: "שלישי", short: "ג'" },
  { value: 3, label: "רביעי", short: "ד'" },
  { value: 4, label: "חמישי", short: "ה'" },
  { value: 5, label: "שישי", short: "ו'" },
  { value: 6, label: "שבת", short: "ש'" }
];

export function CleaningParadeSummary() {
  const [loading, setLoading] = useState(true);
  const [daysData, setDaysData] = useState<DayData[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [expandedOutposts, setExpandedOutposts] = useState<Set<string>>(new Set());
  const [selectedPhotos, setSelectedPhotos] = useState<{ url: string; item_name: string }[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);
  const [selectedSoldierName, setSelectedSoldierName] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetchData();
  }, [weekOffset]);

  const getWeekDates = () => {
    const today = new Date();
    const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 0 });
    return {
      start: weekStart,
      end: addDays(weekStart, 6),
      startStr: format(weekStart, "yyyy-MM-dd"),
      endStr: format(addDays(weekStart, 6), "yyyy-MM-dd")
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, startStr, endStr } = getWeekDates();

      // Fetch active parade days config
      const { data: paradeConfig } = await supabase
        .from("cleaning_parade_config")
        .select("day_of_week, outpost")
        .eq("is_active", true);

      // Get unique parade days
      const activeDays = [...new Set((paradeConfig || []).map(p => p.day_of_week))].sort();

      // Fetch all assignments
      const { data: assignmentsData } = await supabase
        .from("cleaning_item_assignments")
        .select("*, cleaning_checklist_items(item_name)");

      // Fetch soldiers
      const { data: soldiersData } = await supabase
        .from("soldiers")
        .select("id, full_name")
        .eq("is_active", true);

      // Fetch work schedule for soldier resolution
      const { data: workScheduleData } = await supabase
        .from("work_schedule")
        .select("*")
        .eq("week_start_date", startStr);

      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from("cleaning_parade_submissions")
        .select(`
          id,
          soldier_id,
          outpost,
          day_of_week,
          parade_date,
          is_completed,
          completed_at
        `)
        .gte("parade_date", startStr)
        .lte("parade_date", endStr);

      // Fetch completions with photos
      const submissionIds = (submissionsData || []).map(s => s.id);
      let completionsData: any[] = [];
      if (submissionIds.length > 0) {
        const { data } = await supabase
          .from("cleaning_checklist_completions")
          .select(`
            submission_id,
            checklist_item_id,
            photo_url,
            cleaning_checklist_items(item_name)
          `)
          .in("submission_id", submissionIds);
        completionsData = data || [];
      }

      // Build hierarchical data structure
      const daysMap = new Map<number, DayData>();
      const today = new Date();

      activeDays.forEach(day => {
        const dayLabel = DAYS_OF_WEEK.find(d => d.value === day)?.label || "";
        daysMap.set(day, {
          day,
          day_label: dayLabel,
          outposts: [],
          total_completed: 0,
          total_missing: 0
        });
      });

      // Group assignments by day and outpost
      const assignmentsByDayOutpost = new Map<string, Map<string, any[]>>();
      
      (assignmentsData || []).forEach((a: any) => {
        const dayKey = a.parade_day.toString();
        if (!assignmentsByDayOutpost.has(dayKey)) {
          assignmentsByDayOutpost.set(dayKey, new Map());
        }
        const outpostMap = assignmentsByDayOutpost.get(dayKey)!;
        if (!outpostMap.has(a.outpost)) {
          outpostMap.set(a.outpost, []);
        }
        outpostMap.get(a.outpost)!.push(a);
      });

      // Process each parade day
      activeDays.forEach(day => {
        const dayData = daysMap.get(day)!;
        const paradeDateForWeek = addDays(start, day);
        const paradeDateStr = format(paradeDateForWeek, "yyyy-MM-dd");
        const isPastOrToday = isBefore(paradeDateForWeek, today) || isToday(paradeDateForWeek);
        
        const outpostMap = assignmentsByDayOutpost.get(day.toString()) || new Map();
        
        outpostMap.forEach((assignments, outpost) => {
          // Group by soldier
          const soldierAssignments = new Map<string, SoldierAssignment>();

          assignments.forEach((assignment: any) => {
            let soldierId: string | null = null;
            let soldierName: string | null = null;

            if (assignment.shift_type?.startsWith("manual-")) {
              soldierId = assignment.shift_type.replace("manual-", "");
              const soldier = (soldiersData || []).find((s: any) => s.id === soldierId);
              soldierName = soldier?.full_name || null;
            } else if (assignment.shift_type) {
              const [sourceDay, sourceShift] = assignment.shift_type.split("-");
              const scheduleEntry = (workScheduleData || []).find(
                (w: any) => w.outpost === outpost && w.day_of_week === parseInt(sourceDay)
              );
              if (scheduleEntry) {
                const shiftKey = `${sourceShift}_soldier_id` as keyof typeof scheduleEntry;
                soldierId = scheduleEntry[shiftKey] as string | null;
                const soldier = (soldiersData || []).find((s: any) => s.id === soldierId);
                soldierName = soldier?.full_name || null;
              }
            }

            if (soldierId && soldierName) {
              if (!soldierAssignments.has(soldierId)) {
                soldierAssignments.set(soldierId, {
                  soldier_id: soldierId,
                  soldier_name: soldierName,
                  items: [],
                  total_items: 0,
                  completed_items: 0,
                  has_submitted: false
                });
              }

              const soldierData = soldierAssignments.get(soldierId)!;
              
              // Check submission for this soldier
              const submission = (submissionsData || []).find(
                s => s.soldier_id === soldierId && 
                     s.outpost === outpost && 
                     s.parade_date === paradeDateStr
              );

              // Get photos for this item
              const itemPhotos = submission 
                ? completionsData
                    .filter(c => c.submission_id === submission.id && c.checklist_item_id === assignment.item_id)
                    .map(c => ({ url: c.photo_url, item_name: c.cleaning_checklist_items?.item_name || "פריט" }))
                : [];

              soldierData.items.push({
                item_id: assignment.item_id,
                item_name: assignment.cleaning_checklist_items?.item_name || "פריט",
                deadline_time: assignment.deadline_time,
                has_submitted: !!submission,
                is_completed: submission?.is_completed || false,
                photos: itemPhotos
              });

              soldierData.total_items++;
              if (itemPhotos.length > 0) {
                soldierData.completed_items++;
              }
              if (submission) {
                soldierData.has_submitted = true;
              }
            }
          });

          // Convert to array and count
          const soldiersArray = Array.from(soldierAssignments.values());
          const completedSoldiers = soldiersArray.filter(s => s.has_submitted && s.completed_items === s.total_items).length;

          if (soldiersArray.length > 0) {
            dayData.outposts.push({
              outpost,
              soldiers: soldiersArray,
              total_soldiers: soldiersArray.length,
              completed_soldiers: completedSoldiers
            });

            if (isPastOrToday) {
              dayData.total_completed += completedSoldiers;
              dayData.total_missing += soldiersArray.length - completedSoldiers;
            }
          }
        });

        // Sort outposts alphabetically
        dayData.outposts.sort((a, b) => a.outpost.localeCompare(b.outpost, "he"));
      });

      setDaysData(Array.from(daysMap.values()));
      
      // Auto-expand current day
      const currentDay = today.getDay();
      if (activeDays.includes(currentDay) && weekOffset === 0) {
        setExpandedDays(new Set([currentDay]));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const toggleOutpost = (key: string) => {
    const newExpanded = new Set(expandedOutposts);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedOutposts(newExpanded);
  };

  const handleViewPhotos = (photos: { url: string; item_name: string }[], soldierName: string) => {
    setSelectedPhotos(photos);
    setSelectedSoldierName(soldierName);
    setCurrentPhotoIndex(0);
    setShowPhotosDialog(true);
  };

  const handleDownloadPhoto = async (url: string, itemName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${itemName}-${Date.now()}.jpg`;
      link.click();
    } catch {
      toast.error("שגיאה בהורדת התמונה");
    }
  };

  const { start, end } = getWeekDates();
  const weekLabel = `${format(start, "d/M")} - ${format(end, "d/M", { locale: he })}`;

  const totalCompleted = daysData.reduce((sum, d) => sum + d.total_completed, 0);
  const totalMissing = daysData.reduce((sum, d) => sum + d.total_missing, 0);

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur border-slate-200/60">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/90 backdrop-blur border-slate-200/60 shadow-lg overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-emerald-200/50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-800">סיכום מסדרי ניקיון</CardTitle>
                <p className="text-sm text-slate-500">ימים → מוצבים → חיילים</p>
              </div>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setWeekOffset(w => w - 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="px-2 text-sm font-medium text-slate-700 whitespace-nowrap">
                {weekLabel}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setWeekOffset(w => w + 1)}
                disabled={weekOffset >= 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
              <div className="text-2xl font-black text-emerald-600">{totalCompleted}</div>
              <div className="text-xs text-emerald-700">הושלמו</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
              <div className="text-2xl font-black text-red-600">{totalMissing}</div>
              <div className="text-xs text-red-700">חסרים</div>
            </div>
          </div>

          {/* Days accordion */}
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {daysData.map(dayData => (
                <div key={dayData.day} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleDay(dayData.day)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 transition-colors",
                      expandedDays.has(dayData.day) 
                        ? "bg-slate-100" 
                        : "bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5 text-slate-600" />
                      <span className="font-bold text-slate-800">יום {dayData.day_label}</span>
                      <Badge variant="outline" className="text-slate-600">
                        {dayData.outposts.length} מוצבים
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {dayData.total_missing > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          {dayData.total_missing} חסרים
                        </Badge>
                      )}
                      {dayData.total_completed > 0 && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          {dayData.total_completed} ✓
                        </Badge>
                      )}
                      <ChevronDown 
                        className={cn(
                          "w-5 h-5 text-slate-400 transition-transform",
                          expandedDays.has(dayData.day) && "rotate-180"
                        )} 
                      />
                    </div>
                  </button>

                  {expandedDays.has(dayData.day) && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-2 space-y-2">
                      {dayData.outposts.map(outpostData => {
                        const outpostKey = `${dayData.day}-${outpostData.outpost}`;
                        return (
                          <div key={outpostKey} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <button
                              onClick={() => toggleOutpost(outpostKey)}
                              className={cn(
                                "w-full flex items-center justify-between p-2 px-3 transition-colors",
                                expandedOutposts.has(outpostKey) 
                                  ? "bg-slate-50" 
                                  : "hover:bg-slate-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                <span className="font-semibold text-slate-700">{outpostData.outpost}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">
                                  {outpostData.completed_soldiers}/{outpostData.total_soldiers} חיילים
                                </span>
                                <ChevronDown 
                                  className={cn(
                                    "w-4 h-4 text-slate-400 transition-transform",
                                    expandedOutposts.has(outpostKey) && "rotate-180"
                                  )} 
                                />
                              </div>
                            </button>

                            {expandedOutposts.has(outpostKey) && (
                              <div className="border-t border-slate-100 p-2 space-y-2">
                                {outpostData.soldiers.map(soldier => {
                                  const isComplete = soldier.has_submitted && soldier.completed_items === soldier.total_items;
                                  const allPhotos = soldier.items.flatMap(i => i.photos);

                                  return (
                                    <div
                                      key={soldier.soldier_id}
                                      className={cn(
                                        "rounded-lg p-2 border",
                                        isComplete 
                                          ? "bg-emerald-50 border-emerald-200" 
                                          : "bg-red-50 border-red-200"
                                      )}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <User className={cn(
                                            "w-4 h-4",
                                            isComplete ? "text-emerald-600" : "text-red-500"
                                          )} />
                                          <span className={cn(
                                            "font-bold text-sm",
                                            isComplete ? "text-emerald-800" : "text-red-800"
                                          )}>
                                            {soldier.soldier_name}
                                          </span>
                                          {!isComplete && (
                                            <Badge className="bg-red-500 text-white text-[10px] px-1.5">
                                              לא הושלם
                                            </Badge>
                                          )}
                                        </div>
                                        {allPhotos.length > 0 && (
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className={cn(
                                              "h-7 gap-1 text-xs",
                                              isComplete 
                                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100" 
                                                : "text-slate-600 hover:bg-white"
                                            )}
                                            onClick={() => handleViewPhotos(allPhotos, soldier.soldier_name)}
                                          >
                                            <Image className="w-3.5 h-3.5" />
                                            {allPhotos.length} תמונות
                                          </Button>
                                        )}
                                      </div>

                                      {/* Items list */}
                                      <div className="mt-2 space-y-1">
                                        {soldier.items.map(item => {
                                          const hasPhoto = item.photos.length > 0;
                                          return (
                                            <div 
                                              key={item.item_id}
                                              className={cn(
                                                "flex items-center gap-2 text-xs px-2 py-1 rounded",
                                                hasPhoto ? "bg-white/60" : "bg-white/40"
                                              )}
                                            >
                                              {hasPhoto ? (
                                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                              ) : (
                                                <XCircle className="w-3 h-3 text-red-400" />
                                              )}
                                              <span className={cn(
                                                hasPhoto ? "text-slate-700" : "text-red-600"
                                              )}>
                                                {item.item_name}
                                              </span>
                                              {item.photos.length > 0 && (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                                  {item.photos.length} תמונות
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {dayData.outposts.length === 0 && (
                        <p className="text-center text-sm text-slate-500 py-4">אין משימות מוגדרות ליום זה</p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {daysData.length === 0 && (
                <p className="text-center text-slate-500 py-8">אין ימי מסדר מוגדרים</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Photos Dialog */}
      <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-500" />
              תמונות מסדר - {selectedSoldierName}
            </DialogTitle>
          </DialogHeader>

          {selectedPhotos.length > 0 && (
            <div className="space-y-4">
              {/* Main photo */}
              <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
                <img
                  src={selectedPhotos[currentPhotoIndex].url}
                  alt={selectedPhotos[currentPhotoIndex].item_name}
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <Badge className="bg-black/70 text-white">
                    {selectedPhotos[currentPhotoIndex].item_name}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={() => handleDownloadPhoto(
                      selectedPhotos[currentPhotoIndex].url,
                      selectedPhotos[currentPhotoIndex].item_name
                    )}
                  >
                    <Download className="w-3.5 h-3.5" />
                    הורד
                  </Button>
                </div>
              </div>

              {/* Thumbnails */}
              {selectedPhotos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        currentPhotoIndex === idx 
                          ? "border-emerald-500 ring-2 ring-emerald-200" 
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <img
                        src={photo.url}
                        alt={photo.item_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}