import { useState, useEffect } from "react";
import { Bell, BellOff, Shield, Send, Loader2, CheckCircle2 } from "lucide-react";
import { PushNotificationSetup } from "@/components/push/PushNotificationSetup";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NOTIF_PREFS_KEY = "admin_notification_preferences";

interface NotifPrefs {
  license_expiry: boolean;
  pre_shift_form: boolean;
  daily_summary: boolean;
  cleaning: boolean;
  trip_form: boolean;
}

const defaultPrefs: NotifPrefs = {
  license_expiry: true,
  pre_shift_form: true,
  daily_summary: true,
  cleaning: true,
  trip_form: true,
};

const NOTIF_LABELS: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: "license_expiry", label: "רישיונות שפגים", description: "התראה כשרישיון נהג עומד לפוג ב-30/14/7/1 ימים" },
  { key: "pre_shift_form", label: "טופס לפני משמרת", description: "תזכורת למילוי טופס לפני כל משמרת" },
  { key: "daily_summary", label: "סיכום יומי למנהל", description: "סיכום בוקר יומי על מצב המוצבים" },
  { key: "cleaning", label: "ניקיון", description: "תזכורות למוצבים שלא מילאו טפסי ניקיון" },
  { key: "trip_form", label: "טופס טיולים", description: "תזכורת שבועית למילוי טופס טיולים לפני יציאה לבית" },
];

export default function NotificationSettings() {
  const { isAdmin, isPlatoonCommander, isSuperAdmin, isBattalionAdmin } = useAuth();
  const isAdminUser = isAdmin || isPlatoonCommander || isSuperAdmin || isBattalionAdmin;
  const { isSubscribed } = usePushNotifications();

  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    try {
      const stored = localStorage.getItem(NOTIF_PREFS_KEY);
      if (stored) return { ...defaultPrefs, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return defaultPrefs;
  });

  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
  }, [prefs]);

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const sendTestPush = async () => {
    setTestLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("לא מחובר"); return; }

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: { userTestMode: true, userId: user.id },
      });

      if (error || !data?.success) {
        toast.error(data?.error ?? error?.message ?? "שליחה נכשלה");
      } else {
        toast.success(data.message ?? "התראת בדיקה נשלחה!");
      }
    } catch (e: unknown) {
      toast.error("שגיאה בשליחת התראה");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">הגדרות התראות</h1>
          <p className="text-sm text-muted-foreground">נהל את העדפות ההתראות שלך</p>
        </div>
      </div>

      {/* Push subscription card */}
      <PushNotificationSetup />

      {/* Test push button — only when subscribed */}
      {isSubscribed && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Send className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">שלח התראת בדיקה</p>
                <p className="text-xs text-muted-foreground">וודא שההתראות מגיעות לטלפון</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={sendTestPush}
              disabled={testLoading}
              className="shrink-0"
            >
              {testLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
              )}
              בדוק
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Admin-only: per-type notification toggles */}
      {isAdminUser && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              סוגי התראות פעילים
            </CardTitle>
            <p className="text-xs text-muted-foreground">בחר אילו התראות לקבל (הגדרות מנהל)</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {NOTIF_LABELS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                <div className="flex-1">
                  <Label className="font-semibold text-sm cursor-pointer" onClick={() => toggle(key)}>
                    {label}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={() => toggle(key)}
                  className="shrink-0"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isAdminUser && (
        <Card className="border-muted">
          <CardContent className="p-4 flex items-center gap-3 text-muted-foreground">
            <BellOff className="w-4 h-4 shrink-0" />
            <p className="text-sm">הגדרות סוגי התראות זמינות למנהלים בלבד.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
