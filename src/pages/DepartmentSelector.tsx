import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Car, Shield, Building2, ChevronLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import unitLogo from "@/assets/unit-logo.png";

const DepartmentSelector = () => {
  const navigate = useNavigate();

  const departments = [
    {
      id: "planag",
      title: 'פלנ"ג',
      subtitle: "פלוגת נהגים",
      description: "ניהול נהגי בט\"ש, משמרות, ביקורות ובטיחות",
      icon: Car,
      gradient: "from-primary via-teal to-primary",
      borderColor: "border-primary/40",
      hoverBorder: "hover:border-primary",
      glowColor: "from-primary/30",
      route: "/planag",
    },
    {
      id: "hagmar",
      title: 'הגמ"ר',
      subtitle: "הגנת המרחב",
      description: "ניהול הגנת היישוב והקשר עם ההתיישבות",
      icon: Building2,
      gradient: "from-amber-500 via-orange-500 to-amber-600",
      borderColor: "border-amber-500/40",
      hoverBorder: "hover:border-amber-500",
      glowColor: "from-amber-500/30",
      route: "/hagmar",
    },
    {
      id: "battalion",
      title: 'גדוד תע"ם',
      subtitle: "גדוד תעבורה מבצעית",
      description: "ניהול בטיחות, ראיונות נהגים וביקורות גדודיות",
      icon: Shield,
      gradient: "from-indigo-500 via-blue-500 to-indigo-600",
      borderColor: "border-indigo-500/40",
      hoverBorder: "hover:border-indigo-500",
      glowColor: "from-indigo-500/30",
      route: "/battalion-context",
    },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20 relative overflow-hidden" dir="rtl">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--gold)/0.1),transparent_50%)]" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-56 h-56 bg-gradient-to-br from-amber-500/15 to-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        {/* Logo & Title */}
        <div className="relative z-10 text-center mb-12 animate-fade-in">
          <div className="mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-xl opacity-50 animate-pulse" />
            <img
              src={unitLogo}
              alt="סמל היחידה"
              className="w-28 h-28 object-contain relative z-10 drop-shadow-2xl mx-auto"
            />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">מערכת ניהול</h1>
          <p className="text-lg text-slate-400">בחר את המחלקה שברצונך לנהל</p>
        </div>

        {/* Department Cards */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
          {departments.map((dept) => {
            const Icon = dept.icon;
            return (
              <button
                key={dept.id}
                onClick={() => {
                  if (dept.id === 'battalion') {
                    sessionStorage.setItem('superAdminDeptContext', 'battalion');
                  } else {
                    sessionStorage.removeItem('superAdminDeptContext');
                  }
                  navigate(dept.id === 'battalion' ? '/planag' : dept.route);
                }}
                className={`group relative p-8 rounded-3xl border-2 ${dept.borderColor} ${dept.hoverBorder} bg-slate-800/60 backdrop-blur-xl transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl text-right overflow-hidden`}
              >
                {/* Glow effect on hover */}
                <div className={`absolute -inset-1 bg-gradient-to-br ${dept.glowColor} to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${dept.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Text */}
                  <h2 className="text-2xl font-black text-white mb-1">{dept.title}</h2>
                  <p className="text-base font-bold text-slate-300 mb-2">{dept.subtitle}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{dept.description}</p>

                  {/* Arrow */}
                  <div className="flex items-center gap-2 mt-5 text-slate-500 group-hover:text-white transition-colors">
                    <span className="text-sm font-semibold">כניסה למחלקה</span>
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-10 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-slate-400 text-sm font-medium">מנהל ראשי (Super Admin)</span>
        </div>
      </div>
    </AppLayout>
  );
};

export default DepartmentSelector;