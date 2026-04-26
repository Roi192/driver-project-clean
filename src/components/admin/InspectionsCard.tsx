import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { ClipboardCheck, Eye, User, TrendingUp, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface Inspection {
  id: string;
  inspection_date: string;
  created_at?: string;
  platoon: string;
  commander_name: string;
  soldier_id: string;
  inspector_name: string;
  combat_score: number;
  vehicle_score: number;
  procedures_score: number;
  safety_score: number;
  routes_familiarity_score: number;
  simulations_score: number;
  total_score: number;
  general_notes: string | null;
  combat_debrief_by: string | null;
  combat_driver_participated: boolean;
  combat_driver_in_debrief: boolean;
  vehicle_tlt_oil: boolean;
  vehicle_tlt_water: boolean;
  vehicle_tlt_nuts: boolean;
  vehicle_tlt_pressure: boolean;
  vehicle_vardim_knowledge: boolean;
  vehicle_mission_sheet: boolean;
  vehicle_work_card: boolean;
  vehicle_clean: boolean;
  vehicle_equipment_secured: boolean;
  procedures_descent_drill: boolean;
  procedures_rollover_drill: boolean;
  procedures_fire_drill: boolean;
  procedures_combat_equipment: boolean;
  procedures_weapon_present: boolean;
  safety_ten_commandments: boolean;
  safety_driver_tools_extinguisher: boolean;
  safety_driver_tools_jack: boolean;
  safety_driver_tools_wheel_key: boolean;
  safety_driver_tools_vest: boolean;
  safety_driver_tools_triangle: boolean;
  safety_driver_tools_license: boolean;
  routes_notes: string | null;
  soldiers?: { full_name: string; personal_number: string };
}

export function InspectionsCard() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    // Fetch recent for list
    const { data: recentData } = await supabase
      .from("inspections")
      .select("*, soldiers(full_name, personal_number)")
      .order("inspection_date", { ascending: false })
      .limit(10);

    // Fetch all for trends
    const { data: allData } = await supabase
      .from("inspections")
      .select("*, soldiers(full_name, personal_number)")
      .order("inspection_date", { ascending: true });

    if (recentData) setInspections(recentData);
    if (allData) setAllInspections(allData);
  };

  const avgScore = inspections.length > 0
    ? Math.round(inspections.reduce((sum, i) => sum + i.total_score, 0) / inspections.length)
    : 0;

  const getInspectionPerformedAt = (inspection: Pick<Inspection, "created_at" | "inspection_date">) =>
    parseISO(inspection.created_at ?? inspection.inspection_date);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  // Calculate trend data - last 6 months
  const getTrendData = () => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthInspections = allInspections.filter(i => {
        const date = parseISO(i.inspection_date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const avg = monthInspections.length > 0
        ? Math.round(monthInspections.reduce((sum, i) => sum + i.total_score, 0) / monthInspections.length)
        : 0;
      
      return {
        month: format(month, "MMM", { locale: he }),
        ממוצע: avg,
        כמות: monthInspections.length
      };
    });
  };

  // Category breakdown
  const getCategoryAverages = () => {
    if (allInspections.length === 0) return [];
    
    const categories = [
      { key: "combat_score", label: "נוהל קרב", max: 10 },
      { key: "vehicle_score", label: "רכב", max: 30 },
      { key: "procedures_score", label: "נהלים", max: 20 },
      { key: "safety_score", label: "בטיחות", max: 10 },
      { key: "routes_familiarity_score", label: "נתבים", max: 15 },
      { key: "simulations_score", label: "מקתגים", max: 15 },
    ];
    
    return categories.map(cat => {
      const avg = Math.round(
        allInspections.reduce((sum, i) => sum + (i[cat.key as keyof Inspection] as number), 0) / allInspections.length
      );
      const percentage = Math.round((avg / cat.max) * 100);
      return {
        name: cat.label,
        ציון: avg,
        מקסימום: cat.max,
        אחוז: percentage
      };
    });
  };

  const trendData = getTrendData();
  const categoryData = getCategoryAverages();

  return (
    <>
      <Card className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_50px_rgba(0,0,0,0.12)] transition-all duration-500 rounded-3xl col-span-2">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-slate-800 font-bold">ביקורות</span>
                <p className="text-sm text-slate-500">{allInspections.length} ביקורות סה"כ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${getScoreColor(avgScore)} text-white px-3 py-1`}>
                ממוצע: {avgScore}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl mb-4">
              <TabsTrigger value="list" className="rounded-lg text-xs">רשימה</TabsTrigger>
              <TabsTrigger value="trends" className="rounded-lg text-xs">מגמות</TabsTrigger>
              <TabsTrigger value="categories" className="rounded-lg text-xs">קטגוריות</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <ScrollArea className="max-h-[280px]">
                <div className="space-y-2">
                  {inspections.map(inspection => (
                    <div
                      key={inspection.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedInspection(inspection)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{inspection.soldiers?.full_name}</p>
                          <p className="text-xs text-slate-500">
                            {format(getInspectionPerformedAt(inspection), "dd/MM/yyyy HH:mm")} | {inspection.platoon}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreColor(inspection.total_score)} text-white`}>
                          {inspection.total_score}
                        </Badge>
                        <Eye className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                  
                  {inspections.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>אין ביקורות</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="trends">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>מגמת ציונים - 6 חודשים אחרונים</span>
                </div>
                <div className="h-[220px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number, name: string) => [value, name === 'ממוצע' ? 'ציון ממוצע' : 'כמות ביקורות']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ממוצע" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#6366f1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {trendData.slice(-3).map((item, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50">
                      <p className="text-lg font-bold text-indigo-600">{item.ממוצע}</p>
                      <p className="text-xs text-slate-500">{item.month} ({item.כמות})</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>ממוצע לפי קטגוריה</span>
                </div>
                <div className="h-[200px]" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={50} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0'
                        }}
                        formatter={(value: number) => [`${value}%`, 'אחוז']}
                      />
                      <Bar dataKey="אחוז" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${cat.אחוז >= 70 ? 'text-emerald-600' : cat.אחוז >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {cat.ציון}/{cat.מקסימום}
                        </span>
                        <Badge className={`${cat.אחוז >= 70 ? 'bg-emerald-500' : cat.אחוז >= 50 ? 'bg-amber-500' : 'bg-red-500'} text-white text-xs`}>
                          {cat.אחוז}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Inspection Detail Dialog */}
      <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              פרטי ביקורת
            </DialogTitle>
          </DialogHeader>

          {selectedInspection && (
            <div className="space-y-4">
              {/* General Info */}
              <div className="p-4 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-800 mb-2">{selectedInspection.soldiers?.full_name}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-slate-500">תאריך:</span> {format(getInspectionPerformedAt(selectedInspection), "dd/MM/yyyy HH:mm")}</p>
                  <p><span className="text-slate-500">פלוגה:</span> {selectedInspection.platoon}</p>
                  <p><span className="text-slate-500">מפקד:</span> {selectedInspection.commander_name}</p>
                  <p><span className="text-slate-500">מבצע הביקורת:</span> {selectedInspection.inspector_name}</p>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "נוהל קרב", score: selectedInspection.combat_score, max: 10 },
                  { label: "רכב", score: selectedInspection.vehicle_score, max: 30 },
                  { label: "נהלים", score: selectedInspection.procedures_score, max: 20 },
                  { label: "בטיחות", score: selectedInspection.safety_score, max: 10 },
                  { label: "נתבים", score: selectedInspection.routes_familiarity_score, max: 15 },
                  { label: "מקתגים", score: selectedInspection.simulations_score, max: 15 },
                ].map(item => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-slate-50">
                    <p className={`text-xl font-black ${item.score / item.max >= 0.7 ? 'text-emerald-600' : item.score / item.max >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {item.score}/{item.max}
                    </p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Total Score */}
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50">
                <p className="text-4xl font-black text-indigo-600">{selectedInspection.total_score}</p>
                <p className="text-sm text-slate-600">ציון כולל</p>
              </div>

              {/* Combat Details */}
              <div className="p-4 rounded-xl border">
                <h5 className="font-bold text-slate-800 mb-2">נוהל קרב</h5>
                <div className="space-y-1 text-sm">
                  <p>תחקיר ע"י: {selectedInspection.combat_debrief_by || "-"}</p>
                  <p>השתתף בנוהל קרב: {selectedInspection.combat_driver_participated ? "✓" : "✗"}</p>
                  <p>נוכח בתחקיר: {selectedInspection.combat_driver_in_debrief ? "✓" : "✗"}</p>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="p-4 rounded-xl border">
                <h5 className="font-bold text-slate-800 mb-2">רכב</h5>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <p>בדיקת שמן: {selectedInspection.vehicle_tlt_oil ? "✓" : "✗"}</p>
                  <p>בדיקת מים: {selectedInspection.vehicle_tlt_water ? "✓" : "✗"}</p>
                  <p>בדיקת אומים: {selectedInspection.vehicle_tlt_nuts ? "✓" : "✗"}</p>
                  <p>בדיקת לחץ: {selectedInspection.vehicle_tlt_pressure ? "✓" : "✗"}</p>
                  <p>הכרת ורדים: {selectedInspection.vehicle_vardim_knowledge ? "✓" : "✗"}</p>
                  <p>דף משימה: {selectedInspection.vehicle_mission_sheet ? "✓" : "✗"}</p>
                  <p>כרטיס עבודה: {selectedInspection.vehicle_work_card ? "✓" : "✗"}</p>
                  <p>רכב נקי: {selectedInspection.vehicle_clean ? "✓" : "✗"}</p>
                  <p>ציוד מעוגן: {selectedInspection.vehicle_equipment_secured ? "✓" : "✗"}</p>
                </div>
              </div>

              {/* Procedures Details */}
              <div className="p-4 rounded-xl border">
                <h5 className="font-bold text-slate-800 mb-2">נהלים</h5>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <p>ירידה לשול: {selectedInspection.procedures_descent_drill ? "✓" : "✗"}</p>
                  <p>התהפכות: {selectedInspection.procedures_rollover_drill ? "✓" : "✗"}</p>
                  <p>שריפה: {selectedInspection.procedures_fire_drill ? "✓" : "✗"}</p>
                  <p>ציוד לחימה: {selectedInspection.procedures_combat_equipment ? "✓" : "✗"}</p>
                  <p>נשק נהג: {selectedInspection.procedures_weapon_present ? "✓" : "✗"}</p>
                </div>
              </div>

              {/* Safety Details */}
              <div className="p-4 rounded-xl border">
                <h5 className="font-bold text-slate-800 mb-2">בטיחות</h5>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  <p>עשרת הדיברות: {selectedInspection.safety_ten_commandments ? "✓" : "✗"}</p>
                  <p>מטף: {selectedInspection.safety_driver_tools_extinguisher ? "✓" : "✗"}</p>
                  <p>ג'ק: {selectedInspection.safety_driver_tools_jack ? "✓" : "✗"}</p>
                  <p>מפתח גלגלים: {selectedInspection.safety_driver_tools_wheel_key ? "✓" : "✗"}</p>
                  <p>אפודה: {selectedInspection.safety_driver_tools_vest ? "✓" : "✗"}</p>
                  <p>משולש: {selectedInspection.safety_driver_tools_triangle ? "✓" : "✗"}</p>
                  <p>רשיון רכב: {selectedInspection.safety_driver_tools_license ? "✓" : "✗"}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedInspection.general_notes && (
                <div className="p-4 rounded-xl border">
                  <h5 className="font-bold text-slate-800 mb-2">הערות כלליות</h5>
                  <p className="text-sm text-slate-600">{selectedInspection.general_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}