import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Car, 
  FileText,
  ChevronLeft,
  Sparkles,
  Shield,
  Activity,
  Crosshair
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface ActionItem {
  to: string;
  icon: typeof Users;
  label: string;
  description: string;
  gradient: string;
  bgGlow: string;
}

const getActions = (canAccessFitnessReport: boolean, canAccessEquipmentTracking: boolean) => {
  const actions: ActionItem[] = [
    {
      to: "/soldiers-control",
      icon: Users,
      label: "טבלת שליטה",
      description: "ניהול נהגים ורישיונות",
      gradient: "from-primary to-teal-dark",
      bgGlow: "bg-primary/20"
    },
    {
      to: "/annual-work-plan",
      icon: Calendar,
      label: "תוכנית עבודה",
      description: "לוח שנה ומופעים",
      gradient: "from-accent to-amber-600",
      bgGlow: "bg-accent/20"
    },
    {
      to: "/attendance-tracking",
      icon: FileText,
      label: "מעקב נוכחות",
      description: "נוכחות לפי חודש ונהג",
      gradient: "from-success to-emerald-600",
      bgGlow: "bg-success/20"
    },
    {
      to: "/inspections",
      icon: ClipboardCheck,
      label: "ביקורות",
      description: "ביקורות נהגים",
      gradient: "from-olive to-olive-dark",
      bgGlow: "bg-olive/20"
    },
    {
      to: "/accidents-tracking",
      icon: Car,
      label: "מעקב תאונות",
      description: "ניהול ומעקב תאונות",
      gradient: "from-danger to-red-700",
      bgGlow: "bg-danger/20"
    },
    {
      to: "/punishments-tracking",
      icon: Shield,
      label: "מעקב עונשים",
      description: "עונשים ואירועים משמעתיים",
      gradient: "from-slate-600 to-slate-800",
      bgGlow: "bg-slate-400/20"
    },
  ];
  
  // Add fitness report only if user has access (admin only)
  if (canAccessFitnessReport) {
    actions.push({
      to: "/fitness-report",
      icon: Activity,
      label: "דוח כשירות",
      description: "כשירות מרוכזת נהגים",
      gradient: "from-teal-500 to-cyan-600",
      bgGlow: "bg-teal-400/20"
    });
  }
  
  actions.push(
    {
      to: "/safety-scores",
      icon: Activity,
      label: "ציוני בטיחות",
      description: "ניהול ציוני בטיחות חודשיים",
      gradient: "from-sky-500 to-blue-600",
      bgGlow: "bg-sky-400/20"
    },
    {
      to: "/admin-driver-interviews",
      icon: ClipboardCheck,
      label: "ראיונות נהגי קו",
      description: "מעקב ראיונות גדודים",
      gradient: "from-violet-500 to-purple-600",
      bgGlow: "bg-violet-400/20"
    },
    {
      to: "/cleaning-parades-management",
      icon: Sparkles,
      label: "מסדרי ניקיון",
      description: "ניהול תמונות דוגמא",
      gradient: "from-purple-500 to-pink-500",
      bgGlow: "bg-purple-400/20"
    }
  );
  
  if (canAccessEquipmentTracking) {
    actions.push({
      to: "/equipment-tracking",
      icon: Crosshair,
      label: 'מעקב צל"ם',
      description: "ניהול ציוד לחימה מרוכז",
      gradient: "from-rose-500 to-rose-700",
      bgGlow: "bg-rose-400/20"
    });
  }
  
  return actions;
};

export function CommanderQuickActions() {
  const { canAccessFitnessReport, canAccessEquipmentTracking } = useAuth();
  const actions = getActions(canAccessFitnessReport, canAccessEquipmentTracking);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-black text-lg text-foreground">גישה מהירה</h2>
          <p className="text-sm text-muted-foreground">כלי ניהול ושליטה</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "relative overflow-hidden rounded-2xl bg-card/90 backdrop-blur-sm",
                "border border-border p-4 transition-all duration-300",
                "hover:shadow-lg hover:scale-[1.03] hover:border-primary/40"
              )}>
                {/* Gradient glow on hover */}
                <div className={cn(
                  "absolute -inset-2 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500",
                  action.bgGlow
                )} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-card/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform duration-300",
                      action.gradient
                    )}>
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
                  </div>
                  
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}