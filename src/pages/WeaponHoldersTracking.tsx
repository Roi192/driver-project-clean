import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { HAGMAR_ALL_SETTLEMENTS } from "@/lib/hagmar-constants";
import { Shield, Plus, Trash2, CalendarDays, MapPin, Search, CheckCircle2, XCircle, Phone, CreditCard, User, ChevronDown, ChevronUp, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, nextFriday, isFriday } from "date-fns";

interface WeaponHolder {
  id: string;
  soldier_id: string;
  weekend_date: string;
  settlement: string;
  is_holding_weapon: boolean;
  notes: string | null;
  soldier_name?: string;
  id_number?: string;
  phone?: string;
}

interface HagmarProfile {
  user_id: string;
  full_name: string;
  settlement: string | null;
  id_number: string | null;
  personal_number: string | null;
}

export default function WeaponHoldersTracking() {
  const { user, isHagmarAdmin, isSuperAdmin, isAdmin, isRavshatz } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  
  // Ravshatz is also a manager (for their settlement)
  const isManager = isHagmarAdmin || isSuperAdmin || isAdmin || isRavshatz;
  // Full admin = can see all settlements
  const isFullAdmin = isHagmarAdmin || isSuperAdmin || isAdmin;

  const [holders, setHolders] = useState<WeaponHolder[]>([]);
  const [profiles, setProfiles] = useState<HagmarProfile[]>([]);
  const [myProfile, setMyProfile] = useState<HagmarProfile | null>(null);
  const [myRecord, setMyRecord] = useState<WeaponHolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedSettlement, setSelectedSettlement] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterSettlement, setFilterSettlement] = useState<string>("all");
  const [weekendDate, setWeekendDate] = useState(() => {
    const now = new Date();
    const friday = isFriday(now) ? now : nextFriday(now);
    return format(friday, "yyyy-MM-dd");
  });

  useEffect(() => {
    fetchData();
  }, [weekendDate, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [holdersRes, profilesRes, myProfileRes] = await Promise.all([
        supabase
          .from("weekend_weapon_holders")
          .select("*")
          .eq("weekend_date", weekendDate),
        supabase
          .from("profiles")
          .select("user_id, full_name, settlement, id_number, personal_number")
          .eq("department", "hagmar"),
        supabase
          .from("profiles")
          .select("user_id, full_name, settlement, id_number, personal_number")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (holdersRes.error) throw holdersRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);

      const enriched: WeaponHolder[] = (holdersRes.data || []).map(h => {
        const prof = profileMap.get(h.soldier_id);
        return {
          ...h,
          notes: h.notes ?? null,
          soldier_name: prof?.full_name || "לא ידוע",
          id_number: prof?.id_number || undefined,
          phone: prof?.personal_number || undefined,
        };
      });

      setHolders(enriched);
      setProfiles(profilesRes.data || []);
      setMyProfile(myProfileRes.data as HagmarProfile | null);

      const mine = enriched.find(h => h.soldier_id === user.id);
      setMyRecord(mine || null);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  // === USER ACTIONS ===
  const markPresent = async () => {
    if (!user || !myProfile) return;
    const settlement = myProfile.settlement || "";
    if (!settlement) {
      toast.error("לא הוגדר ישוב בפרופיל שלך");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("weekend_weapon_holders").insert({
        soldier_id: user.id,
        weekend_date: weekendDate,
        settlement,
        is_holding_weapon: true,
        created_by: user.id,
      });
      if (error) {
        if (error.code === "23505") toast.error("כבר דיווחת לסופ\"ש זה");
        else throw error;
        return;
      }
      toast.success("דיווח נוכחות נשמר בהצלחה ✅");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    } finally {
      setSubmitting(false);
    }
  };

  const markAbsent = async () => {
    if (!myRecord) {
      toast.success("נרשם - לא סוגר שבת עם נשק");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("weekend_weapon_holders").delete().eq("id", myRecord.id);
      if (error) throw error;
      toast.success("הדיווח הוסר - לא נוכח");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהסרה");
    } finally {
      setSubmitting(false);
    }
  };

  // === Filtered data based on role ===
  const visibleProfiles = useMemo(() => {
    if (isRestricted && userSettlement) {
      return profiles.filter(p => p.settlement === userSettlement);
    }
    return profiles;
  }, [profiles, isRestricted, userSettlement]);

  const visibleHolders = useMemo(() => {
    if (isRestricted && userSettlement) {
      return holders.filter(h => h.settlement === userSettlement);
    }
    return holders;
  }, [holders, isRestricted, userSettlement]);

  // === ADMIN computed data ===
  const settlements = useMemo(() => {
    const set = new Set(visibleProfiles.map(p => p.settlement).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [visibleProfiles]);

  const summaryBySettlement = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    // Count all profiles per settlement
    visibleProfiles.forEach(p => {
      const s = p.settlement || "ללא ישוב";
      if (!map.has(s)) map.set(s, { present: 0, total: 0 });
      map.get(s)!.total++;
    });
    // Count present
    visibleHolders.forEach(h => {
      if (h.is_holding_weapon) {
        const s = h.settlement;
        if (!map.has(s)) map.set(s, { present: 0, total: 0 });
        map.get(s)!.present++;
      }
    });
    return map;
  }, [visibleProfiles, visibleHolders]);

  // Group profiles by settlement with present/absent/not-reported
  const settlementGroups = useMemo(() => {
    const holderMap = new Map(visibleHolders.map(h => [h.soldier_id, h]));
    const groups = new Map<string, { present: HagmarProfile[]; notHolding: HagmarProfile[]; notReported: HagmarProfile[] }>();

    visibleProfiles.forEach(p => {
      const settlement = p.settlement || "ללא ישוב";
      
      // Apply settlement filter for full admin
      if (isFullAdmin && filterSettlement !== "all" && settlement !== filterSettlement) return;
      
      if (!groups.has(settlement)) groups.set(settlement, { present: [], notHolding: [], notReported: [] });
      const group = groups.get(settlement)!;
      
      const holder = holderMap.get(p.user_id);
      if (holder) {
        if (holder.is_holding_weapon) {
          group.present.push(p);
        } else {
          group.notHolding.push(p);
        }
      } else {
        group.notReported.push(p);
      }
    });

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      const filtered = new Map<string, { present: HagmarProfile[]; notHolding: HagmarProfile[]; notReported: HagmarProfile[] }>();
      groups.forEach((group, settlement) => {
        if (settlement.toLowerCase().includes(q)) {
          filtered.set(settlement, group);
        } else {
          const fp = group.present.filter(p => p.full_name.toLowerCase().includes(q));
          const fnh = group.notHolding.filter(p => p.full_name.toLowerCase().includes(q));
          const fnr = group.notReported.filter(p => p.full_name.toLowerCase().includes(q));
          if (fp.length || fnh.length || fnr.length) filtered.set(settlement, { present: fp, notHolding: fnh, notReported: fnr });
        }
      });
      return filtered;
    }
    return groups;
  }, [visibleProfiles, visibleHolders, search, filterSettlement, isFullAdmin]);

  const [expandedSettlement, setExpandedSettlement] = useState<string | null>(null);

  // Auto-expand for ravshatz (single settlement)
  useEffect(() => {
    if (isRestricted && userSettlement && settlementGroups.size === 1) {
      setExpandedSettlement(userSettlement);
    }
  }, [isRestricted, userSettlement, settlementGroups]);

  const addHolder = async () => {
    if (!selectedProfile) return;
    const profile = visibleProfiles.find(p => p.user_id === selectedProfile);
    if (!profile) return;
    const settlement = selectedSettlement || profile.settlement || "";
    if (!settlement) {
      toast.error("יש לבחור ישוב");
      return;
    }
    try {
      const { error } = await supabase.from("weekend_weapon_holders").insert({
        soldier_id: profile.user_id,
        weekend_date: weekendDate,
        settlement,
        is_holding_weapon: true,
        notes: notes || null,
        created_by: user?.id,
      });
      if (error) {
        if (error.code === "23505") toast.error("המשתמש כבר רשום לסופ\"ש זה");
        else throw error;
        return;
      }
      toast.success("נוסף בהצלחה");
      setAddDialogOpen(false);
      setSelectedProfile("");
      setSelectedSettlement("");
      setNotes("");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהוספה");
    }
  };

  const removeHolder = async (id: string) => {
    try {
      const { error } = await supabase.from("weekend_weapon_holders").delete().eq("id", id);
      if (error) throw error;
      toast.success("הוסר בהצלחה");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקה");
    }
  };

  const toggleHolderStatus = async (solderId: string, currentlyHolding: boolean) => {
    const holderRecord = visibleHolders.find(h => h.soldier_id === solderId);
    if (currentlyHolding && holderRecord) {
      // Remove
      await removeHolder(holderRecord.id);
    } else if (!currentlyHolding) {
      // Find profile and add
      const profile = visibleProfiles.find(p => p.user_id === solderId);
      if (!profile) return;
      try {
        const { error } = await supabase.from("weekend_weapon_holders").insert({
          soldier_id: solderId,
          weekend_date: weekendDate,
          settlement: profile.settlement || "",
          is_holding_weapon: true,
          created_by: user?.id,
        });
        if (error) {
          if (error.code === "23505") toast.error("כבר רשום");
          else throw error;
          return;
        }
        toast.success("סטטוס עודכן");
        fetchData();
      } catch (err) {
        console.error(err);
        toast.error("שגיאה בעדכון");
      }
    }
  };

  const goToPrevWeekend = () => {
    const d = new Date(weekendDate);
    d.setDate(d.getDate() - 7);
    setWeekendDate(format(d, "yyyy-MM-dd"));
  };

  const goToNextWeekend = () => {
    const d = new Date(weekendDate);
    d.setDate(d.getDate() + 7);
    setWeekendDate(format(d, "yyyy-MM-dd"));
  };

  const totalPresent = visibleHolders.filter(h => h.is_holding_weapon).length;
  const totalProfiles = visibleProfiles.length;
  const totalNotReported = totalProfiles - visibleHolders.length;

  // Person row component
  const PersonRow = ({ p, status, showActions }: { p: HagmarProfile; status: 'present' | 'notHolding' | 'notReported'; showActions: boolean }) => {
    const isPresent = status === 'present';
    const holderRecord = visibleHolders.find(h => h.soldier_id === p.user_id);
    
    return (
      <div className={`flex items-center justify-between rounded-lg p-2.5 ${
        isPresent ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted/50'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
            isPresent ? 'bg-emerald-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'
          }`}>
            {p.full_name.charAt(0)}
          </div>
          <div>
            <p className={`font-bold text-sm ${isPresent ? 'text-foreground' : 'text-muted-foreground'}`}>{p.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              {p.id_number && (
                <span className="flex items-center gap-0.5">
                  <CreditCard className="w-3 h-3" />
                  {p.id_number}
                </span>
              )}
              {p.personal_number && (
                <span className="flex items-center gap-0.5">
                  <Phone className="w-3 h-3" />
                  {p.personal_number}
                </span>
              )}
            </div>
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-1">
            {isPresent && holderRecord ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleHolderStatus(p.user_id, true)}
                className="text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 ml-1" />
                הסר
              </Button>
            ) : !isPresent ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleHolderStatus(p.user_id, false)}
                className="text-emerald-600 hover:bg-emerald-50 h-7 px-2 text-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                סוגר
              </Button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader
            title="מעקב אוחזי נשק"
            subtitle={isRestricted && userSettlement ? `ישוב: ${userSettlement}` : "מעקב שבועי על אוחזי נשק ביישובים"}
            icon={Shield}
          />

          {/* Weekend Navigation */}
          <Card className="p-4 bg-card/90 backdrop-blur-sm border-border">
             <Label className="text-sm font-bold mb-2 block text-slate-800 flex items-center gap-1.5">
               <CalendarDays className="w-4 h-4 text-slate-600" />
               סוף שבוע
             </Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevWeekend}>←</Button>
              <Input
                type="date"
                value={weekendDate}
                onChange={e => setWeekendDate(e.target.value)}
                className="flex-1 h-11 text-center font-bold"
              />
              <Button variant="outline" size="sm" onClick={goToNextWeekend}>→</Button>
            </div>
          </Card>

          {/* ===== FIGHTER VIEW (non-manager) ===== */}
          {!isManager && (
            <div className="space-y-4">
              {myProfile && (
                <Card className="p-5 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
                  <h3 className="font-black text-base mb-3 text-amber-800">הפרטים שלי</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-amber-600" />
                      <span className="text-slate-600">שם מלא:</span>
                      <span className="font-bold text-slate-800">{myProfile.full_name}</span>
                    </div>
                    {myProfile.id_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                        <span className="text-slate-600">ת.ז:</span>
                        <span className="font-bold text-slate-800">{myProfile.id_number}</span>
                      </div>
                    )}
                    {myProfile.personal_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-amber-600" />
                        <span className="text-slate-600">טלפון:</span>
                        <span className="font-bold text-slate-800">{myProfile.personal_number}</span>
                      </div>
                    )}
                    {myProfile.settlement && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span className="text-slate-600">ישוב:</span>
                        <span className="font-bold text-slate-800">{myProfile.settlement}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : myRecord ? (
                <Card className="p-5 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    <div>
                      <p className="font-black text-emerald-800 text-lg">נוכח - סוגר שבת עם נשק</p>
                      <p className="text-sm text-emerald-600">{myRecord.settlement}</p>
                    </div>
                  </div>
                  <Button
                    onClick={markAbsent}
                    disabled={submitting}
                    variant="outline"
                    className="w-full h-12 border-red-300 text-red-600 hover:bg-red-50 font-bold gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    {submitting ? "מעדכן..." : "ביטול - לא נוכח"}
                  </Button>
                </Card>
              ) : (
                <Card className="p-5 border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-8 h-8 text-slate-400" />
                    <div>
                      <p className="font-bold text-slate-700">לא דיווחת עדיין</p>
                      <p className="text-sm text-slate-500">האם אתה סוגר שבת עם נשק?</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={markPresent}
                      disabled={submitting || !myProfile?.settlement}
                      className="w-full h-14 text-lg font-black gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      {submitting ? "שומר..." : "כן - סוגר שבת עם נשק ✅"}
                    </Button>
                    <Button
                      onClick={markAbsent}
                      disabled={submitting}
                      variant="outline"
                      className="w-full h-12 font-bold gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-5 h-5" />
                      {submitting ? "שומר..." : "לא - לא סוגר שבת ❌"}
                    </Button>
                  </div>
                  {!myProfile?.settlement && (
                    <p className="text-xs text-red-500 mt-2 text-center">לא הוגדר ישוב בפרופיל שלך - פנה למנהל</p>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ===== MANAGER VIEW (Ravshatz + HAGMAR Admin) ===== */}
          {isManager && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold">סוגרים</span>
                  </div>
                  <p className="text-2xl font-black">{totalPresent}</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-red-500 to-rose-500 text-white border-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">לא דיווחו</span>
                  </div>
                  <p className="text-2xl font-black">{totalNotReported}</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold">סה"כ</span>
                  </div>
                  <p className="text-2xl font-black">{totalProfiles}</p>
                </Card>
              </div>

              {/* Settlement filter - only for full admin */}
              {isFullAdmin && (
                <Card className="p-3 border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={filterSettlement} onValueChange={setFilterSettlement}>
                      <SelectTrigger className="flex-1 h-10">
                        <SelectValue placeholder="כל היישובים" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">כל היישובים</SelectItem>
                        {HAGMAR_ALL_SETTLEMENTS.map(s => {
                          const summary = summaryBySettlement.get(s);
                          return (
                            <SelectItem key={s} value={s}>
                              {s} {summary ? `(${summary.present}/${summary.total})` : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>
              )}

              {/* Per-settlement summary table - only for full admin when viewing all */}
              {isFullAdmin && filterSettlement === "all" && summaryBySettlement.size > 0 && (
                <Card className="p-3 border-border overflow-hidden">
                   <h3 className="font-black text-sm mb-2 text-slate-800 flex items-center gap-1.5">
                     <MapPin className="w-4 h-4 text-slate-600" />
                     סיכום לפי יישוב
                   </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {Array.from(summaryBySettlement.entries())
                      .sort((a, b) => b[1].present - a[1].present)
                      .map(([settlement, data]) => (
                        <div key={settlement} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30 text-sm">
                          <span className="font-bold text-slate-800">{settlement}</span>
                           <div className="flex items-center gap-3">
                             <span className="text-emerald-600 font-bold">{data.present} סוגרים</span>
                             <span className="text-slate-500">{data.total - data.present} לא</span>
                             <Badge variant="outline" className="text-xs text-slate-700">{data.total}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="חיפוש לפי שם או ישוב..."
                  className="pr-9 h-10"
                />
              </div>

              {/* Add button */}
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="w-full h-11 font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                הוספת אוחז נשק
              </Button>

              {/* Settlement Groups */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-muted-foreground">טוען...</p>
                </div>
              ) : settlementGroups.size === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="font-bold text-foreground">אין נתונים</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from(settlementGroups.entries())
                    .sort((a, b) => b[1].present.length - a[1].present.length)
                    .map(([settlement, group]) => {
                      const isExpanded = expandedSettlement === settlement;
                      const total = group.present.length + group.notHolding.length + group.notReported.length;
                      return (
                        <Card key={settlement} className="overflow-hidden border-border">
                          <button
                            onClick={() => setExpandedSettlement(isExpanded ? null : settlement)}
                            className="w-full p-4 flex items-center justify-between text-right hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                                <MapPin className="w-5 h-5" />
                              </div>
                              <div className="text-right">
                                <p className="font-black text-base text-slate-800">{settlement}</p>
                                <div className="flex items-center gap-3 text-xs mt-0.5">
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {group.present.length} סוגרים
                                  </span>
                                  <span className="text-red-500 font-bold flex items-center gap-1">
                                    <XCircle className="w-3 h-3" />
                                    {group.notReported.length} לא דיווחו
                                  </span>
                                   <span className="text-slate-500 flex items-center gap-1">
                                     <Users className="w-3 h-3" />
                                     {total}
                                   </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 text-lg px-3">
                                {group.present.length}
                              </Badge>
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border">
                              {/* Present */}
                              {group.present.length > 0 && (
                                <div className="p-3 space-y-2">
                                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 px-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    סוגרים שבת עם נשק ({group.present.length})
                                  </p>
                                  {group.present.map(p => (
                                    <PersonRow key={p.user_id} p={p} status="present" showActions={true} />
                                  ))}
                                </div>
                              )}

                              {/* Not Reported */}
                              {group.notReported.length > 0 && (
                                <div className="p-3 space-y-2 border-t border-border/50">
                                  <p className="text-xs font-bold text-red-500 flex items-center gap-1 px-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    לא דיווחו ({group.notReported.length})
                                  </p>
                                  {group.notReported.map(p => (
                                    <PersonRow key={p.user_id} p={p} status="notReported" showActions={true} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              הוספת אוחז נשק
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-bold mb-1 block">בחר משתמש</Label>
              <Select value={selectedProfile} onValueChange={v => {
                setSelectedProfile(v);
                const p = visibleProfiles.find(p => p.user_id === v);
                if (p?.settlement) setSelectedSettlement(p.settlement);
              }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="בחר..." />
                </SelectTrigger>
                <SelectContent>
                  {visibleProfiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name} {p.settlement ? `(${p.settlement})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold mb-1 block">ישוב</Label>
              <Select value={selectedSettlement} onValueChange={setSelectedSettlement}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="בחר ישוב..." />
                </SelectTrigger>
                <SelectContent>
                  {settlements.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold mb-1 block">הערות</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="הערות נוספות..."
              />
            </div>
            <Button
              onClick={addHolder}
              disabled={!selectedProfile}
              className="w-full h-12 font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף אוחז נשק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}