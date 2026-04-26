import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { OUTPOSTS } from "@/lib/constants";
import { 
  CheckCircle, XCircle, Sparkles, ImageIcon, History, Clock, User, Calendar, 
  Download, ChevronLeft, ChevronRight, Trash2, Eye
} from "lucide-react";
import { format, startOfWeek, parseISO, subDays } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CompletedParade {
  id: string;
  outpost: string;
  day_of_week: string;
  soldier_name: string;
  completed_at: string;
  parade_date: string;
  items_completed: number;
}

interface ParadePhoto {
  id: string;
  item_name: string;
  photo_url: string;
}

const DAY_LABELS: Record<number, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת"
};

interface ParadeDayOption {
  value: number;
  label: string;
  dayKey: string;
}

export function CleaningParadeCards() {
  const [completedParades, setCompletedParades] = useState<CompletedParade[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAllParades, setShowAllParades] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDays, setActiveDays] = useState<ParadeDayOption[]>([]);
  
  // History range
  const [historyDays, setHistoryDays] = useState<number>(7); // 7 = this week, 30 = 30 days
  
  // Photo viewer
  const [selectedParade, setSelectedParade] = useState<CompletedParade | null>(null);
  const [paradePhotos, setParadePhotos] = useState<ParadePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Cleanup
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');

  useEffect(() => {
    fetchActiveDays();
  }, []);

  useEffect(() => {
    if (activeDays.length > 0) {
      fetchCompletedParades();
    }
  }, [historyDays, activeDays]);

  useEffect(() => {
    // Trigger cleanup on mount
    cleanupOldData();
  }, []);

  const fetchActiveDays = async () => {
    try {
      const { data, error } = await supabase
        .from("cleaning_parade_config")
        .select("day_of_week, outpost")
        .eq("is_active", true);

      if (error) throw error;

      // Get unique days that have active parades
      const uniqueDays = [...new Set((data || []).map(d => d.day_of_week))].sort();
      
      const dayOptions: ParadeDayOption[] = uniqueDays.map(day => ({
        value: day,
        label: DAY_LABELS[day] || `יום ${day}`,
        dayKey: DAY_LABELS[day] || String(day)
      }));

      setActiveDays(dayOptions);
    } catch (error) {
      console.error("Error fetching active days:", error);
    }
  };

  const cleanupOldData = async () => {
    try {
      await supabase.functions.invoke('cleanup-old-cleaning-parades');
    } catch (error) {
      console.error('Cleanup function error:', error);
    }
  };

  const fetchCompletedParades = async () => {
    setLoading(true);
    try {
      const startDate = historyDays === 7 
        ? currentWeekStart 
        : format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // Fetch completed submissions with soldier info
      const { data, error } = await supabase
        .from("cleaning_parade_submissions")
        .select(`
          id,
          outpost,
          day_of_week,
          parade_date,
          completed_at,
          soldiers(full_name, personal_number)
        `)
        .eq("is_completed", true)
        .gte("parade_date", startDate)
        .order("completed_at", { ascending: false });

      if (error) {
        console.error("Error fetching submissions:", error);
        return;
      }

      // Get completion counts for each submission
      const submissionIds = (data || []).map(d => d.id);
      let completionCounts: Record<string, number> = {};
      
      if (submissionIds.length > 0) {
        const { data: completions } = await supabase
          .from("cleaning_checklist_completions")
          .select("submission_id")
          .in("submission_id", submissionIds);
        
        (completions || []).forEach(c => {
          completionCounts[c.submission_id] = (completionCounts[c.submission_id] || 0) + 1;
        });
      }

      const parades: CompletedParade[] = (data || []).map((s: any) => ({
        id: s.id,
        outpost: s.outpost,
        day_of_week: s.day_of_week,
        soldier_name: s.soldiers?.full_name || "לא ידוע",
        completed_at: s.completed_at,
        parade_date: s.parade_date,
        items_completed: completionCounts[s.id] || 0,
      }));

      setCompletedParades(parades);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParadePhotos = async (paradeId: string) => {
    setLoadingPhotos(true);
    try {
      const { data: completions, error } = await supabase
        .from("cleaning_checklist_completions")
        .select(`
          id,
          photo_url,
          checklist_item_id,
          cleaning_checklist_items(item_name)
        `)
        .eq("submission_id", paradeId);

      if (error) {
        console.error("Error fetching photos:", error);
        return;
      }

      const photos: ParadePhoto[] = (completions || []).map((c: any) => ({
        id: c.id,
        item_name: c.cleaning_checklist_items?.item_name || "פריט",
        photo_url: c.photo_url,
      }));

      setParadePhotos(photos);
      setCurrentPhotoIndex(0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleViewPhotos = async (parade: CompletedParade) => {
    setSelectedParade(parade);
    await fetchParadePhotos(parade.id);
  };

  const handleDownloadPhoto = async (photoUrl: string, itemName: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${itemName}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("התמונה הורדה");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("שגיאה בהורדת התמונה");
    }
  };

  const getParadesForDay = (dayValue: number) => {
    const dayLabel = DAY_LABELS[dayValue];
    // Only get current week parades for day view
    return completedParades.filter(p => 
      p.day_of_week === dayLabel && p.parade_date >= currentWeekStart
    );
  };

  const getParadesForOutpost = (outpost: string, dayValue: number) => {
    const dayLabel = DAY_LABELS[dayValue];
    return completedParades.filter(p => 
      p.outpost === outpost && p.day_of_week === dayLabel && p.parade_date >= currentWeekStart
    );
  };

  const getDayStats = (dayValue: number) => {
    const dayParades = getParadesForDay(dayValue);
    const uniqueOutposts = [...new Set(dayParades.map(p => p.outpost))];
    return {
      completed: uniqueOutposts.length,
      total: OUTPOSTS.length,
      parades: dayParades.length,
    };
  };

  const getDayInfo = (dayValue: number) => {
    return activeDays.find(d => d.value === dayValue);
  };

  const getDayInfoByLabel = (dayLabel: string) => {
    return activeDays.find(d => d.label === dayLabel);
  };

  // Get recent parades for quick view
  const recentParades = completedParades.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800">מסדרי ניקיון</h2>
            <p className="text-sm text-slate-500">סטטוס ביצוע שבועי</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowAllParades(true)} className="text-primary">
          <History className="w-4 h-4 ml-1" />
          הכל
        </Button>
      </div>

      {/* Day Summary Cards */}
      <div className={cn("grid gap-3", activeDays.length <= 3 ? "grid-cols-3" : "grid-cols-2")}>
        {activeDays.map(day => {
          const stats = getDayStats(day.value);
          const percentage = Math.round((stats.completed / stats.total) * 100);
          const isComplete = stats.completed === stats.total;
          
          return (
            <Card
              key={day.value}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                isComplete ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
              )}
              onClick={() => setSelectedDay(day.value)}
            >
              <CardContent className="p-3 text-center">
                <div className={cn(
                  "text-2xl font-black mb-1",
                  isComplete ? "text-emerald-600" : "text-slate-600"
                )}>
                  {stats.completed}/{stats.total}
                </div>
                <p className="text-xs font-bold text-slate-600">יום {day.label}</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", isComplete ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Parades Quick View */}
      {recentParades.length > 0 && (
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-primary" />
              מסדרים אחרונים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {recentParades.slice(0, 4).map((parade) => (
                <div 
                  key={parade.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border transition-all bg-white border-slate-200"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary px-1.5 py-0">
                        {parade.outpost}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        יום {parade.day_of_week}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <User className="w-3 h-3" />
                      {parade.soldier_name}
                    </div>
                    <p className="text-xs text-slate-400">{parade.items_completed} פריטים</p>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => handleViewPhotos(parade)}
                  >
                    <Eye className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 bg-white">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-primary" />
              מסדרי יום {selectedDay !== null ? DAY_LABELS[selectedDay] : ""}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-3">
              {OUTPOSTS.map(outpost => {
                const outpostParades = selectedDay ? getParadesForOutpost(outpost, selectedDay) : [];
                const isCompleted = outpostParades.length > 0;
                
                return (
                  <div
                    key={outpost}
                    className={cn(
                      "rounded-xl border overflow-hidden",
                      isCompleted ? "bg-white border-emerald-200" : "bg-red-50/50 border-red-200"
                    )}
                  >
                    {/* Outpost Header */}
                    <div className={cn(
                      "p-3 flex items-center gap-3",
                      isCompleted ? "bg-emerald-50" : "bg-red-50"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{outpost}</p>
                        <p className="text-xs text-slate-500">
                          {isCompleted ? "בוצע" : "טרם בוצע"}
                        </p>
                      </div>
                    </div>

                    {/* Parades List */}
                    {outpostParades.length > 0 && (
                      <div className="divide-y divide-slate-100">
                        {outpostParades.map((parade) => (
                          <div key={parade.id} className="p-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <User className="w-3.5 h-3.5" />
                                {parade.soldier_name}
                              </div>
                              <p className="text-xs text-slate-400">
                                {parade.items_completed} פריטים
                              </p>
                              {parade.completed_at && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {format(parseISO(parade.completed_at), "dd/MM HH:mm")}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8"
                              onClick={() => handleViewPhotos(parade)}
                            >
                              <Eye className="w-4 h-4 text-primary" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* All Parades History Dialog */}
      <Dialog open={showAllParades} onOpenChange={setShowAllParades}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 bg-white">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-slate-900">
                <History className="w-5 h-5 text-primary" />
                היסטוריית מסדרים
              </DialogTitle>
              <Select
                value={historyDays.toString()}
                onValueChange={(v) => setHistoryDays(parseInt(v))}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">השבוע</SelectItem>
                  <SelectItem value="30">30 ימים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : completedParades.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  אין מסדרים בתקופה זו
                </div>
              ) : (
                completedParades.map((parade) => (
                  <div
                    key={parade.id}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all bg-white border-slate-200"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          {parade.outpost}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          יום {parade.day_of_week}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <User className="w-3 h-3" />
                        {parade.soldier_name}
                      </div>
                      <p className="text-xs text-slate-400">{parade.items_completed} פריטים</p>
                    </div>

                    {/* Date & Actions */}
                    <div className="flex flex-col items-end gap-1">
                      {parade.completed_at && (
                        <>
                          <p className="text-sm font-medium text-slate-600">
                            {format(parseISO(parade.completed_at), "HH:mm")}
                          </p>
                          <p className="text-xs text-slate-400">
                            {format(parseISO(parade.completed_at), "dd/MM")}
                          </p>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={() => handleViewPhotos(parade)}
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedParade} onOpenChange={() => setSelectedParade(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 bg-black/95">
          <DialogHeader className="p-4 pb-2 border-b border-slate-700">
            <DialogTitle className="flex items-center gap-2 text-white">
              <ImageIcon className="w-5 h-5 text-primary" />
              {selectedParade?.outpost} - {selectedParade?.soldier_name}
            </DialogTitle>
          </DialogHeader>
          
          {loadingPhotos ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paradePhotos.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-slate-400">
              אין תמונות
            </div>
          ) : (
            <div className="relative">
              {/* Current Photo */}
              <div className="relative aspect-square bg-black">
                <img
                  src={paradePhotos[currentPhotoIndex]?.photo_url}
                  alt={paradePhotos[currentPhotoIndex]?.item_name}
                  className="w-full h-full object-contain"
                />
                
                {/* Navigation arrows */}
                {paradePhotos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setCurrentPhotoIndex(prev => prev < paradePhotos.length - 1 ? prev + 1 : 0)}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setCurrentPhotoIndex(prev => prev > 0 ? prev - 1 : paradePhotos.length - 1)}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}
              </div>

              {/* Photo info & download */}
              <div className="p-4 bg-slate-900 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{paradePhotos[currentPhotoIndex]?.item_name}</p>
                  <p className="text-xs text-slate-400">
                    {currentPhotoIndex + 1} / {paradePhotos.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={() => handleDownloadPhoto(
                    paradePhotos[currentPhotoIndex]?.photo_url,
                    paradePhotos[currentPhotoIndex]?.item_name
                  )}
                >
                  <Download className="w-4 h-4 ml-1" />
                  הורד
                </Button>
              </div>

              {/* Thumbnails */}
              {paradePhotos.length > 1 && (
                <div className="p-3 bg-slate-800 flex gap-2 overflow-x-auto">
                  {paradePhotos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={cn(
                        "w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all",
                        idx === currentPhotoIndex ? "border-primary" : "border-transparent opacity-60"
                      )}
                    >
                      <img
                        src={photo.photo_url}
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
    </div>
  );
}