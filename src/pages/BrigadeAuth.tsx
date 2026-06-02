import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Shield, Loader2, Car, KeyRound } from 'lucide-react';
import unitLogo from '@/assets/unit-logo.png';
import bgVehicles from '@/assets/bg-vehicles.png';
import { supabase } from '@/integrations/supabase/client';
import { BRIGADES, isValidBrigade } from '@/lib/brigades';

/**
 * Brigade-specific auth page used by every brigade except Binyamin.
 * Binyamin keeps its existing /auth page intact.
 * Routes here: /auth/brigade/:code  (e.g. /auth/brigade/etzion)
 */
export default function BrigadeAuth() {
  const { code } = useParams<{ code: string }>();
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
    if (code && isValidBrigade(code)) {
      localStorage.setItem('install_brigade', code);
    }
  }, [code]);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  if (!code || !isValidBrigade(code)) {
    return <Navigate to="/auth" replace />;
  }

  // Binyamin keeps the original /auth page
  if (code === 'binyamin') {
    return <Navigate to="/auth" replace />;
  }

  const brigade = BRIGADES[code];

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
      brigade: brigade.code,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({ title: 'שגיאה', description: 'המשתמש כבר רשום במערכת', variant: 'destructive' });
      } else {
        toast({ title: 'שגיאה בהרשמה', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'נרשמת בהצלחה!', description: `ברוך הבא ל${brigade.name}` });
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

      <Card className="w-full max-w-md relative z-10 premium-card border-primary/30 backdrop-blur-xl bg-card/80 overflow-hidden">
        <CardHeader className="text-center space-y-4 pt-8 relative">
          <div className="mx-auto">
            <img src={unitLogo} alt="סמל" className="w-24 h-24 object-contain drop-shadow-2xl" />
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              מערכת נהגי בט"ש
            </CardTitle>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
              <Car className="w-4 h-4 text-primary" />
              <span className="text-primary font-black text-sm">{brigade.shortLabel}</span>
            </div>
            <CardDescription className="text-muted-foreground text-base">
              התחבר או הירשם כדי להמשיך
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 relative">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground">התחברות</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground">הרשמה</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-800 font-semibold">אימייל</Label>
                  <Input id="login-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-800 font-semibold">סיסמה</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 cta-button text-base font-bold rounded-xl" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />מתחבר...</>) : 'התחבר למערכת'}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} className="text-sm font-semibold text-primary hover:underline">
                    שכחת סיסמה?
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="p-3 rounded-xl text-center mb-4 bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-center gap-2">
                    <Car className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-800">הרשמה כנהג - {brigade.name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-800 font-semibold">שם מלא *</Label>
                  <Input id="signup-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-personal-number" className="text-slate-800 font-semibold">מספר אישי</Label>
                  <Input id="signup-personal-number" value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-800 font-semibold">אימייל *</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-800 font-semibold">סיסמה *</Label>
                  <Input id="signup-password" type="password" placeholder="לפחות 8 תווים" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 cta-button text-base font-bold rounded-xl" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />נרשם...</>) : `הירשם ל${brigade.name}`}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="pt-6 mt-6 border-t border-border/30">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-primary font-black">{brigade.shortLabel}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/auth/gdud')}
            className="mt-4 w-full group relative overflow-hidden rounded-2xl border-2 border-purple-500/40 hover:border-purple-500 bg-gradient-to-l from-purple-500/10 via-purple-500/5 to-transparent p-4 transition-all hover:shadow-lg hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-800 text-sm">אתה מגדוד תע"ם?</div>
                  <div className="text-xs text-purple-700 font-semibold">להרשמה ייעודית כגדוד תע"ם</div>
                </div>
              </div>
              <span className="text-purple-700 font-bold text-sm">כניסה ←</span>
            </div>
          </button>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              איפוס סיסמה
            </DialogTitle>
            <DialogDescription>הזן את כתובת האימייל שלך ונשלח אליך קישור לאיפוס.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-slate-800 font-semibold">אימייל</Label>
              <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
            </div>
            <Button type="submit" className="w-full h-12" disabled={forgotLoading}>
              {forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'שלח קישור איפוס'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}