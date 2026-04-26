import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AlertCircle, MessageSquare, FileSignature, Check, X, Sparkles } from "lucide-react";

interface BriefingItemProps {
  icon: React.ElementType;
  label: string;
  name: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  accentColor: string;
}

function BriefingItem({ icon: Icon, label, value, onChange, accentColor }: BriefingItemProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 animate-fade-in">
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${accentColor}/15 to-${accentColor}/5 flex items-center justify-center border border-slate-200`}>
          <Icon className={`w-6 h-6 text-${accentColor}`} />
        </div>
        <Label className="text-lg font-bold flex-1 text-slate-800">{label}</Label>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            "h-14 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 border-2",
            value === true
              ? "bg-green-50 text-green-600 border-green-300 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-green-200 hover:bg-green-50/50"
          )}
        >
          <Check className="w-5 h-5" />
          בוצע
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            "h-14 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-3 border-2",
            value === false
              ? "bg-red-50 text-red-600 border-red-300 shadow-sm"
              : "bg-slate-50 text-slate-600 border-slate-200 hover:border-red-200 hover:bg-red-50/50"
          )}
        >
          <X className="w-5 h-5" />
          לא בוצע
        </button>
      </div>
    </div>
  );
}
export function BriefingsStep() {
  const { watch, setValue } = useFormContext();

  const briefings = [
    {
      icon: AlertCircle,
      label: "השתתפות בנוהל קרב",
      name: "emergencyProcedure",
      accentColor: "warning",
    },
    {
      icon: MessageSquare,
      label: 'השתתפות בתדריך ותחקיר ע"י דרג ממונה',
      name: "commanderBriefing",
      accentColor: "primary",
    },
    {
      icon: FileSignature,
      label: "מילוי כרטיס עבודה וחתימה",
      name: "workCardFilled",
      accentColor: "accent",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 2 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-800">תדריכים ותחקירים</h2>
        <p className="text-slate-500">סמן האם בוצעו התדריכים הנדרשים</p>
      </div>

      <div className="space-y-5">
        {briefings.map((briefing, index) => (
          <div key={briefing.name} style={{ animationDelay: `${index * 100}ms` }}>
            <BriefingItem
              icon={briefing.icon}
              label={briefing.label}
              name={briefing.name}
              value={watch(briefing.name)}
              onChange={(value) => setValue(briefing.name, value)}
              accentColor={briefing.accentColor}
            />
          </div>
        ))}
      </div>
    </div>
  );
}