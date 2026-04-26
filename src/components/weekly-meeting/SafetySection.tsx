import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Loader2, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { REGION_OUTPOSTS } from "@/lib/constants";
import type { WeeklySafetyActivity } from "@/hooks/useWeeklyMeeting";

interface SafetySectionProps {
  region: string;
  activities: WeeklySafetyActivity[];
  onAdd: (activity: Omit<WeeklySafetyActivity, 'id' | 'weekly_opening_id' | 'soldier'>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<WeeklySafetyActivity>) => Promise<any>;
  isLoading: boolean;
}

const ACTIVITY_TYPES = [
  { value: "training", label: "השתלמות", icon: "📚" },
  { value: "briefing", label: "הסברה", icon: "📢" },
  { value: "drill", label: "תרגולת", icon: "🎯" },
  { value: "safety_bulletin", label: "מבזק בטיחות", icon: "⚠️" },
  { value: "intervention", label: "שיחה/טיפול בחייל", icon: "💬" },
  { value: "vulnerability_point", label: "נקודת תורפה בגזרה", icon: "🔍" },
  { value: "other", label: "אחר", icon: "📝" },
];

export function SafetySection({ region, activities, onAdd, onUpdate, isLoading }: SafetySectionProps) {
  const [soldiers, setSoldiers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [activityType, setActivityType] = useState("");
  const [customActivityType, setCustomActivityType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSoldier, setSelectedSoldier] = useState("");
  

  // Fetch soldiers
  useEffect(() => {
    const fetchSoldiers = async () => {
      const outposts = REGION_OUTPOSTS[region] || [];
      if (outposts.length === 0) return;

      const { data } = await supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .in("outpost", outposts)
        .eq("is_active", true)
        .order("full_name");

      setSoldiers(data || []);
    };

    if (region) fetchSoldiers();
  }, [region]);

  const handleAdd = async () => {
    if (!activityType || !title) return;
    if (activityType === "other" && !customActivityType) return;
    setIsSubmitting(true);
    
    const finalActivityType = activityType === "other" ? customActivityType : activityType;
    
    await onAdd({
      activity_type: finalActivityType,
      title,
      description: description || null,
      soldier_id: selectedSoldier || null,
      needs_commander_help: false,
      commander_help_type: null,
      planned_date: null,
      completed: false
    });
    
    // Reset form
    setActivityType("");
    setCustomActivityType("");
    setTitle("");
    setDescription("");
    setSelectedSoldier("");
    setShowAddForm(false);
    setIsSubmitting(false);
  };

  const getActivityTypeLabel = (type: string) => {
    const actType = ACTIVITY_TYPES.find(t => t.value === type);
    return actType ? `${actType.icon} ${actType.label}` : type;
  };

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
        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
          <Shield className="w-5 h-5 text-green-600" />
          פעולות בטיחות השבוע
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* List of safety activities */}
        {activities.length > 0 ? (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div 
                key={activity.id} 
                className={`p-3 rounded-xl border transition-colors ${
                  activity.completed 
                    ? "bg-green-50 border-green-200" 
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={activity.completed}
                    onCheckedChange={(checked) => onUpdate(activity.id, { completed: !!checked })}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-slate-800 ${activity.completed ? "line-through opacity-60" : ""}`}>
                        {activity.title}
                      </span>
                      <Badge variant="outline" className="text-xs bg-white text-slate-700">
                        {getActivityTypeLabel(activity.activity_type)}
                      </Badge>
                    </div>
                    {activity.description && (
                      <p className="text-sm text-slate-600 mt-1">{activity.description}</p>
                    )}
                    {activity.soldier?.full_name && (
                      <p className="text-sm text-primary mt-1">חייל: {activity.soldier.full_name}</p>
                    )}
                  </div>
                  {activity.completed && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>אין פעולות בטיחות מתוכננות לשבוע זה</p>
          </div>
        )}

        {/* Add new safety activity */}
        {showAddForm ? (
          <div className="border border-green-200 rounded-xl p-4 space-y-3 bg-green-50">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-slate-800">הוספת פעולת בטיחות</span>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="h-6 w-6">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                <SelectValue placeholder="סוג פעולה..." />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-slate-800">
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activityType === "other" && (
              <Input
                placeholder="פרט סוג פעולה..."
                value={customActivityType}
                onChange={(e) => setCustomActivityType(e.target.value)}
                className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
              />
            )}

            <Input
              placeholder="כותרת הפעולה..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />

            <Textarea
              placeholder="תיאור..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400 resize-none"
            />

            {(activityType === "intervention" || activityType === "drill") && soldiers.length > 0 && (
              <Select value={selectedSoldier} onValueChange={setSelectedSoldier}>
                <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                  <SelectValue placeholder="חייל רלוונטי (אופציונלי)..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {soldiers.map((soldier) => (
                    <SelectItem key={soldier.id} value={soldier.id} className="text-slate-800">
                      {soldier.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleAdd} 
                disabled={!activityType || !title || (activityType === "other" && !customActivityType) || isSubmitting} 
                className="flex-1"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "הוסף"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף פעולת בטיחות
          </Button>
        )}
      </CardContent>
    </Card>
  );
}