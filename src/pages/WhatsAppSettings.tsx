import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Plus, Trash2, Send, RefreshCw, Settings, CheckCircle2, Search } from "lucide-react";

interface WAGroup {
  id: string;
  name: string;
  wa_id: string;
  is_active: boolean;
  notes: string | null;
}

interface DiscoveredGroup {
  wa_id: string;
  name: string;
}

async function callAdmin(action: string, extra: object = {}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  return data;
}

export default function WhatsAppSettings() {
  const [instanceId, setInstanceId]   = useState("");
  const [apiToken, setApiToken]       = useState("");
  const [isEnabled, setIsEnabled]     = useState(true);
  const [hasToken, setHasToken]       = useState(false);
  const [groups, setGroups]           = useState<WAGroup[]>([]);
  const [savingCfg, setSavingCfg]     = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [discovered, setDiscovered]   = useState<DiscoveredGroup[]>([]);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [testingGroup, setTestingGroup] = useState<string | null>(null);
  const [addDialog, setAddDialog]     = useState(false);
  const [newName, setNewName]         = useState("");
  const [newWaId, setNewWaId]         = useState("");
  const [adding, setAdding]           = useState(false);

  useEffect(() => {
    loadConfig();
    loadGroups();
  }, []);

  async function loadConfig() {
    try {
      const data = await callAdmin("get-config");
      setInstanceId(data.instanceId || "");
      setIsEnabled(data.isEnabled ?? true);
      setHasToken(data.hasToken);
    } catch {}
  }

  async function loadGroups() {
    setLoadingGroups(true);
    try {
      const { data } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .order("name");
      setGroups(data || []);
    } finally {
      setLoadingGroups(false);
    }
  }

  async function saveConfig() {
    if (!instanceId.trim()) return toast.error("הכנס Instance ID");
    setSavingCfg(true);
    try {
      await callAdmin("save-config", {
        instanceId: instanceId.trim(),
        apiToken: apiToken.trim() || undefined,
        isEnabled,
      });
      toast.success("ההגדרות נשמרו");
      setApiToken("");
      loadConfig();
    } catch (e: any) {
      toast.error("שגיאה: " + e.message);
    } finally {
      setSavingCfg(false);
    }
  }

  async function discoverGroups() {
    setShowDiscover(true);
    setDiscoverSearch("");
    setDiscovered([]);
    try {
      const data = await callAdmin("get-groups");
      setDiscovered(data.groups || []);
    } catch (e: any) {
      toast.error("שגיאה בטעינת קבוצות: " + e.message);
    }
  }

  const filteredDiscovered = discovered.filter((g) =>
    g.name.toLowerCase().includes(discoverSearch.toLowerCase())
  );

  async function addFromDiscovered(g: DiscoveredGroup) {
    const { error } = await supabase
      .from("whatsapp_groups")
      .upsert({ name: g.name, wa_id: g.wa_id, is_active: true }, { onConflict: "wa_id" });
    if (error) return toast.error("שגיאה: " + error.message);
    toast.success(`נוסף: ${g.name}`);
    loadGroups();
  }

  async function toggleGroup(id: string, val: boolean) {
    const { error } = await supabase
      .from("whatsapp_groups")
      .update({ is_active: val })
      .eq("id", id);
    if (error) return toast.error("שגיאה");
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: val } : g)));
  }

  async function deleteGroup(id: string) {
    const { error } = await supabase.from("whatsapp_groups").delete().eq("id", id);
    if (error) return toast.error("שגיאה");
    setGroups((prev) => prev.filter((g) => g.id !== id));
    toast.success("הקבוצה הוסרה");
  }

  async function sendTest(wa_id: string) {
    setTestingGroup(wa_id);
    try {
      await callAdmin("send-test", { wa_id });
      toast.success("הודעת בדיקה נשלחה!");
    } catch (e: any) {
      toast.error("שגיאה: " + e.message);
    } finally {
      setTestingGroup(null);
    }
  }

  async function addManual() {
    if (!newName.trim() || !newWaId.trim()) return toast.error("מלא שם ומזהה קבוצה");
    const waId = newWaId.trim().endsWith("@g.us") ? newWaId.trim() : newWaId.trim() + "@g.us";
    setAdding(true);
    try {
      const { error } = await supabase
        .from("whatsapp_groups")
        .insert({ name: newName.trim(), wa_id: waId, is_active: true });
      if (error) throw error;
      toast.success("הקבוצה נוספה");
      setAddDialog(false);
      setNewName("");
      setNewWaId("");
      loadGroups();
    } catch (e: any) {
      toast.error("שגיאה: " + e.message);
    } finally {
      setAdding(false);
    }
  }

  const activeCount = groups.filter((g) => g.is_active).length;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">הגדרות WhatsApp</h1>
            <p className="text-sm text-slate-500">הפצת אירועי בטיחות אוטומטית לקבוצות</p>
          </div>
        </div>

        {/* ── Green API Config ──────────────────────────────────────── */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-slate-500" />
              חיבור Green API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 space-y-1">
              <p className="font-bold">🔧 הגדרה ראשונית (פעם אחת בלבד):</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>כנס ל-<b>console.green-api.com</b> ← הרשם בחינם</li>
                <li>צור Instance חדש ← סרוק QR עם מספר ה-WhatsApp של הבוט</li>
                <li>העתק את <b>idInstance</b> ואת <b>apiTokenInstance</b></li>
                <li>הכנס כאן ולחץ שמור</li>
              </ol>
            </div>

            <div className="flex items-center justify-between py-1">
              <Label className="font-medium">הפצה פעילה</Label>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="space-y-2">
              <Label>Instance ID</Label>
              <Input
                placeholder="לדוגמה: 7103123456"
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                dir="ltr"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>API Token {hasToken && <Badge variant="outline" className="mr-2 text-green-600 border-green-300">שמור ✓</Badge>}</Label>
              <Input
                placeholder={hasToken ? "השאר ריק לשמור את הטוקן הקיים" : "הדבק את apiTokenInstance"}
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                type="password"
                dir="ltr"
                className="font-mono"
              />
            </div>

            <Button onClick={saveConfig} disabled={savingCfg} className="w-full rounded-xl">
              {savingCfg ? "שומר..." : "שמור הגדרות"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Distribution Groups ──────────────────────────────────── */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-4 h-4 text-slate-500" />
                קבוצות הפצה
                {activeCount > 0 && (
                  <Badge className="bg-green-100 text-green-700 border-0">{activeCount} פעילות</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl gap-1 text-xs" onClick={discoverGroups}>
                  <RefreshCw className="w-3 h-3" />
                  טען קבוצות
                </Button>
                <Button size="sm" className="rounded-xl gap-1 text-xs" onClick={() => setAddDialog(true)}>
                  <Plus className="w-3 h-3" />
                  הוסף ידנית
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingGroups ? (
              <p className="text-center text-slate-400 py-6 text-sm">טוען...</p>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <MessageCircle className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm">אין קבוצות מוגדרות</p>
                <p className="text-xs">לחץ "טען קבוצות" לבחור מרשימת ה-WhatsApp שלך</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      g.is_active ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Switch
                        checked={g.is_active}
                        onCheckedChange={(v) => toggleGroup(g.id, v)}
                      />
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${g.is_active ? "text-slate-800" : "text-slate-400"}`}>
                          {g.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono truncate">{g.wa_id}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 mr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        disabled={testingGroup === g.wa_id}
                        onClick={() => sendTest(g.wa_id)}
                        title="שלח הודעת בדיקה"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteGroup(g.id)}
                        title="הסר קבוצה"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Discover Dialog ────────────────────────────────────────── */}
      <Dialog open={showDiscover} onOpenChange={setShowDiscover}>
        <DialogContent className="max-w-md max-h-[85vh] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b">
            <DialogTitle>בחר קבוצות להפצה</DialogTitle>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חפש קבוצה..."
                className="pr-9 rounded-xl"
                value={discoverSearch}
                onChange={(e) => setDiscoverSearch(e.target.value)}
              />
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {discovered.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm">טוען קבוצות...</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredDiscovered.map((g) => {
                  const already = groups.some((x) => x.wa_id === g.wa_id);
                  return (
                    <div
                      key={g.wa_id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{g.name}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">{g.wa_id}</p>
                      </div>
                      {already ? (
                        <Badge variant="outline" className="text-green-600 border-green-300 shrink-0 mr-2">
                          <CheckCircle2 className="w-3 h-3 ml-1" /> קיים
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg shrink-0 mr-2 text-xs"
                          onClick={() => addFromDiscovered(g)}
                        >
                          <Plus className="w-3 h-3 ml-1" /> הוסף
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Add Manual Dialog ──────────────────────────────────────── */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>הוסף קבוצה ידנית</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>שם הקבוצה</Label>
              <Input placeholder="לדוגמה: בטיחות בנימין" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>מזהה קבוצה (Group ID)</Label>
              <Input placeholder="120363411306575884" value={newWaId} onChange={(e) => setNewWaId(e.target.value)} dir="ltr" className="font-mono text-sm" />
              <p className="text-xs text-slate-400">@g.us יתווסף אוטומטית אם חסר</p>
            </div>
            <Button onClick={addManual} disabled={adding} className="w-full rounded-xl">
              {adding ? "מוסיף..." : "הוסף קבוצה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
