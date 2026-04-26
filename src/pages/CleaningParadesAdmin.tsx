import { useState, useEffect, useRef } from "react";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { OUTPOSTS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addWeeks, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Plus, 
  Trash2, 
  Edit,
  MapPin,
  ListChecks,
  Image,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Camera,
  Bell
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChecklistWithGroups } from "@/components/admin/ChecklistWithGroups";

interface ChecklistItem {
  id: string;
  outpost: string;
  item_name: string;
  item_order: number;
  is_active: boolean;
  responsibility_area_id: string | null;
  responsible_soldier_id?: string | null;
  shift_day?: string | null;
  shift_type?: string | null;
  deadline_time?: string | null;
  default_shift_type?: string | null;
  source_schedule_day?: number | null;
  source_schedule_shift?: string | null;
}

interface ReferencePhoto {
  id: string;
  checklist_item_id: string | null;
  outpost: string;
  description: string | null;
  image_url: string;
  display_order: number;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
}

interface ManualAssignment {
  id: string;
  soldier_id: string;
  outpost: string;
  day_of_week: string;
  week_start_date: string;
}

interface WorkScheduleEntry {
  outpost: string;
  day_of_week: number;
  afternoon_soldier_id: string | null;
  morning_soldier_id: string | null;
}

const DAY_OPTIONS = [
  { value: "monday", label: "יום שני", sourceDay: 0, sourceShift: "afternoon" },
  { value: "wednesday", label: "יום רביעי", sourceDay: 2, sourceShift: "afternoon" },
  { value: "saturday_night", label: "מוצאי שבת", sourceDay: 6, sourceShift: "morning" },
];

export default function CleaningParadesAdmin() {
  const { canAccessCleaningManagement, loading: roleLoading } = useAuth();
  const navigate = useNavigate();
  
  // Data state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [referencePhotos, setReferencePhotos] = useState<ReferencePhoto[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [manualAssignments, setManualAssignments] = useState<ManualAssignment[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedOutpost, setSelectedOutpost] = useState<string>(OUTPOSTS[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [activeTab, setActiveTab] = useState("photos");
  
  // Dialog states
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [selectedItemForPhoto, setSelectedItemForPhoto] = useState<ChecklistItem | null>(null);
  const [selectedDayForAssignment, setSelectedDayForAssignment] = useState<string>("monday");
  
  // Form states
  const [itemForm, setItemForm] = useState({ item_name: "" });
  const [photoForm, setPhotoForm] = useState({ description: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roleLoading && !canAccessCleaningManagement) {
      navigate('/');
    }
  }, [canAccessCleaningManagement, roleLoading, navigate]);

  useEffect(() => {
    if (canAccessCleaningManagement) {
      fetchAllData();
    }
  }, [canAccessCleaningManagement, selectedOutpost]);

  useEffect(() => {
    if (canAccessCleaningManagement && selectedOutpost) {
      fetchAssignmentData();
    }
  }, [canAccessCleaningManagement, selectedOutpost, currentWeekStart]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchChecklistItems(), fetchReferencePhotos(), fetchSoldiers()]);
    setLoading(false);
  };

  const fetchChecklistItems = async () => {
    const { data } = await supabase
      .from("cleaning_checklist_items")
      .select("*")
      .eq("outpost", selectedOutpost)
      .order("item_order");
    setChecklistItems(data || []);
  };

  const fetchReferencePhotos = async () => {
    const { data } = await supabase
      .from("cleaning_reference_photos")
      .select("*")
      .eq("outpost", selectedOutpost)
      .order("display_order");
    setReferencePhotos(data || []);
  };

  const fetchSoldiers = async () => {
    const { data } = await supabase
      .from("soldiers")
      .select("id, full_name, personal_number, outpost")
      .eq("is_active", true)
      .order("full_name");
    setSoldiers(data || []);
  };

  const fetchAssignmentData = async () => {
    const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
    
    const { data: manualData } = await supabase
      .from('cleaning_manual_assignments')
      .select('*')
      .eq('outpost', selectedOutpost)
      .eq('week_start_date', weekStartDate);
    setManualAssignments(manualData || []);
    
    const { data: scheduleData } = await supabase
      .from('work_schedule')
      .select('outpost, day_of_week, afternoon_soldier_id, morning_soldier_id')
      .eq('outpost', selectedOutpost)
      .eq('week_start_date', weekStartDate);
    setWorkSchedule(scheduleData || []);
  };

  const getResponsibleSoldier = (dayValue: string): Soldier | null => {
    const manualAssign = manualAssignments.find(a => a.day_of_week === dayValue);
    if (manualAssign) {
      return soldiers.find(s => s.id === manualAssign.soldier_id) || null;
    }
    
    const dayConfig = DAY_OPTIONS.find(d => d.value === dayValue);
    if (!dayConfig) return null;
    
    const scheduleEntry = workSchedule.find(ws => ws.day_of_week === dayConfig.sourceDay);
    if (!scheduleEntry) return null;
    
    const soldierId = dayConfig.sourceShift === "afternoon" 
      ? scheduleEntry.afternoon_soldier_id 
      : scheduleEntry.morning_soldier_id;
    
    if (!soldierId) return null;
    return soldiers.find(s => s.id === soldierId) || null;
  };

  // Checklist item handlers
  const handleSaveItem = async () => {
    if (!itemForm.item_name.trim()) {
      toast.error("יש להזין שם פריט");
      return;
    }

    try {
      if (editingItem) {
        await supabase
          .from("cleaning_checklist_items")
          .update({ item_name: itemForm.item_name })
          .eq("id", editingItem.id);
        toast.success("הפריט עודכן בהצלחה");
      } else {
        await supabase.from("cleaning_checklist_items").insert({
          outpost: selectedOutpost,
          item_name: itemForm.item_name,
          item_order: checklistItems.length,
        });
        toast.success("הפריט נוסף בהצלחה");
      }

      setItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({ item_name: "" });
      fetchChecklistItems();
    } catch (error) {
      toast.error("שגיאה בשמירת הפריט");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("האם למחוק את הפריט?")) return;
    await supabase.from("cleaning_checklist_items").delete().eq("id", id);
    toast.success("הפריט נמחק");
    fetchChecklistItems();
  };

  // Reference photo handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhoto = async () => {
    if (!imageFile) {
      toast.error("נא לבחור תמונה");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      // Use only alphanumeric characters for folder name to avoid Supabase storage issues
      const sanitizedOutpost = selectedOutpost.replace(/[^a-zA-Z0-9]/g, '') || 'outpost';
      const fileName = `${sanitizedOutpost}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('cleaning-examples').upload(fileName, imageFile);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Use signed URL with 1 year expiry for reference photos
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('cleaning-examples')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (urlError || !signedUrlData?.signedUrl) {
        console.error('URL error:', urlError);
        throw urlError || new Error('Failed to get signed URL');
      }

      // Get count for display_order
      const itemPhotos = referencePhotos.filter(p => p.checklist_item_id === selectedItemForPhoto?.id);

      const { error: insertError } = await supabase.from('cleaning_reference_photos').insert({
        outpost: selectedOutpost,
        checklist_item_id: selectedItemForPhoto?.id || null,
        description: photoForm.description || null,
        image_url: signedUrlData.signedUrl,
        display_order: itemPhotos.length,
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      toast.success("התמונה נוספה בהצלחה");
      setPhotoDialogOpen(false);
      setPhotoForm({ description: "" });
      setImageFile(null);
      setImagePreview(null);
      setSelectedItemForPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchReferencePhotos();
    } catch (error) {
      toast.error("שגיאה בהוספת התמונה");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm("האם למחוק את התמונה?")) return;
    // Find the photo record to get the URL before deleting
    const photo = referencePhotos.find(p => p.id === id);
    if (photo?.image_url) {
      await deleteStorageFiles([photo.image_url], "cleaning-examples");
    }
    await supabase.from('cleaning_reference_photos').delete().eq('id', id);
    toast.success("התמונה נמחקה");
    fetchReferencePhotos();
  };

  // Manual assignment handlers
  const handleAssignSoldier = async () => {
    if (!selectedSoldierId) {
      toast.error("יש לבחור חייל");
      return;
    }

    try {
      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      
      await supabase
        .from('cleaning_manual_assignments')
        .delete()
        .eq('outpost', selectedOutpost)
        .eq('day_of_week', selectedDayForAssignment)
        .eq('week_start_date', weekStartDate);
      
      await supabase.from('cleaning_manual_assignments').insert({
        outpost: selectedOutpost,
        soldier_id: selectedSoldierId,
        week_start_date: weekStartDate,
        day_of_week: selectedDayForAssignment,
      });

      toast.success("החייל שובץ בהצלחה");
      setAssignmentDialogOpen(false);
      setSelectedSoldierId("");
      fetchAssignmentData();
    } catch (error) {
      toast.error("שגיאה בשיבוץ החייל");
    }
  };

  const handleClearAssignment = async (dayValue: string) => {
    const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
    await supabase
      .from('cleaning_manual_assignments')
      .delete()
      .eq('outpost', selectedOutpost)
      .eq('day_of_week', dayValue)
      .eq('week_start_date', weekStartDate);
    toast.success("השיבוץ הידני נמחק");
    fetchAssignmentData();
  };

  const getItemPhotoCount = (itemId: string) => {
    return referencePhotos.filter(p => p.checklist_item_id === itemId).length;
  };

  const getGeneralPhotos = () => {
    return referencePhotos.filter(p => !p.checklist_item_id);
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!canAccessCleaningManagement) return null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          <PageHeader
            icon={Settings}
            title="ניהול מסדרי ניקיון"
            subtitle="צ'קליסט, תמונות ושיבוצים"
            badge="ניהול"
          />

          {/* Outpost Selection */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <Label className="font-bold">מוצב:</Label>
                <Select value={selectedOutpost} onValueChange={setSelectedOutpost}>
                  <SelectTrigger className="flex-1 bg-white text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPOSTS.map(outpost => (
                      <SelectItem key={outpost} value={outpost}>{outpost}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="photos" className="gap-1 text-xs px-2">
                <Edit className="w-4 h-4" />
                עריכת צ'קליסט
              </TabsTrigger>
              <TabsTrigger value="checklist" className="gap-1 text-xs px-2">
                <Calendar className="w-4 h-4" />
                שיבוץ למסדר
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-1 text-xs px-2">
                <Users className="w-4 h-4" />
                שיבוצים ידניים
              </TabsTrigger>
            </TabsList>

            {/* Checklist Tab with Groups */}
            <TabsContent value="checklist" className="space-y-4">
              <ChecklistWithGroups
                outpost={selectedOutpost}
                checklistItems={checklistItems}
                referencePhotos={referencePhotos}
                soldiers={soldiers}
                onRefresh={fetchChecklistItems}
                onAddPhoto={(item) => {
                  setSelectedItemForPhoto(item);
                  setPhotoForm({ description: "" });
                  setImageFile(null);
                  setImagePreview(null);
                  setPhotoDialogOpen(true);
                }}
              />
            </TabsContent>

            {/* Photos Tab - Full Checklist Editor */}
            <TabsContent value="photos" className="space-y-4">
              {/* Add New Item Card */}
              <Card className="border-primary/30 border-dashed shadow-lg">
                <CardContent className="p-4">
                  <Button 
                    className="w-full gap-2" 
                    variant="outline"
                    onClick={() => {
                      setEditingItem(null);
                      setItemForm({ item_name: "" });
                      setItemDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    הוסף פריט חדש לצ'קליסט
                  </Button>
                </CardContent>
              </Card>

              {/* Checklist Items with Photos */}
              {checklistItems.length === 0 ? (
                <Card className="border-slate-200/60 shadow-lg">
                  <CardContent className="py-8 text-center text-slate-500">
                    <ListChecks className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">אין פריטים בצ'קליסט</p>
                    <p className="text-sm">לחץ על "הוסף פריט חדש" כדי להתחיל</p>
                  </CardContent>
                </Card>
              ) : (
                checklistItems.map((item, index) => {
                  const itemPhotos = referencePhotos.filter(p => p.checklist_item_id === item.id);
                  
                  return (
                    <Card key={item.id} className="border-slate-200/60 shadow-lg overflow-hidden">
                      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded shrink-0">
                              {index + 1}
                            </span>
                            <CardTitle className="text-sm truncate">{item.item_name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Camera className="w-3 h-3" />
                              {itemPhotos.length}
                            </Badge>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm({ item_name: item.item_name });
                                setItemDialogOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3 text-slate-500" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        {/* Photos Grid */}
                        {itemPhotos.length === 0 ? (
                          <div className="text-center py-4">
                            <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-slate-400 text-sm mb-2">אין תמונות עדיין</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {itemPhotos.map((photo) => (
                              <div key={photo.id} className="relative group">
                                <img 
                                  src={photo.image_url} 
                                  alt={photo.description || ''}
                                  className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                                />
                                {photo.description && (
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 rounded-b-lg">
                                    <p className="text-white text-[10px] truncate">{photo.description}</p>
                                  </div>
                                )}
                                <Button 
                                  variant="destructive" 
                                  size="icon"
                                  className="absolute top-1 left-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleDeletePhoto(photo.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add Photo Button */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full gap-1"
                          onClick={() => {
                            setSelectedItemForPhoto(item);
                            setPhotoForm({ description: "" });
                            setImageFile(null);
                            setImagePreview(null);
                            setPhotoDialogOpen(true);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          הוסף תמונה לפריט
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {/* General photos (not linked to item) */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Image className="w-4 h-4 text-primary" />
                      תמונות כלליות למוצב
                      <Badge variant="outline" className="text-xs">{getGeneralPhotos().length}</Badge>
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => {
                      setSelectedItemForPhoto(null);
                      setPhotoForm({ description: "" });
                      setImageFile(null);
                      setImagePreview(null);
                      setPhotoDialogOpen(true);
                    }}>
                      <Plus className="w-3 h-3 ml-1" />
                      תמונה
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {getGeneralPhotos().length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-2">אין תמונות כלליות</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {getGeneralPhotos().map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img 
                            src={photo.image_url} 
                            alt={photo.description || ''}
                            className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                          />
                          {photo.description && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 rounded-b-lg">
                              <p className="text-white text-[10px] truncate">{photo.description}</p>
                            </div>
                          )}
                          <Button 
                            variant="destructive" 
                            size="icon"
                            className="absolute top-1 left-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              {/* Week Navigation */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-bold">
                          {format(currentWeekStart, 'd/M', { locale: he })} - {format(addDays(currentWeekStart, 6), 'd/M', { locale: he })}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Assignments Grid */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="w-5 h-5 text-primary" />
                    שיבוצים שבועיים
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {DAY_OPTIONS.map((day) => {
                    const soldier = getResponsibleSoldier(day.value);
                    const isManual = manualAssignments.some(a => a.day_of_week === day.value);
                    
                    return (
                      <div 
                        key={day.value}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          soldier ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{day.label}</p>
                            {soldier ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-emerald-700">{soldier.full_name}</span>
                                {isManual && (
                                  <Badge variant="outline" className="text-[10px] border-purple-200 text-purple-600">
                                    ידני
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-500">לא משובץ</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDayForAssignment(day.value);
                                setSelectedSoldierId(soldier?.id || "");
                                setAssignmentDialogOpen(true);
                              }}
                            >
                              {soldier ? "שנה" : "שבץ"}
                            </Button>
                            {isManual && (
                              <Button 
                                size="sm"
                                variant="ghost"
                                onClick={() => handleClearAssignment(day.value)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "עריכת פריט" : "הוספת פריט"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>שם הפריט</Label>
              <Input
                value={itemForm.item_name}
                onChange={(e) => setItemForm({ item_name: e.target.value })}
                placeholder="לדוגמה: ניקיון רצפה"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveItem}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              הוספת תמונה {selectedItemForPhoto ? `ל"${selectedItemForPhoto.item_name}"` : "כללית"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>תמונה</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full mt-1 h-32 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Camera className="w-8 h-8" />
                    <span>בחר תמונה</span>
                  </div>
                )}
              </Button>
            </div>
            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Input
                value={photoForm.description}
                onChange={(e) => setPhotoForm({ description: e.target.value })}
                placeholder="לדוגמה: כך צריך להיראות הרצפה"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleAddPhoto} disabled={isUploading}>
              {isUploading ? "מעלה..." : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>שיבוץ חייל - {DAY_OPTIONS.find(d => d.value === selectedDayForAssignment)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>בחר חייל</Label>
              <Select value={selectedSoldierId} onValueChange={setSelectedSoldierId}>
                <SelectTrigger className="mt-1 bg-white text-slate-800">
                  <SelectValue placeholder="בחר חייל..." />
                </SelectTrigger>
                <SelectContent>
                  {soldiers.map(soldier => (
                    <SelectItem key={soldier.id} value={soldier.id}>{soldier.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleAssignSoldier}>שבץ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}