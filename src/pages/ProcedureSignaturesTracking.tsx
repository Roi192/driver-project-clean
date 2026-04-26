import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileSignature, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Download,
  Loader2,
  AlertTriangle,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string | null;
  outpost: string | null;
}

interface SignatureRecord {
  id: string;
  user_id: string;
  procedure_type: string;
  full_name: string;
  created_at: string;
}

interface SoldierWithStatus extends Soldier {
  signedProcedures: Set<string>;
  lastSignatures: Record<string, SignatureRecord | null>;
}

const procedureLabels: Record<string, string> = {
  routine: "נהלי שגרה",
  shift: "נהלים במהלך משמרת",
  aluf70: "נוהל אלוף 70",
};

const procedureColors: Record<string, string> = {
  routine: "from-blue-500 to-blue-600",
  shift: "from-emerald-500 to-emerald-600",
  aluf70: "from-amber-500 to-amber-600",
};

const ProcedureSignaturesTracking = () => {
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "signed" | "unsigned">("all");
  const [selectedProcedure, setSelectedProcedure] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString();
    
    // Fetch soldiers and signatures in parallel
    const [soldiersRes, signaturesRes] = await Promise.all([
      supabase.from("soldiers").select("id, full_name, personal_number, outpost").order("full_name"),
      supabase.from("procedure_signatures").select("*").gte("created_at", startOfYear).order("created_at", { ascending: false })
    ]);

    if (soldiersRes.error) {
      console.error("Error fetching soldiers:", soldiersRes.error);
      toast.error("שגיאה בטעינת רשימת החיילים");
    } else {
      setSoldiers(soldiersRes.data || []);
    }

    if (signaturesRes.error) {
      console.error("Error fetching signatures:", signaturesRes.error);
    } else {
      setSignatures(signaturesRes.data || []);
    }

    setLoading(false);
  };

  // Build a map of user_id to their signed procedures
  const signaturesByUser = useMemo(() => {
    const map = new Map<string, Map<string, SignatureRecord>>();
    
    signatures.forEach(sig => {
      if (!map.has(sig.user_id)) {
        map.set(sig.user_id, new Map());
      }
      const userSigs = map.get(sig.user_id)!;
      // Keep only the latest signature per procedure type
      if (!userSigs.has(sig.procedure_type)) {
        userSigs.set(sig.procedure_type, sig);
      }
    });
    
    return map;
  }, [signatures]);

  // Map soldiers to their signature status
  // Note: We try to match by full_name since procedure_signatures uses full_name
  const soldiersWithStatus: SoldierWithStatus[] = useMemo(() => {
    return soldiers.map(soldier => {
      // Find matching signatures by name (case-insensitive)
      const matchingSigs = signatures.filter(
        sig => sig.full_name.toLowerCase().trim() === soldier.full_name.toLowerCase().trim()
      );
      
      const signedProcedures = new Set<string>();
      const lastSignatures: Record<string, SignatureRecord | null> = {
        routine: null,
        shift: null,
        aluf70: null
      };
      
      matchingSigs.forEach(sig => {
        signedProcedures.add(sig.procedure_type);
        if (!lastSignatures[sig.procedure_type] || 
            new Date(sig.created_at) > new Date(lastSignatures[sig.procedure_type]!.created_at)) {
          lastSignatures[sig.procedure_type] = sig;
        }
      });
      
      return {
        ...soldier,
        signedProcedures,
        lastSignatures
      };
    });
  }, [soldiers, signatures]);

  // Filter soldiers based on search and status
  const filteredSoldiers = useMemo(() => {
    return soldiersWithStatus.filter(soldier => {
      // Search filter
      const matchesSearch = soldier.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (soldier.personal_number?.includes(searchTerm));
      
      if (!matchesSearch) return false;
      
      // Procedure filter
      if (selectedProcedure !== "all") {
        const hasSigned = soldier.signedProcedures.has(selectedProcedure);
        if (filterStatus === "signed" && !hasSigned) return false;
        if (filterStatus === "unsigned" && hasSigned) return false;
      } else {
        // All procedures - check if signed all 3
        const signedAll = soldier.signedProcedures.size === 3;
        if (filterStatus === "signed" && !signedAll) return false;
        if (filterStatus === "unsigned" && signedAll) return false;
      }
      
      return true;
    });
  }, [soldiersWithStatus, searchTerm, filterStatus, selectedProcedure]);

  // Stats
  const stats = useMemo(() => {
    const total = soldiers.length;
    const signedAll = soldiersWithStatus.filter(s => s.signedProcedures.size === 3).length;
    const byProcedure = {
      routine: soldiersWithStatus.filter(s => s.signedProcedures.has("routine")).length,
      shift: soldiersWithStatus.filter(s => s.signedProcedures.has("shift")).length,
      aluf70: soldiersWithStatus.filter(s => s.signedProcedures.has("aluf70")).length,
    };
    
    return { total, signedAll, byProcedure };
  }, [soldiers.length, soldiersWithStatus]);

  const handleExportToExcel = () => {
    try {
      const exportData = filteredSoldiers.map(soldier => ({
        "שם מלא": soldier.full_name,
        "מספר אישי": soldier.personal_number || "-",
        "מוצב": soldier.outpost || "-",
        "נהלי שגרה": soldier.signedProcedures.has("routine") ? "✓ חתם" : "✗ לא חתם",
        "תאריך חתימה - שגרה": soldier.lastSignatures.routine 
          ? format(new Date(soldier.lastSignatures.routine.created_at), "dd/MM/yyyy", { locale: he })
          : "-",
        "נהלי משמרת": soldier.signedProcedures.has("shift") ? "✓ חתם" : "✗ לא חתם",
        "תאריך חתימה - משמרת": soldier.lastSignatures.shift
          ? format(new Date(soldier.lastSignatures.shift.created_at), "dd/MM/yyyy", { locale: he })
          : "-",
        "נוהל אלוף 70": soldier.signedProcedures.has("aluf70") ? "✓ חתם" : "✗ לא חתם",
        "תאריך חתימה - אלוף 70": soldier.lastSignatures.aluf70
          ? format(new Date(soldier.lastSignatures.aluf70.created_at), "dd/MM/yyyy", { locale: he })
          : "-",
      }));

      if (exportData.length === 0) {
        toast.error("אין נתונים לייצוא");
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 20 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 15 }
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "מעקב חתימות");
      
      const fileName = `מעקב_חתימות_נהלים_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("הקובץ יוצא בהצלחה");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("שגיאה בייצוא הקובץ");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        icon={FileSignature}
        title="מעקב חתימות נהלים"
        subtitle="מי חתם ומי לא חתם על הנהלים"
        badge="בקרה ושליטה"
      />

      <div className="px-4 space-y-4 pb-24">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">סה"כ נהגים</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">{stats.signedAll}</p>
                  <p className="text-xs text-muted-foreground">חתמו על הכל</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Procedure Stats */}
        <div className="grid grid-cols-3 gap-2">
          {(["routine", "shift", "aluf70"] as const).map(key => (
            <div 
              key={key}
              className={`p-3 rounded-xl bg-gradient-to-br ${procedureColors[key]} text-white text-center`}
            >
              <p className="text-xl font-bold">{stats.byProcedure[key]}/{stats.total}</p>
              <p className="text-[10px] opacity-90">{procedureLabels[key]}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">סינון</span>
            </div>
            
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש לפי שם או מספר אישי..."
                className="pr-10 bg-muted/50 border-border rounded-xl"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={selectedProcedure === "all" ? "default" : "outline"}
                onClick={() => setSelectedProcedure("all")}
                className="rounded-xl"
              >
                כל הנהלים
              </Button>
              {(["routine", "shift", "aluf70"] as const).map(key => (
                <Button
                  key={key}
                  size="sm"
                  variant={selectedProcedure === key ? "default" : "outline"}
                  onClick={() => setSelectedProcedure(key)}
                  className="rounded-xl"
                >
                  {procedureLabels[key]}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className="rounded-xl flex-1"
              >
                הכל
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "signed" ? "default" : "outline"}
                onClick={() => setFilterStatus("signed")}
                className="rounded-xl flex-1 gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                חתמו
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "unsigned" ? "default" : "outline"}
                onClick={() => setFilterStatus("unsigned")}
                className="rounded-xl flex-1 gap-1"
              >
                <XCircle className="w-4 h-4" />
                לא חתמו
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          onClick={handleExportToExcel}
          className="w-full gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600"
        >
          <Download className="w-4 h-4" />
          ייצוא לאקסל ({filteredSoldiers.length} רשומות)
        </Button>

        {/* Results */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                רשימת נהגים ({filteredSoldiers.length})
              </h3>
              {filterStatus === "unsigned" && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  לא חתמו
                </Badge>
              )}
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-border">
                {filteredSoldiers.length === 0 ? (
                  <div className="p-8 text-center">
                    <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">לא נמצאו נהגים</p>
                  </div>
                ) : (
                  filteredSoldiers.map(soldier => (
                    <div key={soldier.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground">{soldier.full_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {soldier.personal_number && <span>מ.א: {soldier.personal_number}</span>}
                            {soldier.outpost && <span>• {soldier.outpost}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {soldier.signedProcedures.size === 3 ? (
                            <Badge className="bg-emerald-500 text-white gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              הכל
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              {soldier.signedProcedures.size}/3
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Procedure status */}
                      <div className="flex gap-2 mt-3">
                        {(["routine", "shift", "aluf70"] as const).map(key => {
                          const signed = soldier.signedProcedures.has(key);
                          const sig = soldier.lastSignatures[key];
                          return (
                            <div 
                              key={key}
                              className={`flex-1 p-2 rounded-lg text-center text-xs ${
                                signed 
                                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" 
                                  : "bg-destructive/10 text-destructive border border-destructive/20"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1 mb-1">
                                {signed ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                              </div>
                              <p className="font-medium truncate">{procedureLabels[key].split(" ")[0]}</p>
                              {sig && (
                                <p className="text-[10px] opacity-70 mt-0.5">
                                  {format(new Date(sig.created_at), "dd/MM", { locale: he })}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProcedureSignaturesTracking;