import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { COMBAT_EQUIPMENT, PRE_MOVEMENT_CHECKS, DRIVER_TOOLS } from "@/lib/constants";
import { Shield, Wrench, Briefcase, CheckCircle2, Sparkles } from "lucide-react";

interface ChecklistSectionProps {
  icon: React.ElementType;
  title: string;
  items: readonly string[];
  fieldName: string;
  accentColor?: string;
}

function ChecklistSection({ icon: Icon, title, items, fieldName, accentColor = "primary" }: ChecklistSectionProps) {
  const { watch, setValue } = useFormContext();
  const selectedItems: string[] = watch(fieldName) || [];

  const toggleItem = (item: string) => {
    const newItems = selectedItems.includes(item)
      ? selectedItems.filter((i) => i !== item)
      : [...selectedItems, item];
    setValue(fieldName, newItems);
  };

  const allSelected = items.every((item) => selectedItems.includes(item));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${accentColor}/15 to-${accentColor}/5 flex items-center justify-center border border-slate-200`}>
          <Icon className={`w-6 h-6 text-${accentColor}`} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500">{selectedItems.length} / {items.length} נבחרו</p>
        </div>
        {allSelected && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 text-green-600 border border-green-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold">הושלם</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => {
          const isChecked = selectedItems.includes(item);
          return (
            <div
              key={item}
              onClick={() => toggleItem(item)}
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 animate-fade-in ${
                isChecked 
                  ? "bg-primary/5 border-primary/30 shadow-sm" 
                  : "bg-slate-50 border-slate-200 hover:border-primary/20 hover:bg-primary/5"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                isChecked 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-white border border-slate-300"
              }`}>
                {isChecked && <CheckCircle2 className="w-5 h-5" />}
              </div>
              <span className={`flex-1 font-medium transition-colors duration-300 ${
                isChecked ? "text-slate-800" : "text-slate-600"
              }`}>
                {item}
              </span>
              {isChecked && (
                <div className="w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(selectedItems.length / items.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function EquipmentStep() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 3 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-800">ציוד וכוננות</h2>
        <p className="text-slate-500">סמן את כל הפריטים שנבדקו</p>
      </div>

      <div className="space-y-6">
        <ChecklistSection
          icon={Shield}
          title="ציוד לחימה מלא"
          items={COMBAT_EQUIPMENT}
          fieldName="combatEquipment"
          accentColor="primary"
        />

        <ChecklistSection
          icon={Wrench}
          title='ביצוע טיפול לפני תנועה (טל"ת)'
          items={PRE_MOVEMENT_CHECKS}
          fieldName="preMovementChecks"
          accentColor="warning"
        />

        <ChecklistSection
          icon={Briefcase}
          title="בדיקת כלי נהג"
          items={DRIVER_TOOLS}
          fieldName="driverTools"
          accentColor="accent"
        />
      </div>
    </div>
  );
}