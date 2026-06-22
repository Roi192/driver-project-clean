import { LucideIcon, ChevronLeft } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

type NavTheme = 'gold' | 'amber' | 'indigo' | 'primary' | 'division';

const THEME_STYLES: Record<NavTheme, { border: string; hover: string; active: string; chevron: string; glow: string }> = {
  gold: {
    border: "border-gold/30",
    hover: "hover:bg-gradient-to-l hover:from-gold/20 hover:to-transparent hover:border-gold/60",
    active: "bg-gradient-to-l from-gold/30 to-transparent text-gold border-gold/60 shadow-lg shadow-gold/20",
    chevron: "group-hover:text-gold",
    glow: "from-gold/10",
  },
  amber: {
    border: "border-gold/30",
    hover: "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60",
    active: "bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60",
    chevron: "group-hover:text-amber-400",
    glow: "from-amber-500/10",
  },
  indigo: {
    border: "border-gold/30",
    hover: "hover:bg-gradient-to-l hover:from-indigo-500/20 hover:to-transparent hover:border-indigo-500/60",
    active: "bg-gradient-to-l from-indigo-500/30 to-transparent text-indigo-400 border-indigo-500/60",
    chevron: "group-hover:text-indigo-400",
    glow: "from-indigo-500/10",
  },
  primary: {
    border: "border-slate-700/50",
    hover: "hover:bg-gradient-to-l hover:from-primary/20 hover:to-transparent hover:border-primary/50",
    active: "bg-gradient-to-l from-primary/30 to-transparent text-primary border-primary/60 shadow-lg shadow-primary/20",
    chevron: "group-hover:text-primary",
    glow: "from-primary/10",
  },
  division: {
    border: "border-amber-500/30",
    hover: "hover:bg-gradient-to-l hover:from-amber-500/20 hover:to-transparent hover:border-amber-500/60",
    active: "bg-gradient-to-l from-amber-500/30 to-transparent text-amber-400 border-amber-500/60",
    chevron: "group-hover:text-amber-400",
    glow: "from-amber-500/10",
  },
};

interface NavMenuItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor?: string;
  theme?: NavTheme;
  onClose: () => void;
  badge?: React.ReactNode;
  style?: React.CSSProperties;
}

export const NavMenuItem = ({
  to,
  label,
  icon: Icon,
  iconBg,
  iconColor = "text-white",
  theme = 'gold',
  onClose,
  badge,
  style,
}: NavMenuItemProps) => {
  const t = THEME_STYLES[theme];

  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={cn(
        "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:text-white",
        "transition-all duration-300 relative overflow-hidden group border",
        t.border,
        t.hover
      )}
      activeClassName={t.active}
      style={style}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300", t.glow)} />
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
        "group-hover:scale-110 transition-transform duration-300",
        iconBg,
        iconColor
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="font-bold text-base relative z-10 flex-1">{label}</span>
      {badge ?? (
        <ChevronLeft className={cn(
          "w-5 h-5 text-slate-500 group-hover:-translate-x-1 transition-all duration-300",
          t.chevron
        )} />
      )}
    </NavLink>
  );
};
