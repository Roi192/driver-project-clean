import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2, Shield } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import unitLogo from "@/assets/unit-logo.png";
import bgVehicles from "@/assets/bg-vehicles.png";

const HAGMAR_ROLES = [
  "לוחם",
  "רבש\"צ",
  "מ\"מ מחלקת הגנה",
  "קצין הגמ\"ר",
] as const;

const SETTLEMENTS = [
  "עפרה",
  "בית אל",
  "פסגות",
  "כוכב יעקב",
  "טלמון",
  "נחליאל",
  "חשמונאים",
  "מודיעין עילית",
  "כפר האורנים",
  "בית חורון",
  "גבעון החדשה",
  "גבעת זאב",
  "אדם",
  "אחר",
] as const;

export default function HagmarAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [settlement, setSettlement] = useState("");
  const [hagmarRole, setHagmarRole] = useState("");

  const { signIn, signUp, signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('install_department', 'hagmar');
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/hagmar");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "שגיאה", description: "נא למלא אימייל וסיסמה", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setIsLoading(false);
      toast({
        title: "שגיאה בהתחברות",
        description: error.message === "Invalid login credentials" ? "אימייל או סיסמה שגויים" : error.message,
        variant: "destructive",
      });
      return;
    }
    // Verify department matches (hagmar users only)
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    if (loggedInUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('department')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();
      
      if (roleData?.role !== 'super_admin') {
        if (profile?.department !== 'hagmar') {
          await signOut();
          setIsLoading(false);
          toast({
            title: "שגיאה בהתחברות",
            description: 'משתמש זה לא רשום במחלקת הגמ"ר. יש להשתמש בלינק ההתחברות המתאים למחלקה שלך.',
            variant: "destructive",
          });
          return;
        }
      }
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !idNumber || !phone || !settlement || !hagmarRole) {
      toast({ title: "שגיאה", description: "נא למלא את כל השדות הנדרשים", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "שגיאה", description: "הסיסמה חייבת להכיל לפחות 8 תווים", variant: "destructive" });
      return;
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!(hasUpperCase && hasLowerCase && hasNumber)) {
      toast({ title: "שגיאה", description: "הסיסמה חייבת להכיל אותיות גדולות, אותיות קטנות ומספרים", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp({
      email,
      password,
      fullName,
      userType: "driver",
      personalNumber: phone,
      department: "hagmar",
      settlement,
      idNumber,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({ title: "שגיאה", description: "המשתמש כבר רשום במערכת", variant: "destructive" });
      } else {
        toast({ title: "שגיאה בהרשמה", description: error.message, variant: "destructive" });
      }
    } else {
      // Update profile with hagmar-specific fields via metadata
      toast({ title: "נרשמת בהצלחה!", description: 'ברוך הבא למערכת הגמ"ר' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15" style={{ backgroundImage: `url(${bgVehicles})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-amber-500/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(30,80%,50%,0.15),transparent_50%)]" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-10 w-56 h-56 bg-gradient-to-br from-orange-400/15 to-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <Card className="w-full max-w-md relative z-10 premium-card border-amber-500/30 backdrop-blur-xl bg-card/80 animate-scale-in overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />

        <CardHeader className="text-center space-y-4 pt-8 relative">
          <div className="mx-auto elite-badge animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <img src={unitLogo} alt="סמל היחידה" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
            </div>
          </div>
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-foreground via-amber-600 to-foreground bg-clip-text text-transparent">
              מחלקת הגמ"ר
            </CardTitle>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="text-amber-700 font-black text-sm">הגנת המרחב</span>
            </div>
            <CardDescription className="text-muted-foreground text-base">התחבר או הירשם כדי להמשיך</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 relative">
          <Tabs defaultValue="login" className="w-full animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                התחברות
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                הרשמה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-800 font-semibold">אימייל</Label>
                  <Input id="login-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500/30 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-800 font-semibold">סיסמה</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500/30 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />מתחבר...</>) : "התחבר למערכת"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="p-3 rounded-xl text-center mb-4 bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-amber-800">הרשמה למחלקת הגמ"ר</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">שם מלא *</Label>
                  <Input type="text" placeholder="ישראל ישראלי" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">תעודת זהות *</Label>
                  <Input type="text" placeholder="123456789" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">מספר טלפון *</Label>
                  <Input type="tel" placeholder="050-1234567" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">ישוב *</Label>
                  <Select value={settlement} onValueChange={setSettlement}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl">
                      <SelectValue placeholder="בחר ישוב" />
                    </SelectTrigger>
                    <SelectContent>
                      {SETTLEMENTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">תפקיד *</Label>
                  <Select value={hagmarRole} onValueChange={setHagmarRole}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl">
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent>
                      {HAGMAR_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">אימייל *</Label>
                  <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">סיסמה *</Label>
                  <Input type="password" placeholder="לפחות 8 תווים" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl" />
                </div>

                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />נרשם...</>) : "הירשם למערכת"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-center gap-3 pt-6 mt-6 border-t border-border/30 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="text-amber-700 font-black">מחלקת הגמ"ר</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}