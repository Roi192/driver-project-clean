import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ShieldAlert, Loader2, CheckCircle2, AlertTriangle, PenLine, FileText } from "lucide-react";

interface Warning {
  id: string;
  category: string;
  event_date: string;
  action_taken: string | null;
  description: string | null;
  soldier_signature: string | null;
  signed_at: string | null;
  created_at: string;
}

export default function MyWarnings() {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<Warning | null>(null);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_number")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!profile?.personal_number) {
        setWarnings([]);
        return;
      }

      const { data: soldier } = await supabase
        .from("soldiers")
        .select("id")
        .eq("personal_number", profile.personal_number)
        .maybeSingle();

      if (!soldier) {
        setWarnings([]);
        return;
      }

      const { data, error } = await supabase
        .from("soldier_warnings")
        .select("id, category, severity, event_date, action_taken, description, soldier_signature, signed_at, created_at")
        .eq("soldier_id", soldier.id)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setWarnings((data || []) as Warning[]);
    } catch (e: any) {
      toast.error(`שגיאה בטעינה: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openSign = (w: Warning) => {
    setSigning(w);
    setSignature("");
  };

  const submitSignature = async () => {
    if (!signing || !signature) {
      toast.error("נדרשת חתימה");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("soldier_warnings")
        .update({ soldier_signature: signature, signed_at: new Date().toISOString() })
        .eq("id", signing.id);
      if (error) throw error;
      toast.success("האזהרה נחתמה");
      setSigning(null);
      setSignature("");
      load();
    } catch (e: any) {
      toast.error(`שגיאה בחתימה: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const unsignedCount = useMemo(() => warnings.filter((w) => !w.signed_at).length, [warnings]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">האזהרות שלי</h1>
              <p className="text-sm text-slate-600">אזהרות שקיבלת – נדרשת חתימתך</p>
            </div>
          </div>

          {unsignedCount > 0 && (
            <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-3 flex gap-2 mt-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-sm text-amber-900">
                <strong>{unsignedCount} אזהרות ממתינות לחתימתך.</strong> אנא חתום על כל אזהרה כאישור קבלה.
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
          </div>
        ) : warnings.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-slate-600">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
              <p className="font-semibold text-slate-800">אין לך אזהרות</p>
              <p className="text-sm text-slate-600 mt-1">המשך כך! 💪</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {warnings.map((w) => {
              const isSigned = !!w.signed_at;
              return (
                <Card key={w.id} className={isSigned ? "border-emerald-200 bg-emerald-50/30" : "border-red-300 bg-red-50/30 shadow-md"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-2 text-base">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-slate-700 border-slate-300 font-semibold">{w.category}</Badge>
                      </div>
                      {isSigned ? (
                        <Badge className="bg-emerald-600 text-white gap-1">
                          <CheckCircle2 className="w-3 h-3" /> נחתם
                        </Badge>
                      ) : (
                        <Badge className="bg-red-600 text-white animate-pulse">דרושה חתימה</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>תאריך אירוע: <strong>{format(new Date(w.event_date), "dd/MM/yyyy")}</strong></span>
                    </div>
                    {w.action_taken && (
                      <p className="text-sm text-slate-700"><strong>אמצעי:</strong> {w.action_taken}</p>
                    )}
                    {w.description && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">תיאור</p>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{w.description}</p>
                      </div>
                    )}

                    {isSigned ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
                        {w.soldier_signature && (
                          <img src={w.soldier_signature} alt="חתימה" className="h-12 bg-white rounded border border-slate-200" />
                        )}
                        <div className="text-xs text-emerald-800">
                          נחתם בתאריך {format(new Date(w.signed_at!), "dd/MM/yyyy HH:mm")}
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => openSign(w)}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-white gap-2"
                      >
                        <PenLine className="w-4 h-4" />
                        חתום על האזהרה
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!signing} onOpenChange={(o) => !o && setSigning(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-800">חתימה על אזהרה</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                בחתימתך אתה מאשר קבלת אזהרה בנושא: <strong>{signing?.category}</strong>
              </p>
              <SignatureCanvas value={signature} onChange={setSignature} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSigning(null)} disabled={saving}>ביטול</Button>
              <Button
                onClick={submitSignature}
                disabled={!signature || saving}
                className="bg-gradient-to-r from-red-500 to-orange-600 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "אשר חתימה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}