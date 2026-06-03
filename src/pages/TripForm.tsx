import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Home, CheckCircle2, Shirt, Car, ClipboardList, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { OUTPOSTS } from "@/lib/constants";
import { useBrigadeOutposts } from "@/hooks/useBrigadeOutposts";

interface FormData {
  weaponReset: boolean;
  exitBriefingByOfficer: boolean;
  officerName: string;
  uniformClassA: boolean;
  personalEquipmentChecked: boolean;
  vehicleReturned: boolean;
  notes: string;
  signature: string;
  outpost: string;
}

// הגדרת הסעיפים לפי קטגוריות
const checklistCategories = [
  {
    key: "appearance",
    title: "הופעה ולבוש",
    icon: Shirt,
    color: "from-blue-500 to-blue-600",
    items: [
      "יציאה לבית תיהיה על מדי א' תקניים בלבד, כומתה בכותפת, גלח\"צ נעליים, דסקית צוואר ודסקיות נעליים, חולצה לבנה/ירוקה מתחת למדים",
      "חל איסור לנוע עם טבעות/צמידים",
      "התנועה תיהיה בהופעה צבאית תקנית בדגש על תספורת וגילוח, חל איסור לנוע עם פליז/כובע/חמצוואר או כל פריט שאינו מדי א'",
    ],
  },
  {
    key: "roadSafety",
    title: "בטיחות בדרכים",
    icon: Car,
    color: "from-amber-500 to-amber-600",
    items: [
      "יש לחצות כבישים במקומות המיועדים לכך רק במעברי חצייה",
      "כל יציאה מהבסיס תיהיה בתחבורה ציבורית בלבד",
      "יש לנוח טרם עלייה על ההגה ולהימנע מהסיחי דעת",
      "אם שותים לא נוהגים - יש למנות נהג תורן או לנסוע במונית",
      "התאמת מהירות לתנאי מזג אוויר והדרך",
    ],
  },
  {
    key: "generalProcedures",
    title: "נהלים כלליים",
    icon: ClipboardList,
    color: "from-emerald-500 to-emerald-600",
    items: [
      "חל איסור לנוע עם 2 אוזניות על האוזניים",
      "במידה וקיבלת דוח משטרה צבאית יש לדווח למפקדים ולבקש להישפט ביחידה",
      "חובה להיות זמינים במהלך החופשה, אחת ל4 שעות על החייל להתעדכן בטלפון הנייד שלו ולבדוק אם חיפשו אותו",
      "חל איסור לעלות על טרמפים",
      "יש לדווח למפקדים על כל שינוי במצב הבריאותי במהלך החופשה וכל פנייה לביקור רופא תיהיה בעדכון מפקדים",
      "בכל אופן אסורה הפנייה לחדר מיון ללא אישור מגורם רפואי צבאי מוסמך",
      "יש לאפסן את הנשק טרם היציאה לבית בנשקייה",
      "יש לבצע תדריך יציאה ע\"י קצין מוצב טרם היציאה לבית",
    ],
  },
];

export default function TripForm() {
  const { user, brigade } = useAuth();
  const { outposts: brigadeOutposts } = useBrigadeOutposts(brigade ?? undefined);
  const outpostOptions = brigadeOutposts.length > 0
    ? brigadeOutposts.map((outpost) => outpost.name)
    : brigade === "binyamin" || !brigade
      ? OUTPOSTS
      : [];
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [userName, setUserName] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // מעקב אחר סעיפים מסומנים
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<FormData>({
    weaponReset: false,
    exitBriefingByOfficer: false,
    officerName: "",
    uniformClassA: false,
    personalEquipmentChecked: false,
    vehicleReturned: false,
    notes: "",
    signature: "",
    outpost: "",
  });

  useEffect(() => {
    const fetchUserAndCheck = async () => {
      if (user?.id) {
        // Fetch user name and personal number
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, personal_number')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        }
        
        if (profile?.personal_number) {
          setPersonalNumber(profile.personal_number);
        }
        
        // Check if already submitted this week (since last Thursday)
        const getLastThursday = () => {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const daysSinceThursday = (dayOfWeek + 3) % 7;
          const lastThursday = new Date(now);
          lastThursday.setDate(now.getDate() - daysSinceThursday);
          lastThursday.setHours(0, 0, 0, 0);
          return lastThursday;
        };
        
        const lastThursday = getLastThursday();
        const lastThursdayStr = lastThursday.toISOString().split('T')[0];
        
        let existingFormQuery = supabase
          .from('trip_forms')
          .select('id')
          .eq('user_id', user.id)
          .gte('form_date', lastThursdayStr);

        if (brigade) existingFormQuery = existingFormQuery.eq('brigade', brigade);

        const { data: existingForm } = await existingFormQuery.maybeSingle();
        
        setAlreadySubmitted(Boolean(existingForm));
      }
    };
    fetchUserAndCheck();
  }, [user, brigade]);

  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCanvasCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      setFormData(prev => ({ ...prev, signature: canvas.toDataURL() }));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData(prev => ({ ...prev, signature: "" }));
  };

  // בדיקה האם כל הסעיפים מסומנים
  const totalItems = checklistCategories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const allItemsChecked = checkedCount === totalItems;

  const handleSubmit = async () => {
    // Validate required fields
    if (!userName.trim()) {
      toast.error("יש להזין את שם החייל");
      return;
    }

    if (!formData.outpost) {
      toast.error("יש לבחור מוצב");
      return;
    }
    
    if (!allItemsChecked) {
      toast.error("יש לסמן את כל הסעיפים");
      return;
    }
    
    if (!formData.officerName.trim()) {
      toast.error("יש לציין את שם הקצין שערך את התדריך");
      return;
    }
    
    if (!formData.signature) {
      toast.error("יש לחתום על הטופס");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('trip_forms').insert({
        user_id: user?.id,
        brigade: brigade || "binyamin",
        soldier_name: userName,
        outpost: formData.outpost,
        weapon_reset: true, // יש סעיף על איפסון נשק ברשימה
        exit_briefing_by_officer: true, // יש סעיף על תדריך יציאה ברשימה
        officer_name: formData.officerName,
        uniform_class_a: true, // יש סעיף על מדי א' ברשימה
        personal_equipment_checked: true,
        vehicle_returned: formData.vehicleReturned,
        signature: formData.signature,
        notes: formData.notes,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("הטופס נשלח בהצלחה!");
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error("שגיאה בשליחת הטופס");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">כבר מילאת טופס טיולים להיום</h2>
              <p className="text-slate-500 mb-6">הטופס יתאפס ביום חמישי הבא</p>
              <Button onClick={() => navigate('/')} className="w-full">
                <Home className="w-5 h-5 ml-2" />
                חזרה לדף הבית
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
            <CardContent className="pt-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-50" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="w-14 h-14 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">טופס טיולים נשלח!</h2>
              <p className="text-slate-500 mb-6">נסיעה בטוחה הביתה 🚗</p>
              <Button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                <Home className="w-5 h-5 ml-2" />
                חזרה לדף הבית
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <PageHeader
            icon={Home}
            title="טופס טיולים לפני יציאה"
            subtitle="ווידוא ביצוע נהלים לפני יציאה לבית"
            badge="טופס טיולים"
          />

          {/* User info */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-800">פרטי החייל</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="soldierName" className="text-slate-700">שם החייל</Label>
                <Input
                  id="soldierName"
                  value={userName}
                  readOnly
                  disabled
                  className="bg-slate-100 text-slate-900 font-medium cursor-not-allowed"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="personalNumber" className="text-slate-700">מספר אישי</Label>
                <Input
                  id="personalNumber"
                  value={personalNumber}
                  readOnly
                  disabled
                  className="bg-slate-100 text-slate-900 font-medium cursor-not-allowed"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  מוצב *
                </Label>
                <Select
                  value={formData.outpost}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, outpost: value }))}
                >
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="בחר מוצב" />
                  </SelectTrigger>
                  <SelectContent>
                    {outpostOptions.map((outpost) => (
                      <SelectItem key={outpost} value={outpost}>
                        {outpost}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-slate-500">תאריך: {new Date().toLocaleDateString('he-IL')}</div>
            </CardContent>
          </Card>

          {/* Progress indicator */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">התקדמות</span>
              <span className="text-sm font-bold text-primary">{checkedCount}/{totalItems}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${(checkedCount / totalItems) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist by categories */}
          {checklistCategories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={category.key} className="border-slate-200/60 shadow-lg overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${category.color}`} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                      <CategoryIcon className="w-5 h-5 text-white" />
                    </div>
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.items.map((item, index) => {
                    const itemKey = `${category.key}-${index}`;
                    const isChecked = checkedItems[itemKey] || false;
                    
                    return (
                      <div 
                        key={itemKey} 
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
                          isChecked 
                            ? 'bg-emerald-50 border-emerald-200' 
                            : 'bg-slate-50 border-slate-200 hover:border-primary/30'
                        }`}
                        onClick={() => setCheckedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                      >
                        <Checkbox
                          id={itemKey}
                          checked={isChecked}
                          onCheckedChange={(checked) => 
                            setCheckedItems(prev => ({ ...prev, [itemKey]: checked as boolean }))
                          }
                          className="w-6 h-6 mt-0.5"
                        />
                        <Label 
                          htmlFor={itemKey} 
                          className={`flex-1 font-medium cursor-pointer leading-relaxed ${
                            isChecked ? 'text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          <span className="font-bold text-slate-500">{index + 1}.</span> {item}
                        </Label>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {/* Officer name */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="officerName" className="text-slate-700">שם הקצין שערך את התדריך *</Label>
                <Input
                  id="officerName"
                  value={formData.officerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, officerName: e.target.value }))}
                  placeholder="הזן את שם הקצין"
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-700">הערות (אופציונלי)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="הערות נוספות..."
                  rows={2}
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-800">חתימה *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">חתום באצבע או בעכבר:</p>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={150}
                  className="w-full h-[150px] touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="w-full"
              >
                נקה חתימה
              </Button>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !allItemsChecked}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 ml-2" />
                שלח טופס טיולים
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}