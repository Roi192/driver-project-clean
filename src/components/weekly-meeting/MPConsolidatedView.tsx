import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Users, Heart, Shield, AlertTriangle, Clock, FileText, Save, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";
import { REGIONS } from "@/lib/constants";
import { toast } from "sonner";

interface MPConsolidatedViewProps {
  weekStart: Date;
}

interface RegionData {
  region: string;
  weeklyOpening: any;
  manpower: any[];
  fitnessIssues: any[];
  safetyActivities: any[];
  schedule: any[];
  concerns: string | null;
  needsCommanderHelp: boolean;
  commanderHelpDescription: string | null;
}

const DAYS = [
  { value: 0, label: "ראשון", short: "א'" },
  { value: 1, label: "שני", short: "ב'" },
  { value: 2, label: "שלישי", short: "ג'" },
  { value: 3, label: "רביעי", short: "ד'" },
  { value: 4, label: "חמישי", short: "ה'" },
  { value: 5, label: "שישי", short: "ו'" },
  { value: 6, label: "שבת", short: "ש'" },
];

export function MPConsolidatedView({ weekStart }: MPConsolidatedViewProps) {
  const [regionsData, setRegionsData] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emphases, setEmphases] = useState<Record<string, string>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    fetchAllRegionsData();
    fetchMPNotes();
  }, [weekStartFormatted]);

  const fetchMPNotes = async () => {
    const { data } = await supabase
      .from('mp_weekly_notes' as any)
      .select('*')
      .eq('week_start_date', weekStartFormatted)
      .maybeSingle();

    if (data) {
      setGeneralNotes((data as any).general_notes || "");
      setEmphases((data as any).region_emphases ? 
        (typeof (data as any).region_emphases === 'string' 
          ? JSON.parse((data as any).region_emphases) 
          : (data as any).region_emphases) 
        : {});
    }
  };

  const fetchAllRegionsData = async () => {
    setIsLoading(true);

    // Fetch all weekly openings for this week
    const { data: openings } = await supabase
      .from('weekly_openings')
      .select('*')
      .eq('week_start_date', weekStartFormatted);

    if (!openings || openings.length === 0) {
      setRegionsData([]);
      setIsLoading(false);
      return;
    }

    const openingIds = openings.map(o => o.id);

    // Fetch all related data in parallel
    const [manpowerRes, fitnessRes, safetyRes, scheduleRes] = await Promise.all([
      supabase
        .from('weekly_manpower')
        .select('*, soldier:soldiers(full_name, personal_number)')
        .in('weekly_opening_id', openingIds),
      supabase
        .from('weekly_fitness_issues')
        .select('*, soldier:soldiers(full_name, personal_number)')
        .in('weekly_opening_id', openingIds),
      supabase
        .from('weekly_safety_activities')
        .select('*, soldier:soldiers(full_name)')
        .in('weekly_opening_id', openingIds),
      supabase
        .from('weekly_schedule')
        .select('*')
        .in('weekly_opening_id', openingIds)
        .order('scheduled_day'),
    ]);

    // Build data per region
    const data: RegionData[] = openings.map(opening => ({
      region: opening.region,
      weeklyOpening: opening,
      manpower: (manpowerRes.data || []).filter(m => m.weekly_opening_id === opening.id),
      fitnessIssues: (fitnessRes.data || []).filter(f => f.weekly_opening_id === opening.id),
      safetyActivities: (safetyRes.data || []).filter(s => s.weekly_opening_id === opening.id),
      schedule: (scheduleRes.data || []).filter(s => s.weekly_opening_id === opening.id),
      concerns: opening.concerns,
      needsCommanderHelp: opening.needs_commander_help,
      commanderHelpDescription: opening.commander_help_description
    }));

    setRegionsData(data);
    setIsLoading(false);
  };

  const handleSaveNotes = async () => {
    setIsSaving(true);

    const { data: existing } = await supabase
      .from('mp_weekly_notes' as any)
      .select('id')
      .eq('week_start_date', weekStartFormatted)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('mp_weekly_notes' as any)
        .update({
          general_notes: generalNotes,
          region_emphases: emphases,
          updated_at: new Date().toISOString()
        })
        .eq('id', (existing as any).id);
    } else {
      await supabase
        .from('mp_weekly_notes' as any)
        .insert({
          week_start_date: weekStartFormatted,
          general_notes: generalNotes,
          region_emphases: emphases
        } as any);
    }

    toast.success("הערות נשמרו בהצלחה");
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalSoldiers = regionsData.reduce((sum, r) => sum + r.manpower.length, 0);
  const totalAbsent = regionsData.reduce((sum, r) => sum + r.manpower.filter(m => m.status === 'absent').length, 0);
  const totalFitnessIssues = regionsData.reduce((sum, r) => sum + r.fitnessIssues.filter(f => !f.resolved).length, 0);
  const totalNeedHelp = regionsData.filter(r => r.needsCommanderHelp).length;

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <div className="text-2xl font-bold text-blue-700">{totalSoldiers}</div>
            <div className="text-xs text-blue-600">סה"כ חיילים</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto text-red-600 mb-1" />
            <div className="text-2xl font-bold text-red-700">{totalAbsent}</div>
            <div className="text-xs text-red-600">חסרים</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 mx-auto text-amber-600 mb-1" />
            <div className="text-2xl font-bold text-amber-700">{totalFitnessIssues}</div>
            <div className="text-xs text-amber-600">פערי כשירות</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-orange-600 mb-1" />
            <div className="text-2xl font-bold text-orange-700">{totalNeedHelp}</div>
            <div className="text-xs text-orange-600">מ"מים שצריכים עזרה</div>
          </CardContent>
        </Card>
      </div>

      {/* Regions needing help - highlight */}
      {totalNeedHelp > 0 && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              גזרות שמבקשות עזרת מ"פ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {regionsData.filter(r => r.needsCommanderHelp).map(region => (
              <div key={region.region} className="p-3 bg-white rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-orange-700">{region.region}</span>
                </div>
                <p className="text-sm text-muted-foreground">{region.commanderHelpDescription || "לא פורט"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-region breakdown */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="py-2 text-xs">סקירה כללית</TabsTrigger>
          <TabsTrigger value="schedules" className="py-2 text-xs">לוזות מ"מים</TabsTrigger>
          <TabsTrigger value="notes" className="py-2 text-xs">הערות מ"פ</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {regionsData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>אין נתונים מהמ"מים לשבוע זה</p>
              </CardContent>
            </Card>
          ) : (
            regionsData.map(region => (
              <Card key={region.region}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      {region.region}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {region.manpower.filter(m => m.status === 'present').length} נוכחים
                      </Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700">
                        {region.manpower.filter(m => m.status === 'absent').length} חסרים
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Absent soldiers */}
                  {region.manpower.filter(m => m.status === 'absent').length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2">חיילים חסרים:</p>
                      <div className="flex flex-wrap gap-2">
                        {region.manpower.filter(m => m.status === 'absent').map(m => (
                          <Badge key={m.id} variant="outline" className="bg-red-50 text-red-700">
                            {m.soldier?.full_name} - {m.absence_reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attention soldiers */}
                  {region.manpower.filter(m => m.status === 'attention').length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-2">חיילים לתשומת לב:</p>
                      <div className="space-y-1">
                        {region.manpower.filter(m => m.status === 'attention').map(m => (
                          <div key={m.id} className="text-sm p-2 bg-amber-50 rounded-lg">
                            <span className="font-medium">{m.soldier?.full_name}</span>: {m.notes}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fitness issues */}
                  {region.fitnessIssues.filter(f => !f.resolved).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-700 mb-2">פערי כשירות:</p>
                      <div className="flex flex-wrap gap-2">
                        {region.fitnessIssues.filter(f => !f.resolved).map(f => (
                          <Badge key={f.id} variant="outline" className="bg-amber-50 text-amber-700">
                            {f.soldier?.full_name} - {f.issue_type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Safety activities */}
                  {region.safetyActivities.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">פעולות בטיחות מתוכננות:</p>
                      <div className="flex flex-wrap gap-2">
                        {region.safetyActivities.map(a => (
                          <Badge key={a.id} variant="outline" className={a.completed ? "bg-green-100 text-green-800" : "bg-slate-50"}>
                            {a.completed && "✓ "}{a.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concerns */}
                  {region.concerns && (
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-sm font-medium text-orange-700 mb-1">מה מטריד את המ"מ:</p>
                      <p className="text-sm text-muted-foreground">{region.concerns}</p>
                    </div>
                  )}

                  {/* Emphasis input for MP */}
                  <div className="pt-2 border-t">
                    <label className="text-sm font-medium text-primary mb-2 block">דגשים/הערות לגזרה זו:</label>
                    <Textarea
                      placeholder="הערות ודגשים ספציפיים לגזרה..."
                      value={emphases[region.region] || ""}
                      onChange={(e) => setEmphases(prev => ({ ...prev, [region.region]: e.target.value }))}
                      rows={2}
                      className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          {regionsData.map(region => (
            <Card key={region.region}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  לוז {region.region}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {region.schedule.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">לא הוזן לוז לגזרה זו</p>
                ) : (
                  <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <div className="flex gap-2 min-w-max">
                      {DAYS.map(day => {
                        const dayTasks = region.schedule.filter(s => s.scheduled_day === day.value);
                        return (
                          <div key={day.value} className="flex-shrink-0 w-32 border rounded-xl overflow-hidden bg-card">
                            <div className="bg-primary text-primary-foreground px-2 py-1.5 text-center">
                              <div className="font-bold text-sm">{day.short}</div>
                            </div>
                            <div className="p-2 min-h-[100px] space-y-1 bg-muted/30">
                              {dayTasks.map(task => (
                                <div key={task.id} className={`p-1.5 rounded text-xs ${task.completed ? "bg-green-100" : "bg-background"}`}>
                                  {task.scheduled_time && (
                                    <span className="font-bold text-primary block">{task.scheduled_time.substring(0, 5)}</span>
                                  )}
                                  <span className={task.completed ? "line-through opacity-60" : ""}>{task.title}</span>
                                </div>
                              ))}
                              {dayTasks.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-4">—</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                הערות כלליות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="הערות כלליות לכלל הגזרות..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={4}
                className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
              />
              <Button onClick={handleSaveNotes} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    שמור הערות
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}