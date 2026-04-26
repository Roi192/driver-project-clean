import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Target, Plus, Calendar, MapPin, Users, ChevronDown, ChevronUp, Trash2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { HAGMAR_REGIONS, HAGMAR_ALL_SETTLEMENTS, getRegionFromSettlement, getCompanyFromSettlement } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

interface ShootingRange {
  id: string;
  settlement: string;
  range_date: string;
  exercises: string[] | null;
  summary: string | null;
  company: string | null;
  region: string | null;
  created_at: string;
}

interface ShootingScore {
  id: string;
  range_id: string;
  soldier_id: string;
  exercise_name: string | null;
  hits: number;
  total_shots: number;
  score: number | null;
  attended: boolean;
  notes: string | null;
}

interface Soldier {
  id: string;
  full_name: string;
  settlement: string;
}

export default function HagmarShootingRanges() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [ranges, setRanges] = useState<ShootingRange[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [scores, setScores] = useState<Map<string, ShootingScore[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRange, setExpandedRange] = useState<string | null>(null);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [filterSettlement, setFilterSettlement] = useState("all");

  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formSettlement, setFormSettlement] = useState("");
  const [formExercises, setFormExercises] = useState("");
  const [formSummary, setFormSummary] = useState("");

  const [scoreSoldierId, setScoreSoldierId] = useState("");
  const [scoreExercise, setScoreExercise] = useState("");
  const [scoreHits, setScoreHits] = useState(0);
  const [scoreTotalShots, setScoreTotalShots] = useState(0);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [rangesRes, soldiersRes] = await Promise.all([
      supabase.from("hagmar_shooting_ranges").select("*").order("range_date", { ascending: false }),
      supabase.from("hagmar_soldiers").select("id, full_name, settlement").eq("is_active", true),
    ]);
    setRanges((rangesRes.data || []) as ShootingRange[]);
    setSoldiers(soldiersRes.data || []);
    setLoading(false);
  };

  const fetchScores = async (rangeId: string) => {
    const { data } = await supabase.from("hagmar_shooting_scores").select("*").eq("range_id", rangeId);
    setScores(prev => new Map(prev).set(rangeId, (data || []) as ShootingScore[]));
  };

  const toggleRange = (id: string) => {
    if (expandedRange === id) { setExpandedRange(null); return; }
    setExpandedRange(id);
    if (!scores.has(id)) fetchScores(id);
  };

  const allSettlements = useMemo(() => {
    if (isRestricted && userSettlement) return [userSettlement];
    return HAGMAR_ALL_SETTLEMENTS;
  }, [isRestricted, userSettlement]);

  const visibleRanges = useMemo(() => {
    let result = ranges;
    if (isRestricted && userSettlement) result = result.filter(r => r.settlement === userSettlement);
    if (filterSettlement !== "all") result = result.filter(r => r.settlement === filterSettlement);
    return result;
  }, [ranges, isRestricted, userSettlement, filterSettlement]);

  const createRange = async () => {
    if (!formSettlement || !formDate) { toast.error("יש למלא ישוב ותאריך"); return; }
    const { error } = await supabase.from("hagmar_shooting_ranges").insert({
      settlement: formSettlement,
      range_date: formDate,
      exercises: formExercises ? formExercises.split(",").map(s => s.trim()) : null,
      summary: formSummary || null,
      region: getRegionFromSettlement(formSettlement),
      company: getCompanyFromSettlement(formSettlement),
      created_by: user?.id,
    });
    if (error) { toast.error("שגיאה ביצירה"); return; }
    toast.success("מטווח נוצר בהצלחה");
    setDialogOpen(false);
    fetchData();
  };

  const deleteRange = async (id: string) => {
    if (!confirm("למחוק מטווח זה?")) return;
    await supabase.from("hagmar_shooting_scores").delete().eq("range_id", id);
    await supabase.from("hagmar_shooting_ranges").delete().eq("id", id);
    toast.success("נמחק");
    fetchData();
  };

  const addScore = async () => {
    if (!activeRangeId || !scoreSoldierId) { toast.error("יש לבחור לוחם"); return; }
    const { error } = await supabase.from("hagmar_shooting_scores").insert({
      range_id: activeRangeId,
      soldier_id: scoreSoldierId,
      exercise_name: scoreExercise || null,
      hits: scoreHits,
      total_shots: scoreTotalShots,
      score: scoreTotalShots > 0 ? Math.round((scoreHits / scoreTotalShots) * 100) : 0,
    });
    if (error) { toast.error("שגיאה"); return; }
    toast.success("תוצאה נוספה");
    fetchScores(activeRangeId);
    setScoreSoldierId("");
    setScoreExercise("");
    setScoreHits(0);
    setScoreTotalShots(0);
  };

  const addAllSoldiersToRange = async (rangeId: string, settlement: string) => {
    const relevantSoldiers = soldiers.filter(s => s.settlement === settlement);
    const existing = scores.get(rangeId) || [];
    const existingIds = new Set(existing.map(s => s.soldier_id));
    const toAdd = relevantSoldiers.filter(s => !existingIds.has(s.id));
    if (toAdd.length === 0) { toast.info("כל הלוחמים כבר רשומים"); return; }
    const { error } = await supabase.from("hagmar_shooting_scores").insert(
      toAdd.map(s => ({ range_id: rangeId, soldier_id: s.id, hits: 0, total_shots: 0, score: 0 }))
    );
    if (error) { toast.error("שגיאה"); return; }
    toast.success(`${toAdd.length} לוחמים נוספו`);
    fetchScores(rangeId);
  };

  const getSoldierName = (id: string) => soldiers.find(s => s.id === id)?.full_name || "לא ידוע";

  const exportToExcel = () => {
    const rows = visibleRanges.map(r => ({
      "ישוב": r.settlement,
      "תאריך": r.range_date,
      "מקצים": r.exercises?.join(", ") || "",
      "סיכום": r.summary || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מטווחים");
    XLSX.writeFile(wb, `מטווחים_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="מטווחים" subtitle="ניהול מטווחים ומעקב פגיעות" icon={Target} />

          {isManager && (
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} className="flex-1 h-12 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold gap-2">
                <Plus className="w-5 h-5" /> מטווח חדש
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="h-12 gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Excel
              </Button>
            </div>
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
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : visibleRanges.length === 0 ? (
            <div className="text-center py-12"><Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין מטווחים</p></div>
          ) : (
            <div className="space-y-3">
              {visibleRanges.map(range => {
                const isExpanded = expandedRange === range.id;
                const rangeScores = scores.get(range.id) || [];
                const attended = rangeScores.filter(s => s.attended).length;
                const avgScore = rangeScores.length > 0 ? Math.round(rangeScores.reduce((sum, s) => sum + (s.score || 0), 0) / rangeScores.length) : 0;

                return (
                  <Card key={range.id} className="overflow-hidden border-border">
                    <div className="p-4 cursor-pointer" onClick={() => toggleRange(range.id)}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className="bg-red-100 text-red-700 border-red-200 mb-1">מטווח</Badge>
                          <h3 className="font-bold text-foreground">{range.settlement}</h3>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{range.range_date}</span>
                        {range.exercises && <span>מקצים: {range.exercises.join(", ")}</span>}
                        {rangeScores.length > 0 && (
                          <>
                            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{attended}/{rangeScores.length}</span>
                            <span>ממוצע: {avgScore}%</span>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-3 bg-muted/30">
                        {range.summary && <p className="text-sm text-muted-foreground">{range.summary}</p>}
                        
                        {isManager && (
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => addAllSoldiersToRange(range.id, range.settlement)} className="gap-1">
                              <Users className="w-4 h-4" /> הוסף לוחמי ישוב
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setActiveRangeId(range.id); setScoreDialogOpen(true); }} className="gap-1">
                              <Plus className="w-4 h-4" /> הוסף תוצאה
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteRange(range.id)} className="gap-1">
                              <Trash2 className="w-4 h-4" /> מחק
                            </Button>
                          </div>
                        )}

                        {rangeScores.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-sm font-bold">תוצאות ({rangeScores.length})</p>
                            {rangeScores.map(s => (
                              <div key={s.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background border border-border">
                                <div>
                                  <span className="text-sm font-medium">{getSoldierName(s.soldier_id)}</span>
                                  {s.exercise_name && <span className="text-xs text-muted-foreground mr-2">({s.exercise_name})</span>}
                                </div>
                                <div className="text-sm">
                                  <span className="font-bold">{s.hits}/{s.total_shots}</span>
                                  <span className="mr-2 text-xs text-muted-foreground">({s.score}%)</span>
                                </div>
                              </div>
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
      </div>

      {/* Create Range Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>מטווח חדש</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>ישוב *</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תאריך *</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div><Label>מקצים (מופרדים בפסיקים)</Label><Input value={formExercises} onChange={e => setFormExercises(e.target.value)} placeholder='מקצה 1, מקצה 2...' /></div>
            <div><Label>סיכום</Label><Textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} rows={3} /></div>
            <Button onClick={createRange} className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold">צור מטווח</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Score Dialog */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>הוסף תוצאת ירי</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>לוחם *</Label>
              <Select value={scoreSoldierId} onValueChange={setScoreSoldierId}>
                <SelectTrigger><SelectValue placeholder="בחר לוחם" /></SelectTrigger>
                <SelectContent>{soldiers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.settlement})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>שם מקצה</Label><Input value={scoreExercise} onChange={e => setScoreExercise(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>פגיעות</Label><Input type="number" value={scoreHits} onChange={e => setScoreHits(Number(e.target.value))} min={0} /></div>
              <div><Label>סה"כ יריות</Label><Input type="number" value={scoreTotalShots} onChange={e => setScoreTotalShots(Number(e.target.value))} min={0} /></div>
            </div>
            <Button onClick={addScore} className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold">הוסף תוצאה</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}