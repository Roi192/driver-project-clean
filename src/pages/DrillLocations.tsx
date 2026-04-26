import { useState, useEffect } from "react";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeckCard } from "@/components/shared/DeckCard";
import { OUTPOSTS, DRILLS } from "@/lib/constants";
import { MapPin, ArrowRight, Target, Car, Flame, Navigation, Info, Plus, Pencil, Trash2, Loader2, Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StorageImage } from "@/components/shared/StorageImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type View = "outposts" | "drills" | "detail";

type DrillType = "descent" | "rollover" | "fire";

interface DrillLocation {
  id: string;
  outpost: string;
  drill_type: DrillType;
  name: string;
  description: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  instructions: string | null;
}

const drillIcons: Record<string, any> = {
  descent: Car,
  rollover: Target,
  fire: Flame,
};

const drillTypeLabels: Record<string, string> = {
  descent: "תרגולת ירידה לשול",
  rollover: "תרגולת התהפכות",
  fire: "תרגולת שריפה",
};

const defaultDrillInstructions: Record<string, string> = {
  descent: `שלבי ביצוע התרגולת:
1. איתור שול רחב ובטוח לעצירה
2. הפעלת אורות חירום (אורות צהובים)
3. בדיקת מראות והאטה הדרגתית
4. נסיעה על השול עד לעצירה מלאה
5. הפעלת הנד ברייק והוצאת משולש אזהרה
6. יציאה זהירה מהרכב ובדיקת הסביבה`,
  rollover: `שלבי ביצוע התרגולת:
1. במקרה של התהפכות - לכבות את המנוע מיידית
2. לנתק מתח מהמצבר אם אפשר
3. להישאר חגור עד לעצירה מלאה
4. לבדוק פציעות אצל הנוכחים ברכב
5. לפנות את הרכב בזהירות דרך החלונות או הדלתות
6. להתרחק מהרכב למרחק בטוח ולהזעיק עזרה`,
  fire: `שלבי ביצוע התרגולת:
1. עצירת הרכב ידנית וכיבוי המנוע
2. הוצאת כל הנוסעים מהרכב מיידית
3. התרחקות למרחק בטוח (מינימום 50 מטר)
4. שימוש במטף רק אם השריפה קטנה ומאותרת
5. הזעקת כיבוי אש וכוחות הצלה
6. אין לפתוח את מכסה המנוע אם יש עשן`,
};

const getAddFields = (): FieldConfig[] => [
  { name: "name", label: "שם הנקודה", type: "text", required: true, placeholder: "הזן שם..." },
  { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור הנקודה..." },
  { name: "image_url", label: "תמונה", type: "image" },
  { name: "map_picker", label: "דקירה במפה", type: "map_picker", latField: "latitude", lngField: "longitude" },
  { name: "latitude", label: "קו רוחב", type: "number", placeholder: "31.8456" },
  { name: "longitude", label: "קו אורך", type: "number", placeholder: "35.2345" },
  { name: "instructions", label: "הוראות ביצוע", type: "textarea", placeholder: "הוראות ביצוע התרגולת..." },
];

export default function DrillLocations() {
  const { canEditDrillLocations: canEdit, canDelete } = useAuth();
  const [view, setView] = useState<View>("outposts");
  const [selectedOutpost, setSelectedOutpost] = useState<string | null>(null);
  const [selectedDrillType, setSelectedDrillType] = useState<DrillType | null>(null);
  const [drillLocations, setDrillLocations] = useState<DrillLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DrillLocation | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [editInstructions, setEditInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDrillLocations = async (outpost: string, drillType: DrillType) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("drill_locations")
      .select("*")
      .eq("outpost", outpost)
      .eq("drill_type", drillType);

    if (error) {
      toast.error("שגיאה בטעינת נקודות התרגולות");
      console.error(error);
    } else {
      setDrillLocations((data as DrillLocation[]) || []);
    }
    setLoading(false);
  };

  const handleAdd = async (data: Record<string, any>) => {
    if (!selectedOutpost || !selectedDrillType) return;
    setIsSubmitting(true);
    
    const insertData = {
      name: data.name as string,
      outpost: selectedOutpost,
      drill_type: selectedDrillType,
      description: data.description || null,
      image_url: data.image_url || null,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      instructions: data.instructions || null,
    };

    const { error } = await supabase.from("drill_locations").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת נקודת תרגולת");
      console.error(error);
    } else {
      toast.success("נקודת התרגולת נוספה בהצלחה");
      setAddDialogOpen(false);
      fetchDrillLocations(selectedOutpost, selectedDrillType);
    }
    setIsSubmitting(false);
  };

  const handleEdit = async (data: Record<string, any>) => {
    if (!selectedLocation) return;
    setIsSubmitting(true);
    
    const updateData = {
      name: data.name as string,
      description: data.description || null,
      image_url: data.image_url || null,
      latitude: data.latitude ? parseFloat(data.latitude) : null,
      longitude: data.longitude ? parseFloat(data.longitude) : null,
      instructions: data.instructions || null,
    };

    const { error } = await supabase
      .from("drill_locations")
      .update(updateData)
      .eq("id", selectedLocation.id);

    if (error) {
      toast.error("שגיאה בעדכון נקודת התרגולת");
      console.error(error);
    } else {
      toast.success("נקודת התרגולת עודכנה בהצלחה");
      setEditDialogOpen(false);
      if (selectedOutpost && selectedDrillType) {
        fetchDrillLocations(selectedOutpost, selectedDrillType);
      }
    }
    setIsSubmitting(false);
  };

  const handleSaveInstructions = async () => {
    if (!selectedLocation) return;
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("drill_locations")
      .update({ instructions: editInstructions })
      .eq("id", selectedLocation.id);

    if (error) {
      toast.error("שגיאה בעדכון ההוראות");
      console.error(error);
    } else {
      toast.success("ההוראות עודכנו בהצלחה");
      setInstructionsDialogOpen(false);
      if (selectedOutpost && selectedDrillType) {
        fetchDrillLocations(selectedOutpost, selectedDrillType);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;
    setIsSubmitting(true);
    
    // Delete image from storage first
    if (selectedLocation.image_url) {
      await deleteStorageFiles([selectedLocation.image_url], "content-images");
    }

    const { error } = await supabase
      .from("drill_locations")
      .delete()
      .eq("id", selectedLocation.id);

    if (error) {
      toast.error("שגיאה במחיקת נקודת התרגולת");
      console.error(error);
    } else {
      toast.success("נקודת התרגולת נמחקה בהצלחה");
      setDeleteDialogOpen(false);
      setView("drills");
      setSelectedLocation(null);
      if (selectedOutpost && selectedDrillType) {
        fetchDrillLocations(selectedOutpost, selectedDrillType);
      }
    }
    setIsSubmitting(false);
  };

  const handleOutpostSelect = (outpost: string) => {
    setSelectedOutpost(outpost);
    setView("drills");
  };

  const handleDrillSelect = async (drillType: DrillType) => {
    setSelectedDrillType(drillType);
    await fetchDrillLocations(selectedOutpost!, drillType);
    setView("detail");
  };

  const getDrillTypeFromLabel = (label: string): DrillType => {
    if (label === "תרגולת ירידה לשול") return "descent";
    if (label === "תרגולת התהפכות") return "rollover";
    return "fire";
  };

  const goBack = () => {
    if (view === "detail") {
      setView("drills");
      setSelectedLocation(null);
      setDrillLocations([]);
    } else if (view === "drills") {
      setView("outposts");
      setSelectedOutpost(null);
      setSelectedDrillType(null);
    }
  };

  useEffect(() => {
    if (selectedOutpost && selectedDrillType && view === "detail") {
      fetchDrillLocations(selectedOutpost, selectedDrillType);
    }
  }, [selectedDrillType]);

  const getInstructions = () => {
    // Check if any location has custom instructions
    const locationWithInstructions = drillLocations.find(loc => loc.instructions);
    if (locationWithInstructions?.instructions) {
      return locationWithInstructions.instructions;
    }
    // Fall back to default instructions
    return defaultDrillInstructions[selectedDrillType || ""] || "";
  };

  const renderHeader = () => {
    if (view === "outposts") {
      return (
        <PageHeader
          icon={Target}
          title="נקודות תרגולות"
          subtitle="בחר מוצב לצפייה בנקודות התרגולות"
          badge="נקודות תרגולות"
        />
      );
    }

    return (
      <div className="mb-6 animate-slide-up">
        <Button variant="ghost" onClick={goBack} className="mb-4 hover:bg-primary/10 rounded-xl gap-2 text-foreground">
          <ArrowRight className="w-5 h-5" />
          חזרה
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30">
              <MapPin className="w-4 h-4 text-primary" />
              <h1 className="text-xl font-black text-foreground">
                {view === "drills" ? selectedOutpost : drillTypeLabels[selectedDrillType || ""]}
              </h1>
            </div>
            {view === "drills" && (
              <p className="text-muted-foreground text-sm">בחר סוג תרגולת</p>
            )}
            {view === "detail" && selectedOutpost && (
              <p className="text-sm text-primary font-medium flex items-center gap-1">
                <Target className="w-3 h-3" />
                {selectedOutpost}
              </p>
            )}
          </div>
          {canEdit && view === "detail" && (
            <Button 
              size="sm" 
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === "outposts") {
      return (
        <div className="grid gap-4">
          {OUTPOSTS.map((outpost, index) => (
            <DeckCard
              key={outpost}
              icon={MapPin}
              title={outpost}
              description="לחץ לצפייה בנקודות התרגולות"
              onClick={() => handleOutpostSelect(outpost)}
              className={`animate-slide-up stagger-${(index % 5) + 1}`}
            />
          ))}
        </div>
      );
    }

    if (view === "drills") {
      return (
        <div className="grid gap-4">
          {DRILLS.map((drill, index) => {
            const drillType = getDrillTypeFromLabel(drill);
            const DrillIcon = drillIcons[drillType] || Target;
            return (
              <DeckCard
                key={drill}
                icon={DrillIcon}
                title={drill}
                description="לחץ לצפייה בפרטי הנקודה והוראות ביצוע"
                onClick={() => handleDrillSelect(drillType)}
                className={`animate-slide-up stagger-${index + 1}`}
              />
            );
          })}
        </div>
      );
    }

    // Detail view
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    const instructions = getInstructions();

    if (drillLocations.length === 0) {
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="text-center py-12 glass-card">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg">אין נקודות תרגולת להצגה</p>
            {canEdit && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף" להוספת נקודת תרגולת חדשה
              </p>
            )}
          </div>

          {instructions && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Info className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-bold text-lg">הוראות ביצוע התרגולת</h3>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-xl text-sm">
                {instructions}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {drillLocations.map((location) => (
          <div key={location.id} className="glass-card overflow-hidden animate-fade-in relative">
            {(canEdit || canDelete) && (
              <div className="absolute top-3 left-3 z-10 flex gap-2">
                {canEdit && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-9 h-9 backdrop-blur-sm bg-secondary/80"
                    onClick={() => {
                      setSelectedLocation(location);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="w-9 h-9"
                    onClick={() => {
                      setSelectedLocation(location);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            {location.image_url && (
              <StorageImage
                src={location.image_url}
                alt={location.name}
                className="w-full h-52 object-cover"
              />
            )}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedOutpost}
                </span>
              </div>
              <h2 className="text-xl font-bold mb-3 text-slate-800">{location.name}</h2>
              {location.description && (
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {location.description}
                </p>
              )}
              {location.latitude && location.longitude && (
                <Button
                  variant="default"
                  className="w-full gap-2"
                  onClick={() =>
                    window.open(
                      `https://waze.com/ul?ll=${location.latitude},${location.longitude}&navigate=yes`,
                      "_blank"
                    )
                  }
                >
                  <Navigation className="w-5 h-5" />
                  פתח בוויז
                </Button>
              )}
            </div>
          </div>
        ))}

        {instructions && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Info className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">הוראות ביצוע התרגולת</h3>
              </div>
              {canEdit && drillLocations.length > 0 && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    setSelectedLocation(drillLocations[0]);
                    setEditInstructions(instructions);
                    setInstructionsDialogOpen(true);
                  }}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
            <pre className="whitespace-pre-wrap text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-xl text-sm">
              {instructions}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const addFields = getAddFields();

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-lg mx-auto">
        {renderHeader()}
        {renderContent()}
      </div>

      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="הוספת נקודת תרגולת"
        fields={addFields}
        onSubmit={handleAdd}
        isLoading={isSubmitting}
      />

      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="עריכת נקודת תרגולת"
        fields={addFields}
        initialData={selectedLocation || undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת נקודת תרגולת"
        description={`האם אתה בטוח שברצונך למחוק את נקודת התרגולת "${selectedLocation?.name}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />

      {/* Instructions Edit Dialog */}
      <Dialog open={instructionsDialogOpen} onOpenChange={setInstructionsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>עריכת הוראות ביצוע</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>הוראות ביצוע התרגולת</Label>
              <Textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="הזן הוראות ביצוע..."
                className="min-h-[200px] resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setInstructionsDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveInstructions} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}