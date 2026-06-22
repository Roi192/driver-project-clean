import { Bell } from "lucide-react";
import { PushNotificationSetup } from "@/components/push/PushNotificationSetup";

export default function NotificationSettings() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">הגדרות התראות</h1>
          <p className="text-sm text-muted-foreground">נהל את העדפות ההתראות שלך</p>
        </div>
      </div>
      <PushNotificationSetup />
    </div>
  );
}
