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
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  MessageCircle, Plus, Trash2, Send, RefreshCw, Settings,
  Globe, Building2, Search, CheckCircle2, ShieldCheck,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WAGroup {
  id: string;
  name: string;
  wa_id: string;
  is_active: boolean;
  is_global: boolean;
  battalion_name: string | null;
}

interface DiscoveredGroup {
  wa_id: string;
  name: string;
}

// ── Edge Function helper ───────────────────────────────────────────────────────

async function callAdmin(action: string, extra: object = {}) {
  const { data, error } = await supabase.functions.invoke("whatsapp-admin", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  return data;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function WhatsAppSettings() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
          אין לך הרשאה לצפות בדף זה
        </div>
      </AppLayout>
    );
  }

  const canManageBrigade   = true;
  const canManageBattalion = true;

  // Green API config state
  const [instanceId, setInstanceId] = useState("");
  const [apiToken, setApiToken]     = useState("");
  const [isEnabled, setIsEnabled]   = useState(true);
  const [hasToken, setHasToken]     = useState(false);
  const [savingCfg, setSavingCfg]   = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  // Groups state
  const [groups, setGroups]             = useState<WAGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [myBattalion, setMyBattalion]   = useState<string | null>(null);

  // Discover dialog
  const [showDiscover, setShowDiscover]       = useState(false);
  const [discoverTarget, setDiscoverTarget]   = useState<"brigade" | "battalion">("brigade");
  const [discovered, setDiscovered]           = useState<DiscoveredGroup[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverSearch, setDiscoverSearch]   = useState("");

  // Add manual dialog
  const [addDialog, setAddDialog]   = useState(false);
  const [addTarget, setAddTarget]   = useState<"brigade" | "battalion">("brigade");
  const [newName, setNewName]       = useState("");
  const [newWaId, setNewWaId]       = useState("");
  const [adding, setAdding]         = useState(false);

  // Test send
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadGroups();
    fetchMyBattalion();
  }, []);

  async function fetchMyBattalion() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("battalion_name")
      .eq("user_id", session.user.id)
      .maybeSingle();
    setMyBattalion(data?.battalion_name || null);
  }

  async function loadConfig() {
    try {
      const data = await callAdmin("get-config");
      setInstanceId(data.instanceId || "");
      setIsEnabled(data.isEnabled ?? true);
      setHasToken(data.hasToken);
      setApiConnected(!!data.instanceId && data.hasToken);
    } catch { /* not configured yet */ }
  }

  async function loadGroups() {
    setLoadingGroups(true);
    try {
      const { data } = await supabase
        .from("whatsapp_groups")
        .select("*")
        .order("is_global", { ascending: false })
        .order("name");
      setGroups((data as WAGroup[]) || []);
    } finally {
      setLoadingGroups(false);
    }
  }

  // ── Green API config ────────────────────────────────────────────────────────

  async function saveConfig() {
    if (!instanceId.trim()) return toast.error("הכנס Instance ID");
    setSavingCfg(true);
    try {
      await callAdmin("save-config", {
        instanceId: instanceId.trim(),
        apiToken: apiToken.trim() || undefined,
        isEnabled,
      });
      toast.success("ההגדרות נשמרו ✓");
      setApiToken("");
      loadConfig();
    } catch (e: unknown) {
      toast.error("שגיאה: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingCfg(false);
    }
  }

  // ── Discover groups via Green API ───────────────────────────────────────────

  async function openDiscover(target: "brigade" | "battalion") {
    setDiscoverTarget(target);
    setShowDiscover(true);
    setDiscoverSearch("");
    setDiscovered([]);
    setDiscoverLoading(true);
    try {
      const data = await callAdmin("get-groups");
      setDiscovered(data.groups || []);
    } catch (e: unknown) {
      toast.error("שגיאה בטעינת קבוצות: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDiscoverLoading(false);
    }
  }

  const alreadyAdded = new Set(groups.map((g) => g.wa_id));
  const filteredDiscovered = discovered.filter((g) =>
    !alreadyAdded.has(g.wa_id) &&
    g.name.toLowerCase().includes(discoverSearch.toLowerCase())
  );

  async function addFromDiscovered(g: DiscoveredGroup) {
    const isGlobal = discoverTarget === "brigade";
    const { error } = await supabase.from("whatsapp_groups").upsert(
      {
        name: g.name,
        wa_id: g.wa_id,
        is_active: true,
        is_global: isGlobal,
        battalion_name: isGlobal ? null : myBattalion,
      },
      { onConflict: "wa_id" }
    );
    if (error) return toast.error("שגיאה: " + error.message);
    toast.success(`נוסף: ${g.name}`);
    loadGroups();
    setDiscovered((prev) => prev.filter((d) => d.wa_id !== g.wa_id));
  }

  // ── Add manual ──────────────────────────────────────────────────────────────

  function openAddManual(target: "brigade" | "battalion") {
    setAddTarget(target);
    setNewName("");
    setNewWaId("");
    setAddDialog(true);
  }

  async function addManual() {
    if (!newName.trim()) return toast.error("הכנס שם קבוצה");
    if (!newWaId.trim()) return toast.error("הכנס מזהה קבוצה");
    const waId = newWaId.trim().endsWith("@g.us") ? newWaId.trim() : newWaId.trim() + "@g.us";
    const isGlobal = addTarget === "brigade";
    setAdding(true);
    try {
      const { error } = await supabase.from("whatsapp_groups").upsert(
        {
          name: newName.trim(),
          wa_id: waId,
          is_active: true,
          is_global: isGlobal,
          battalion_name: isGlobal ? null : myBattalion,
        },
        { onConflict: "wa_id" }
      );
      if (error) throw error;
      toast.success("הקבוצה נוספה ✓");
      setAddDialog(false);
      loadGroups();
    } catch (e: unknown) {
      toast.error("שגיאה: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setAdding(false);
    }
  }

  // ── Toggle / delete / test ──────────────────────────────────────────────────

  async function toggleGroup(id: string, val: boolean) {
    await supabase.from("whatsapp_groups").update({ is_active: val }).eq("id", id);
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, is_active: val } : g)));
  }

  async function deleteGroup(group: WAGroup) {
    const { error } = await supabase.from("whatsapp_groups").delete().eq("id", group.id);
    if (error) return toast.error("שגיאה במחיקה");
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
    toast.success(`"${group.name}" הוסרה`);
  }

  async function sendTest(group: WAGroup) {
    setTestingId(group.id);
    try {
      await callAdmin("send-test", { wa_id: group.wa_id });
      toast.success(`הודעת בדיקה נשלחה לקבוצה "${group.name}"`);
    } catch (e: unknown) {
      toast.error("שגיאה: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTestingId(null);
    }
  }

  // ── Derived lists ───────────────────────────────────────────────────────────

  const brigadeGroups  = groups.filter((g) => g.is_global);
  const myBattalionGroups = groups.filter(
    (g) => !g.is_global && (myBattalion ? g.battalion_name === myBattalion : !g.battalion_name)
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 space-y-5 pb-24">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">הפצת WhatsApp</h1>
            <p className="text-sm text-slate-500">אירועי בטיחות → WhatsApp אוטומטי</p>
          </div>
        </div>

        {/* ── Green API Config (admin only) ─────────────────────────────── */}
        {canManageBrigade && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-4 h-4 text-slate-500" />
                חיבור Green API
                {apiConnected && isEnabled && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">מחובר ✓</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800 space-y-1">
                <p className="font-bold">🔧 הגדרה ראשונית (פעם אחת בלבד):</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
                  <li>כנס ל-<b>console.green-api.com</b> ← הרשם חינם (אין צורך בכרטיס אשראי)</li>
                  <li>לחץ <b>Create Instance</b> ← בחר "API WhatsApp"</li>
                  <li>לחץ <b>Scan QR</b> ← סרוק עם הוואטסאפ שלך</li>
                  <li>העתק <b>idInstance</b> ו-<b>apiTokenInstance</b> מהדשבורד</li>
                  <li>הכנס כאן למטה ← שמור</li>
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
                <Label>
                  API Token{" "}
                  {hasToken && <Badge variant="outline" className="mr-2 text-green-600 border-green-300 text-xs">שמור ✓</Badge>}
                </Label>
                <Input
                  placeholder={hasToken ? "השאר ריק לשמור טוקן קיים" : "הדבק apiTokenInstance"}
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
        )}

        {/* ── Brigade Groups (mandatory, all events go here) ────────────── */}
        <Card className="rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  קבוצת חטיבה
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">חובה</Badge>
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  כל אירוע בטיחות מכל משתמש ישלח תמיד לכאן
                </p>
              </div>
              {canManageBrigade && (
                <div className="flex gap-2">
                  {apiConnected && (
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1"
                      onClick={() => openDiscover("brigade")}>
                      <RefreshCw className="w-3 h-3" /> טען
                    </Button>
                  )}
                  <Button size="sm" className="rounded-xl text-xs gap-1"
                    onClick={() => openAddManual("brigade")}>
                    <Plus className="w-3 h-3" /> הוסף
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingGroups ? (
              <p className="text-center text-slate-400 py-4 text-sm">טוען...</p>
            ) : brigadeGroups.length === 0 ? (
              <div className="text-center py-6 text-slate-400 space-y-2">
                <Globe className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-sm">לא הוגדרה קבוצת חטיבה</p>
                {canManageBrigade && (
                  <p className="text-xs">לחץ "הוסף" להוספת קבוצת חטיבת בנימין</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {brigadeGroups.map((g) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    testing={testingId === g.id}
                    canEdit={canManageBrigade}
                    onToggle={() => toggleGroup(g.id, !g.is_active)}
                    onTest={() => sendTest(g)}
                    onDelete={() => deleteGroup(g)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Battalion Group (optional, battalion-specific events) ──────── */}
        {canManageBattalion && (
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    קבוצה גדודית
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">אופציונלי</Badge>
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    אירועים של{myBattalion ? ` ${myBattalion}` : " הגדוד שלך"} ישלחו גם לכאן (בנוסף לקבוצת החטיבה)
                  </p>
                </div>
                <div className="flex gap-2">
                  {apiConnected && (
                    <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1"
                      onClick={() => openDiscover("battalion")}>
                      <RefreshCw className="w-3 h-3" /> טען
                    </Button>
                  )}
                  <Button size="sm" className="rounded-xl text-xs gap-1"
                    onClick={() => openAddManual("battalion")}>
                    <Plus className="w-3 h-3" /> הוסף
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myBattalionGroups.length === 0 ? (
                <div className="text-center py-6 text-slate-400 space-y-2">
                  <Building2 className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm">לא הוגדרה קבוצה גדודית</p>
                  <p className="text-xs">אם יש קבוצת וואטסאפ לגדוד שלך, הוסף אותה כאן</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myBattalionGroups.map((g) => (
                    <GroupRow
                      key={g.id}
                      group={g}
                      testing={testingId === g.id}
                      canEdit={canManageBattalion}
                      onToggle={() => toggleGroup(g.id, !g.is_active)}
                      onTest={() => sendTest(g)}
                      onDelete={() => deleteGroup(g)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── How it works box ──────────────────────────────────────────── */}
        <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            איך זה עובד
          </p>
          <p>• אירוע בטיחות מוזן ← <b>קבוצת החטיבה</b> מקבלת אוטומטית</p>
          <p>• אם הגדוד הזין את האירוע ויש לו קבוצה גדודית ← <b>גם הקבוצה הגדודית</b> מקבלת</p>
          <p>• Green API שומר על החיבור לוואטסאפ — גם כשהטלפון כבוי</p>
        </div>
      </div>

      {/* ── Discover dialog ───────────────────────────────────────────── */}
      <Dialog open={showDiscover} onOpenChange={setShowDiscover}>
        <DialogContent className="max-w-md max-h-[85vh] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b">
            <DialogTitle>
              {discoverTarget === "brigade" ? "בחר קבוצת חטיבה" : "בחר קבוצה גדודית"}
            </DialogTitle>
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
            {discoverLoading ? (
              <div className="text-center py-10 text-slate-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                <p className="text-sm">טוען קבוצות מ-Green API...</p>
              </div>
            ) : filteredDiscovered.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-1">
                <p className="text-sm">לא נמצאו קבוצות</p>
                <p className="text-xs">ודא שה-Instance ID ו-Token מוגדרים נכון</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredDiscovered.map((g) => (
                  <div key={g.wa_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{g.name}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{g.wa_id}</p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-lg shrink-0 mr-2 text-xs"
                      onClick={() => addFromDiscovered(g)}>
                      <CheckCircle2 className="w-3 h-3 ml-1" /> הוסף
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Add manual dialog ─────────────────────────────────────────── */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {addTarget === "brigade" ? "הוסף קבוצת חטיבה" : "הוסף קבוצה גדודית"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {addTarget === "battalion" && myBattalion && (
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                הקבוצה תשויך לגדוד: <b>{myBattalion}</b>
              </div>
            )}
            <div className="space-y-2">
              <Label>שם הקבוצה</Label>
              <Input placeholder="לדוגמה: בטיחות בנימין" value={newName}
                onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>מזהה קבוצה (Group ID)</Label>
              <Input placeholder="120363411306575884" value={newWaId}
                onChange={(e) => setNewWaId(e.target.value)} dir="ltr" className="font-mono text-sm" />
              <p className="text-xs text-slate-400">
                @g.us יתווסף אוטומטית אם חסר
              </p>
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

// ── Group row component ────────────────────────────────────────────────────────

function GroupRow({
  group, testing, canEdit, onToggle, onTest, onDelete,
}: {
  group: WAGroup;
  testing: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
      group.is_active ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        {canEdit ? (
          <Switch checked={group.is_active} onCheckedChange={onToggle} />
        ) : (
          <div className={`w-2 h-2 rounded-full ${group.is_active ? "bg-green-500" : "bg-slate-300"}`} />
        )}
        <div className="min-w-0">
          <p className={`font-semibold text-sm truncate ${group.is_active ? "text-slate-800" : "text-slate-400"}`}>
            {group.name}
          </p>
          <p className="text-xs text-slate-400 font-mono truncate">{group.wa_id}</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-1 shrink-0 mr-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
            disabled={testing} onClick={onTest} title="שלח הודעת בדיקה">
            <Send className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={onDelete} title="מחק קבוצה">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
