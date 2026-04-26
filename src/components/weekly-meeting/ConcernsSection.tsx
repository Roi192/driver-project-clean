import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ConcernsSectionProps {
  weeklyOpeningId?: string;
  concerns: string;
  needsCommanderHelp: boolean;
  commanderHelpDescription: string;
  onSave: (concerns: string, needsHelp: boolean, helpDescription: string) => Promise<any>;
  isLoading: boolean;
}

export function ConcernsSection({ 
  concerns: initialConcerns, 
  needsCommanderHelp: initialNeedsHelp,
  commanderHelpDescription: initialHelpDescription,
  onSave, 
  isLoading 
}: ConcernsSectionProps) {
  const [concerns, setConcerns] = useState("");
  const [needsHelp, setNeedsHelp] = useState(false);
  const [helpDescription, setHelpDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConcerns(initialConcerns || "");
    setNeedsHelp(initialNeedsHelp || false);
    setHelpDescription(initialHelpDescription || "");
  }, [initialConcerns, initialNeedsHelp, initialHelpDescription]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await onSave(concerns, needsHelp, helpDescription);
    if (error) {
      toast.error("שגיאה בשמירה");
    } else {
      toast.success("נשמר בהצלחה");
    }
    setIsSaving(false);
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
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          מה מטריד אותי
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="block mb-2 text-slate-700 font-medium">דברים שמטרידים אותי (כח אדם, התנהלות פלוגות, בעיות חוזרות...)</Label>
          <Textarea
            placeholder="תאר מה מטריד אותך מבחינת כח אדם, חיילים, התנהלות פלוגות, ועוד..."
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            rows={4}
            className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
          />
        </div>

        <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={needsHelp} onCheckedChange={setNeedsHelp} />
            <Label className="font-medium text-slate-800">צריך עזרת מ"פ</Label>
          </div>

          {needsHelp && (
            <Textarea
              placeholder='פרט מה העזרה הנדרשת (לדבר עם חייל, שיחה עם סמג"ד/מ"פ, איפוס חייל...)'
              value={helpDescription}
              onChange={(e) => setHelpDescription(e.target.value)}
              rows={3}
              className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />
          )}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}