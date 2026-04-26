import { ReactNode, CSSProperties } from "react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeckCardProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  featured?: boolean;
}

export function DeckCard({ icon: Icon, title, description, onClick, children, className, style, featured }: DeckCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "group relative overflow-hidden p-4 md:p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 transition-all duration-500 touch-manipulation",
        onClick && "cursor-pointer active:scale-[0.98] hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.3),0_0_40px_hsl(var(--accent)/0.15)] hover:bg-card hover:scale-[1.01]",
        className
      )}
    >
      {/* Animated gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all duration-500 pointer-events-none" />
      
      {/* Premium glow effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none" />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

      {/* Sparkle accents */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Sparkles className="w-3 h-3 text-accent animate-pulse" />
      </div>
      
      <div className="relative flex items-center gap-3 md:gap-4">
        {Icon && (
          <div className="relative">
            {/* Multi-layer glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-all duration-500 scale-150" />
            
            <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center shrink-0 border border-primary/25 group-hover:border-accent/60 group-hover:scale-105 transition-all duration-500 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              <Icon className="w-7 h-7 md:w-8 md:h-8 text-primary group-hover:text-accent transition-colors duration-500" />
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base md:text-lg text-slate-800 group-hover:text-primary transition-all duration-500">
            {title}
          </h3>
          {description && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 group-hover:text-foreground/80 transition-all duration-500 line-clamp-2">{description}</p>
          )}
          {children}
        </div>

        {onClick && (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-500 shrink-0">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all duration-500" />
          </div>
        )}
      </div>

      {/* Featured badge */}
      {featured && (
        <div className="absolute top-0 left-0 px-2.5 py-1 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold rounded-br-xl rounded-tl-xl">
          <Sparkles className="w-3 h-3 inline-block mr-1" />
          מומלץ
        </div>
      )}

      {/* Corner accent */}
      <div className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-accent/20 to-transparent rounded-tl-3xl" />
      </div>
    </div>
  );
}