import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';

interface PushNotificationSetupProps {
  className?: string;
}

export function PushNotificationSetup({ className }: PushNotificationSetupProps) {
  const [soldierId, setSoldierId] = useState<string | undefined>();
  const [soldierName, setSoldierName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    loading: pushLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications(soldierId);

  useEffect(() => {
    fetchCurrentSoldier();
  }, []);

  const fetchCurrentSoldier = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile to find personal number
      const { data: profile } = await supabase
        .from('profiles')
        .select('personal_number, full_name')
        .eq('user_id', user.id)
        .single();

      if (profile?.personal_number) {
        // Find matching soldier
        const { data: soldier } = await supabase
          .from('soldiers')
          .select('id, full_name')
          .eq('personal_number', profile.personal_number)
          .single();

        if (soldier) {
          setSoldierId(soldier.id);
          setSoldierName(soldier.full_name);
        }
      }
    } catch (err) {
      console.error('Error fetching soldier:', err);
    } finally {
      setLoading(false);
    }
  };

  // Still loading soldier info
  if (loading) return null;

  if (!isSupported) {
    return (
      <Card className={`border-destructive/20 bg-destructive/5 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">התראות לא נתמכות</p>
              <p className="text-sm text-muted-foreground">
                יש להתקין את האפליקציה למסך הבית ולהשתמש בדפדפן תומך
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show setup even if no soldier linked - just prompt to enable
  if (!soldierId) {
    return (
      <Card className={`border-amber-500/20 bg-amber-500/5 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700">התראות זמינות</p>
              <p className="text-sm text-muted-foreground">
                יש לקשר את המשתמש לחייל בניהול משתמשים כדי לקבל התראות
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          התראות חכמות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          קבל התראות על משמרות, רישיונות שפגים, טפסים חסרים ועוד
        </p>

        {isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 text-white">
                <CheckCircle className="w-3 h-3 ml-1" />
                התראות פעילות
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={unsubscribe}
              disabled={pushLoading}
              className="w-full"
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <BellOff className="w-4 h-4 ml-2" />
              )}
              בטל התראות
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {permission === 'denied' ? (
              <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                התראות נחסמו בדפדפן. יש לאפשר התראות בהגדרות האתר.
              </div>
            ) : (
              <Button
                onClick={subscribe}
                disabled={pushLoading}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Bell className="w-4 h-4 ml-2" />
                )}
                הפעל התראות
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}