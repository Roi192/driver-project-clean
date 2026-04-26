import { useEffect, useState } from "react";
import { registerAppServiceWorker } from "@/lib/service-worker";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type DeptKey = "drivers" | "gdud" | "hagmar";

interface Props {
  department: DeptKey;
}

const DEPT_CONFIG: Record<DeptKey, {
  title: string;
  badge: string;
  badgeEmoji: string;
  subtitle: string;
  authPath: string;
  manifestHref: string;
  primaryHsl: string;
  features: { icon: string; text: string }[];
}> = {
  drivers: {
    title: "התקן את האפליקציה",
    badge: "נהגי בט״ש",
    badgeEmoji: "🚛",
    subtitle: "הורד את אפליקציית נהגי בט״ש לטלפון כדי לקבל גישה מהירה, התראות ודיווחים.",
    authPath: "/auth",
    manifestHref: "/manifest.json",
    primaryHsl: "221 83% 53%",
    features: [
      { icon: "⚡", text: "גישה ישירה" },
      { icon: "🔔", text: "התראות פוש" },
      { icon: "📱", text: "חווית אפליקציה" },
      { icon: "📶", text: "עובד אופליין" },
    ],
  },
  gdud: {
    title: "התקן את האפליקציה",
    badge: "גדוד תע״ם",
    badgeEmoji: "🎖️",
    subtitle: "הורד את אפליקציית גדוד תע״ם לטלפון כדי לקבל גישה מהירה, ניהול ודיווחים.",
    authPath: "/auth/gdud",
    manifestHref: "/manifest-battalion.json",
    primaryHsl: "217 91% 60%",
    features: [
      { icon: "⚡", text: "גישה ישירה" },
      { icon: "🔔", text: "התראות ניהול" },
      { icon: "📱", text: "חווית אפליקציה" },
      { icon: "📊", text: "דשבורד גדודי" },
    ],
  },
  hagmar: {
    title: "התקן את האפליקציה",
    badge: "הגמ״ר",
    badgeEmoji: "🛡️",
    subtitle: "הורד את אפליקציית הגמ״ר לטלפון כדי לקבל גישה מהירה, דיווחים והתראות.",
    authPath: "/auth/hagmar",
    manifestHref: "/manifest-hagmar.json",
    primaryHsl: "160 84% 39%",
    features: [
      { icon: "⚡", text: "גישה ישירה" },
      { icon: "🔔", text: "התראות פוש" },
      { icon: "📱", text: "חווית אפליקציה" },
      { icon: "🛡️", text: "הגנת מרחב" },
    ],
  },
};

export default function DepartmentInstallPage({ department }: Props) {
  const config = DEPT_CONFIG[department];
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--department-primary", config.primaryHsl);
    try { localStorage.setItem("install_department", department === "gdud" ? "battalion" : department); } catch {}

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.href = config.manifestHref;
    } else {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = config.manifestHref;
      document.head.appendChild(manifestLink);
    }

    registerAppServiceWorker().catch(() => {});

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone) {
      window.location.replace(config.authPath);
      return;
    }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [config, department]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") setIsInstalled(true);
      setInstalling(false);
    } else if (isIOS) {
      document.getElementById("ios-instructions")?.scrollIntoView({ behavior: "smooth" });
    } else {
      document.getElementById("manual-instructions")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const p = config.primaryHsl;

  return (
    <div dir="rtl" lang="he" style={{
      minHeight: "100dvh",
      background: "hsl(222 22% 8%)",
      color: "hsl(210 40% 98%)",
      fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "28px 18px", textAlign: "center", position: "relative", overflow: "hidden",
    }}>
      {/* BG */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 80% 10%, hsl(${p} / 0.22), transparent),
          radial-gradient(ellipse 50% 60% at 15% 90%, hsl(${p} / 0.12), transparent),
          hsl(222 22% 8%)`,
      }} />
      <div style={{
        position: "fixed", width: 280, height: 280, top: -60, left: -40,
        borderRadius: "50%", background: `hsl(${p} / 0.10)`, filter: "blur(80px)", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: `hsl(${p} / 0.15)`, filter: "blur(36px)" }} />
          <img src="/pwa-192x192.png" alt="סמל" style={{
            position: "relative", zIndex: 1, width: 100, height: 100, objectFit: "contain",
            filter: `drop-shadow(0 8px 24px hsl(${p} / 0.35))`,
          }} />
        </div>

        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "8px 20px", borderRadius: 999, fontWeight: 800, fontSize: ".88rem",
          color: `hsl(${p})`, background: `hsl(${p} / 0.10)`, border: `1px solid hsl(${p} / 0.22)`,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: "1.2rem" }}>{config.badgeEmoji}</span> {config.badge}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: 900, lineHeight: 1.15, marginBottom: 10,
          background: `linear-gradient(135deg, hsl(210 40% 98%), hsl(${p} / 0.85))`,
          WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {config.title}
        </h1>

        <p style={{ color: "hsl(214 20% 55%)", lineHeight: 1.6, fontSize: ".95rem", maxWidth: 340, margin: "0 auto 28px" }}>
          {config.subtitle}
        </p>

        {/* Card */}
        <div style={{
          width: "100%", background: "hsl(222 24% 12% / 0.80)",
          border: "1px solid hsl(216 15% 20%)", borderRadius: 28, padding: "32px 24px 28px",
          boxShadow: "0 4px 12px hsl(0 0% 0% / 0.15), 0 24px 64px hsl(222 40% 4% / 0.4)",
          backdropFilter: "blur(24px)",
        }}>
          {isInstalled ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              padding: "28px 18px", borderRadius: 22,
              background: "hsl(142 71% 55% / 0.08)", border: "1px solid hsl(142 71% 55% / 0.2)",
            }}>
              <span style={{ fontSize: "3.5rem", lineHeight: 1 }}>✅</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "hsl(142 71% 55%)" }}>ההתקנה הושלמה!</span>
              <span style={{ color: "hsl(214 20% 55%)", fontSize: ".88rem" }}>פתח את האפליקציה מהמסך הראשי של הטלפון.</span>
            </div>
          ) : (
            <>
              {/* Features */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                {config.features.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "16px 8px", borderRadius: 16,
                    background: "hsl(222 22% 8% / 0.5)", border: "1px solid hsl(216 15% 20%)",
                  }}>
                    <span style={{ fontSize: "1.6rem" }}>{f.icon}</span>
                    <span style={{ fontSize: ".8rem", color: "hsl(214 20% 55%)", fontWeight: 600 }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Install button — ALWAYS visible */}
              <div style={{ marginTop: 8, marginBottom: 24 }}>
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  style={{
                    appearance: "none", cursor: "pointer",
                    width: "100%", borderRadius: 22, padding: "20px 24px",
                    fontSize: "1.12rem", fontWeight: 800, letterSpacing: "0.01em",
                    color: "hsl(210 40% 98%)",
                    background: `linear-gradient(145deg, hsl(${p}), hsl(${p} / 0.6))`,
                    border: `1px solid hsl(${p} / 0.4)`,
                    boxShadow: `0 8px 32px hsl(${p} / 0.35), 0 2px 8px hsl(0 0% 0% / 0.2), inset 0 1px 0 hsl(0 0% 100% / 0.12)`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    animation: "pulse 2.5s ease-in-out infinite",
                    transition: "transform 0.15s ease",
                    position: "relative", overflow: "hidden",
                  }}
                  onTouchStart={e => (e.currentTarget.style.transform = "scale(0.96)")}
                  onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
                  onMouseDown={e => (e.currentTarget.style.transform = "scale(0.96)")}
                  onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {/* Shimmer effect */}
                  <span style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.1) 50%, transparent 60%)",
                    animation: "shimmer 3s ease-in-out infinite",
                  }} />
                  <span style={{ position: "relative", zIndex: 1 }}>
                    {installing ? "⏳ מתקין..." : "📲 לחץ כאן להורדת האפליקציה"}
                  </span>
                </button>
              </div>

              {/* iOS instructions */}
              {isIOS && (
                <div id="ios-instructions" style={{
                  background: "hsl(222 22% 8% / 0.4)", border: "1px solid hsl(216 15% 20%)",
                  borderRadius: 20, padding: "18px 20px", marginBottom: 18, textAlign: "right",
                }}>
                  <h2 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 700 }}>התקנה באייפון</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {["לחץ על כפתור השיתוף בתחתית המסך", 'גלול ובחר "הוסף למסך הבית"', 'לחץ "הוסף" בפינה הימנית'].map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, color: "hsl(214 20% 55%)", fontSize: ".9rem", lineHeight: 1.5 }}>
                        <span style={{
                          flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: "50%", background: `hsl(${p} / 0.12)`, color: `hsl(${p})`,
                          fontWeight: 800, fontSize: ".82rem", border: `1px solid hsl(${p} / 0.28)`,
                        }}>{i + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: step.replace(/"([^"]+)"/g, '<strong>"$1"</strong>') }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual instructions (non-iOS, no prompt) */}
              {!isIOS && !deferredPrompt && (
                <div id="manual-instructions" style={{
                  background: "hsl(222 22% 8% / 0.4)", border: "1px solid hsl(216 15% 20%)",
                  borderRadius: 20, padding: "18px 20px", textAlign: "right",
                }}>
                  <h2 style={{ fontSize: "1rem", marginBottom: 12, fontWeight: 700 }}>כיצד להתקין</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {["פתח את הקישור הזה ב-Chrome או Samsung Internet", "לחץ על תפריט הדפדפן ⋮", 'בחר "התקן אפליקציה" או "הוסף למסך הבית"'].map((step, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, color: "hsl(214 20% 55%)", fontSize: ".9rem", lineHeight: 1.5 }}>
                        <span style={{
                          flexShrink: 0, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: "50%", background: `hsl(${p} / 0.12)`, color: `hsl(${p})`,
                          fontWeight: 800, fontSize: ".82rem", border: `1px solid hsl(${p} / 0.28)`,
                        }}>{i + 1}</span>
                        <span dangerouslySetInnerHTML={{ __html: step.replace(/"([^"]+)"/g, '<strong>"$1"</strong>') }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <a href="/install" style={{ marginTop: 20, color: "hsl(214 20% 55%)", fontSize: ".85rem", textDecoration: "none" }}>
          ← חזרה לבחירת מחלקה
        </a>
        <div style={{ marginTop: 16, color: "hsl(214 20% 35%)", fontSize: ".78rem" }}>© חטיבת בנימין</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 8px 32px hsl(${p} / 0.35) }
          50% { box-shadow: 0 12px 48px hsl(${p} / 0.55) }
        }
        @keyframes shimmer {
          0% { transform: translateX(100%) }
          100% { transform: translateX(-100%) }
        }
      `}</style>
    </div>
  );
}