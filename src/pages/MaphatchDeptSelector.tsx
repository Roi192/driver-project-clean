import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, Building2, ArrowRight, Shield } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import unitLogo from "@/assets/unit-logo.png";
import { BRIGADES } from "@/lib/brigades";

const MAPHATCH_DEPARTMENTS = [
  'לוגיסטיקה',
  'אג"ם',
  'מודיעין',
  'לשכה',
  'רפואה',
  'תקשוב',
  'הנדסה',
  'משא"ן',
  'הגמ"ר',
  'איסוף',
] as const;

const DEPT_COLORS = [
  "from-blue-500 to-blue-700",
  "from-violet-500 to-violet-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-rose-700",
  "from-green-500 to-emerald-600",
  "from-cyan-500 to-cyan-700",
  "from-yellow-500 to-yellow-700",
  "from-pink-500 to-pink-700",
  "from-indigo-500 to-indigo-700",
  "from-teal-500 to-teal-700",
];

const MaphatchDeptSelector = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, isBrigadeAdmin, brigade: myBrigade } = useAuth();

  // brigade_admin: brigade is fixed — skip brigade-selection step
  const [selectedBrigade, setSelectedBrigade] = useState<string | null>(
    isBrigadeAdmin ? (myBrigade ?? null) : null
  );

  const handleSelectBrigade = (code: string) => {
    setSelectedBrigade(code);
  };

  const handleSelectDept = (dept: string) => {
    if (!selectedBrigade) return;
    sessionStorage.setItem('maphatchDeptContext', dept);
    if (isBrigadeAdmin) {
      // brigadeAdminContext was already set to 'maphatch' when entering from BrigadeNav
      navigate('/safety-events');
    } else {
      sessionStorage.setItem('brigadeContext', selectedBrigade);
      navigate('/safety-events');
    }
  };

  const handleBack = () => {
    if (isBrigadeAdmin) {
      sessionStorage.removeItem('brigadeAdminContext');
      sessionStorage.removeItem('maphatchDeptContext');
      navigate('/brigade-dashboard');
    } else if (selectedBrigade) {
      setSelectedBrigade(null);
    } else {
      sessionStorage.removeItem('superAdminDeptContext');
      sessionStorage.removeItem('maphatchDeptContext');
      sessionStorage.removeItem('brigadeContext');
      navigate('/department-selector');
    }
  };

  if (!isSuperAdmin && !isBrigadeAdmin) {
    navigate('/');
    return null;
  }

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20 relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--gold)/0.1),transparent_50%)]" />

        {/* Back button */}
        <button
          onClick={handleBack}
          className="absolute top-20 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm font-semibold">
            {isBrigadeAdmin ? 'חזרה לדשבורד חטיבה' : selectedBrigade ? 'חזרה לבחירת חטיבה' : 'חזרה לבחירת מחלקה'}
          </span>
        </button>

        {/* Logo & Title */}
        <div className="relative z-10 text-center mb-10 animate-fade-in">
          <div className="mx-auto mb-5 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <img src={unitLogo} alt="סמל היחידה" className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl mx-auto" />
          </div>

          {!selectedBrigade && !isBrigadeAdmin ? (
            <>
              <h1 className="text-3xl font-black text-white mb-2">מפח&quot;ט — בחר חטיבה</h1>
              <p className="text-slate-400">שלב 1 מתוך 2 · בחר את החטיבה</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black text-white mb-2">
                מפח&quot;ט — {BRIGADES[selectedBrigade as keyof typeof BRIGADES]?.name || selectedBrigade}
              </h1>
              <p className="text-slate-400">{isBrigadeAdmin ? 'בחר אגף' : 'שלב 2 מתוך 2 · בחר אגף'}</p>
            </>
          )}
        </div>

        {/* Step 1 — Brigade selection (super_admin only; brigade_admin skips this) */}
        {!selectedBrigade && !isBrigadeAdmin && (
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            {Object.values(BRIGADES).map((b) => (
              <button
                key={b.code}
                onClick={() => handleSelectBrigade(b.code)}
                className="group relative p-5 rounded-2xl border-2 border-slate-700/60 hover:border-emerald-500/60 bg-slate-800/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.04] hover:shadow-xl text-right overflow-hidden"
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-black text-white mb-0.5">{b.name}</h3>
                  <p className="text-xs text-slate-400">{b.shortLabel}</p>
                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-emerald-400 transition-colors mt-2">
                    <span className="text-xs font-semibold">בחר</span>
                    <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2 — Department selection */}
        {(selectedBrigade || isBrigadeAdmin) && (
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl">
            {MAPHATCH_DEPARTMENTS.map((dept, i) => (
              <button
                key={dept}
                onClick={() => handleSelectDept(dept)}
                className="group relative p-5 rounded-2xl border-2 border-slate-700/60 hover:border-emerald-500/60 bg-slate-800/60 backdrop-blur-xl transition-all duration-300 hover:scale-[1.05] hover:shadow-xl text-right overflow-hidden"
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${DEPT_COLORS[i]} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">{dept}</h3>
                  <div className="flex items-center gap-1 text-slate-500 group-hover:text-emerald-400 transition-colors">
                    <span className="text-xs font-semibold">כניסה</span>
                    <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="relative z-10 mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 text-sm font-medium">
            {isBrigadeAdmin ? 'מנהל חטיבה — מפח"ט' : 'מנהל ראשי — מפח"ט'}
          </span>
        </div>
      </div>
    </AppLayout>
  );
};

export default MaphatchDeptSelector;
