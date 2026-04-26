import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Shield, Loader2, Users } from 'lucide-react';
import unitLogo from '@/assets/unit-logo.png';
import bgVehicles from '@/assets/bg-vehicles.png';
import { OUTPOSTS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

const REGIONS = [
  "ארץ בנימין",
  "גבעת בנימין", 
  "טלמונים",
  "מכבים"
] as const;

const MILITARY_ROLES = [
  "מג\"ד",
  "סמג\"ד",
  "מ\"פ",
  "סמ\"פ",
  "מ\"מ",
  "מ\"כ",
  "אחר"
] as const;

const PLATOONS = [
  "גדודי",
  ...OUTPOSTS
] as const;

export default function AuthBattalion() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [personalNumber, setPersonalNumber] = useState('');
  const [region, setRegion] = useState('');
  const [militaryRole, setMilitaryRole] = useState('');
  const [platoon, setPlatoon] = useState('');
  const [battalionName, setBattalionName] = useState('');
  
  const { signIn, signUp, signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('install_department', 'battalion');
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'שגיאה', description: 'נא למלא אימייל וסיסמה', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setIsLoading(false);
      toast({
        title: 'שגיאה בהתחברות',
        description: error.message === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : error.message,
        variant: 'destructive',
      });
      return;
    }
    // Verify department matches (battalion users only)
    const { data: { user: loggedInUser } } = await supabase.auth.getUser();
    if (loggedInUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('department, user_type')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', loggedInUser.id)
        .maybeSingle();
      
      if (roleData?.role !== 'super_admin') {
        if (profile?.department === 'hagmar' || profile?.user_type !== 'battalion') {
          await signOut();
          setIsLoading(false);
          toast({
            title: 'שגיאה בהתחברות',
            description: 'משתמש זה לא רשום כגדודי תע"ם. יש להשתמש בלינק ההתחברות המתאים למחלקה שלך.',
            variant: 'destructive',
          });
          return;
        }
      }
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName || !region || !militaryRole || !platoon || !battalionName) {
      toast({ title: 'שגיאה', description: 'נא למלא את כל השדות הנדרשים', variant: 'destructive' });
      return;
    }

    if (password.length < 8) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להכיל לפחות 8 תווים', variant: 'destructive' });
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumber)) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להכיל אותיות גדולות, אותיות קטנות ומספרים', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp({
      email,
      password,
      fullName,
      userType: 'battalion',
      region,
      militaryRole,
      platoon,
      personalNumber: personalNumber || undefined,
      battalionName: battalionName || undefined,
    });
    setIsLoading(false);

    if (error) {
      if (error.message.includes('already registered')) {
        toast({ title: 'שגיאה', description: 'המשתמש כבר רשום במערכת', variant: 'destructive' });
      } else {
        toast({ title: 'שגיאה בהרשמה', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'נרשמת בהצלחה!', description: 'ברוך הבא למערכת' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{ backgroundImage: `url(${bgVehicles})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.1),transparent_50%)]" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-10 w-56 h-56 bg-gradient-to-br from-accent/15 to-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <Card className="w-full max-w-md relative z-10 premium-card border-primary/30 backdrop-blur-xl bg-card/80 animate-scale-in overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        
        <CardHeader className="text-center space-y-4 pt-8 relative">
          <div className="mx-auto elite-badge animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-xl opacity-50 animate-pulse" />
              <img src={unitLogo} alt="סמל הפלוגה" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
            </div>
          </div>
          
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              הרשמה גדודי תע"ם
            </CardTitle>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 font-black text-sm">גדודי תע"ם</span>
            </div>
            <CardDescription className="text-muted-foreground text-base">
              התחבר או הירשם כדי להמשיך
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-8 relative">
          <Tabs defaultValue="login" className="w-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                התחברות
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                הרשמה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-slate-800 font-semibold">אימייל</Label>
                  <Input id="login-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-800 font-semibold">סיסמה</Label>
                  <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 cta-button text-base font-bold rounded-xl" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />מתחבר...</>) : 'התחבר למערכת'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="animate-fade-in">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="p-3 rounded-xl text-center mb-4 bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    <span className="font-bold text-purple-800">הרשמה כגדודי תע"ם</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-800 font-semibold">שם מלא *</Label>
                  <Input id="signup-name" type="text" placeholder="ישראל ישראלי" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-personal-number" className="text-slate-800 font-semibold">מספר אישי</Label>
                  <Input id="signup-personal-number" type="text" placeholder="1234567" value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">גזרה *</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl">
                      <SelectValue placeholder="בחר גזרה" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">תפקיד *</Label>
                  <Select value={militaryRole} onValueChange={setMilitaryRole}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl">
                      <SelectValue placeholder="בחר תפקיד" />
                    </SelectTrigger>
                    <SelectContent>
                      {MILITARY_ROLES.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-800 font-semibold">פלוגה *</Label>
                  <Select value={platoon} onValueChange={setPlatoon}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl">
                      <SelectValue placeholder="בחר פלוגה" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATOONS.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-battalion-name" className="text-slate-800 font-semibold">שם הגדוד *</Label>
                  <Input id="signup-battalion-name" type="text" placeholder='גדוד תע"ם 900' value={battalionName} onChange={(e) => setBattalionName(e.target.value)} className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-800 font-semibold">אימייל *</Label>
                  <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-right bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-800 font-semibold">סיסמה *</Label>
                  <Input id="signup-password" type="password" placeholder="לפחות 8 תווים" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/30 transition-all duration-300 h-12 rounded-xl" />
                </div>
                <Button type="submit" className="w-full h-12 cta-button text-base font-bold rounded-xl" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />נרשם...</>) : 'הירשם למערכת'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="pt-6 mt-6 border-t border-border/30 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="text-purple-700 font-black">גדוד תע"ם</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}