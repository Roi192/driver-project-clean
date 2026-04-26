import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, MessageSquare, ListTodo, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format } from "date-fns";

interface CommanderSummarySectionProps {
  summary: any;
  onSave: (summaryText: string, actionItems: string) => Promise<any>;
  isAdmin: boolean;
  weekStart?: Date;
}

interface MPWeeklyNotes {
  general_notes: string | null;
  region_emphases: Record<string, string> | null;
}

export function CommanderSummarySection({ summary, onSave, isAdmin, weekStart }: CommanderSummarySectionProps) {
  const [mpNotes, setMpNotes] = useState<MPWeeklyNotes | null>(null);
  const [isLoadingMpNotes, setIsLoadingMpNotes] = useState(true);

  // Fetch MP notes for MM view
  useEffect(() => {
    const fetchMpNotes = async () => {
      setIsLoadingMpNotes(true);
      try {
        const weekStartDate = weekStart || startOfWeek(new Date(), { weekStartsOn: 0 });
        const formattedDate = format(weekStartDate, 'yyyy-MM-dd');
        
        const { data, error } = await supabase
          .from('mp_weekly_notes' as any)
          .select('*')
          .eq('week_start_date', formattedDate)
          .maybeSingle();

        if (!error && data) {
          setMpNotes({
            general_notes: (data as any).general_notes,
            region_emphases: (data as any).region_emphases
          });
        } else {
          setMpNotes(null);
        }
      } catch (err) {
        console.error("Error fetching MP notes:", err);
        setMpNotes(null);
      }
      setIsLoadingMpNotes(false);
    };

    fetchMpNotes();
  }, [weekStart]);

  // Loading state
  if (isLoadingMpNotes) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const hasContent = mpNotes && (mpNotes.general_notes || (mpNotes.region_emphases && Object.keys(mpNotes.region_emphases).length > 0));

  // No content state
  if (!hasContent) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-amber-600" />
            סיכום מ"פ
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lock className="w-12 h-12 mb-4 text-slate-400" />
          <p className="text-center text-slate-600 font-medium">עדיין לא נכתב סיכום</p>
          <p className="text-center text-slate-500 text-sm mt-1">סיכום מ"פ יוצג כאן לאחר שיוזן</p>
        </CardContent>
      </Card>
    );
  }
  
  // Read-only summary view for MM
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
          <FileText className="w-5 h-5 text-amber-600" />
          סיכום מ"פ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Region emphases */}
        {mpNotes?.region_emphases && Object.keys(mpNotes.region_emphases).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <ListTodo className="w-4 h-4" />
              <label className="font-medium">דגשים והערות לגזרות</label>
            </div>
            <div className="space-y-2">
              {Object.entries(mpNotes.region_emphases).map(([region, emphasis]) => (
                emphasis && (
                  <div key={region} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm font-medium text-primary mb-1">{region}</p>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{emphasis}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* General notes */}
        {mpNotes?.general_notes && (
          <div>
            <div className="flex items-center gap-2 text-slate-700 mb-2">
              <MessageSquare className="w-4 h-4" />
              <label className="font-medium">הערות, דגשים והנחיות</label>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-slate-800 text-sm whitespace-pre-wrap">{mpNotes.general_notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}