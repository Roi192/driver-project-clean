import { useState, useEffect, useMemo } from "react";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FolderOpen, Plus, MapPin, Trash2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { HAGMAR_ALL_SETTLEMENTS } from "@/lib/hagmar-constants";

interface DefenseFile {
  id: string;
  settlement: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
}

export default function HagmarDefenseFiles() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [files, setFiles] = useState<DefenseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterSettlement, setFilterSettlement] = useState("all");

  const [formTitle, setFormTitle] = useState("");
  const [formSettlement, setFormSettlement] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("hagmar_defense_files").select("*").order("created_at", { ascending: false });
    setFiles((data || []) as DefenseFile[]);
    setLoading(false);
  };

  const allSettlements = useMemo(() => isRestricted && userSettlement ? [userSettlement] : HAGMAR_ALL_SETTLEMENTS, [isRestricted, userSettlement]);

  const visibleFiles = useMemo(() => {
    let result = files;
    if (isRestricted && userSettlement) result = result.filter(f => f.settlement === userSettlement);
    if (filterSettlement !== "all") result = result.filter(f => f.settlement === filterSettlement);
    return result;
  }, [files, isRestricted, userSettlement, filterSettlement]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `defense-files/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { error } = await supabase.storage.from("content-images").upload(path, file);
    if (error) { toast.error("שגיאה בהעלאה"); setUploading(false); return; }
    setUploadedUrl(path);
    setUploading(false);
    toast.success("קובץ הועלה");
  };

  const create = async () => {
    if (!formTitle || !formSettlement) { toast.error("יש למלא כותרת וישוב"); return; }
    const { error } = await supabase.from("hagmar_defense_files").insert({
      title: formTitle,
      settlement: formSettlement,
      description: formDescription || null,
      file_url: uploadedUrl || null,
      file_type: uploadedUrl ? uploadedUrl.split('.').pop() : null,
      uploaded_by: user?.id,
    });
    if (error) { toast.error("שגיאה"); return; }
    toast.success("תיק הוגנה נוסף");
    setDialogOpen(false);
    setFormTitle(""); setFormSettlement(""); setFormDescription(""); setUploadedUrl("");
    fetchData();
  };

  const deleteFile = async (id: string) => {
    if (!confirm("למחוק?")) return;
    const file = files.find(f => f.id === id);
    if (file?.file_url) {
      await deleteStorageFiles([file.file_url], "content-images");
    }
    await supabase.from("hagmar_defense_files").delete().eq("id", id);
    toast.success("נמחק");
    fetchData();
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="תיק הגנת היישוב" subtitle="ניהול תיקי הגנה ליישובים" icon={FolderOpen} />

          {isManager && (
            <Button onClick={() => setDialogOpen(true)} className="w-full h-12 bg-gradient-to-r from-slate-700 to-slate-900 text-white font-bold gap-2">
              <Plus className="w-5 h-5" /> הוסף מסמך
            </Button>
          )}

          {!isRestricted && (
            <Select value={filterSettlement} onValueChange={setFilterSettlement}>
              <SelectTrigger className="h-11"><SelectValue placeholder="סינון לפי ישוב" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הישובים</SelectItem>
                {HAGMAR_ALL_SETTLEMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-slate-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : visibleFiles.length === 0 ? (
            <div className="text-center py-12"><FolderOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין מסמכים</p></div>
          ) : (
            <div className="space-y-3">
              {visibleFiles.map(file => (
                <Card key={file.id} className="p-4 border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" />{file.title}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{file.settlement}</p>
                      {file.description && <p className="text-sm text-muted-foreground mt-1">{file.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(file.created_at), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="flex gap-1">
                      {isManager && <Button size="icon" variant="ghost" onClick={() => deleteFile(file.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>הוסף מסמך הגנה</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>כותרת *</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} /></div>
            <div><Label>ישוב *</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תיאור</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <div><Label>העלאת קובץ</Label><Input type="file" onChange={handleFileUpload} disabled={uploading} /></div>
            <Button onClick={create} className="w-full h-12 bg-gradient-to-r from-slate-700 to-slate-900 text-white font-bold" disabled={uploading}>
              {uploading ? "מעלה..." : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}