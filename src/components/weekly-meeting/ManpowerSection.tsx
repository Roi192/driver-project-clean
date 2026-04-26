import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Trash2, Loader2, UserPlus, UserMinus, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WeeklyManpower } from "@/hooks/useWeeklyMeeting";

interface ManpowerSectionProps {
  region: string;
  manpower: WeeklyManpower[];
  onAdd: (soldierId: string, status: string, reason?: string, notes?: string) => Promise<any>;
  onUpdate: (id: string, updates: Partial<WeeklyManpower>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  isLoading: boolean;
}

const ABSENCE_REASONS = [
  { value: "gimelim", label: "גימלים" },
  { value: "course", label: "קורס" },
  { value: "absent", label: "נפקד" },
  { value: "other", label: "סיבה אחרת" },
];

export function ManpowerSection({ region, manpower, onAdd, onUpdate, onDelete, isLoading }: ManpowerSectionProps) {
  const [soldiers, setSoldiers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("roster");
  
  // Add soldier form state
  const [selectedSoldierToAdd, setSelectedSoldierToAdd] = useState("");
  const [isAddingRoster, setIsAddingRoster] = useState(false);
  
  // Mark absence form state
  const [selectedSoldierForAbsence, setSelectedSoldierForAbsence] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);

  // Attention soldier form state
  const [selectedSoldierForAttention, setSelectedSoldierForAttention] = useState("");
  const [attentionNotes, setAttentionNotes] = useState("");
  const [isSubmittingAttention, setIsSubmittingAttention] = useState(false);

  // Fetch ALL soldiers from the control table - regardless of region
  // The MM will manually add soldiers to their regional roster
  useEffect(() => {
    const fetchSoldiers = async () => {
      // Fetch ALL active soldiers from the control table
      const { data, error } = await supabase
        .from("soldiers")
        .select("id, full_name, personal_number, outpost")
        .eq("is_active", true)
        .order("full_name");

      if (error) {
        console.error("Error fetching soldiers:", error);
        setSoldiers([]);
      } else {
        setSoldiers(data || []);
      }
    };

    fetchSoldiers();
  }, []);

  // Add soldier to roster (as present by default)
  const handleAddToRoster = async () => {
    if (!selectedSoldierToAdd) return;
    setIsAddingRoster(true);
    await onAdd(selectedSoldierToAdd, "present");
    setSelectedSoldierToAdd("");
    setIsAddingRoster(false);
  };

  // Mark soldier as absent
  const handleMarkAbsence = async () => {
    if (!selectedSoldierForAbsence || !absenceReason) return;
    setIsSubmittingAbsence(true);
    
    const reason = absenceReason === "other" ? customReason : ABSENCE_REASONS.find(r => r.value === absenceReason)?.label;
    
    // Find the manpower entry and update it
    const entry = manpower.find(m => m.soldier_id === selectedSoldierForAbsence);
    if (entry) {
      await onUpdate(entry.id, { status: "absent", absence_reason: reason });
    }
    
    setSelectedSoldierForAbsence("");
    setAbsenceReason("");
    setCustomReason("");
    setIsSubmittingAbsence(false);
  };

  // Mark soldier as needing attention
  const handleMarkAttention = async () => {
    if (!selectedSoldierForAttention || !attentionNotes) return;
    setIsSubmittingAttention(true);
    
    const entry = manpower.find(m => m.soldier_id === selectedSoldierForAttention);
    if (entry) {
      await onUpdate(entry.id, { status: "attention", notes: attentionNotes });
    }
    
    setSelectedSoldierForAttention("");
    setAttentionNotes("");
    setIsSubmittingAttention(false);
  };

  // Filter out already added soldiers
  const availableSoldiers = soldiers.filter(
    s => !manpower.some(m => m.soldier_id === s.id)
  );

  // Get soldiers in manpower list (for absence/attention marking)
  const rosterSoldiers = manpower.filter(m => m.status === "present");
  const absentSoldiers = manpower.filter(m => m.status === "absent");
  const attentionSoldiers = manpower.filter(m => m.status === "attention");

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-primary" />
            מצב כוח אדם
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {rosterSoldiers.length} נוכחים
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {absentSoldiers.length} חסרים
            </Badge>
            {attentionSoldiers.length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {attentionSoldiers.length} דורשים התייחסות
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 bg-slate-100">
            <TabsTrigger value="roster" className="flex items-center gap-1 text-xs data-[state=active]:bg-white">
              <UserPlus className="w-3 h-3" />
              הוספה
            </TabsTrigger>
            <TabsTrigger value="absence" className="flex items-center gap-1 text-xs data-[state=active]:bg-white">
              <UserMinus className="w-3 h-3" />
              חסרים
            </TabsTrigger>
            <TabsTrigger value="attention" className="flex items-center gap-1 text-xs data-[state=active]:bg-white">
              <AlertCircle className="w-3 h-3" />
              חריגים
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Add soldiers to roster */}
          <TabsContent value="roster" className="space-y-4 mt-4">
            {/* Add soldier form */}
            <div className="border border-primary/20 rounded-xl p-4 space-y-3 bg-blue-50">
              <p className="text-sm font-medium text-slate-700">הוסף חייל מטבלת השליטה לגזרה:</p>
              <Select value={selectedSoldierToAdd} onValueChange={setSelectedSoldierToAdd}>
                <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                  <SelectValue placeholder="בחר חייל להוספה..." />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {availableSoldiers.length > 0 ? (
                    availableSoldiers.map((soldier) => (
                      <SelectItem key={soldier.id} value={soldier.id} className="text-slate-800">
                        {soldier.full_name} ({soldier.outpost})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-slate-500 text-center">
                      {soldiers.length === 0 ? "אין חיילים בגזרה זו" : "כל החיילים כבר נוספו"}
                    </div>
                  )}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddToRoster} 
                disabled={!selectedSoldierToAdd || isAddingRoster}
                className="w-full"
              >
                {isAddingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף לרשימת הגזרה
                  </>
                )}
              </Button>
            </div>

            {/* Current roster */}
            {manpower.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">חיילי הגזרה ({manpower.length}):</p>
                {manpower.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    item.status === "present" ? "bg-green-50 border-green-200" : 
                    item.status === "absent" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                  }`}>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.soldier?.full_name || "---"}</p>
                      {item.notes && (
                        <p className="text-xs text-slate-600">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === "present" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">נוכח</Badge>
                      ) : item.status === "absent" ? (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          חסר - {item.absence_reason}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">דורש התייחסות</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>לא נוספו חיילים לגזרה השבוע</p>
                <p className="text-xs">הוסף חיילים מטבלת השליטה</p>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Mark absences */}
          <TabsContent value="absence" className="space-y-4 mt-4">
            {rosterSoldiers.length > 0 ? (
              <div className="border border-red-200 rounded-xl p-4 space-y-3 bg-red-50">
                <p className="text-sm font-medium text-red-800">עדכן חייל כחסר:</p>
                <Select value={selectedSoldierForAbsence} onValueChange={setSelectedSoldierForAbsence}>
                  <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                    <SelectValue placeholder="בחר חייל מהרשימה..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {rosterSoldiers.map((item) => (
                      <SelectItem key={item.soldier_id} value={item.soldier_id} className="text-slate-800">
                        {item.soldier?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={absenceReason} onValueChange={setAbsenceReason}>
                  <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                    <SelectValue placeholder="סיבת ההיעדרות..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {ABSENCE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value} className="text-slate-800">
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {absenceReason === "other" && (
                  <Input
                    placeholder="פרט את הסיבה..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
                  />
                )}

                <Button 
                  onClick={handleMarkAbsence} 
                  disabled={!selectedSoldierForAbsence || !absenceReason || (absenceReason === "other" && !customReason) || isSubmittingAbsence}
                  variant="destructive"
                  className="w-full"
                >
                  {isSubmittingAbsence ? <Loader2 className="w-4 h-4 animate-spin" /> : "עדכן כחסר"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl">
                <UserMinus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>אין חיילים נוכחים ברשימה</p>
                <p className="text-xs">הוסף קודם חיילים בלשונית "הוספה"</p>
              </div>
            )}

            {/* List of absent soldiers */}
            {absentSoldiers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">חיילים חסרים ({absentSoldiers.length}):</p>
                {absentSoldiers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-200">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.soldier?.full_name || "---"}</p>
                      <p className="text-sm text-red-600">{item.absence_reason}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate(item.id, { status: "present", absence_reason: null })}
                    >
                      החזר לנוכחים
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Soldiers requiring attention */}
          <TabsContent value="attention" className="space-y-4 mt-4">
            {rosterSoldiers.length > 0 ? (
              <div className="border border-amber-200 rounded-xl p-4 space-y-3 bg-amber-50">
                <p className="text-sm font-medium text-amber-800">חייל הדורש התייחסות מיוחדת:</p>
                <Select value={selectedSoldierForAttention} onValueChange={setSelectedSoldierForAttention}>
                  <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                    <SelectValue placeholder="בחר חייל..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {rosterSoldiers.map((item) => (
                      <SelectItem key={item.soldier_id} value={item.soldier_id} className="text-slate-800">
                        {item.soldier?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="תאר את הסיטואציה (בעיות חוזרות, שינוי ברקע משפחתי, אירוע חריג...)..."
                  value={attentionNotes}
                  onChange={(e) => setAttentionNotes(e.target.value)}
                  rows={3}
                  className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400 resize-none"
                />

                <Button 
                  onClick={handleMarkAttention} 
                  disabled={!selectedSoldierForAttention || !attentionNotes || isSubmittingAttention}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isSubmittingAttention ? <Loader2 className="w-4 h-4 animate-spin" /> : "סמן לטיפול"}
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>אין חיילים נוכחים ברשימה</p>
                <p className="text-xs">הוסף קודם חיילים בלשונית "הוספה"</p>
              </div>
            )}

            {/* List of soldiers requiring attention */}
            {attentionSoldiers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700">חיילים הדורשים התייחסות ({attentionSoldiers.length}):</p>
                {attentionSoldiers.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.soldier?.full_name || "---"}</p>
                      <p className="text-sm text-amber-700">{item.notes}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate(item.id, { status: "present", notes: null })}
                    >
                      הסר סימון
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}