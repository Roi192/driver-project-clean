import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Check, BookOpen, CheckCircle2, Loader2, ArrowRight, Shield, Award, Calendar, PenLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import unitLogo from "@/assets/unit-logo.png";
import { SignatureCanvas } from "@/components/shared/SignatureCanvas";

interface ProcedureItem {
  id: string;
  text: string;
  checked: boolean;
}

interface SignatureRecord {
  id: string;
  procedure_type: string;
  full_name: string;
  created_at: string;
}

// Procedure content
const proceduresData = {
  routine: {
    title: "נהלי שגרה",
    icon: "📋",
    color: "from-blue-500 to-blue-600",
    items: [
      "בכל שבוע בימי ראשון ושני יתקיימו שיחות פלוגה בשעה 11:00 בחטיבה",
      "כל אירוע שקורה גם בבית על החייל לדווח למפקדיו",
      "כל הגעה לבסיס או יציאה מימנו תיהיה על מדי א' מדוגמים עם דסקיות צוואר ונעליים חולצה לבנה מתחת למדים כומתה וחוגר.",
      "חל איסור להגיע עם רכב פרטי לבסיס, כל יציאה או הגעה לבסיס תתבצע בתחבורה ציבורית בלבד.",
      "חל איסור לנוע עם טבעות/צמידים.",
      "אין לעשן ברכב/בחדר נהגים - העישון הוא רק בפינות העישון המוגדרות",
      "יבוצעו 2 מסדרי ניקיון במהלך השבוע בימי ראשון ורביעי על החדר להיות נקי ומסודר עד השעה 17:00",
      "כל יציאה מהמוצב תיהיה באישור מ\"מ ולאחר תדריך יציאה ע\"י קצין מוצב",
      "כיבוי אורות בשעה 23:00 אין להסתובב מחוץ למגורים ואין להרעיש בחדר.",
      "חולצה מתחת למדי ב' תיהיה בצבע ירוק או לבן",
      "אין לבצע חילופים בסידורי עבודה, כל חילוף באישור מ\"מ",
      "טרם יציאה מהבסיס יש לאפסן את הנשק בנשקיית החטיבה או בארמון הפלוגתי.",
      "ככלל היציאה לבית תיהיה בשעה 14:00 לאחר השלמת שעות שינה.",
      "הנשק הוא נשק אישי, כל חייל אחראי לנשקו, אין להעביר נשק מיד ליד והנשק יהיה צמוד לחייל בכל זמן נתון, בשינה הנשק ימצא מתחת לראשו של החייל, יש לשמור על הנשק נצור עם מק פורק ומחסנית מחוץ לנשק.",
      "ניקוי נשקים יהיה בנקודה מוגדרת במוצב בנוכחות מפקד.",
      "הנשק יהיה במצב שחור מחסנית בהכנס רק בפעילות מבצעית בתחילת הסיור הכנסת המחסנית תיהיה בנוכחות מפקד בסוף הסיור הוצאת המחסנית תיהיה בנוכחות מפקד",
      "תנועה עם פליז תיהיה רק על גבי פליז צבאי ירוק ומדי ב' מלאים מתחת."
    ]
  },
  shift: {
    title: "נהלים במהלך משמרת",
    icon: "🚗",
    color: "from-emerald-500 to-emerald-600",
    items: [
      "יש להגיע בזמן שהוגדר ע\"י הפלוגה לנוהל קרב למשימה.",
      "יש לבצע תחקיר ע\"י רמה ממונה ותדריך נהיגה ע\"י מפקד גזרה.",
      "יש להגיע עם ציוד לחימה ומדים מלאים לנוהל קרב ולמשימה",
      "יש לנוע בכל משימה גם באירוע מבצעי עם חגורות בטיחות",
      "אין לצאת למשימה ללא מילוי כרטיס עבודה ומעבר תדריך פרונטלי",
      "יש לוודא טרם יציאה למשימה את תקינות מערכת הענ\"א",
      "יש להעביר בתחילת כל נסיעה את החוגר במערכת הענ\"א",
      "יש לבצע טל\"ת לפני כל יציאה למשמרת",
      "יש לבדוק את כלי הנהג ברכב.",
      "יש לבצע תרגולות מחייבות בתחילת המשימה",
      "עיגון ציוד - יש לוודא עיגון ציוד ברכב כמו ברוסים כלי נהג מטף",
      "יש לוודא נעילה כפולה בדויד",
      "מפקד המשימה הוא מפקד של כל הכוח כולל הנהג,יש להישמע להוראות מפקד המשימה בכל מהלך המשמרת.",
      "בכל מקרה של תקלה חימושית או תאונה יש להעביר דיווח לפלוגה הלוחמת ולסגל הפלוגת הנהגים.",
      "יש לשמור על הרכב נקי לפני ואחרי משמרת",
      "יש לנסוע על פי חוקי התעבורה",
      "נסיעה ברכב תתבצע על מדים מלאים",
      "אין להתעסק בהיסחי דעת במהלך נסיעה (טלפון, רדיו, ניווט, אוכל, שתייה וכו')",
      "לפני כל משימה על הנהג למלא טופס לפני משמרת באפליקצייה.",
      "במהלך המשימה יש להיות עם ווסט קרמי על הנהג וקסדה בהישג יד, קסדה תעלה לראש במידה והנהג נדרש לפרוק או בכניסה לכפר.",
      "חל איסור לדרוך את הנשק או לפרוק ולצאת מהרכב ללא פקודה מפורשת ממפקד הכוח."
    ]
  },
  aluf70: {
    title: "נוהל אלוף 70",
    icon: "⚠️",
    color: "from-amber-500 to-amber-600",
    items: [
      "הגעה מהבית עד השעה 11:00 כך שיהיה 9 שעות שינה טרם עלייה למשימה כפי שמוגדר בנוהל אלוף 70.",
      "חל איסור על ביצוע פרסות ברכב ממוגן.",
      "נוהל ורדים (גדם ראשון) - הגשם הראשון מוגדר כגשם שיורד לאחר קיץ או לאחר 3 חודשי יובש, גשם ראשון \"תקופתי\" יורד לאחר מספר ימים של יובש. הגשם הראשון לא מנקה את הכביש מאבק ושמנים אשר הצטברו בימי היובש ולכן, בזמן הגשם הכביש חלק באופן קיצוני וקיימת סכנת החלקה ואובדן שליטה. על הכרזה על נוהל ורדים יש להתמקם בנקודות ורדים וכל אישור נסיעה תיהיה באישור סא\"ל בלבד (מג\"ד/סמח\"ט)",
      "מערכת הענ\"א - חובה להעביר חוגר ולוודא כי מערכת הענ\"א עובדת ברכב, נהג יקבל משוב אחת לחודש, יש לבצע תדריך על פי נתוני הענ\"א, חייל אשר יקבל ציון ראשון מתחת ל75 יגיע לבירור סמח\"ט, חודש שני ברציפות יגיע שוב לבירור סמח\"ט ומבחן שליטה חודש שלישי ברציפות הנהג יהיה שלול מההגה עד מעבר נהיגה מונעת במידה ונהג יותר מ750 קילומטר יהיה שלול בנוסף לחודש ימים."
    ]
  }
};

type ProcedureType = keyof typeof proceduresData;

export default function Procedures() {
  const { user } = useAuth();
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureType | null>(null);
  const [items, setItems] = useState<ProcedureItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mySignatures, setMySignatures] = useState<SignatureRecord[]>([]);
  const [loadingSignatures, setLoadingSignatures] = useState(true);
  const [readAndUnderstood, setReadAndUnderstood] = useState(false);

  useEffect(() => {
    fetchMySignatures();
    fetchUserProfile();
  }, [user]);
  
  const fetchUserProfile = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, personal_number')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
    if (profile?.personal_number) {
      setPersonalNumber(profile.personal_number);
    }
  };

  useEffect(() => {
    if (selectedProcedure) {
      const procedureItems = proceduresData[selectedProcedure].items.map((text, idx) => ({
        id: `${selectedProcedure}-${idx}`,
        text,
        checked: false
      }));
      setItems(procedureItems);
      setReadAndUnderstood(false);
      setSignature("");
    }
  }, [selectedProcedure]);

  const fetchMySignatures = async () => {
    if (!user) return;
    setLoadingSignatures(true);
    const { data, error } = await supabase
      .from("procedure_signatures")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching signatures:", error);
    } else {
      setMySignatures(data || []);
    }
    setLoadingSignatures(false);
  };

  const toggleItem = (itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  const allItemsChecked = items.every(item => item.checked);
  const canSubmit = allItemsChecked && readAndUnderstood && fullName.trim() && signature.trim();

  const getLatestSignature = (procedureType: string) => {
    const currentYear = new Date().getFullYear();
    return mySignatures.find(sig => {
      const sigYear = new Date(sig.created_at).getFullYear();
      return sig.procedure_type === procedureType && sigYear === currentYear;
    });
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit || !selectedProcedure) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("procedure_signatures").insert({
      user_id: user.id,
      procedure_type: selectedProcedure,
      full_name: fullName.trim(),
      signature: signature.trim(),
      items_checked: items.map(item => item.id)
    });

    if (error) {
      toast.error("שגיאה בשמירת החתימה");
      console.error(error);
    } else {
      toast.success("הנוהל נחתם בהצלחה!");
      fetchMySignatures();
      setSelectedProcedure(null);
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // Procedure Detail View
  if (selectedProcedure) {
    const procedure = proceduresData[selectedProcedure];
    const checkedCount = items.filter(i => i.checked).length;
    const progress = (checkedCount / items.length) * 100;

    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="px-4 py-6 max-w-lg mx-auto">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => setSelectedProcedure(null)}
              className="mb-4 gap-2 text-slate-600 hover:text-slate-800"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לנהלים
            </Button>

            {/* Document Header */}
            <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden mb-6 border border-slate-200">
              {/* Top Banner */}
              <div className={`h-3 bg-gradient-to-r ${procedure.color}`} />
              
              {/* Logo & Title Section */}
              <div className="p-6 text-center border-b border-slate-100">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                    <img 
                      src={unitLogo} 
                      alt="סמל הפלוגה" 
                      className="relative w-20 h-20 object-contain drop-shadow-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">פלנ"ג בנימין</p>
                  <h1 className="text-2xl font-black text-slate-800">{procedure.title}</h1>
                  <p className="text-xs text-slate-400">מערכת נהגי בט"ש</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="px-6 py-4 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600">התקדמות קריאה</span>
                  <span className="text-sm font-bold text-primary">{checkedCount}/{items.length}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${procedure.color} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Procedure Items */}
            <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden mb-6">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  סעיפי הנוהל
                </h2>
                <p className="text-xs text-slate-500 mt-1">סמן כל סעיף שקראת והבנת</p>
              </div>
              
              <div className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`p-4 cursor-pointer transition-all duration-300 ${
                      item.checked 
                        ? 'bg-emerald-50' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                        item.checked 
                          ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/30' 
                          : 'border-slate-300 hover:border-primary'
                      }`}>
                        {item.checked && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm leading-relaxed ${
                          item.checked ? 'text-emerald-700' : 'text-slate-700'
                        }`}>
                          <span className="font-bold text-slate-500">{index + 1}.</span> {item.text}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirmation & Signature Section */}
            {allItemsChecked && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
                <div className={`h-2 bg-gradient-to-r ${procedure.color}`} />
                
                <div className="p-6 space-y-6">
                  {/* Read and Understood Button */}
                  <div 
                    onClick={() => setReadAndUnderstood(!readAndUnderstood)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-4 ${
                      readAndUnderstood 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      readAndUnderstood ? 'bg-white/20' : 'bg-white'
                    }`}>
                      {readAndUnderstood ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <span className="font-bold text-lg">קראתי והבנתי את כל הסעיפים</span>
                  </div>

                  {readAndUnderstood && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Name Display (Read Only) */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          שם מלא
                        </label>
                        <Input
                          value={fullName}
                          readOnly
                          disabled
                          className="h-12 rounded-xl bg-slate-100 border-slate-200 text-slate-800 text-right font-medium cursor-not-allowed"
                        />
                      </div>

                      {/* Personal Number Display (Read Only) */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                          מספר אישי
                        </label>
                        <Input
                          value={personalNumber}
                          readOnly
                          disabled
                          className="h-12 rounded-xl bg-slate-100 border-slate-200 text-slate-800 text-right font-medium cursor-not-allowed"
                        />
                      </div>

                      {/* Signature Input */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                          <PenLine className="w-4 h-4" />
                          חתימה דיגיטלית
                        </label>
                        <SignatureCanvas
                          value={signature}
                          onChange={setSignature}
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                        className={`w-full h-14 rounded-2xl text-lg font-bold transition-all duration-300 ${
                          canSubmit 
                            ? `bg-gradient-to-r ${procedure.color} hover:opacity-90 shadow-lg` 
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <Award className="w-5 h-5 ml-2" />
                            חתום על הנוהל
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Procedures List View
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="px-4 py-6 max-w-lg mx-auto">
          {/* Header */}
          <PageHeader
            icon={BookOpen}
            title="נהלים לחתימה"
            subtitle="בחר נוהל לקריאה וחתימה"
            badge="נהלים"
          />

          {/* Procedures Cards */}
          <div className="space-y-4">
            {(Object.keys(proceduresData) as ProcedureType[]).map((key, index) => {
              const procedure = proceduresData[key];
              const latestSignature = getLatestSignature(key);
              const isSigned = !!latestSignature;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedProcedure(key)}
                  className="group relative bg-white rounded-3xl shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden cursor-pointer border border-slate-200 hover:border-primary/30 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Color Strip */}
                  <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${procedure.color}`} />
                  
                  <div className="p-5 pr-6">
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${procedure.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {procedure.icon}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-800 mb-1">{procedure.title}</h3>
                        <p className="text-sm text-slate-500">{procedure.items.length} סעיפים</p>
                        
                        {/* Signature Status */}
                        {isSigned ? (
                          <div className="mt-2 flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs font-medium">
                              נחתם ב-{formatDate(latestSignature.created_at)}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-2 text-amber-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-xs font-medium">טרם נחתם השנה</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Arrow */}
                      <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary rotate-180 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Annual Reminder Notice */}
          <div className="mt-8 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-amber-800">חידוש חתימות שנתי</h4>
                <p className="text-sm text-amber-700 mt-1">
                  יש לחתום על הנהלים מחדש בתחילת כל שנה. וודא שכל הנהלים חתומים.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}