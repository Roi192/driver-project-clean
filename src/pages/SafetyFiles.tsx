import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeckCard } from "@/components/shared/DeckCard";
import { OUTPOSTS } from "@/lib/constants";
import { FolderOpen, ArrowRight, MapPin, AlertTriangle, Shield, Navigation, Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { StorageImage } from "@/components/shared/StorageImage";
import { useNavigate } from "react-router-dom";

type View = "outposts" | "categories" | "points" | "pointDetail";
type SafetyCategory = "vardim" | "vulnerability" | "parsa";

interface SafetyFile {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  category: SafetyCategory;
  outpost: string;
  latitude: number | null;
  longitude: number | null;
}

const categories = [
  { id: "vardim" as SafetyCategory, label: "נקודות ורדים", icon: MapPin, color: "text-primary" },
  { id: "vulnerability" as SafetyCategory, label: "נקודות תורפה", icon: AlertTriangle, color: "text-warning" },
  { id: "parsa" as SafetyCategory, label: "נקודות פרסה", icon: Shield, color: "text-accent" },
];

const getFields = (): FieldConfig[] => [
  { name: "title", label: "שם הנקודה", type: "text", required: true, placeholder: "הזן שם..." },
  { name: "content", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט של הנקודה..." },
  { name: "image_url", label: "תמונה", type: "image" },
  { name: "map_picker", label: "דקירה במפה", type: "map_picker", latField: "latitude", lngField: "longitude" },
  { name: "get_location", label: "מיקום נוכחי", type: "location", latField: "latitude", lngField: "longitude" },
  { name: "latitude", label: "קו רוחב", type: "text", placeholder: "31.9" },
  { name: "longitude", label: "קו אורך", type: "text", placeholder: "35.2" },
];

export default function SafetyFiles() {
  const { canEditSafetyFiles: canEdit, canDelete } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("outposts");
  const [selectedOutpost, setSelectedOutpost] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SafetyCategory | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<SafetyFile | null>(null);
  const [safetyFiles, setSafetyFiles] = useState<SafetyFile[]>([]);
  const [loading, setLoading] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSafetyFiles = async (outpost: string, category: SafetyCategory) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("safety_files")
      .select("*")
      .eq("outpost", outpost)
      .eq("category", category);

    if (error) {
      toast.error("שגיאה בטעינת הנתונים");
      console.error(error);
    } else {
      setSafetyFiles(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async (data: Record<string, any>) => {
    if (!selectedOutpost || !selectedCategory) return;
    setIsSubmitting(true);

    const latitude = data.latitude ? parseFloat(data.latitude) : null;
    const longitude = data.longitude ? parseFloat(data.longitude) : null;

    const insertData = {
      title: data.title as string,
      content: data.content || null,
      image_url: data.image_url || null,
      outpost: selectedOutpost,
      category: selectedCategory,
      latitude,
      longitude,
    };

    const { error } = await supabase.from("safety_files").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת הנקודה");
      console.error(error);
    } else {
      toast.success("הנקודה נוספה בהצלחה");
      setAddDialogOpen(false);
      fetchSafetyFiles(selectedOutpost, selectedCategory);
    }
    setIsSubmitting(false);
  };

  const handleEdit = async (data: Record<string, any>) => {
    if (!selectedPoint) return;
    setIsSubmitting(true);

    const latitude = data.latitude ? parseFloat(data.latitude) : null;
    const longitude = data.longitude ? parseFloat(data.longitude) : null;

    const updateData = {
      title: data.title as string,
      content: data.content || null,
      image_url: data.image_url || null,
      latitude,
      longitude,
    };

    const { error } = await supabase
      .from("safety_files")
      .update(updateData)
      .eq("id", selectedPoint.id);

    if (error) {
      toast.error("שגיאה בעדכון הנקודה");
      console.error(error);
    } else {
      toast.success("הנקודה עודכנה בהצלחה");
      setEditDialogOpen(false);
      if (selectedOutpost && selectedCategory) {
        fetchSafetyFiles(selectedOutpost, selectedCategory);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedPoint) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("safety_files")
      .delete()
      .eq("id", selectedPoint.id);

    if (error) {
      toast.error("שגיאה במחיקת הנקודה");
      console.error(error);
    } else {
      toast.success("הנקודה נמחקה בהצלחה");
      setDeleteDialogOpen(false);
      setView("points");
      setSelectedPoint(null);
      if (selectedOutpost && selectedCategory) {
        fetchSafetyFiles(selectedOutpost, selectedCategory);
      }
    }
    setIsSubmitting(false);
  };

  const handleOutpostSelect = (outpost: string) => {
    setSelectedOutpost(outpost);
    setView("categories");
  };

  const handleCategorySelect = async (categoryId: SafetyCategory) => {
    setSelectedCategory(categoryId);
    if (selectedOutpost) {
      await fetchSafetyFiles(selectedOutpost, categoryId);
    }
    setView("points");
  };

  const handlePointSelect = (point: SafetyFile) => {
    setSelectedPoint(point);
    setView("pointDetail");
  };

  const goBack = () => {
    if (view === "pointDetail") {
      setView("points");
      setSelectedPoint(null);
    } else if (view === "points") {
      setView("categories");
      setSelectedCategory(null);
      setSafetyFiles([]);
    } else if (view === "categories") {
      setView("outposts");
      setSelectedOutpost(null);
    }
  };

  const renderHeader = () => {
    if (view === "outposts") {
      return (
        <PageHeader
          icon={FolderOpen}
          title="תיקי בטיחות מוצבים"
          subtitle="בחר מוצב לצפייה בתיק הבטיחות"
          badge="תיקי בטיחות"
        />
      );
    }

    const categoryLabel = categories.find((c) => c.id === selectedCategory)?.label;

    return (
      <div className="mb-6 animate-slide-up">
        <Button variant="ghost" onClick={goBack} className="mb-4 hover:bg-primary/10 rounded-xl gap-2 text-foreground">
          <ArrowRight className="w-5 h-5" />
          חזרה
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30">
              <Navigation className="w-4 h-4 text-primary" />
              <h1 className="text-xl font-black text-foreground">
                {view === "categories"
                  ? selectedOutpost
                  : view === "points"
                  ? categoryLabel
                  : selectedPoint?.title}
              </h1>
            </div>
            {view === "categories" && <p className="text-muted-foreground text-sm">בחר קטגוריה</p>}
            {view === "points" && (
              <p className="text-sm text-primary font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {selectedOutpost}
              </p>
            )}
            {view === "pointDetail" && (
              <p className="text-sm text-primary font-medium">
                {selectedOutpost} • {categoryLabel}
              </p>
            )}
          </div>
          {canEdit && view === "points" && (
            <Button 
              size="sm" 
              onClick={() => setAddDialogOpen(true)}
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          )}
          {(canEdit || canDelete) && view === "pointDetail" && (
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setEditDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
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
              icon={FolderOpen}
              title={outpost}
              description="לחץ לצפייה בתיק הבטיחות"
              onClick={() => handleOutpostSelect(outpost)}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      );
    }

    if (view === "categories") {
      return (
        <div className="grid gap-4">
          {categories.map((category, index) => (
            <DeckCard
              key={category.id}
              icon={category.icon}
              title={category.label}
              description="לחץ לצפייה בנקודות"
              onClick={() => handleCategorySelect(category.id)}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      );
    }

    if (view === "points") {
      if (loading) {
        return (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        );
      }

      if (safetyFiles.length === 0) {
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">אין נקודות להצגה</p>
            {canEdit && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף" להוספת נקודה חדשה
              </p>
            )}
          </div>
        );
      }

      return (
        <div className="grid gap-4">
          {safetyFiles.map((point) => (
            <div
              key={point.id}
              className="glass-card p-4 cursor-pointer hover:bg-primary/5 transition-colors"
              onClick={() => handlePointSelect(point)}
            >
              <h3 className="font-bold mb-1 text-slate-800">{point.title}</h3>
              {point.content && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {point.content}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Point Detail View
    if (view === "pointDetail" && selectedPoint) {
      const hasLocation = selectedPoint.latitude && selectedPoint.longitude;
      
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card overflow-hidden">
            {selectedPoint.image_url && (
              <StorageImage
                src={selectedPoint.image_url}
                alt={selectedPoint.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="military-badge">
                  <MapPin className="w-4 h-4" />
                  {selectedOutpost}
                </div>
                {hasLocation && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => navigate(`/know-the-area?lat=${selectedPoint.latitude}&lng=${selectedPoint.longitude}`)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    הצג במפה
                  </Button>
                )}
              </div>
              <h2 className="text-xl font-bold mb-3 text-slate-800">{selectedPoint.title}</h2>
              {selectedPoint.content && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedPoint.content}
                </p>
              )}
              {hasLocation && (
                <div className="mt-4 p-3 bg-primary/10 rounded-xl flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="text-sm text-primary font-medium">
                    {selectedPoint.latitude?.toFixed(6)}, {selectedPoint.longitude?.toFixed(6)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const fields = getFields();

  return (
    <AppLayout>
      <div className="px-3 md:px-4 py-5 md:py-6 max-w-lg mx-auto">
        {renderHeader()}
        {renderContent()}
      </div>

      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="הוספת נקודת בטיחות"
        fields={fields}
        onSubmit={handleAdd}
        isLoading={isSubmitting}
      />

      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="עריכת נקודת בטיחות"
        fields={fields}
        initialData={selectedPoint || undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת נקודת בטיחות"
        description={`האם אתה בטוח שברצונך למחוק את הנקודה "${selectedPoint?.title}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}