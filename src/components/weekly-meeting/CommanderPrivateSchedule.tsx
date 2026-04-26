import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Plus, Loader2, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

interface CommanderPrivateScheduleProps {
  schedule: any[];
  onAdd: (item: { scheduled_day: number; scheduled_time?: string; title: string; description?: string }) => Promise<any>;
  onUpdate: (id: string, updates: any) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  isLoading: boolean;
}

const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" },
];

export function CommanderPrivateSchedule({ schedule, onAdd, onUpdate, onDelete, isLoading }: CommanderPrivateScheduleProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDay, setScheduledDay] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleAdd = async () => {
    if (!title || scheduledDay === "") return;
    setIsSubmitting(true);
    
    const { error } = await onAdd({
      scheduled_day: parseInt(scheduledDay),
      scheduled_time: scheduledTime || undefined,
      title,
      description: description || undefined
    });
    
    if (error) {
      toast.error("שגיאה בהוספת הפריט");
    } else {
      toast.success("הפריט נוסף בהצלחה");
      // Reset form
      setTitle("");
      setDescription("");
      setScheduledDay("");
      setScheduledTime("");
      setShowAddForm(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await onDelete(id);
    if (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  // Group by day
  const groupedSchedule = DAYS.map(day => ({
    day: day.value,
    label: day.label,
    items: schedule.filter(s => s.scheduled_day === day.value)
  })).filter(group => group.items.length > 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-600" />
          לוז מ"פ (פרטי)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          הלוז הזה נראה רק לך - המ"מים לא יכולים לראות אותו
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grouped schedule by day */}
        {groupedSchedule.length > 0 ? (
          <div className="space-y-4">
            {groupedSchedule.map((group) => (
              <div key={group.day} className="space-y-2">
                <h4 className="font-bold text-amber-700 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm">
                    {group.label.charAt(0)}
                  </span>
                  יום {group.label}
                </h4>
                <div className="space-y-2 mr-10">
                  {group.items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 rounded-xl border bg-white transition-colors ${
                        item.completed ? "border-green-200 bg-green-50" : "border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={(checked) => onUpdate(item.id, { completed: !!checked })}
                        />
                        <div className={item.completed ? "line-through opacity-60" : ""}>
                          <span className="font-medium">{item.title}</span>
                          {item.scheduled_time && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {item.scheduled_time.substring(0, 5)}
                            </span>
                          )}
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>אין פריטים בלוז הפרטי שלך</p>
          </div>
        )}

        {/* Add new item */}
        {showAddForm ? (
          <div className="border border-amber-300 rounded-xl p-4 space-y-3 bg-amber-50">
            <div className="grid grid-cols-2 gap-3">
              <Select value={scheduledDay} onValueChange={setScheduledDay}>
                <SelectTrigger>
                  <SelectValue placeholder="יום..." />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      יום {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="שעה"
              />
            </div>

            <Input
              placeholder="כותרת..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Input
              placeholder="פרטים נוספים (אופציונלי)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!title || scheduledDay === "" || isSubmitting} className="flex-1 bg-amber-600 hover:bg-amber-700">
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
            className="w-full border-dashed border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף ללוז הפרטי
          </Button>
        )}
      </CardContent>
    </Card>
  );
}