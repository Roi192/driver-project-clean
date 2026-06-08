import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { BRIGADES, BRIGADE_CODES } from "@/lib/brigades";
import { Shield, Globe, ChevronLeft, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const BrigadeContextSelector = () => {
  const navigate = useNavigate();
  const { realIsDivisionAdmin, setActiveBrigade, loading, isBattalion } = useAuth() as any;
  const canSelect = realIsDivisionAdmin || isBattalion;
  const [savingBrigade, setSavingBrigade] = useState(false);

  useEffect(() => {
    if (!loading && !canSelect) {
      navigate("/", { replace: true });
    }
  }, [loading, canSelect, navigate]);

  const pick = async (code: string | null) => {
    setSavingBrigade(true);
    try {
      await setActiveBrigade(code);
      sessionStorage.setItem('superAdminBrigadePicked', '1');
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error(`שגיאה בשמירת החטיבה: ${error?.message || error}`);
    } finally {
      setSavingBrigade(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-20 bg-gradient-to-br from-slate-50 via-white to-slate-100" dir="rtl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">בחר חטיבה לניהול</h1>
          <p className="text-slate-700 font-medium">
            {isBattalion && !realIsDivisionAdmin
              ? 'כגדוד תע"ם, בחר את החטיבה שאליה אתה משתייך כעת'
              : 'תוכל להחליף חטיבה בכל עת מהתפריט'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {/* All brigades — only for division admins */}
          {realIsDivisionAdmin && (
          <button
            onClick={() => pick(null)}
            disabled={savingBrigade}
            className="group relative p-6 rounded-2xl border-2 border-primary/40 hover:border-primary bg-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl text-right disabled:opacity-60"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-3">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">מפאו"ג איו"ש</h2>
            <p className="text-sm text-slate-700 font-medium">תצוגה אוגדתית — שש החטיבות</p>
            <div className="flex items-center gap-1 mt-3 text-primary text-sm font-semibold">
              <span>כניסה</span>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </button>
          )}

          {canSelect && BRIGADE_CODES.map((code) => (
            <button
              key={code}
              onClick={() => pick(code)}
              disabled={savingBrigade}
              className="group relative p-6 rounded-2xl border-2 border-slate-200 hover:border-primary bg-white shadow-md transition-all hover:scale-[1.02] hover:shadow-xl text-right disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1">{BRIGADES[code].name}</h2>
              <p className="text-sm text-slate-700 font-medium">{BRIGADES[code].shortLabel}</p>
              <div className="flex items-center gap-1 mt-3 text-primary text-sm font-semibold">
                <span>כניסה לחטיבה</span>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default BrigadeContextSelector;