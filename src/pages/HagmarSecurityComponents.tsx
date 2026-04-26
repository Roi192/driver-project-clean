import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { ShieldCheck, Save, MapPin, Camera, Radio, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { HAGMAR_ALL_SETTLEMENTS, DEFENSIVE_SECURITY_TYPES, COMMAND_CENTER_TYPES, getRegionFromSettlement, getCompanyFromSettlement } from "@/lib/hagmar-constants";

interface SecurityComponent {
  id: string;
  settlement: string;
  defensive_security_type: string | null;
  armored_vehicle: boolean;
  hailkis: boolean;
  command_center_type: string | null;
  armory: boolean;
  sensors_data: any[];
  cameras_data: any[];
  fence_type: string | null;
  security_gaps: string | null;
  readiness_weights: Record<string, number>;
}

export default function HagmarSecurityComponents() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [components, setComponents] = useState<SecurityComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<string>(userSettlement || "");
  const [formData, setFormData] = useState<Partial<SecurityComponent>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (userSettlement && !selectedSettlement) setSelectedSettlement(userSettlement); }, [userSettlement]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("hagmar_security_components").select("*");
    setComponents((data || []) as SecurityComponent[]);
    setLoading(false);
  };

  useEffect(() => {
    const existing = components.find(c => c.settlement === selectedSettlement);
    if (existing) {
      setFormData(existing);
    } else {
      setFormData({
        defensive_security_type: null, armored_vehicle: false, hailkis: false,
        command_center_type: null, armory: false, sensors_data: [], cameras_data: [],
        fence_type: null, security_gaps: null, readiness_weights: {},
      });
    }
  }, [selectedSettlement, components]);

  const allSettlements = useMemo(() => isRestricted && userSettlement ? [userSettlement] : HAGMAR_ALL_SETTLEMENTS, [isRestricted, userSettlement]);

  const calculateReadiness = useMemo(() => {
    if (!formData) return 0;
    let score = 0, total = 0;
    const weights = formData.readiness_weights || {};

    const checks = [
      { key: "defense_type", val: !!formData.defensive_security_type && formData.defensive_security_type !== "none" },
      { key: "armored_vehicle", val: !!formData.armored_vehicle },
      { key: "hailkis", val: !!formData.hailkis },
      { key: "command_center", val: !!formData.command_center_type && formData.command_center_type !== "none" },
      { key: "armory", val: !!formData.armory },
      { key: "fence", val: !!formData.fence_type },
      { key: "no_gaps", val: !formData.security_gaps },
    ];

    checks.forEach(c => {
      const w = weights[c.key] || 1;
      total += w;
      if (c.val) score += w;
    });

    // Camera/sensor operational status
    const cameras = formData.cameras_data || [];
    if (cameras.length > 0) {
      const working = cameras.filter((c: any) => c.operational).length;
      const camWeight = weights["cameras"] || 2;
      total += camWeight;
      score += (working / cameras.length) * camWeight;
    }

    return total > 0 ? Math.round((score / total) * 100) : 0;
  }, [formData]);

  const saveData = async () => {
    if (!selectedSettlement || !isManager) return;
    setSaving(true);
    const existing = components.find(c => c.settlement === selectedSettlement);
    const payload = {
      settlement: selectedSettlement,
      defensive_security_type: formData.defensive_security_type || null,
      armored_vehicle: formData.armored_vehicle || false,
      hailkis: formData.hailkis || false,
      command_center_type: formData.command_center_type || null,
      armory: formData.armory || false,
      sensors_data: formData.sensors_data || [],
      cameras_data: formData.cameras_data || [],
      fence_type: formData.fence_type || null,
      security_gaps: formData.security_gaps || null,
      readiness_weights: formData.readiness_weights || {},
      region: getRegionFromSettlement(selectedSettlement),
      company: getCompanyFromSettlement(selectedSettlement),
      created_by: user?.id,
    };

    if (existing) {
      await supabase.from("hagmar_security_components").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("hagmar_security_components").insert(payload);
    }
    toast.success("נשמר");
    setSaving(false);
    fetchData();
  };

  const addCamera = () => {
    setFormData(prev => ({
      ...prev,
      cameras_data: [...(prev.cameras_data || []), { company: "", type: "", responsibility: "", viewed_in: "", watches_over: "", has_alerts: false, operational: true }],
    }));
  };

  const updateCamera = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const cameras = [...(prev.cameras_data || [])];
      cameras[index] = { ...cameras[index], [field]: value };
      return { ...prev, cameras_data: cameras };
    });
  };

  const addSensor = () => {
    setFormData(prev => ({
      ...prev,
      sensors_data: [...(prev.sensors_data || []), { company: "", type: "", responsibility: "", viewed_in: "", watches_over: "", has_alerts: false, operational: true }],
    }));
  };

  const updateSensor = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const sensors = [...(prev.sensors_data || [])];
      sensors[index] = { ...sensors[index], [field]: value };
      return { ...prev, sensors_data: sensors };
    });
  };

  const updateWeight = (key: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      readiness_weights: { ...(prev.readiness_weights || {}), [key]: value },
    }));
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="מרכיבי ביטחון" subtitle="סיווג ומעקב מרכיבי ביטחון ביישוב" icon={ShieldCheck} />

          <Select value={selectedSettlement} onValueChange={setSelectedSettlement}>
            <SelectTrigger className="h-11"><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
            <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>

          {selectedSettlement && (
            <>
              {/* Readiness gauge */}
              <Card className={`p-4 border-0 shadow-lg text-white ${calculateReadiness >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : calculateReadiness >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold opacity-80">כשירות מרכיבי ביטחון</span>
                  <span className="text-3xl font-black">{calculateReadiness}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${calculateReadiness}%` }} />
                </div>
              </Card>

              {/* Basic fields */}
              <Card className="p-4 space-y-3">
                <h3 className="font-bold text-foreground">פרטים כלליים</h3>
                <div><Label>מב"ט הגנתי</Label>
                  <Select value={formData.defensive_security_type || ""} onValueChange={v => setFormData(p => ({ ...p, defensive_security_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                    <SelectContent>{DEFENSIVE_SECURITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3"><Switch checked={formData.armored_vehicle || false} onCheckedChange={v => setFormData(p => ({ ...p, armored_vehicle: v }))} /><Label>רכב ממוגן</Label></div>
                <div className="flex items-center gap-3"><Switch checked={formData.hailkis || false} onCheckedChange={v => setFormData(p => ({ ...p, hailkis: v }))} /><Label>היילקיס</Label></div>
                <div><Label>חמ"ל יישובי</Label>
                  <Select value={formData.command_center_type || ""} onValueChange={v => setFormData(p => ({ ...p, command_center_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
                    <SelectContent>{COMMAND_CENTER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3"><Switch checked={formData.armory || false} onCheckedChange={v => setFormData(p => ({ ...p, armory: v }))} /><Label>נשקייה</Label></div>
                <div><Label>סוג גדר</Label><Input value={formData.fence_type || ""} onChange={e => setFormData(p => ({ ...p, fence_type: e.target.value }))} /></div>
                <div><Label>פערים משמעותיים במב"ט</Label><Textarea value={formData.security_gaps || ""} onChange={e => setFormData(p => ({ ...p, security_gaps: e.target.value }))} rows={2} placeholder="ציר ביטחון לא עביר, גדר לא תקינה, חוסר בתאורה..." /></div>
              </Card>

              {/* Sensors */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2"><Radio className="w-4 h-4" />מכמים</h3>
                  {isManager && <Button size="sm" variant="outline" onClick={addSensor}>+ מכם</Button>}
                </div>
                {(formData.sensors_data || []).map((sensor: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">חברה</Label><Input className="h-8 text-xs" value={sensor.company || ""} onChange={e => updateSensor(i, "company", e.target.value)} /></div>
                      <div><Label className="text-xs">סוג</Label><Input className="h-8 text-xs" value={sensor.type || ""} onChange={e => updateSensor(i, "type", e.target.value)} /></div>
                      <div><Label className="text-xs">באחריות</Label><Input className="h-8 text-xs" value={sensor.responsibility || ""} onChange={e => updateSensor(i, "responsibility", e.target.value)} /></div>
                      <div><Label className="text-xs">נצפה ב</Label><Input className="h-8 text-xs" value={sensor.viewed_in || ""} onChange={e => updateSensor(i, "viewed_in", e.target.value)} /></div>
                      <div><Label className="text-xs">צופה על</Label><Input className="h-8 text-xs" value={sensor.watches_over || ""} onChange={e => updateSensor(i, "watches_over", e.target.value)} /></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={sensor.operational} onCheckedChange={v => updateSensor(i, "operational", v)} />
                      <Label className="text-xs">{sensor.operational ? "תקין" : "לא תקין"}</Label>
                      {!sensor.operational && <Badge variant="destructive" className="text-xs">תקול</Badge>}
                    </div>
                  </div>
                ))}
              </Card>

              {/* Cameras */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground flex items-center gap-2"><Camera className="w-4 h-4" />מצלמות</h3>
                  {isManager && <Button size="sm" variant="outline" onClick={addCamera}>+ מצלמה</Button>}
                </div>
                {(formData.cameras_data || []).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    תקינות: {(formData.cameras_data || []).filter((c: any) => c.operational).length}/{(formData.cameras_data || []).length}
                  </div>
                )}
                {(formData.cameras_data || []).map((cam: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">חברה</Label><Input className="h-8 text-xs" value={cam.company || ""} onChange={e => updateCamera(i, "company", e.target.value)} /></div>
                      <div><Label className="text-xs">סוג</Label><Input className="h-8 text-xs" value={cam.type || ""} onChange={e => updateCamera(i, "type", e.target.value)} /></div>
                      <div><Label className="text-xs">באחריות</Label><Input className="h-8 text-xs" value={cam.responsibility || ""} onChange={e => updateCamera(i, "responsibility", e.target.value)} /></div>
                      <div><Label className="text-xs">נצפה ב</Label><Input className="h-8 text-xs" value={cam.viewed_in || ""} onChange={e => updateCamera(i, "viewed_in", e.target.value)} /></div>
                      <div><Label className="text-xs">צופה על</Label><Input className="h-8 text-xs" value={cam.watches_over || ""} onChange={e => updateCamera(i, "watches_over", e.target.value)} /></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={cam.operational} onCheckedChange={v => updateCamera(i, "operational", v)} />
                      <Label className="text-xs">{cam.operational ? "תקין" : "לא תקין"}</Label>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Readiness Weights (Admin only) */}
              {isManager && (
                <Card className="p-4 space-y-3">
                  <h3 className="font-bold text-foreground">משקלות כשירות (קביעת מנהל)</h3>
                  <p className="text-xs text-muted-foreground">הגדר משקל לכל מרכיב (1-10) כדי לקבוע את חשיבותו באחוז הכשירות</p>
                  {[
                    { key: "defense_type", label: 'מב"ט הגנתי' },
                    { key: "armored_vehicle", label: "רכב ממוגן" },
                    { key: "hailkis", label: "היילקיס" },
                    { key: "command_center", label: 'חמ"ל' },
                    { key: "armory", label: "נשקייה" },
                    { key: "fence", label: "גדר" },
                    { key: "no_gaps", label: "ללא פערים" },
                    { key: "cameras", label: "מצלמות" },
                  ].map(w => (
                    <div key={w.key} className="flex items-center justify-between">
                      <Label className="text-sm">{w.label}</Label>
                      <Input type="number" className="h-8 w-20 text-sm" min={1} max={10}
                        value={(formData.readiness_weights || {})[w.key] || 1}
                        onChange={e => updateWeight(w.key, Number(e.target.value))} />
                    </div>
                  ))}
                </Card>
              )}

              {isManager && (
                <Button onClick={saveData} disabled={saving} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2">
                  <Save className="w-5 h-5" />{saving ? "שומר..." : "שמור"}
                </Button>
              )}
            </>
          )}

          {!selectedSettlement && (
            <div className="text-center py-12"><MapPin className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">בחר ישוב</p></div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}