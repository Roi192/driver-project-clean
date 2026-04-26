import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Plus, Trash2, Image, Sparkles, Settings, Eye, ChevronLeft, Upload, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { OUTPOSTS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";

interface ExamplePhoto {
  id: string;
  outpost: string;
  description: string;
  image_url: string;
  display_order: number;
}

export default function CleaningParadesManagement() {
  const { isAdmin, isPlatoonCommander, canAccessCleaningManagement, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const hasAccess = canAccessCleaningManagement;
  const [examples, setExamples] = useState<ExamplePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOutpost, setSelectedOutpost] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form state
  const [newDescription, setNewDescription] = useState("");
  const [newOutpost, setNewOutpost] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !hasAccess) {
      navigate('/');
    }
  }, [hasAccess, roleLoading, navigate]);

  useEffect(() => {
    if (hasAccess) {
      fetchExamples();
    }
  }, [isAdmin]);

  const fetchExamples = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaning_parade_examples')
        .select('*')
        .order('outpost', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setExamples(data || []);
    } catch (error: any) {
      console.error('Error fetching examples:', error);
      toast.error("שגיאה בטעינת הדוגמאות");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddExample = async () => {
    if (!newDescription || !newOutpost || !newImageFile) {
      toast.error("נא למלא את כל השדות");
      return;
    }

    setIsUploading(true);
    try {
      // Upload image - use UUID for path to avoid Hebrew characters issues
      const fileExt = newImageFile.name.split('.').pop();
      const uniqueId = crypto.randomUUID();
      const fileName = `${uniqueId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cleaning-examples')
        .upload(fileName, newImageFile);

      if (uploadError) throw uploadError;

      // Get signed URL for secure access (48 hours validity for security)
      // Shorter validity reduces risk if URL is shared/leaked
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('cleaning-examples')
        .createSignedUrl(fileName, 60 * 60 * 24 * 2);

      if (signedError || !signedUrlData?.signedUrl) {
        throw signedError || new Error('Failed to generate signed URL');
      }
      const signedUrl = signedUrlData.signedUrl;

      // Get max order for this outpost
      const existingForOutpost = examples.filter(e => e.outpost === newOutpost);
      const maxOrder = existingForOutpost.length > 0 
        ? Math.max(...existingForOutpost.map(e => e.display_order)) 
        : -1;

      // Insert record
      const { error: insertError } = await supabase
        .from('cleaning_parade_examples')
        .insert({
          outpost: newOutpost,
          description: newDescription,
          image_url: signedUrl,
          display_order: maxOrder + 1,
        });

      if (insertError) throw insertError;

      toast.success("התמונה נוספה בהצלחה");
      setIsDialogOpen(false);
      resetForm();
      fetchExamples();
    } catch (error: any) {
      console.error('Error adding example:', error);
      toast.error("שגיאה בהוספת התמונה");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteExample = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cleaning_parade_examples')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("התמונה נמחקה בהצלחה");
      fetchExamples();
    } catch (error: any) {
      console.error('Error deleting example:', error);
      toast.error("שגיאה במחיקת התמונה");
    }
  };

  const resetForm = () => {
    setNewDescription("");
    setNewOutpost("");
    setNewImageFile(null);
    setImagePreview(null);
  };

  const filteredExamples = selectedOutpost 
    ? examples.filter(e => e.outpost === selectedOutpost)
    : examples;

  const outpostsWithExamples = [...new Set(examples.map(e => e.outpost))];

  if (roleLoading || isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <PageHeader
            icon={Settings}
            title="ניהול מסדרי ניקיון"
            subtitle="הוספת ועריכת תמונות דוגמא למוצבים"
            badge="ניהול מסדרי ניקיון"
          />

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-accent">
                    <Plus className="w-5 h-5 ml-2" />
                    הוסף תמונה
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>הוספת תמונת דוגמא</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>מוצב</Label>
                      <Select value={newOutpost} onValueChange={setNewOutpost}>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מוצב" />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTPOSTS.map(outpost => (
                            <SelectItem key={outpost} value={outpost}>{outpost}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>תיאור התמונה</Label>
                      <Textarea 
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="לדוגמא: תמונת הכניסה לחדר"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>תמונה</Label>
                      {imagePreview ? (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                          <img src={imagePreview} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              setNewImageFile(null);
                              setImagePreview(null);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-500">לחץ להעלאת תמונה</span>
                        </label>
                      )}
                    </div>

                    <Button
                      onClick={handleAddExample}
                      disabled={isUploading || !newDescription || !newOutpost || !newImageFile}
                      className="w-full"
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5 ml-2" />
                          הוסף תמונה
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

          {/* Filter by outpost */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardContent className="p-4">
              <Select value={selectedOutpost || "all"} onValueChange={(val) => setSelectedOutpost(val === "all" ? "" : val)}>
                <SelectTrigger className="bg-white text-slate-900">
                  <SelectValue placeholder="כל המוצבים" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all" className="text-slate-900">כל המוצבים</SelectItem>
                  {OUTPOSTS.map(outpost => (
                    <SelectItem key={outpost} value={outpost} className="text-slate-900">
                      {outpost} {outpostsWithExamples.includes(outpost) && `(${examples.filter(e => e.outpost === outpost).length} תמונות)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Examples Grid */}
          {filteredExamples.length === 0 ? (
            <Card className="border-slate-200/60 shadow-lg">
              <CardContent className="p-8 text-center">
                <Image className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-600 mb-2">אין תמונות דוגמא</h3>
                <p className="text-slate-500">לחץ על "הוסף תמונה" להוספת תמונת דוגמא ראשונה</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {/* Group by outpost */}
              {[...new Set(filteredExamples.map(e => e.outpost))].map(outpost => (
                <Card key={outpost} className="border-slate-200/60 shadow-lg overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      {outpost}
                      <span className="text-sm font-normal text-slate-500">
                        ({filteredExamples.filter(e => e.outpost === outpost).length} תמונות)
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {filteredExamples
                        .filter(e => e.outpost === outpost)
                        .map(example => (
                          <div key={example.id} className="relative group">
                            <div className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                              <img 
                                src={example.image_url} 
                                alt={example.description} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <p className="text-white text-sm font-medium">{example.description}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteExample(example.id)}
                              className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="mt-2 text-sm text-slate-600 line-clamp-2">
                              {example.description}
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}