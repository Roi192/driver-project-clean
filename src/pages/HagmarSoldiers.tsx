import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, ChevronDown, ChevronUp, Users, Shield, AlertTriangle, Target, Award, Pencil, Trash2, Download } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { HAGMAR_REGIONS, HAGMAR_ALL_SETTLEMENTS, HAGMAR_CERT_TYPES, CERT_VALIDITY_DAYS, CERT_WARNING_DAYS, SHOOTING_VALIDITY_DAYS, SHOOTING_WARNING_DAYS, getCompanyFromSettlement, getRegionFromSettlement } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

interface HagmarSoldier {
  id: string;
  full_name: string;
  id_number: string;
  phone: string | null;
  settlement: string;
  shoe_size: string | null;
  uniform_size_top: string | null;
  uniform_size_bottom: string | null;
  weapon_serial: string | null;
  last_shooting_range_date: string | null;
  notes: string | null;
  is_active: boolean;
}

interface HagmarCert {
  id: string;
  soldier_id: string;
  cert_type: string;
  certified_date: string | null;
  last_refresh_date: string | null;
}

const getShootingStatus = (date: string | null) => {
  if (!date) return { status: "unknown", label: "לא הוזן", color: "bg-slate-400" };
  const days = differenceInDays(new Date(), parseISO(date));
  if (days > SHOOTING_VALIDITY_DAYS) return { status: "expired", label: "חייב מטווח", color: "bg-red-500" };
  if (days > SHOOTING_WARNING_DAYS) return { status: "warning", label: `${SHOOTING_VALIDITY_DAYS - days} ימים`, color: "bg-amber-500" };
  return { status: "valid", label: "תקף", color: "bg-emerald-500" };
};

const getCertStatus = (lastRefresh: string | null) => {
  if (!lastRefresh) return { status: "unknown", label: "לא הוזן", color: "bg-slate-400" };
  const days = differenceInDays(new Date(), parseISO(lastRefresh));
  if (days > CERT_VALIDITY_DAYS) return { status: "expired", label: "פג תוקף", color: "bg-red-500" };
  if (days > CERT_WARNING_DAYS) return { status: "warning", label: `${CERT_VALIDITY_DAYS - days} ימים`, color: "bg-amber-500" };
  return { status: "valid", label: "תקף", color: "bg-emerald-500" };
};

const HagmarSoldiers = () => {
  const { isHagmarAdmin, isSuperAdmin, role } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const queryClient = useQueryClient();
  const isRavshatz = role === 'ravshatz';
  const canManage = isHagmarAdmin || isSuperAdmin || isRavshatz;
  const canDelete = isHagmarAdmin || isSuperAdmin;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedSettlement, setSelectedSettlement] = useState<string>("all");
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<HagmarSoldier | null>(null);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "", id_number: "", phone: "", settlement: "",
    shoe_size: "", uniform_size_top: "", uniform_size_bottom: "",
    weapon_serial: "", last_shooting_range_date: "", notes: "",
  });

  // Cert form state
  const [certForm, setCertForm] = useState({ cert_type: "", certified_date: "", last_refresh_date: "" });

  const { data: soldiers = [], isLoading } = useQuery({
    queryKey: ['hagmar-soldiers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hagmar_soldiers').select('*').eq('is_active', true).order('settlement').order('full_name');
      if (error) throw error;
      return data as HagmarSoldier[];
    },
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['hagmar-certifications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hagmar_certifications').select('*');
      if (error) throw error;
      return data as HagmarCert[];
    },
  });

  const saveSoldier = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = { ...data, last_shooting_range_date: data.last_shooting_range_date || null };
      if (editingSoldier) {
        const { error } = await supabase.from('hagmar_soldiers').update(payload).eq('id', editingSoldier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hagmar_soldiers').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hagmar-soldiers'] });
      toast.success(editingSoldier ? "הלוחם עודכן" : "הלוחם נוסף");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSoldier = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hagmar_soldiers').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hagmar-soldiers'] });
      toast.success("הלוחם הוסר");
    },
  });

  const saveCert = useMutation({
    mutationFn: async (data: typeof certForm & { soldier_id: string }) => {
      const { error } = await supabase.from('hagmar_certifications').upsert({
        soldier_id: data.soldier_id,
        cert_type: data.cert_type,
        certified_date: data.certified_date || null,
        last_refresh_date: data.last_refresh_date || null,
      }, { onConflict: 'soldier_id,cert_type' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hagmar-certifications'] });
      toast.success("ההסמכה עודכנה");
      setCertDialogOpen(false);
      setCertForm({ cert_type: "", certified_date: "", last_refresh_date: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setFormData({ full_name: "", id_number: "", phone: "", settlement: "", shoe_size: "", uniform_size_top: "", uniform_size_bottom: "", weapon_serial: "", last_shooting_range_date: "", notes: "" });
    setEditingSoldier(null);
  };

  const openEdit = (s: HagmarSoldier) => {
    setEditingSoldier(s);
    setFormData({
      full_name: s.full_name, id_number: s.id_number, phone: s.phone || "", settlement: s.settlement,
      shoe_size: s.shoe_size || "", uniform_size_top: s.uniform_size_top || "", uniform_size_bottom: s.uniform_size_bottom || "",
      weapon_serial: s.weapon_serial || "", last_shooting_range_date: s.last_shooting_range_date || "", notes: s.notes || "",
    });
    setDialogOpen(true);
  };

  const filteredSoldiers = useMemo(() => {
    return soldiers.filter(s => {
      // Ravshatz: restrict to own settlement
      if (isRestricted && userSettlement && s.settlement !== userSettlement) return false;
      if (searchQuery && !s.full_name.includes(searchQuery) && !s.id_number.includes(searchQuery)) return false;
      if (selectedSettlement !== "all" && s.settlement !== selectedSettlement) return false;
      if (selectedRegion !== "all") {
        const region = getRegionFromSettlement(s.settlement);
        if (region !== selectedRegion) return false;
      }
      return true;
    });
  }, [soldiers, searchQuery, selectedRegion, selectedSettlement, isRestricted, userSettlement]);

  // Group soldiers by settlement for the hierarchy view
  const soldiersBySettlement = useMemo(() => {
    const map: Record<string, HagmarSoldier[]> = {};
    filteredSoldiers.forEach(s => {
      if (!map[s.settlement]) map[s.settlement] = [];
      map[s.settlement].push(s);
    });
    return map;
  }, [filteredSoldiers]);

  // Get certs for a soldier
  const getCertsForSoldier = (soldierId: string) => certifications.filter(c => c.soldier_id === soldierId);

  // Dashboard stats
  const stats = useMemo(() => {
    const relevantSoldiers = isRestricted && userSettlement 
      ? soldiers.filter(s => s.settlement === userSettlement) 
      : soldiers;
    const relevantCerts = isRestricted && userSettlement
      ? certifications.filter(c => relevantSoldiers.some(s => s.id === c.soldier_id))
      : certifications;
    const shootingExpired = relevantSoldiers.filter(s => getShootingStatus(s.last_shooting_range_date).status === 'expired').length;
    const shootingWarning = relevantSoldiers.filter(s => getShootingStatus(s.last_shooting_range_date).status === 'warning').length;
    const certsExpired = relevantCerts.filter(c => getCertStatus(c.last_refresh_date).status === 'expired').length;
    return { total: relevantSoldiers.length, shootingExpired, shootingWarning, certsExpired };
  }, [soldiers, certifications, isRestricted, userSettlement]);

  // Export
  const handleExport = () => {
    const rows = filteredSoldiers.map(s => {
      const certs = getCertsForSoldier(s.id);
      const certMap: Record<string, string> = {};
      HAGMAR_CERT_TYPES.forEach(ct => {
        const cert = certs.find(c => c.cert_type === ct.value);
        certMap[ct.label] = cert?.last_refresh_date ? format(parseISO(cert.last_refresh_date), 'dd/MM/yyyy') : 'לא';
      });
      return {
        "שם מלא": s.full_name,
        "ת.ז": s.id_number,
        "טלפון": s.phone || "",
        "יישוב": s.settlement,
        "פלוגה": getCompanyFromSettlement(s.settlement) || "",
        "גזרה": getRegionFromSettlement(s.settlement) || "",
        "מידת נעליים": s.shoe_size || "",
        "מידת חולצה": s.uniform_size_top || "",
        "מידת מכנסיים": s.uniform_size_bottom || "",
        "מספר צ נשק": s.weapon_serial || "",
        "מטווח אחרון": s.last_shooting_range_date ? format(parseISO(s.last_shooting_range_date), 'dd/MM/yyyy') : "",
        "סטטוס מטווח": getShootingStatus(s.last_shooting_range_date).label,
        ...certMap,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "לוחמי הגמר");
    XLSX.writeFile(wb, `לוחמי_הגמר_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const availableSettlements = useMemo(() => {
    if (isRestricted && userSettlement) return [userSettlement];
    if (selectedRegion === "all") return HAGMAR_ALL_SETTLEMENTS;
    const region = HAGMAR_REGIONS.find(r => r.name === selectedRegion);
    return region ? region.companies.flatMap(c => c.settlements) : HAGMAR_ALL_SETTLEMENTS;
  }, [selectedRegion, isRestricted, userSettlement]);

  // Readiness percentage for Ravshatz view
  const readinessPercent = useMemo(() => {
    if (!isRestricted || stats.total === 0) return 0;
    const validShooting = stats.total - stats.shootingExpired - stats.shootingWarning;
    return Math.round((validShooting / stats.total) * 100);
  }, [isRestricted, stats]);

  // For Ravshatz: show a focused, settlement-centric view
  if (isRestricted && userSettlement) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white p-4 pt-20 pb-24" dir="rtl">
          {/* Settlement-Focused Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">🏘️ {userSettlement}</h1>
                <p className="text-sm text-muted-foreground">כשירות לוחמי הישוב</p>
              </div>
            </div>

            {/* Readiness Gauge */}
            <Card className="p-5 mb-4 border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold opacity-80">מוכנות הישוב</span>
                <span className="text-3xl font-black">{readinessPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${readinessPercent >= 80 ? 'bg-emerald-400' : readinessPercent >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-black">{stats.total}</p>
                  <p className="text-xs opacity-70">לוחמים</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-black ${stats.shootingExpired > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.shootingExpired}</p>
                  <p className="text-xs opacity-70">חייבים מטווח</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-black ${stats.certsExpired > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{stats.certsExpired}</p>
                  <p className="text-xs opacity-70">הסמכות פגות</p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              {canManage && (
                <Button size="sm" onClick={() => { resetForm(); setFormData(p => ({ ...p, settlement: userSettlement })); setDialogOpen(true); }} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white flex-1">
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף לוחם
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 ml-1" />
                ייצוא
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חיפוש לפי שם או ת.ז..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
            </div>
          </div>

          {/* Soldiers List - Flat cards for Ravshatz */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">טוען...</div>
          ) : filteredSoldiers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-bold text-foreground">אין לוחמים רשומים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSoldiers.map(soldier => {
                const shooting = getShootingStatus(soldier.last_shooting_range_date);
                const soldierCerts = getCertsForSoldier(soldier.id);
                return (
                  <Card key={soldier.id} className={`p-4 border ${shooting.status === 'expired' ? 'border-red-200 bg-red-50/30' : shooting.status === 'warning' ? 'border-amber-200 bg-amber-50/30' : 'border-border'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{soldier.full_name}</h3>
                        <p className="text-xs text-muted-foreground">ת.ז: {soldier.id_number}</p>
                      </div>
                      <div className="flex gap-1">
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(soldier)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedSoldierId(soldier.id); setCertDialogOpen(true); }}>
                              <Award className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("להסיר לוחם?")) deleteSoldier.mutate(soldier.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge className={`${shooting.color} text-white text-xs`}>
                        <Target className="w-3 h-3 ml-1" />
                        מטווח: {shooting.label}
                      </Badge>
                      {soldier.weapon_serial && (
                        <Badge variant="outline" className="text-xs">🔫 {soldier.weapon_serial}</Badge>
                      )}
                    </div>
                    {soldierCerts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {soldierCerts.map(c => {
                          const status = getCertStatus(c.last_refresh_date);
                          const label = HAGMAR_CERT_TYPES.find(ct => ct.value === c.cert_type)?.label || c.cert_type;
                          return (
                            <Badge key={c.id} variant="outline" className={`text-xs ${status.status === 'expired' ? 'border-red-300 text-red-600' : status.status === 'warning' ? 'border-amber-300 text-amber-600' : 'border-emerald-300 text-emerald-600'}`}>
                              {label.replace('הסמכת ', '')}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    {/* Additional details row */}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {soldier.phone && <span>📱 {soldier.phone}</span>}
                      {soldier.shoe_size && <span>👟 {soldier.shoe_size}</span>}
                      {soldier.uniform_size_top && <span>👕 {soldier.uniform_size_top}</span>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Admin/Officer view - full hierarchy
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white p-4 pt-20" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">לוחמי הגמ"ר</h1>
              <p className="text-sm text-muted-foreground">ניהול כשירות לפי יישובים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 ml-1" />
              ייצוא
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Plus className="w-4 h-4 ml-1" />
                הוסף לוחם
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-blue-700">{stats.total}</p>
              <p className="text-xs text-blue-500">סה"כ לוחמים</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-red-700">{stats.shootingExpired}</p>
              <p className="text-xs text-red-500">חייבים מטווח</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-amber-700">{stats.shootingWarning}</p>
              <p className="text-xs text-amber-500">מטווח עומד לפוג</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4 text-center">
              <Award className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-black text-purple-700">{stats.certsExpired}</p>
              <p className="text-xs text-purple-500">הסמכות פגות</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חיפוש לפי שם או ת.ז..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
            </div>
          </div>
          <Select value={selectedRegion} onValueChange={v => { setSelectedRegion(v); setSelectedSettlement("all"); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="גזרה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הגזרות</SelectItem>
              {HAGMAR_REGIONS.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedSettlement} onValueChange={setSelectedSettlement}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="יישוב" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל היישובים</SelectItem>
              {availableSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Hierarchy View */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : (
          <div className="space-y-4">
            {HAGMAR_REGIONS.filter(r => selectedRegion === "all" || r.name === selectedRegion).map(region => (
              <Card key={region.name} className="border-border overflow-hidden">
                <Collapsible open={openRegions[region.name] !== false} onOpenChange={open => setOpenRegions(p => ({ ...p, [region.name]: open }))}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="bg-gradient-to-l from-muted to-background py-3 px-4 cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-amber-600" />
                          <CardTitle className="text-lg font-bold text-slate-800">{region.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs text-slate-700">
                             {filteredSoldiers.filter(s => getRegionFromSettlement(s.settlement) === region.name).length} לוחמים
                           </Badge>
                        </div>
                        {openRegions[region.name] !== false ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-0">
                      {region.companies.map(company => {
                        const companySoldiers = company.settlements.flatMap(s => soldiersBySettlement[s] || []);
                        if (selectedSettlement !== "all" && !company.settlements.includes(selectedSettlement)) return null;
                        return (
                          <div key={company.name} className="border-t border-border">
                            <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-800">{company.name}</span>
                               <Badge variant="outline" className="text-xs text-slate-700">{companySoldiers.length}</Badge>
                            </div>
                            {company.settlements.filter(s => selectedSettlement === "all" || s === selectedSettlement).map(settlement => {
                              const settlementSoldiers = soldiersBySettlement[settlement] || [];
                              return (
                                <div key={settlement} className="px-4 py-2 border-t border-border/50">
                                  <div className="flex items-center gap-2 mb-2">
                                   <span className="text-sm font-medium text-amber-700">🏘️ {settlement}</span>
                                     <Badge variant="outline" className="text-xs text-slate-700">{settlementSoldiers.length}</Badge>
                                  </div>
                                  {settlementSoldiers.length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-right">שם</TableHead>
                                            <TableHead className="text-right">ת.ז</TableHead>
                                            <TableHead className="text-right">נשק</TableHead>
                                            <TableHead className="text-right">מטווח</TableHead>
                                            <TableHead className="text-right">הסמכות</TableHead>
                                            <TableHead className="text-right">פעולות</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {settlementSoldiers.map(soldier => {
                                            const shooting = getShootingStatus(soldier.last_shooting_range_date);
                                            const soldierCerts = getCertsForSoldier(soldier.id);
                                            return (
                                              <TableRow key={soldier.id}>
                                                <TableCell className="font-medium">{soldier.full_name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{soldier.id_number}</TableCell>
                                                <TableCell className="text-xs">{soldier.weapon_serial || "-"}</TableCell>
                                                <TableCell>
                                                  <Badge className={`${shooting.color} text-white text-xs`}>{shooting.label}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex flex-wrap gap-1">
                                                    {soldierCerts.length > 0 ? soldierCerts.map(c => {
                                                      const status = getCertStatus(c.last_refresh_date);
                                                      const label = HAGMAR_CERT_TYPES.find(ct => ct.value === c.cert_type)?.label || c.cert_type;
                                                      return <Badge key={c.id} variant="outline" className={`text-xs ${status.status === 'expired' ? 'border-red-300 text-red-600' : status.status === 'warning' ? 'border-amber-300 text-amber-600' : 'border-emerald-300 text-emerald-600'}`}>{label.replace('הסמכת ', '')}</Badge>;
                                                    }) : <span className="text-xs text-muted-foreground">אין</span>}
                                                  </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex gap-1">
                                                    {canManage && (
                                                      <>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(soldier)}>
                                                          <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedSoldierId(soldier.id); setCertDialogOpen(true); }}>
                                                          <Award className="w-3.5 h-3.5" />
                                                        </Button>
                                                      </>
                                                    )}
                                                    {canDelete && (
                                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("להסיר לוחם?")) deleteSoldier.mutate(soldier.id); }}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </Button>
                                                    )}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground py-2 pr-4">אין לוחמים רשומים</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Soldier Dialog */}
        <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingSoldier ? "עריכת לוחם" : "הוספת לוחם"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>שם מלא *</Label>
                  <Input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div>
                  <Label>ת.ז *</Label>
                  <Input value={formData.id_number} onChange={e => setFormData(p => ({ ...p, id_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>טלפון</Label>
                  <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <Label>יישוב *</Label>
                  <Select value={formData.settlement} onValueChange={v => setFormData(p => ({ ...p, settlement: v }))}>
                    <SelectTrigger><SelectValue placeholder="בחר יישוב" /></SelectTrigger>
                    <SelectContent>
                      {HAGMAR_ALL_SETTLEMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>מידת נעליים</Label>
                  <Input value={formData.shoe_size} onChange={e => setFormData(p => ({ ...p, shoe_size: e.target.value }))} />
                </div>
                <div>
                  <Label>מידת חולצה</Label>
                  <Input value={formData.uniform_size_top} onChange={e => setFormData(p => ({ ...p, uniform_size_top: e.target.value }))} />
                </div>
                <div>
                  <Label>מידת מכנסיים</Label>
                  <Input value={formData.uniform_size_bottom} onChange={e => setFormData(p => ({ ...p, uniform_size_bottom: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>מספר צ' נשק</Label>
                  <Input value={formData.weapon_serial} onChange={e => setFormData(p => ({ ...p, weapon_serial: e.target.value }))} />
                </div>
                <div>
                  <Label>תאריך מטווח אחרון</Label>
                  <Input type="date" value={formData.last_shooting_range_date} onChange={e => setFormData(p => ({ ...p, last_shooting_range_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>הערות</Label>
                <Input value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={() => saveSoldier.mutate(formData)} disabled={!formData.full_name || !formData.id_number || !formData.settlement}>
                {editingSoldier ? "עדכן" : "הוסף"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Certification Dialog */}
        <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>ניהול הסמכה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>סוג הסמכה</Label>
                <Select value={certForm.cert_type} onValueChange={v => {
                  setCertForm(p => ({ ...p, cert_type: v }));
                  // Pre-fill existing cert data
                  if (selectedSoldierId) {
                    const existing = certifications.find(c => c.soldier_id === selectedSoldierId && c.cert_type === v);
                    if (existing) {
                      setCertForm({ cert_type: v, certified_date: existing.certified_date || "", last_refresh_date: existing.last_refresh_date || "" });
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="בחר הסמכה" /></SelectTrigger>
                  <SelectContent>
                    {HAGMAR_CERT_TYPES.map(ct => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תאריך הסמכה</Label>
                <Input type="date" value={certForm.certified_date} onChange={e => setCertForm(p => ({ ...p, certified_date: e.target.value }))} />
              </div>
              <div>
                <Label>תאריך רענון אחרון</Label>
                <Input type="date" value={certForm.last_refresh_date} onChange={e => setCertForm(p => ({ ...p, last_refresh_date: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={() => selectedSoldierId && saveCert.mutate({ ...certForm, soldier_id: selectedSoldierId })} disabled={!certForm.cert_type}>
                שמור הסמכה
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default HagmarSoldiers;