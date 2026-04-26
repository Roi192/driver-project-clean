import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto helpers for VAPID
async function generateVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const keyData = new Uint8Array(privateKeyBytes);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  const jwt = `${unsignedToken}.${base64UrlEncode(sigBytes)}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Encrypt the push payload using the browser's public key
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlDecode(p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authBytes = base64UrlDecode(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive the encryption key
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // PRK = HKDF-Extract(auth, sharedSecret)
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prkKey = await crypto.subtle.importKey("raw", authBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  // Derive content encryption key
  const context = createContext(base64UrlDecode(p256dh), new Uint8Array(localPublicKeyRaw));
  const cekInfo = createInfo("aesgcm", context);
  const nonceInfo = createInfo("nonce", context);

  const cek = await hkdfExpand(prk, salt, cekInfo, 16);
  const nonce = await hkdfExpand(prk, salt, nonceInfo, 12);

  // Pad payload
  const paddingLength = 2;
  const paddedPayload = new Uint8Array(paddingLength + payloadBytes.length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, paddingLength);

  // Encrypt
  const key = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey: new Uint8Array(localPublicKeyRaw),
  };
}

function createContext(subscriberKey: Uint8Array, localKey: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode("P-256");
  const context = new Uint8Array(5 + 2 + subscriberKey.length + 2 + localKey.length);
  let offset = 0;
  context.set(label, offset);
  offset += label.length;
  context[offset++] = 0; // null separator
  context[offset++] = 0;
  context[offset++] = subscriberKey.length;
  context.set(subscriberKey, offset);
  offset += subscriberKey.length;
  context[offset++] = 0;
  context[offset++] = localKey.length;
  context.set(localKey, offset);
  return context;
}

function createInfo(type: string, context: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode(`Content-Encoding: ${type}\0`);
  const info = new Uint8Array(label.length + context.length);
  info.set(label);
  info.set(context, label.length);
  return info;
}

async function hkdfExpand(prk: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const extract = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, prk));

  const extractKey = await crypto.subtle.importKey("raw", extract, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const expand = new Uint8Array(await crypto.subtle.sign("HMAC", extractKey, infoWithCounter));
  return expand.slice(0, length);
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Encrypt the payload
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    // Generate VAPID headers
    const { authorization } = await generateVapidAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      "mailto:admin@bvt-driving.app"
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aesgcm",
        Encryption: `salt=${base64UrlEncode(salt)}`,
        "Crypto-Key": `dh=${base64UrlEncode(localPublicKey)}`,
        TTL: "86400",
        Urgency: "high",
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
      return true;
    }

    if (response.status === 410 || response.status === 404) {
      console.log(`Subscription expired/invalid: ${subscription.endpoint.substring(0, 50)}...`);
      return false;
    }

    const errorText = await response.text();
    console.error(`Push failed (${response.status}): ${errorText}`);
    return false;
  } catch (error) {
    console.error("Error sending web push:", error);
    return false;
  }
}

// Shift times in Israel timezone
const SHIFTS = {
  morning: { hour: 6, minute: 0, label: "בוקר" },
  afternoon: { hour: 14, minute: 0, label: "צהריים" },
  evening: { hour: 22, minute: 0, label: "ערב" },
};

const NOTIFICATION_MINUTES_BEFORE = 15;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));

    // === TEST MODE ===
    if (body.testMode) {
      const { soldierId, soldierName, outpost, shiftType } = body;

      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("soldier_id", soldierId);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ error: "לחייל אין מנוי להתראות. יש להתקין ולאפשר התראות." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const payload = JSON.stringify({
        title: "התראת בדיקה 🔔",
        body: `שלום ${soldierName}, זוהי הודעת בדיקה. המשמרת שלך ב${outpost} (${shiftType}).`,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: "test-notification",
        dir: "rtl",
        lang: "he",
      });

      let successCount = 0;
      for (const sub of subscriptions) {
        if (await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey)) {
          successCount++;
        }
      }

      await supabase.from("push_notifications_log").insert({
        soldier_id: soldierId,
        soldier_name: soldierName,
        shift_type: "test",
        outpost: outpost,
        shift_date: new Date().toISOString().split("T")[0],
        status: successCount > 0 ? "sent" : "failed",
      });

      return new Response(
        JSON.stringify({ success: successCount > 0, message: successCount > 0 ? "התראה נשלחה!" : "שליחה נכשלה" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: successCount > 0 ? 200 : 500 }
      );
    }

    // === SCHEDULED MODE: Smart Notifications ===
    const now = new Date();
    const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    const currentHour = israelTime.getHours();
    const currentMinute = israelTime.getMinutes();
    const currentDayOfWeek = israelTime.getDay();

    const weekStart = new Date(israelTime);
    weekStart.setDate(israelTime.getDate() - currentDayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const today = israelTime.toISOString().split("T")[0];

    console.log(`Smart Notifications - Israel time: ${currentHour}:${currentMinute}, Day: ${currentDayOfWeek}`);

    const allResults: any[] = [];

    // ======= 1. SHIFT REMINDERS (Drivers) =======
    for (const [shiftKey, shiftInfo] of Object.entries(SHIFTS)) {
      const notifyHour = shiftInfo.minute < NOTIFICATION_MINUTES_BEFORE ? shiftInfo.hour - 1 : shiftInfo.hour;
      const notifyMinute = shiftInfo.minute < NOTIFICATION_MINUTES_BEFORE
        ? 60 - NOTIFICATION_MINUTES_BEFORE + shiftInfo.minute
        : shiftInfo.minute - NOTIFICATION_MINUTES_BEFORE;

      const isNotificationTime =
        currentHour === (notifyHour < 0 ? 23 : notifyHour) &&
        currentMinute >= notifyMinute &&
        currentMinute < notifyMinute + 5;

      if (!isNotificationTime) continue;

      console.log(`Processing shift reminders for ${shiftKey}`);

      const soldierIdColumn = `${shiftKey}_soldier_id`;
      const { data: schedules } = await supabase
        .from("work_schedule")
        .select("id, outpost, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("week_start_date", weekStartStr)
        .eq("day_of_week", currentDayOfWeek);

      const relevantSchedules = (schedules || []).filter((s: any) => s[soldierIdColumn] != null);

      for (const schedule of relevantSchedules) {
        const soldierId = (schedule as any)[soldierIdColumn];
        if (!soldierId) continue;

        // Check if already sent
        const { data: existing } = await supabase
          .from("push_notifications_log")
          .select("id")
          .eq("soldier_id", soldierId)
          .eq("shift_type", shiftKey)
          .eq("shift_date", today)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { data: soldier } = await supabase
          .from("soldiers")
          .select("id, full_name")
          .eq("id", soldierId)
          .single();

        if (!soldier) continue;

        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("soldier_id", soldierId);

        if (!subs || subs.length === 0) continue;

        const payload = JSON.stringify({
          title: `תזכורת משמרת ${shiftInfo.label} ⏰`,
          body: `שלום ${soldier.full_name}, המשמרת שלך ב${(schedule as any).outpost} מתחילה בעוד 15 דקות. אנא מלא טופס לפני משמרת.`,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: `shift-${shiftKey}-${today}`,
          dir: "rtl",
          lang: "he",
          data: { url: "/shift-form" },
        });

        let success = false;
        for (const sub of subs) {
          if (await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey)) success = true;
        }

        await supabase.from("push_notifications_log").insert({
          soldier_id: soldierId,
          soldier_name: soldier.full_name,
          shift_type: shiftKey,
          outpost: (schedule as any).outpost,
          shift_date: today,
          status: success ? "sent" : "failed",
        });

        allResults.push({ type: "shift_reminder", soldier: soldier.full_name, success });
      }
    }

    // ======= 2. ADMIN ALERTS (Run once daily at 08:00) =======
    if (currentHour === 8 && currentMinute < 5) {
      console.log("Processing admin alerts...");

      // Get all admin users with push subscriptions
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map((r: any) => r.user_id);

        // Get admin profiles to find soldier IDs
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("user_id, personal_number, full_name")
          .in("user_id", adminUserIds);

        const adminSoldierMap: Map<string, { userId: string; name: string }> = new Map();
        if (adminProfiles) {
          for (const profile of adminProfiles) {
            if (profile.personal_number) {
              const { data: soldier } = await supabase
                .from("soldiers")
                .select("id")
                .eq("personal_number", profile.personal_number)
                .single();
              if (soldier) {
                adminSoldierMap.set(soldier.id, { userId: profile.user_id, name: profile.full_name || "" });
              }
            }
          }
        }

        // --- 2a. License expiry alerts ---
        const thirtyDaysFromNow = new Date(israelTime);
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

        const { data: expiringSoldiers } = await supabase
          .from("soldiers")
          .select("id, full_name, military_license_expiry, civilian_license_expiry")
          .or(`military_license_expiry.lte.${thirtyDaysStr},civilian_license_expiry.lte.${thirtyDaysStr}`)
          .eq("is_active", true);

        const licenseAlerts: string[] = [];
        if (expiringSoldiers) {
          for (const s of expiringSoldiers) {
            if (s.military_license_expiry && s.military_license_expiry <= thirtyDaysStr) {
              licenseAlerts.push(`${s.full_name} - רישיון צבאי: ${s.military_license_expiry}`);
            }
            if (s.civilian_license_expiry && s.civilian_license_expiry <= thirtyDaysStr) {
              licenseAlerts.push(`${s.full_name} - רישיון אזרחי: ${s.civilian_license_expiry}`);
            }
          }
        }

        // --- 2b. Missing forms alert ---
        const yesterday = new Date(israelTime);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const { data: yesterdayShifts } = await supabase
          .from("work_schedule")
          .select("outpost, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
          .eq("week_start_date", weekStartStr)
          .eq("day_of_week", yesterday.getDay());

        const { data: yesterdayReports } = await supabase
          .from("shift_reports")
          .select("user_id")
          .gte("created_at", `${yesterdayStr}T00:00:00`)
          .lte("created_at", `${yesterdayStr}T23:59:59`);

        const reportedUserIds = new Set((yesterdayReports || []).map((r: any) => r.user_id));
        const missingOutposts: string[] = [];

        if (yesterdayShifts) {
          for (const shift of yesterdayShifts) {
            const shiftSoldierIds = [
              (shift as any).morning_soldier_id,
              (shift as any).afternoon_soldier_id,
              (shift as any).evening_soldier_id,
            ].filter(Boolean);

            if (shiftSoldierIds.length > 0) {
              // Check how many submitted forms for this outpost
              const hasReport = shiftSoldierIds.some((id: string) => reportedUserIds.has(id));
              if (!hasReport) {
                missingOutposts.push((shift as any).outpost);
              }
            }
          }
        }

        // --- 2c. Safety events alert ---
        const { data: recentSafetyEvents } = await supabase
          .from("safety_events")
          .select("id, title, severity")
          .gte("created_at", `${yesterdayStr}T00:00:00`)
          .order("created_at", { ascending: false })
          .limit(5);

        // Send combined admin alert
        const alertParts: string[] = [];

        if (licenseAlerts.length > 0) {
          alertParts.push(`🪪 ${licenseAlerts.length} רישיונות עומדים לפוג`);
        }
        if (missingOutposts.length > 0) {
          alertParts.push(`📋 ${missingOutposts.length} מוצבים לא הזינו טופס אתמול`);
        }
        if (recentSafetyEvents && recentSafetyEvents.length > 0) {
          alertParts.push(`⚠️ ${recentSafetyEvents.length} אירועי בטיחות חדשים`);
        }

        if (alertParts.length > 0) {
          // Check if admin alert already sent today
          const { data: existingAdminAlert } = await supabase
            .from("push_notifications_log")
            .select("id")
            .eq("shift_type", "admin_daily")
            .eq("shift_date", today)
            .limit(1);

          if (!existingAdminAlert || existingAdminAlert.length === 0) {
            const adminPayload = JSON.stringify({
              title: "סיכום בוקר למנהל 📊",
              body: alertParts.join("\n"),
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              tag: `admin-daily-${today}`,
              dir: "rtl",
              lang: "he",
              data: { url: "/admin" },
            });

            // Send to all admins with push subscriptions
            for (const [soldierIdKey, adminInfo] of adminSoldierMap) {
              const { data: adminSubs } = await supabase
                .from("push_subscriptions")
                .select("*")
                .eq("soldier_id", soldierIdKey);

              if (adminSubs && adminSubs.length > 0) {
                let success = false;
                for (const sub of adminSubs) {
                  if (await sendWebPush(sub, adminPayload, vapidPublicKey, vapidPrivateKey)) {
                    success = true;
                  }
                }
                await supabase.from("push_notifications_log").insert({
                  soldier_id: soldierIdKey,
                  soldier_name: adminInfo.name,
                  shift_type: "admin_daily",
                  outpost: "all",
                  shift_date: today,
                  status: success ? "sent" : "failed",
                });
                allResults.push({ type: "admin_daily", admin: adminInfo.name, success });
              }
            }
          }
        }
      }
    }

    // ======= 3. MISSING FORM REMINDER (Run at 07:00, 15:00, 23:00 - 1hr after each shift) =======
    const formReminderHours = [7, 15, 23];
    if (formReminderHours.includes(currentHour) && currentMinute < 5) {
      const shiftMap: Record<number, string> = { 7: "morning", 15: "afternoon", 23: "evening" };
      const shiftLabelMap: Record<string, string> = { morning: "בוקר", afternoon: "צהריים", evening: "ערב" };
      const currentShift = shiftMap[currentHour];

      console.log(`Checking missing forms for ${currentShift} shift...`);

      const { data: todaySchedules } = await supabase
        .from("work_schedule")
        .select("outpost, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("week_start_date", weekStartStr)
        .eq("day_of_week", currentDayOfWeek);

      if (todaySchedules) {
        const soldierIdColumn = `${currentShift}_soldier_id`;

        for (const schedule of todaySchedules) {
          const soldierId = (schedule as any)[soldierIdColumn];
          if (!soldierId) continue;

          // Check if this soldier submitted a report today
          const { data: reports } = await supabase
            .from("shift_reports")
            .select("id")
            .eq("user_id", soldierId)
            .gte("created_at", `${today}T00:00:00`)
            .limit(1);

          if (reports && reports.length > 0) continue;

          // Check if reminder already sent
          const { data: existingReminder } = await supabase
            .from("push_notifications_log")
            .select("id")
            .eq("soldier_id", soldierId)
            .eq("shift_type", `form_reminder_${currentShift}`)
            .eq("shift_date", today)
            .limit(1);

          if (existingReminder && existingReminder.length > 0) continue;

          const { data: soldier } = await supabase
            .from("soldiers")
            .select("id, full_name")
            .eq("id", soldierId)
            .single();

          if (!soldier) continue;

          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("soldier_id", soldierId);

          if (!subs || subs.length === 0) continue;

          const payload = JSON.stringify({
            title: "תזכורת: לא מילאת טופס! 📋",
            body: `שלום ${soldier.full_name}, לא הזנת טופס לפני משמרת ב${(schedule as any).outpost}. אנא מלא בהקדם.`,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: `form-reminder-${today}`,
            dir: "rtl",
            lang: "he",
            data: { url: "/shift-form" },
          });

          let success = false;
          for (const sub of subs) {
            if (await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey)) success = true;
          }

          await supabase.from("push_notifications_log").insert({
            soldier_id: soldierId,
            soldier_name: soldier.full_name,
            shift_type: `form_reminder_${currentShift}`,
            outpost: (schedule as any).outpost,
            shift_date: today,
            status: success ? "sent" : "failed",
          });

          allResults.push({ type: "form_reminder", soldier: soldier.full_name, success });
        }
      }
    }

    // ======= 4. MANAGER ALERT: Missing outpost forms (1hr after shift) =======
    if (formReminderHours.includes(currentHour) && currentMinute < 5) {
      const shiftMap2: Record<number, string> = { 7: "morning", 15: "afternoon", 23: "evening" };
      const shiftLabelMap2: Record<string, string> = { morning: "בוקר", afternoon: "צהריים", evening: "ערב" };
      const currentShift2 = shiftMap2[currentHour];
      const managerAlertType = `manager_missing_forms_${currentShift2}`;

      // Check if already sent
      const { data: existingManagerAlert } = await supabase
        .from("push_notifications_log")
        .select("id")
        .eq("shift_type", managerAlertType)
        .eq("shift_date", today)
        .limit(1);

      if (!existingManagerAlert || existingManagerAlert.length === 0) {
        console.log(`Checking missing outpost forms for managers (${currentShift2})...`);

        const soldierIdCol = `${currentShift2}_soldier_id`;

        // Get today's schedules
        const { data: todayMgrSchedules } = await supabase
          .from("work_schedule")
          .select("outpost, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
          .eq("week_start_date", weekStartStr)
          .eq("day_of_week", currentDayOfWeek);

        const missingOutpostsList: string[] = [];

        if (todayMgrSchedules) {
          for (const schedule of todayMgrSchedules) {
            const soldierId2 = (schedule as any)[soldierIdCol];
            if (!soldierId2) continue;

            const { data: reports } = await supabase
              .from("shift_reports")
              .select("id")
              .eq("user_id", soldierId2)
              .gte("created_at", `${today}T00:00:00`)
              .limit(1);

            if (!reports || reports.length === 0) {
              missingOutpostsList.push((schedule as any).outpost);
            }
          }
        }

        if (missingOutpostsList.length > 0) {
          // Get manager users: admin, super_admin, or profiles with military_role containing 'מפ נהגים' / 'ממ נהגים'
          const { data: managerRoles } = await supabase
            .from("user_roles")
            .select("user_id")
            .in("role", ["admin", "super_admin"]);

          const managerUserIds = new Set((managerRoles || []).map((r: any) => r.user_id));

          // Also get mp_driver profiles (ממ נהגים / מפ נהגים)
          const { data: mpProfiles } = await supabase
            .from("profiles")
            .select("user_id")
            .or("military_role.ilike.%ממ נהגים%,military_role.ilike.%מפ נהגים%");

          if (mpProfiles) {
            for (const p of mpProfiles) {
              managerUserIds.add(p.user_id);
            }
          }

          // Get soldier IDs for these managers
          const { data: managerProfiles } = await supabase
            .from("profiles")
            .select("user_id, personal_number, full_name")
            .in("user_id", Array.from(managerUserIds));

          const uniqueOutposts = [...new Set(missingOutpostsList)];
          const alertBody = `משמרת ${shiftLabelMap2[currentShift2]}: ${uniqueOutposts.length} מוצבים לא הזינו טופס\n${uniqueOutposts.join(", ")}`;

          const managerPayload = JSON.stringify({
            title: `⚠️ מוצבים ללא טופס - משמרת ${shiftLabelMap2[currentShift2]}`,
            body: alertBody,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            tag: `manager-missing-${currentShift2}-${today}`,
            dir: "rtl",
            lang: "he",
            data: { url: "/admin" },
          });

          if (managerProfiles) {
            for (const profile of managerProfiles) {
              if (!profile.personal_number) continue;

              const { data: soldier } = await supabase
                .from("soldiers")
                .select("id")
                .eq("personal_number", profile.personal_number)
                .single();

              if (!soldier) continue;

              const { data: subs } = await supabase
                .from("push_subscriptions")
                .select("*")
                .eq("soldier_id", soldier.id);

              if (!subs || subs.length === 0) continue;

              let success = false;
              for (const sub of subs) {
                if (await sendWebPush(sub, managerPayload, vapidPublicKey, vapidPrivateKey)) {
                  success = true;
                }
              }

              await supabase.from("push_notifications_log").insert({
                soldier_id: soldier.id,
                soldier_name: profile.full_name || "",
                shift_type: managerAlertType,
                outpost: "all",
                shift_date: today,
                status: success ? "sent" : "failed",
              });

              allResults.push({ type: "manager_missing_forms", admin: profile.full_name, success });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Smart notifications processed: ${allResults.length} sent`,
        results: allResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
