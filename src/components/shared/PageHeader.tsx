import { LucideIcon } from "lucide-react";
import unitLogo from "@/assets/unit-logo.png";

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle: string;
  badge?: string;
}

export function PageHeader({ icon: Icon, title, subtitle, badge }: PageHeaderProps) {
  const hasIcon = !!Icon;
  return (
    <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-8 rounded-2xl mb-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
      <div className="absolute top-4 left-4 opacity-20">
        <img src={unitLogo} alt="" className="w-20 h-20" />
      </div>
      
      <div className="relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/30 mb-4">
          {hasIcon && <Icon className="w-4 h-4 text-gold" />}
          <span className="text-sm font-bold text-gold">{badge || title}</span>
        </div>
        <h1 className="text-2xl font-black text-white mb-2">{title}</h1>
        <p className="text-slate-400 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}