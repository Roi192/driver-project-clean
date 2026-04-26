import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { DRILLS } from "@/lib/constants";
import { Target, AlertTriangle, MapPin, CheckCircle2, Sparkles } from "lucide-react";

export function DrillsStep() {
  const { register, watch, setValue } = useFormContext();
  const drillsCompleted: string[] = watch("drillsCompleted") || [];

  const toggleDrill = (drill: string) => {
    const newDrills = drillsCompleted.includes(drill)
      ? drillsCompleted.filter((d) => d !== drill)
      : [...drillsCompleted, drill];
    setValue("drillsCompleted", newDrills);
  };

  const allDrillsCompleted = DRILLS.every((drill) => drillsCompleted.includes(drill));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 4 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-800">תרגולות מחייבות</h2>
        <p className="text-slate-500">סמן את התרגולות שבוצעו ומלא את הפרטים</p>
      </div>

      {/* Drills Checklist */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-slate-200">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">תרגולות שבוצעו</h3>
              <p className="text-xs text-slate-500">{drillsCompleted.length} / {DRILLS.length} בוצעו</p>
            </div>
          </div>
          {allDrillsCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-600 border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">הושלם</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {DRILLS.map((drill, index) => {
            const isChecked = drillsCompleted.includes(drill);
            return (
              <div
                key={drill}
                onClick={() => toggleDrill(drill)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 animate-fade-in ${
                  isChecked 
                    ? "bg-green-50/50 border-green-300 shadow-sm" 
                    : "bg-slate-50 border-slate-200 hover:border-green-200 hover:bg-green-50/50"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isChecked 
                    ? "bg-green-500 text-white shadow-md" 
                    : "bg-white border border-slate-300"
                }`}>
                  {isChecked && <CheckCircle2 className="w-5 h-5" />}
                </div>
                <span className={`flex-1 font-medium transition-colors duration-300 ${
                  isChecked ? "text-slate-800" : "text-slate-600"
                }`}>
                  {drill}
                </span>
                {isChecked && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100">
                    <Sparkles className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-bold text-green-600">בוצע</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-primary transition-all duration-500"
              style={{ width: `${(drillsCompleted.length / DRILLS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Safety Vulnerabilities */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center border border-orange-200">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">נקודות תורפה בטיחותיות בגזרה</h3>
            <p className="text-xs text-slate-500">פנייה חדה, ציר מסוכן, צומת מסוכן וכו׳</p>
          </div>
        </div>
        <Textarea
          {...register("safetyVulnerabilities")}
          placeholder="לדוגמה: פנייה או עיקול חד בכביש X, ציר מסוכן ליד צומת Y, צומת מסוכן..."
          className="min-h-[120px] bg-slate-50 border-slate-200 resize-none focus:border-orange-400 focus:ring-orange-200 transition-all duration-300 rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Vardim Procedure */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center border border-amber-200">
            <MapPin className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">מהו נוהל ורדים?</h3>
            <p className="text-xs text-slate-500">תאר את נוהל ורדים</p>
          </div>
        </div>
        <Textarea
          {...register("vardimProcedure")}
          placeholder="תאר את נוהל ורדים..."
          className="min-h-[120px] bg-slate-50 border-slate-200 resize-none focus:border-accent/50 focus:ring-accent/20 transition-all duration-300 rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}