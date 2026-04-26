import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Plus, Loader2, AlertTriangle, X } from "lucide-react";
import type { WeeklyFitnessIssue, WeeklyManpower } from "@/hooks/useWeeklyMeeting";

interface FitnessSectionProps {
  region: string;
  fitnessIssues: WeeklyFitnessIssue[];
  manpower: WeeklyManpower[]; // Use manpower list for soldier selection
  onAdd: (soldierId: string, issueType: string, details?: string) => Promise<any>;
  onToggleResolved: (id: string, resolved: boolean) => Promise<any>;
  isLoading: boolean;
}

const ISSUE_TYPES = [
  { value: "birur_ana", label: "בירור ענ\"א", icon: "📋" },
  { value: "license_expired", label: "תוקף רישיון", icon: "🚫" },
  { value: "needs_control_test", label: "צורך במבחן שליטה", icon: "🎯" },
  { value: "low_safety_score", label: "ציון בטיחות נמוך", icon: "📉" },
  { value: "other", label: "אחר", icon: "❓" },
];

export function FitnessSection({ region, fitnessIssues, manpower, onAdd, onToggleResolved, isLoading }: FitnessSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSoldier, setSelectedSoldier] = useState("");
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [issueDetails, setIssueDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!selectedSoldier || !selectedIssueType) return;
    setIsSubmitting(true);
    
    // For "other" type, require details
    const details = selectedIssueType === "other" ? issueDetails : (issueDetails || undefined);
    await onAdd(selectedSoldier, selectedIssueType, details);
    
    setSelectedSoldier("");
    setSelectedIssueType("");
    setIssueDetails("");
    setShowAddForm(false);
    setIsSubmitting(false);
  };

  const getIssueTypeLabel = (type: string) => {
    const issueType = ISSUE_TYPES.find(t => t.value === type);
    return issueType ? `${issueType.icon} ${issueType.label}` : type;
  };

  const unresolvedCount = fitnessIssues.filter(f => !f.resolved).length;

  // Get soldiers from manpower list only
  const availableSoldiers = manpower.map(m => ({
    id: m.soldier_id,
    full_name: m.soldier?.full_name || "---"
  }));

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
            <Heart className="w-5 h-5 text-red-500" />
            כשירות נהגים
          </CardTitle>
          {unresolvedCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {unresolvedCount} פערים
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info about soldier source */}
        {manpower.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-600" />
            <p className="text-sm text-amber-800">יש להוסיף קודם חיילים בסעיף "כוח אדם"</p>
            <p className="text-xs text-amber-600">רשימת החיילים לבחירה מגיעה מרשימת כוח האדם</p>
          </div>
        )}

        {/* List of fitness issues */}
        {fitnessIssues.length > 0 ? (
          <div className="space-y-2">
            {fitnessIssues.map((issue) => (
              <div 
                key={issue.id} 
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  issue.resolved ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={issue.resolved}
                    onCheckedChange={(checked) => onToggleResolved(issue.id, !!checked)}
                  />
                  <div className={issue.resolved ? "line-through opacity-60" : ""}>
                    <p className="font-medium text-slate-800">{issue.soldier?.full_name || "---"}</p>
                    <p className="text-sm text-slate-600">
                      {getIssueTypeLabel(issue.issue_type)}
                      {issue.issue_details && ` - ${issue.issue_details}`}
                    </p>
                  </div>
                </div>
                {issue.resolved ? (
                  <Badge className="bg-green-100 text-green-800 border-green-300">טופל</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 border-red-300">פתוח</Badge>
                )}
              </div>
            ))}
          </div>
        ) : manpower.length > 0 ? (
          <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>אין פערי כשירות לשבוע זה</p>
          </div>
        ) : null}

        {/* Add new fitness issue */}
        {manpower.length > 0 && (
          <>
            {showAddForm ? (
              <div className="border border-red-200 rounded-xl p-4 space-y-3 bg-red-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-slate-800">הוספת פער כשירות</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="h-6 w-6">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Select value={selectedSoldier} onValueChange={setSelectedSoldier}>
                  <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                    <SelectValue placeholder="בחר חייל מרשימת כוח האדם..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {availableSoldiers.map((soldier) => (
                      <SelectItem key={soldier.id} value={soldier.id} className="text-slate-800">
                        {soldier.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedIssueType} onValueChange={setSelectedIssueType}>
                  <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                    <SelectValue placeholder="סוג הפער..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {ISSUE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-slate-800">
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedIssueType === "other" ? (
                  <Input
                    placeholder="פרט בקצרה..."
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    required
                    className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
                  />
                ) : (
                  <Input
                    placeholder="פרטים נוספים (אופציונלי)..."
                    value={issueDetails}
                    onChange={(e) => setIssueDetails(e.target.value)}
                    className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
                  />
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleAdd} 
                    disabled={!selectedSoldier || !selectedIssueType || (selectedIssueType === "other" && !issueDetails) || isSubmitting} 
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
                className="w-full border-dashed border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4 ml-2" />
                הוסף פער כשירות
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}