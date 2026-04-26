import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, CheckCircle, AlertCircle, Sparkles, ListChecks, Image, ArrowLeft, MapPin, Calendar, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Day labels for display
const DAY_LABELS: Record<number, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת"
};

// Dynamic day config interface
interface DayConfig {
  paradeDay: number;
  label: string;
  outpost: string;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  item_order: number;
}

interface ReferencePhoto {
  id: string;
  checklist_item_id: string | null;
  outpost: string;
  description: string | null;
  image_url: string;
}

interface ChecklistCompletion {
  id: string;
  checklist_item_id: string;
  photo_url: string;
}

type Step = "weekly-view" | "checklist" | "completed";

// Assignment for weekly view
interface WeeklyAssignment {
  paradeDay: number;
  outpost: string;
  isCompleted: boolean;
  date: Date;
}

export default function CleaningParades() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [soldierId, setSoldierId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("weekly-view");
  
  // Selection
  const [selectedOutpost, setSelectedOutpost] = useState<string>("");
  const [selectedParadeDay, setSelectedParadeDay] = useState<number | null>(null);
  
  // Weekly assignments - dynamic based on actual assignments
  const [weeklyAssignments, setWeeklyAssignments] = useState<WeeklyAssignment[]>([]);
  
  // Checklist data
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [referencePhotos, setReferencePhotos] = useState<ReferencePhoto[]>([]);
  const [completions, setCompletions] = useState<Map<string, { id: string; url: string }[]>>(new Map());
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // UI state
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [compareItem, setCompareItem] = useState<{ item: ChecklistItem; userPhotos: { id: string; url: string }[] } | null>(null);
  const [currentRefPhotoIndex, setCurrentRefPhotoIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadItemRef = useRef<string | null>(null);

  const currentDate = format(new Date(), "yyyy-MM-dd");
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  useEffect(() => {
    initializeUser();
  }, [user]);

  useEffect(() => {
    // Handle URL params for direct navigation
    const paradeDayParam = searchParams.get('paradeDay');
    const outpostParam = searchParams.get('outpost');
    
    if (outpostParam && soldierId && paradeDayParam) {
      const paradeDayNum = parseInt(paradeDayParam);
      if (!isNaN(paradeDayNum)) {
        setSelectedParadeDay(paradeDayNum);
        setSelectedOutpost(outpostParam);
        startParade(paradeDayNum, outpostParam);
      }
    }
  }, [searchParams, soldierId]);

  const initializeUser = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('personal_number')
        .eq('user_id', user.id)
        .maybeSingle();

      const personalNumber = profile?.personal_number ?? user.user_metadata?.personal_number ?? null;

      if (!personalNumber) {
        setSoldierId(null);
        setLoading(false);
        return;
      }

      const { data: soldier } = await supabase
        .from('soldiers')
        .select('id')
        .eq('personal_number', personalNumber)
        .maybeSingle();

      if (soldier) {
        setSoldierId(soldier.id);
        await loadWeeklyAssignments(soldier.id);
      }
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyAssignments = async (sid: string) => {
    try {
      // Get work schedule
      const { data: workSchedule } = await supabase
        .from('work_schedule')
        .select('outpost, day_of_week, morning_soldier_id, afternoon_soldier_id, evening_soldier_id')
        .eq('week_start_date', weekStartStr);

      // Get item assignments - this tells us which parade days have items assigned to this soldier
      const { data: itemAssignments } = await supabase
        .from('cleaning_item_assignments')
        .select('parade_day, outpost, shift_type, manual_soldier_id');

      // Get submissions
      const { data: submissions } = await supabase
        .from('cleaning_parade_submissions')
        .select('day_of_week, outpost, is_completed')
        .eq('soldier_id', sid)
        .gte('parade_date', weekStartStr);

      // Build a map of parade days where this soldier has assignments
      const assignmentMap = new Map<string, { paradeDay: number; outpost: string }>();
      
      if (itemAssignments) {
        for (const assignment of itemAssignments) {
          let isMyTask = false;
          
          // Check if manual assignment
          if (assignment.shift_type?.startsWith("manual-")) {
            const manualSoldierId = assignment.shift_type.replace("manual-", "");
            if (manualSoldierId === sid) isMyTask = true;
          } else if (assignment.shift_type) {
            // Schedule-based: parse "day-shift" format
            const [sourceDayStr, sourceShift] = assignment.shift_type.split("-");
            const sourceDay = parseInt(sourceDayStr);
            
            if (!isNaN(sourceDay) && sourceShift) {
              const scheduleEntry = workSchedule?.find(s => 
                s.day_of_week === sourceDay && s.outpost === assignment.outpost
              );
              if (scheduleEntry) {
                let shiftSoldierId: string | null = null;
                if (sourceShift === "morning") shiftSoldierId = scheduleEntry.morning_soldier_id;
                else if (sourceShift === "afternoon") shiftSoldierId = scheduleEntry.afternoon_soldier_id;
                else if (sourceShift === "evening") shiftSoldierId = scheduleEntry.evening_soldier_id;
                
                if (shiftSoldierId === sid) isMyTask = true;
              }
            }
          }
          
          // Also check additional soldier
          if (assignment.manual_soldier_id === sid) isMyTask = true;
          
          if (isMyTask) {
            const key = `${assignment.parade_day}-${assignment.outpost}`;
            if (!assignmentMap.has(key)) {
              assignmentMap.set(key, {
                paradeDay: assignment.parade_day,
                outpost: assignment.outpost
              });
            }
          }
        }
      }

      // Convert to array with completion status
      const assignmentsList: WeeklyAssignment[] = [];
      for (const [key, assignment] of assignmentMap) {
        const submission = submissions?.find(s => 
          s.outpost === assignment.outpost
        );
        
        // Calculate date for this parade day
        const date = addDays(currentWeekStart, assignment.paradeDay);
        
        assignmentsList.push({
          paradeDay: assignment.paradeDay,
          outpost: assignment.outpost,
          isCompleted: submission?.is_completed || false,
          date
        });
      }

      // Sort by parade day
      assignmentsList.sort((a, b) => a.paradeDay - b.paradeDay);
      
      setWeeklyAssignments(assignmentsList);
    } catch (error) {
      console.error('Error loading weekly assignments:', error);
    }
  };

  const startParade = async (paradeDay?: number, outpost?: string) => {
    const useParadeDay = paradeDay ?? selectedParadeDay;
    const useOutpost = outpost || selectedOutpost;
    
    if (!useOutpost || !soldierId || useParadeDay === null || useParadeDay === undefined) {
      toast.error("יש לבחור יום ומוצב");
      return;
    }

    // Validate that today is the parade day
    const todayDayOfWeek = new Date().getDay();
    const isFutureParade = useParadeDay > todayDayOfWeek;
    
    if (isFutureParade) {
      toast.error(`ניתן למלא מסדר זה רק ביום ${DAY_LABELS[useParadeDay]}`);
      return;
    }

    setSelectedParadeDay(useParadeDay);
    setSelectedOutpost(useOutpost);
    setLoading(true);
    
    try {
      // Check existing submission
      const paradeDate = format(addDays(currentWeekStart, useParadeDay), 'yyyy-MM-dd');
      const dayValue = DAY_LABELS[useParadeDay]; // for storage
      
      const { data: existingSubmission } = await supabase
        .from('cleaning_parade_submissions')
        .select('id, is_completed')
        .eq('soldier_id', soldierId)
        .eq('outpost', useOutpost)
        .eq('parade_date', paradeDate)
        .maybeSingle();

      if (existingSubmission?.is_completed) {
        const { data: existingCompletions } = await supabase
          .from('cleaning_checklist_completions')
          .select('id, checklist_item_id, photo_url')
          .eq('submission_id', existingSubmission.id);
        
        const completionsMap = new Map<string, { id: string; url: string }[]>();
        existingCompletions?.forEach(c => {
          const existing = completionsMap.get(c.checklist_item_id) || [];
          existing.push({ id: c.id, url: c.photo_url });
          completionsMap.set(c.checklist_item_id, existing);
        });
        setCompletions(completionsMap);
        setSubmissionId(existingSubmission.id);
        setIsCompleted(true);
        setCurrentStep("completed");
        await fetchOutpostData(useOutpost, useParadeDay);
        return;
      }

      // Create or use existing submission
      let subId = existingSubmission?.id;
      if (!subId) {
        const { data: newSubmission, error } = await supabase
          .from('cleaning_parade_submissions')
          .insert({
            soldier_id: soldierId,
            outpost: useOutpost,
            day_of_week: dayValue,
            parade_date: paradeDate,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        subId = newSubmission.id;
      }
      
      setSubmissionId(subId);

      // Load existing completions
      const { data: existingCompletions } = await supabase
        .from('cleaning_checklist_completions')
        .select('id, checklist_item_id, photo_url')
        .eq('submission_id', subId);
      
      const completionsMap = new Map<string, { id: string; url: string }[]>();
      existingCompletions?.forEach(c => {
        const existing = completionsMap.get(c.checklist_item_id) || [];
        existing.push({ id: c.id, url: c.photo_url });
        completionsMap.set(c.checklist_item_id, existing);
      });
      setCompletions(completionsMap);

      await fetchOutpostData(useOutpost, useParadeDay);
      setCurrentStep("checklist");
    } catch (error) {
      console.error('Error starting parade:', error);
      toast.error("שגיאה בהתחלת המסדר");
    } finally {
      setLoading(false);
    }
  };

  const fetchOutpostData = async (outpost: string, paradeDay?: number) => {
    // First, get all checklist items for the outpost
    const [itemsRes, photosRes, assignmentsRes] = await Promise.all([
      supabase
        .from('cleaning_checklist_items')
        .select('id, item_name, item_order')
        .eq('outpost', outpost)
        .eq('is_active', true)
        .order('item_order'),
      supabase
        .from('cleaning_reference_photos')
        .select('id, checklist_item_id, outpost, description, image_url')
        .eq('outpost', outpost)
        .order('display_order'),
      // Get assignments for this soldier on this parade day
      paradeDay !== undefined ? (supabase as any)
        .from('cleaning_item_assignments')
        .select('item_id, shift_type, manual_soldier_id')
        .eq('outpost', outpost)
        .eq('parade_day', paradeDay) : Promise.resolve({ data: null })
    ]);

    let filteredItems = itemsRes.data || [];
    
    // If we have assignments, filter to show only assigned items
    if (assignmentsRes.data && assignmentsRes.data.length > 0 && soldierId) {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      
      // Get current work schedule
      const { data: schedule } = await supabase
        .from("work_schedule")
        .select("outpost, day_of_week, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("week_start_date", weekStartStr)
        .eq("outpost", outpost);

      const myItemIds = new Set<string>();
      
      for (const assignment of assignmentsRes.data) {
        let isMyTask = false;
        
        // Check if manual assignment
        if (assignment.shift_type?.startsWith("manual-")) {
          const manualSoldierId = assignment.shift_type.replace("manual-", "");
          if (manualSoldierId === soldierId) isMyTask = true;
        } else if (assignment.shift_type) {
          // Schedule-based: parse "day-shift" format
          const [sourceDayStr, sourceShift] = assignment.shift_type.split("-");
          const sourceDay = parseInt(sourceDayStr);
          
          if (!isNaN(sourceDay) && sourceShift) {
            const scheduleEntry = schedule?.find(s => s.day_of_week === sourceDay);
            if (scheduleEntry) {
              let shiftSoldierId: string | null = null;
              if (sourceShift === "morning") shiftSoldierId = scheduleEntry.morning_soldier_id;
              else if (sourceShift === "afternoon") shiftSoldierId = scheduleEntry.afternoon_soldier_id;
              else if (sourceShift === "evening") shiftSoldierId = scheduleEntry.evening_soldier_id;
              
              if (shiftSoldierId === soldierId) isMyTask = true;
            }
          }
        }
        
        // Also check additional soldier
        if (assignment.manual_soldier_id === soldierId) isMyTask = true;
        
        if (isMyTask) {
          myItemIds.add(assignment.item_id);
        }
      }
      
      // Filter to only my assigned items (or show all if no specific assignments)
      if (myItemIds.size > 0) {
        filteredItems = filteredItems.filter(item => myItemIds.has(item.id));
      }
    }

    setChecklistItems(filteredItems);
    setReferencePhotos(photosRes.data || []);
  };

  const handleItemClick = (itemId: string) => {
    if (isCompleted) return;
    currentUploadItemRef.current = itemId;
    fileInputRef.current?.click();
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const itemId = currentUploadItemRef.current;
    
    if (!file || !itemId || !submissionId || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("אנא צלם תמונה");
      return;
    }

    setUploadingItemId(itemId);
    try {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/heic': 'jpg',
      };
      const fileExt = mimeToExt[file.type] || 'jpg';
      const fileName = `${user.id}/${currentDate}/${itemId}_${Date.now()}.${fileExt}`;
      
      await supabase.storage.from('cleaning-parades').upload(fileName, file, { contentType: file.type || 'image/jpeg' });

      const { data: signedUrlData } = await supabase.storage
        .from('cleaning-parades')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      const photoUrl = signedUrlData?.signedUrl || '';

      // Insert new photo (not upsert - allow multiple)
      const { data: inserted } = await supabase.from('cleaning_checklist_completions').insert({
        submission_id: submissionId,
        checklist_item_id: itemId,
        photo_url: photoUrl,
      }).select('id').single();

      setCompletions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(itemId) || [];
        existing.push({ id: inserted?.id || '', url: photoUrl });
        newMap.set(itemId, existing);
        return newMap;
      });
      toast.success("התמונה נשמרה");
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setUploadingItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!submissionId) return;
    
    const missingItems = checklistItems.filter(item => {
      const photos = completions.get(item.id);
      return !photos || photos.length === 0;
    });
    if (missingItems.length > 0) {
      toast.error(`יש להשלים ${missingItems.length} פריטים נוספים`);
      return;
    }

    setIsSubmitting(true);
    try {
      await supabase
        .from('cleaning_parade_submissions')
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq('id', submissionId);

      setIsCompleted(true);
      setCurrentStep("completed");
      toast.success("המסדר הושלם בהצלחה!");
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error("שגיאה בשמירת המסדר");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setCurrentStep("weekly-view");
    setCompletions(new Map());
    setChecklistItems([]);
    setReferencePhotos([]);
    setSubmissionId(null);
    setIsCompleted(false);
    setSelectedParadeDay(null);
    setSelectedOutpost("");
  };

  const openCompareDialog = (item: ChecklistItem) => {
    const userPhotos = completions.get(item.id);
    if (userPhotos && userPhotos.length > 0) {
      setCompareItem({ item, userPhotos });
      setCurrentRefPhotoIndex(0);
      setCompareDialogOpen(true);
    }
  };

  const handleDeletePhoto = async (itemId: string, photoId: string) => {
    if (!submissionId) return;
    
    try {
      // Delete specific photo from database
      await supabase
        .from('cleaning_checklist_completions')
        .delete()
        .eq('id', photoId);

      // Update local state
      setCompletions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(itemId) || [];
        const filtered = existing.filter(p => p.id !== photoId);
        if (filtered.length === 0) {
          newMap.delete(itemId);
        } else {
          newMap.set(itemId, filtered);
        }
        return newMap;
      });
      
      toast.success("התמונה נמחקה");
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error("שגיאה במחיקת התמונה");
    }
  };

  const getItemReferencePhotos = (itemId: string) => {
    // Get photos linked to this specific item, or general outpost photos
    return referencePhotos.filter(p => 
      p.checklist_item_id === itemId || 
      (p.checklist_item_id === null && p.outpost === selectedOutpost)
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const todayDayOfWeek = new Date().getDay();

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          <PageHeader
            icon={Sparkles}
            title="מסדר ניקיון"
            subtitle={
              currentStep === "weekly-view" ? "המסדרים שלי השבוע" : 
              currentStep === "checklist" ? `${selectedOutpost} - יום ${selectedParadeDay !== null ? DAY_LABELS[selectedParadeDay] : ''}` : 
              "המסדר הושלם"
            }
            badge={format(currentWeekStart, 'd/M', { locale: he }) + " - " + format(addDays(currentWeekStart, 6), 'd/M', { locale: he })}
          />

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {/* Not linked to soldier */}
          {!soldierId && (
            <Card className="border-amber-200 shadow-lg bg-amber-50">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <p className="text-amber-800 font-medium">המשתמש לא מקושר לחייל</p>
                <p className="text-sm text-amber-600 mt-1">פנה למפקד לעדכון המספר האישי בפרופיל</p>
              </CardContent>
            </Card>
          )}

          {/* Step: Weekly View */}
          {currentStep === "weekly-view" && soldierId && (
            <div className="space-y-4">
              {/* Weekly Schedule Card */}
              <Card className="border-purple-200/60 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    לוח מסדרים שבועי
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {weeklyAssignments.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {weeklyAssignments.map((assignment) => {
                        const isToday = assignment.paradeDay === todayDayOfWeek;
                        const isPast = assignment.paradeDay < todayDayOfWeek;
                        const canFill = isToday || isPast;

                        return (
                          <button
                            key={`${assignment.paradeDay}-${assignment.outpost}`}
                            onClick={() => {
                              if (canFill && !assignment.isCompleted) {
                                setSelectedParadeDay(assignment.paradeDay);
                                setSelectedOutpost(assignment.outpost);
                                startParade(assignment.paradeDay, assignment.outpost);
                              }
                            }}
                            disabled={!canFill || assignment.isCompleted}
                            className={cn(
                              "relative p-4 rounded-2xl border-2 transition-all duration-300 text-center",
                              assignment.isCompleted 
                                ? "bg-emerald-50 border-emerald-300"
                                : isToday
                                  ? "bg-purple-50 border-purple-400 shadow-lg ring-2 ring-purple-200"
                                  : isPast
                                    ? "bg-red-50 border-red-200"
                                    : "bg-white border-slate-200 opacity-70"
                            )}
                          >
                            {/* Status Icon */}
                            <div className="absolute -top-2 -left-2">
                              {assignment.isCompleted ? (
                                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              ) : isToday ? (
                                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-lg animate-pulse">
                                  <Sparkles className="w-4 h-4 text-white" />
                                </div>
                              ) : isPast ? (
                                <div className="w-7 h-7 rounded-full bg-red-400 flex items-center justify-center shadow-lg">
                                  <AlertCircle className="w-4 h-4 text-white" />
                                </div>
                              ) : null}
                            </div>

                            <p className={cn(
                              "text-lg font-bold",
                              assignment.isCompleted ? "text-emerald-700" :
                              isToday ? "text-purple-700" :
                              isPast ? "text-red-600" : "text-slate-700"
                            )}>
                              יום {DAY_LABELS[assignment.paradeDay]}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {format(assignment.date, 'd/M', { locale: he })}
                            </p>

                            <div className={cn(
                              "mt-3 px-2 py-1.5 rounded-lg",
                              assignment.isCompleted ? "bg-emerald-100" : "bg-slate-100"
                            )}>
                              <div className="flex items-center justify-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span className="text-xs font-medium text-slate-600 truncate">
                                  {assignment.outpost}
                                </span>
                              </div>
                            </div>

                            {isToday && !assignment.isCompleted && (
                              <Badge className="mt-2 bg-purple-500 text-white text-[10px]">
                                היום!
                              </Badge>
                            )}
                            
                            {!canFill && !assignment.isCompleted && (
                              <p className="text-[10px] text-slate-400 mt-2">
                                ניתן למלא ב{DAY_LABELS[assignment.paradeDay]}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">אין מסדרים משובצים השבוע</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Empty state already handled in the card above */}
            </div>
          )}

          {/* Step: Checklist */}
          {currentStep === "checklist" && (
            <div className="space-y-4">
              <Button variant="ghost" onClick={goBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                חזור
              </Button>

              {/* Progress */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-600">התקדמות</span>
                    <span className="text-sm font-bold text-primary">
                      {completions.size}/{checklistItems.length}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${(completions.size / checklistItems.length) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Checklist with side-by-side comparison */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="w-5 h-5 text-purple-500" />
                    צ'קליסט - צלם והשווה
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {checklistItems.map((item, index) => {
                    const userPhotos = completions.get(item.id) || [];
                    const hasPhotos = userPhotos.length > 0;
                    const isUploading = uploadingItemId === item.id;
                    const itemRefPhotos = getItemReferencePhotos(item.id);

                    return (
                      <div 
                        key={item.id}
                        className={cn(
                          "rounded-2xl border-2 transition-all overflow-hidden",
                          hasPhotos 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-white border-slate-200"
                        )}
                      >
                        {/* Item Header */}
                        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                          {isUploading ? (
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : hasPhotos ? (
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-purple-500" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className={cn(
                              "font-bold",
                              hasPhotos ? "text-emerald-700" : "text-slate-800"
                            )}>
                              {index + 1}. {item.item_name}
                            </p>
                          </div>

                          {hasPhotos && (
                            <Badge className="bg-emerald-500 text-white">
                              {userPhotos.length} תמונות
                            </Badge>
                          )}
                        </div>

                        {/* Two columns: Reference (right) | User photos (left) */}
                        <div className="grid grid-cols-2 gap-3 p-4">
                          {/* Right side - Reference photos */}
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-purple-600 text-center">תמונות דוגמה</p>
                            {itemRefPhotos.length > 0 ? (
                              <div className="space-y-2">
                                {itemRefPhotos.map((refPhoto, refIndex) => (
                                  <img 
                                    key={refPhoto.id}
                                    src={refPhoto.image_url}
                                    alt={`דוגמה ${refIndex + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg border-2 border-purple-200"
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="w-full aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                                <div className="text-center">
                                  <Image className="w-8 h-8 text-slate-300 mx-auto" />
                                  <p className="text-xs text-slate-400 mt-1">אין דוגמה</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Left side - User photos */}
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-emerald-600 text-center">התמונות שלך</p>
                            
                            {/* User uploaded photos */}
                            {userPhotos.map((photo, photoIndex) => (
                              <div key={photo.id} className="relative">
                                <img 
                                  src={photo.url}
                                  alt={`תמונה ${photoIndex + 1}`}
                                  className="w-full aspect-square object-cover rounded-lg border-2 border-emerald-200"
                                />
                                <button
                                  onClick={() => handleDeletePhoto(item.id, photo.id)}
                                  className="absolute top-1 left-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                                >
                                  <X className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            ))}
                            
                            {/* Add photo button */}
                            <button
                              onClick={() => handleItemClick(item.id)}
                              disabled={isUploading}
                              className={cn(
                                "w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
                                hasPhotos 
                                  ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                                  : "border-purple-300 bg-purple-50 hover:bg-purple-100"
                              )}
                            >
                              {isUploading ? (
                                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Camera className={cn(
                                    "w-8 h-8",
                                    hasPhotos ? "text-emerald-500" : "text-purple-500"
                                  )} />
                                  <span className={cn(
                                    "text-xs font-medium",
                                    hasPhotos ? "text-emerald-600" : "text-purple-600"
                                  )}>
                                    {hasPhotos ? "הוסף תמונה" : "צלם תמונה"}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Submit Button */}
              {checklistItems.every(item => {
                const photos = completions.get(item.id);
                return photos && photos.length > 0;
              }) && !isCompleted && (
                <Button 
                  className="w-full h-14 text-lg bg-gradient-to-r from-emerald-500 to-teal-500"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "שומר..." : "סיים ושלח מסדר ✓"}
                </Button>
              )}
            </div>
          )}

          {/* Step: Completed */}
          {currentStep === "completed" && (
            <div className="space-y-4">
              <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-800 mb-2">מסדר הושלם!</h2>
                  <p className="text-emerald-600">
                    {selectedOutpost} • יום {selectedParadeDay !== null ? DAY_LABELS[selectedParadeDay] : ''}
                  </p>
                </CardContent>
              </Card>

              <Button 
                variant="outline"
                className="w-full"
                onClick={goBack}
              >
                חזור ללוח השבועי
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen comparison dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 overflow-hidden">
          {compareItem && (
            <div className="h-full flex flex-col bg-slate-900">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
                <h3 className="text-white font-bold text-lg">{compareItem.item.item_name}</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCompareDialogOpen(false)}
                  className="text-white hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Side by side */}
              <div className="flex-1 grid grid-cols-2 gap-1 p-2">
                {/* Reference */}
                <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-purple-500 text-white">דוגמה</Badge>
                  </div>
                  {(() => {
                    const itemRefPhotos = getItemReferencePhotos(compareItem.item.id);
                    if (itemRefPhotos.length > 0) {
                      return (
                        <>
                          <img 
                            src={itemRefPhotos[currentRefPhotoIndex]?.image_url}
                            alt="Reference"
                            className="w-full h-full object-contain"
                          />
                          {itemRefPhotos.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="w-8 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentRefPhotoIndex(prev => Math.max(0, prev - 1));
                                }}
                                disabled={currentRefPhotoIndex === 0}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                                {currentRefPhotoIndex + 1}/{itemRefPhotos.length}
                              </span>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="w-8 h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentRefPhotoIndex(prev => Math.min(itemRefPhotos.length - 1, prev + 1));
                                }}
                                disabled={currentRefPhotoIndex === itemRefPhotos.length - 1}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    }
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-slate-400">אין תמונת דוגמה</p>
                      </div>
                    );
                  })()}
                </div>

                {/* User photos */}
                <div className="relative bg-slate-800 rounded-lg overflow-hidden">
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-emerald-500 text-white">שלך ({compareItem.userPhotos.length})</Badge>
                  </div>
                  <img 
                    src={compareItem.userPhotos[0]?.url || ''}
                    alt="Your photo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}