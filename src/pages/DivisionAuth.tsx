import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Shield, Loader2, KeyRound } from 'lucide-react';
import unitLogo from '@/assets/unit-logo.png';
import bgVehicles from '@/assets/bg-vehicles.png';
import { supabase } from '@/integrations/supabase/client';
import { DIVISION_BRIGADE_CODE, DIVISION_LABEL } from '@/lib/brigades';

/**
 * Dedicated registration / login page for the מפאו"ג איו"ש (Division HQ).
 * Anyone who signs up here is tagged brigade='division' and gets the division_admin role
 * automatically (handled by the handle_new_user trigger).
 */
export default function DivisionAuth() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('install_department', 'drivers');
    localStorage.setItem('install_brigade', DIVISION_BRIGADE_CODE);
  }, []);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'שגיאה', description: 'נא למלא אימייל וסיסמה', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({
        title: 'שגיאה בהתחברות',
        description: error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({ title: 'שגיאה', description: 'נא למלא את כל השדות הנדרשים', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להכיל לפחות 8 תווים', variant: 'destructive' });
      return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    if (!(hasUpper && hasLower && hasNum)) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להכיל אותיות גדולות, קטנות ומספרים', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp({
      email,
      password,
      fullName,
      userType: 'driver',
      personalNumber: personalNumber || undefined,
      brigade: DIVISION_BRIGADE_CODE,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({ title: 'שגיאה', description: 'המשתמש כבר רשום במערכת', variant: 'destructive' });
      } else {
        toast({ title: 'שגיאה בהרשמה', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'נרשמת בהצלחה!', description: `ברוך הבא ל${DIVISION_LABEL}` });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast({ title: 'שגיאה', description: 'נא להזין אימייל', variant: 'destructive' });
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'נשלח קישור לאיפוס', description: 'בדוק את תיבת המייל שלך' });
    setForgotOpen(false);
    setForgotEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(${bgVehicles})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />

      <Card className="w-full max-w-md relative z-10 premium-card border-amber-500/40 backdrop-blur-xl bg-card/80 overflow-hidden">
        <CardHeader className="text-center space-y-4 pt-8 relative">
          <div className="mx-auto">
            <img src={unitLogo} alt="סמל" className="w-24 h-24 object-contain drop-shadow-2xl" />
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-amber-500 via-foreground to-amber-500 bg-clip-text text-transparent">
              מערכת נהגי בט"ש
            </CardTitle>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-700/20 border border-amber-500/40">
              <Shield className="w-4 h-4 text-amber-700" />
              <span className="text-amber-800 font-black text-sm">{DIVISION_LABEL}</span>
            </div>
            <CardDescription className="text-muted-foreground text-base">
              הרשמה למשתמשי המפקדה האוגדתית בלבד
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 relative">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white">התחברות</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="div-login-email" className="text-slate-800 font-semibold">אימייל</Label>
                  <Input id="div-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="div-login-password" className="text-slate-800 font-semibold">סיסמה</Label>
                  <Input id="div-login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />מתחבר...</>) : 'התחבר למערכת'}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} className="text-sm font-semibold text-amber-700 hover:underline">
                    שכחת סיסמה?
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="p-3 rounded-xl text-center mb-4 bg-amber-50 border border-amber-200">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="w-5 h-5 text-amber-700" />
                    <span className="font-bold text-amber-800">הרשמה כקצין מפאו"ג איו"ש</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="div-signup-name" className="text-slate-800 font-semibold">שם מלא *</Label>
                  <Input id="div-signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="div-signup-pn" className="text-slate-800 font-semibold">מספר אישי</Label>
                  <Input id="div-signup-pn" value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="div-signup-email" className="text-slate-800 font-semibold">אימייל *</Label>
                  <Input id="div-signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="div-signup-password" className="text-slate-800 font-semibold">סיסמה *</Label>
                  <Input id="div-signup-password" type="password" placeholder="לפחות 8 תווים" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />נרשם...</>) : `הירשם ל${DIVISION_LABEL}`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />איפוס סיסמה</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-800 font-semibold">אימייל</Label>
              <Input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} dir="ltr" className="text-right" />
            </div>
            <Button type="submit" className="w-full" disabled={forgotLoading}>
              {forgotLoading ? (<><Loader2 className="w-4 h-4 animate-spin ml-2" />שולח...</>) : 'שלח קישור איפוס'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}