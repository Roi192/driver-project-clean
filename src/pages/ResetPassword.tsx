import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, KeyRound } from 'lucide-react';
import unitLogo from '@/assets/unit-logo.png';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for errors in the URL hash (e.g. expired link)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const errorDescription = params.get('error_description') || params.get('error');
    if (errorDescription) {
      setErrorMessage(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
    }

    // Supabase will set the session automatically from the recovery URL hash
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
        setErrorMessage(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להכיל לפחות 8 תווים', variant: 'destructive' });
      return;
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!(hasUpperCase && hasLowerCase && hasNumber)) {
      toast({ title: 'שגיאה', description: 'הסיסמה חייבת להכיל אותיות גדולות, קטנות ומספרים', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'שגיאה', description: 'הסיסמאות אינן תואמות', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ title: 'שגיאה בעדכון הסיסמה', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'הסיסמה עודכנה בהצלחה', description: 'מתחבר למערכת...' });
    setTimeout(() => navigate('/'), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/10" dir="rtl">
      <Card className="w-full max-w-md premium-card border-primary/30 backdrop-blur-xl bg-card/80">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto">
            <img src={unitLogo} alt="סמל הפלוגה" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
            <KeyRound className="w-6 h-6 text-primary" />
            איפוס סיסמה
          </CardTitle>
          <CardDescription>הזן סיסמה חדשה לחשבון שלך</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          {!hasSession ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {errorMessage ? `שגיאה: ${errorMessage}` : 'קישור איפוס לא תקין או שפג תוקפו.'}
              </p>
              <p className="text-xs text-muted-foreground">
                אם הלינק נשלח לפני יותר משעה, בקש איפוס סיסמה חדש.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">חזרה להתחברות</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-800 font-semibold">סיסמה חדשה</Label>
                <Input id="new-password" type="password" placeholder="לפחות 8 תווים" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-800 font-semibold">אימות סיסמה</Label>
                <Input id="confirm-password" type="password" placeholder="הקלד שוב" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" className="bg-white border-slate-300 text-slate-900 h-12 rounded-xl" />
              </div>
              <Button type="submit" className="w-full h-12 cta-button text-base font-bold rounded-xl" disabled={isLoading}>
                {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin ml-2" />מעדכן...</>) : 'עדכן סיסמה'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}