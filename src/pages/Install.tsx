import { Truck, Shield, Users } from "lucide-react";
import unitLogo from "@/assets/unit-logo.png";

const departments = [
  {
    key: "drivers",
    title: "נהגי בט״ש",
    subtitle: "פלנ\"ג - חטיבת בנימין",
    icon: <Truck className="w-7 h-7" />,
    href: "/install/drivers",
    gradient: "from-blue-600 to-blue-400",
    glow: "shadow-blue-500/30",
    emoji: "🚛",
  },
  {
    key: "battalion",
    title: "גדוד תע״ם",
    subtitle: "חטיבת בנימין",
    icon: <Users className="w-7 h-7" />,
    href: "/install/gdud",
    gradient: "from-indigo-600 to-indigo-400",
    glow: "shadow-indigo-500/30",
    emoji: "🎖️",
  },
  {
    key: "hagmar",
    title: "הגמ״ר",
    subtitle: "הגנת המרחב - חטיבת בנימין",
    icon: <Shield className="w-7 h-7" />,
    href: "/install/hagmar",
    gradient: "from-emerald-600 to-emerald-400",
    glow: "shadow-emerald-500/30",
    emoji: "🛡️",
  },
];

export default function Install() {
  return (
    <div className="min-h-screen bg-[hsl(222,22%,8%)] flex flex-col overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] right-[-80px] w-[350px] h-[350px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-100px] left-[-60px] w-[300px] h-[300px] rounded-full bg-emerald-500/8 blur-[80px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-5 text-center relative z-10">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-[-20px] bg-blue-500/15 rounded-full blur-[40px] animate-pulse" />
          <img
            src={unitLogo}
            alt="לוגו חטיבת בנימין"
            className="relative w-24 h-24 object-contain drop-shadow-[0_8px_24px_rgba(59,130,246,0.3)]"
          />
        </div>

        <h1 className="text-[clamp(1.8rem,6vw,2.6rem)] font-black text-transparent bg-clip-text bg-gradient-to-l from-white to-blue-200 mb-2 leading-tight">
          התקנת האפליקציה
        </h1>
        <p className="text-[hsl(214,20%,55%)] text-sm mb-10 max-w-[300px]">
          בחר את המחלקה שלך כדי להתקין את האפליקציה בטלפון
        </p>

        {/* Department cards */}
        <div className="grid gap-4 w-full max-w-sm">
          {departments.map((dept) => (
            <a
              key={dept.key}
              href={dept.href}
              className={`group relative flex items-center gap-4 rounded-2xl p-5 text-right
                bg-[hsl(222,24%,12%)]/80 backdrop-blur-xl
                border border-[hsl(216,15%,20%)] hover:border-white/20
                transition-all duration-300 active:scale-[0.97]
                shadow-lg hover:shadow-xl ${dept.glow}`}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dept.gradient} 
                flex items-center justify-center text-white shrink-0
                shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                <span className="text-2xl">{dept.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white">{dept.title}</p>
                <p className="text-xs text-[hsl(214,20%,55%)] mt-0.5">{dept.subtitle}</p>
              </div>
              <div className="text-[hsl(214,20%,40%)] group-hover:text-white/60 transition-colors text-lg">
                ←
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="p-5 text-center text-xs text-[hsl(214,20%,35%)] relative z-10">
        © חטיבת בנימין
      </div>
    </div>
  );
}