import { 
  FileText, 
  MapPin, 
  FolderOpen, 
  AlertTriangle, 
  Video, 
  BookOpen, 
  ClipboardList,
  ArrowLeft,
  Sparkles,
  Crown,
  Flame,
  Zap,
  Star,
  Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PushNotificationSetup } from "@/components/push/PushNotificationSetup";

interface ActionItem {
  to: string;
  icon: typeof FileText;
  label: string;
  description: string;
  iconGradient: string;
  featured?: boolean;
  hideForBattalion?: boolean;
}

const actions: ActionItem[] = [
  {
    to: "/shift-form",
    icon: FileText,
    label: "טופס לפני משמרת",
    description: "מלא את הטופס לפני תחילת המשמרת",
    iconGradient: "from-primary to-primary/70",
    featured: true,
    hideForBattalion: true,
  },
  {
    to: "/drill-locations",
    icon: MapPin,
    label: "נקודות תרגולות",
    description: "צפה בנקודות התרגולות לפי מוצב",
    iconGradient: "from-accent to-accent/70",
  },
  {
    to: "/safety-files",
    icon: FolderOpen,
    label: "תיקי בטיחות",
    description: "נקודות ורדים, תורפה ופרסה",
    iconGradient: "from-accent/80 to-primary/80",
  },
  {
    to: "/safety-events",
    icon: AlertTriangle,
    label: "אירועי בטיחות",
    description: "תחקירים ואירועים בגזרה",
    iconGradient: "from-warning to-warning/70",
  },
  {
    to: "/training-videos",
    icon: Video,
    label: "סרטוני הדרכה",
    description: "סרטוני הדרכה ולמידה",
    iconGradient: "from-danger to-danger/70",
  },
  {
    to: "/procedures",
    icon: BookOpen,
    label: "נהלים",
    description: "נהלי הפלוגה והחטיבה",
    iconGradient: "from-olive-light to-olive-dark",
  },
  {
    to: "/my-reports",
    icon: ClipboardList,
    label: "הדיווחים שלי",
    description: "היסטוריית הדיווחים שלך",
    iconGradient: "from-sand to-sand-dark",
  },
  // Cleaning parades removed - shown in DriverHomeContent
  // {
  //   to: "/cleaning-parades",
  //   icon: Sparkles,
  //   label: "מסדרי ניקיון",
  //   description: "דווח על ביצוע מסדר ניקיון",
  //   iconGradient: "from-purple-500 to-pink-500",
  //   hideForBattalion: true,
  // },
];

export function QuickActions() {
  const { userType } = useAuth();
  const isBattalionUser = userType === 'battalion';

  // Filter actions based on user type
  const filteredActions = actions.filter(action => 
    !action.hideForBattalion || !isBattalionUser
  );

  return (
    <section className="relative px-4 py-20 overflow-hidden">
      {/* Premium Light Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-cream/50" />
      
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* Light Ambient Glows */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-[150px]" />
      <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-accent/6 rounded-full blur-[180px]" />
      
      {/* Decorative Circles */}
      <div className="absolute top-10 right-10 w-20 h-20 border border-primary/10 rounded-full" />
      <div className="absolute bottom-20 left-10 w-16 h-16 border border-accent/10 rounded-full" />
      
      {/* Light Grid overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px'
      }} />

      {/* Floating Decorative Elements */}
      <div className="absolute top-[15%] left-[8%] animate-float" style={{ animationDuration: '8s' }}>
        <Star className="w-4 h-4 text-accent/30" />
      </div>
      <div className="absolute top-[40%] right-[5%] animate-float" style={{ animationDuration: '10s', animationDelay: '2s' }}>
        <Sparkles className="w-5 h-5 text-primary/25" />
      </div>
      <div className="absolute bottom-[25%] left-[12%] animate-float" style={{ animationDuration: '7s', animationDelay: '1s' }}>
        <Zap className="w-4 h-4 text-accent/25" />
      </div>
      
      <div className="max-w-lg mx-auto relative z-10">
        {/* Section Header - Enhanced */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/90 border border-primary/15 mb-6 animate-slide-up shadow-[0_4px_30px_rgba(0,0,0,0.06),0_0_50px_rgba(var(--accent),0.06)]"
            style={{ animationDelay: '0.1s' }}
          >
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <span className="text-base font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">פעולות מהירות</span>
            <Flame className="w-5 h-5 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <h2 
            className="text-4xl md:text-5xl font-black text-slate-800 animate-slide-up drop-shadow-sm"
            style={{ animationDelay: '0.2s' }}
          >
            מה תרצה לעשות?
          </h2>
          
          {/* Decorative underline */}
          <div className="flex items-center justify-center gap-2 mt-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-primary/40" />
            <div className="w-2 h-2 rounded-full bg-accent" />
            <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-accent/40" />
          </div>
        </div>
        
        {/* Push Notification Setup for all users */}
        <PushNotificationSetup className="mb-6" />

        {/* Note: Cleaning parade info removed - shown in DriverHomeContent */}

        {/* Action Cards Grid - Premium Light */}
        <div className="space-y-4">
          {filteredActions.map((action, i) => (
            <Link
              key={action.to}
              to={action.to}
              className="group block animate-slide-up"
              style={{ animationDelay: `${(i + 3) * 80}ms` }}
            >
              <div className={cn(
                "relative overflow-hidden rounded-3xl p-6 transition-all duration-500",
                "bg-white/90 backdrop-blur-xl border border-slate-200/80",
                "shadow-[0_4px_25px_rgba(0,0,0,0.04)]",
                "hover:shadow-[0_12px_50px_rgba(0,0,0,0.1),0_0_80px_rgba(var(--primary),0.06)]",
                "hover:border-primary/40 hover:scale-[1.02]",
                action.featured && "border-accent/30 bg-gradient-to-r from-white to-accent/5"
              )}>
                {/* Animated gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }} 
                />
                
                {/* Content */}
                <div className="relative flex items-center gap-5">
                  {/* Icon Container - Premium Light Style */}
                  <div className={cn(
                    "relative w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500",
                    "group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3",
                    action.featured 
                      ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_6px_30px_rgba(var(--primary),0.3)]" 
                      : `bg-gradient-to-br ${action.iconGradient} text-primary-foreground shadow-lg`
                  )}>
                    {/* Icon inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
                    <action.icon className="relative w-8 h-8 drop-shadow" />
                    
                    {/* Pulse ring on hover */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/30 scale-100 opacity-0 group-hover:scale-125 group-hover:opacity-0 transition-all duration-700" />
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xl mb-1 text-slate-800 group-hover:text-primary transition-colors duration-300">
                      {action.label}
                    </h3>
                    <p className="text-sm text-slate-500 group-hover:text-slate-600 transition-colors duration-300 line-clamp-1">
                      {action.description}
                    </p>
                  </div>

                  {/* Arrow Button - Enhanced */}
                  <div className={cn(
                    "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-400",
                    "bg-slate-100 border border-slate-200",
                    "group-hover:bg-gradient-to-br group-hover:from-primary/15 group-hover:to-accent/15",
                    "group-hover:border-primary/40 group-hover:shadow-lg group-hover:scale-110"
                  )}>
                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1.5 transition-all duration-300" />
                  </div>
                </div>

                {/* Featured Badge - Enhanced */}
                {action.featured && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 shadow-[0_0_30px_rgba(var(--accent),0.15)]">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span className="text-sm font-black text-amber-700">חשוב</span>
                  </div>
                )}
                
                {/* Decorative corner accent */}
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/5 to-transparent rounded-tl-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-accent/5 to-transparent rounded-br-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </Link>
          ))}
        </div>
        
        {/* Bottom decorative element - Enhanced */}
        <div className="flex justify-center mt-14 animate-slide-up" style={{ animationDelay: '0.9s' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-primary/50" />
            <div className="relative">
              <div className="absolute inset-0 bg-accent blur-sm opacity-50" />
              <Crown className="relative w-6 h-6 text-accent" />
            </div>
            <div className="w-12 h-0.5 bg-gradient-to-l from-transparent via-accent/30 to-accent/50" />
          </div>
        </div>
        
        {/* Brand signature */}
        <div className="text-center mt-8 animate-slide-up" style={{ animationDelay: '1s' }}>
          <span className="text-sm font-bold text-slate-400">פלנ"ג בנימין • מערכת נהגי בט"ש</span>
        </div>
      </div>
      
      {/* Bottom gradient transition */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none" />
    </section>
  );
}