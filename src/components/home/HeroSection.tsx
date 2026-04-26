import { Shield, ChevronLeft, LogOut, Star, LayoutDashboard, Sparkles, Zap, Target, Award, Crown, Sun, Moon, Flame, Stars, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import unitLogo from "@/assets/unit-logo.png";
import bgVehicles from "@/assets/bg-vehicles.png";

const safetyQuotes = [
  "בטיחות היא לא מקרה - היא בחירה",
  "נהיגה זהירה = חזרה הביתה",
  "אל תמהר - המשפחה מחכה בבית",
  "בדוק, תרגל, נהג בזהירות",
  "חיי אדם קודמים למשימה",
  "הבטיחות מתחילה בך",
  "נהג אחראי - חוזר הביתה",
];

export function HeroSection() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const randomQuote = safetyQuotes[Math.floor(Math.random() * safetyQuotes.length)];
  
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Premium Light Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cream/30" />
      
      {/* Secondary Light Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-accent/5" />
      
      {/* Animated Light Mesh */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_30%_10%,hsl(var(--primary)/0.15),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-3/4 h-1/2 bg-[radial-gradient(ellipse_at_70%_5%,hsl(var(--accent)/0.12),transparent_50%)]" />
        <div className="absolute bottom-0 w-full h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,hsl(var(--primary)/0.08),transparent_70%)]" />
      </div>

      {/* Elegant Light Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />
      
      {/* Premium Top Border Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      {/* Decorative Corner Elements */}
      <div className="absolute top-20 left-4 w-32 h-32 border border-primary/10 rounded-full opacity-30" />
      <div className="absolute top-32 left-8 w-20 h-20 border border-accent/10 rounded-full opacity-20" />
      <div className="absolute bottom-40 right-4 w-24 h-24 border border-primary/10 rounded-full opacity-25" />
      
      {/* Background Vehicles - Subtle */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url(${bgVehicles})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Premium Floating Light Orbs */}
      <div className="absolute top-[10%] left-[5%] w-80 h-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-[100px] animate-float" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[25%] right-[5%] w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-transparent blur-[120px] animate-float" style={{ animationDuration: '14s', animationDelay: '3s' }} />
      <div className="absolute bottom-[15%] left-[15%] w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 blur-[90px] animate-float" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      
      {/* Golden Accent Orbs */}
      <div className="absolute top-[45%] right-[15%] w-48 h-48 rounded-full bg-gradient-to-br from-accent/25 to-transparent blur-[70px] animate-pulse" style={{ animationDuration: '5s' }} />
      <div className="absolute top-[20%] left-[25%] w-36 h-36 rounded-full bg-gradient-to-br from-accent/20 to-transparent blur-[60px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />

      {/* Animated Sparkle Dots */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            background: i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
            top: `${10 + (i * 4.5) % 80}%`,
            left: `${5 + (i * 5.3) % 90}%`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: `${2 + (i % 2)}s`,
            opacity: 0.4
          }}
        />
      ))}

      {/* Floating Stars Animation */}
      <div className="absolute top-[30%] left-[8%] animate-bounce-soft" style={{ animationDuration: '4s' }}>
        <Stars className="w-5 h-5 text-accent/40" />
      </div>
      <div className="absolute top-[50%] right-[12%] animate-bounce-soft" style={{ animationDuration: '5s', animationDelay: '1s' }}>
        <Sparkles className="w-4 h-4 text-primary/30" />
      </div>
      <div className="absolute bottom-[35%] left-[20%] animate-bounce-soft" style={{ animationDuration: '4.5s', animationDelay: '2s' }}>
        <Gem className="w-4 h-4 text-accent/35" />
      </div>

      {/* User Panel - Premium Light Glass */}
      {user && (
        <div className="absolute top-4 left-4 right-4 z-20 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-4 rounded-3xl bg-white/80 backdrop-blur-2xl border border-primary/15 shadow-[0_8px_40px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-md opacity-50" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <span className="text-primary-foreground font-black text-lg">
                    {(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">שלום,</span>
                <span className="text-base font-black text-slate-800">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-accent/20 to-accent/10 text-amber-700 text-xs font-black border border-accent/30 shadow-[0_0_20px_rgba(var(--accent),0.15)]">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  מנהל
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary-foreground hover:bg-primary font-bold rounded-xl text-sm px-4 h-10 transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105">
                    <LayoutDashboard className="w-4 h-4" />
                    דשבורד
                  </Button>
                </Link>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut} 
                className="gap-1.5 text-slate-500 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-xl text-sm px-4 h-10 transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                התנתק
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-24 pt-32">
        {/* Premium Emblem Container */}
        <div className="relative mb-10 animate-slide-up">
          {/* Multiple Glow Layers */}
          <div className="absolute inset-[-60%] bg-gradient-to-br from-primary/25 via-accent/20 to-primary/25 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute inset-[-40%] bg-gradient-to-br from-accent/30 to-primary/25 rounded-full blur-[60px] animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <div className="absolute inset-[-20%] bg-gradient-to-br from-primary/15 to-accent/15 rounded-full blur-[40px] animate-glow" style={{ animationDuration: '3s' }} />
          
          {/* Decorative Spinning Rings */}
          <div className="absolute -inset-8 rounded-full border-2 border-dashed border-primary/20 animate-spin-slow" />
          <div className="absolute -inset-14 rounded-full border border-accent/15 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
          <div className="absolute -inset-20 rounded-full border border-primary/8" />
          
          {/* Orbiting Dots */}
          <div className="absolute -inset-12 animate-spin-slow" style={{ animationDuration: '15s' }}>
            <div className="absolute top-0 left-1/2 w-2 h-2 -translate-x-1/2 bg-accent rounded-full shadow-lg" />
            <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 -translate-x-1/2 bg-primary rounded-full" />
          </div>
          
          {/* Logo - Enhanced with effects */}
          <div className="relative group">
            <img 
              src={unitLogo} 
              alt="סמל פלנ״ג בנימין" 
              className="relative w-52 h-52 md:w-80 md:h-80 object-contain animate-float transition-transform duration-500 group-hover:scale-105"
              style={{ 
                filter: 'drop-shadow(0 30px 70px hsl(var(--primary) / 0.5)) drop-shadow(0 20px 40px hsl(var(--accent) / 0.35))',
                animationDuration: '7s'
              }}
            />
            {/* Shine effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
          </div>
        </div>

        {/* Elite Unit Badge - Premium Light */}
        <div 
          className="relative flex items-center gap-3 px-6 py-3 rounded-3xl bg-white/90 border border-primary/20 backdrop-blur-xl mb-6 animate-slide-up shadow-[0_8px_40px_rgba(0,0,0,0.08),0_0_80px_rgba(var(--primary),0.08)]" 
          style={{ animationDelay: '0.15s' }}
        >
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-shimmer" />
          
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg animate-glow">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-black bg-gradient-to-r from-primary via-slate-800 to-accent bg-clip-text text-transparent">
              פלנ"ג בנימין
            </span>
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          </div>
          
          {/* Day/Night indicator - Enhanced */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <Moon className="w-3.5 h-3.5 text-primary animate-pulse" />
            <div className="w-px h-4 bg-slate-300" />
            <Sun className="w-3.5 h-3.5 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Main Title - Epic Typography with Light Theme */}
        <div className="text-center mb-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight">
            <span className="block text-slate-800 drop-shadow-sm">מערכת ניהול</span>
          </h1>
          <span className="block text-4xl md:text-6xl font-black bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
            נהגי בט"ש
          </span>
        </div>

        {/* Decorative Divider - Enhanced */}
        <div className="flex items-center gap-4 mb-5 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-primary" />
          <div className="relative">
            <div className="absolute inset-0 bg-accent blur-md opacity-60" />
            <div className="relative w-3 h-3 rounded-full bg-accent shadow-lg" />
          </div>
          <div className="w-20 h-0.5 bg-gradient-to-l from-transparent via-accent/40 to-accent" />
        </div>

        {/* Slogan - Premium Style Light */}
        <div className="text-center mb-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-xl md:text-3xl font-black bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent drop-shadow-sm animate-glow-pulse">
            נהג מוביל - פלוגה מנצחת
          </p>
        </div>

        {/* Safety Quote Card - Premium Light Glassmorphism */}
        <div className="relative w-full max-w-md mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          {/* Card glow */}
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-accent/15 to-primary/20 rounded-[2rem] blur-2xl opacity-60" />
          
          <div className="relative p-7 rounded-3xl bg-white/85 backdrop-blur-2xl border border-primary/15 shadow-[0_20px_60px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)]">
            {/* Quote marks - Enhanced */}
            <div className="absolute top-3 right-5 text-6xl font-serif text-primary/20 select-none animate-float" style={{ animationDuration: '8s' }}>"</div>
            <div className="absolute bottom-3 left-5 text-6xl font-serif text-primary/20 rotate-180 select-none animate-float" style={{ animationDuration: '8s', animationDelay: '1s' }}>"</div>
            
            {/* Glow dot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-pulse" />
            
            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-primary/30 rounded-tl" />
            <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-primary/30 rounded-tr" />
            <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-primary/30 rounded-bl" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-primary/30 rounded-br" />
            
            <p className="relative text-xl md:text-2xl text-slate-700 font-bold text-center leading-relaxed px-6 py-3">
              {randomQuote}
            </p>
          </div>
        </div>

        {/* CTA Button - Ultimate Premium Light */}
        <div className="w-full max-w-md mx-auto animate-slide-up mb-14" style={{ animationDelay: '0.5s' }}>
          <Link to="/shift-form" className="block">
            <button className="group relative w-full overflow-hidden px-10 py-6 rounded-3xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] text-primary-foreground font-black text-xl shadow-[0_10px_50px_rgba(0,0,0,0.15),0_0_80px_rgba(var(--primary),0.15)] hover:shadow-[0_15px_60px_rgba(0,0,0,0.2),0_0_100px_rgba(var(--primary),0.25)] transition-all duration-500 hover:scale-[1.03] animate-shimmer">
              {/* Multiple shimmer effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-full group-hover:-translate-x-full transition-transform duration-1200 delay-100" />
              
              {/* Inner border glow */}
              <div className="absolute inset-[2px] rounded-3xl border border-white/25" />
              
              {/* Animated corner accents */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white/40 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white/40 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <span className="relative flex items-center justify-center gap-5">
                <Zap className="w-7 h-7 drop-shadow-lg animate-pulse" />
                <span className="drop-shadow-lg tracking-wide">התחל טופס לפני משמרת</span>
                <ChevronLeft className="w-7 h-7 transition-transform duration-500 group-hover:-translate-x-3 drop-shadow-lg" />
              </span>
            </button>
          </Link>
        </div>

        {/* Stats Grid - Premium Light Cards */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 w-full max-w-xl animate-slide-up" style={{ animationDelay: '0.6s' }}>
          {[
            { value: "100%", label: "בטיחות", icon: Award, gradient: "from-primary to-primary/80", glowColor: "primary" },
            { value: "24/7", label: "פעילות", icon: Zap, gradient: "from-accent to-amber-500", glowColor: "accent" },
            { value: "11", label: "מוצבים", icon: Target, gradient: "from-primary via-accent to-primary", glowColor: "primary" },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="group relative p-5 rounded-3xl bg-white/80 backdrop-blur-xl border border-slate-200/80 hover:border-primary/40 transition-all duration-500 shadow-[0_4px_25px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_50px_rgba(0,0,0,0.12),0_0_50px_rgba(var(--primary),0.08)] hover:scale-105"
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br from-${stat.glowColor}/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative text-center">
                <div className={`relative inline-flex w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                  {/* Icon glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
                  <stat.icon className="relative w-7 h-7 md:w-8 md:h-8 text-primary-foreground drop-shadow" />
                </div>
                <div className="text-3xl md:text-5xl font-black text-slate-800 mb-1.5 group-hover:text-primary transition-colors duration-300">
                  {stat.value}
                </div>
                <div className="text-sm md:text-base text-slate-500 font-bold group-hover:text-slate-700 transition-colors duration-300">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom gradient fade - Light */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white/80 via-white/40 to-transparent pointer-events-none" />
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
}