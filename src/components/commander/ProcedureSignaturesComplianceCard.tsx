import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, Users, CheckCircle2, XCircle, ChevronLeft, Search, Loader2, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Soldier {
  id: string;
  full_name: string;
  outpost: string | null;
}

interface SignatureRecord {
  user_id: string;
  procedure_type: string;
  full_name: string;
  created_at: string;
}

const procedureLabels: Record<string, string> = {
  routine: "נהלי שגרה",
  shift: "נהלים במהלך משמרת",
  aluf70: "נוהל אלוף 70",
};

const procedureColors: Record<string, { bg: string; text: string; border: string }> = {
  routine: { bg: "bg-blue-500", text: "text-blue-600", border: "border-blue-200" },
  shift: { bg: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-200" },
  aluf70: { bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-200" },
};

export function ProcedureSignaturesComplianceCard() {
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "signed" | "unsigned">("all");

  useEffect(() => {
    fetchData();
    
    // Refetch when tab becomes visible (user returns to page)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all soldiers from the control table
      const { data: soldiersData } = await supabase
        .from("soldiers")
        .select("id, full_name, outpost")
        .order("full_name");

      // Fetch procedure signatures for current year
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1).toISOString();
      
      const { data: signaturesData } = await supabase
        .from("procedure_signatures")
        .select("user_id, procedure_type, full_name, created_at")
        .gte("created_at", startOfYear)
        .order("created_at", { ascending: false });

      setSoldiers(soldiersData || []);
      setSignatures(signaturesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Match by normalized name instead of user_id since soldiers table uses different IDs
  // Returns a map with normalized name -> signature date
  const getSignedNamesWithDate = (procedureType: string): Map<string, string> => {
    const signedMap = new Map<string, string>();
    signatures
      .filter(s => s.procedure_type === procedureType)
      .forEach(sig => {
        // Normalize name for comparison
        const normalizedName = sig.full_name.trim().toLowerCase();
        // Only keep the first (most recent) signature date for each name
        if (!signedMap.has(normalizedName)) {
          signedMap.set(normalizedName, sig.created_at);
        }
      });
    return signedMap;
  };

  const getSignedNames = (procedureType: string): Set<string> => {
    return new Set(getSignedNamesWithDate(procedureType).keys());
  };

  const getComplianceStats = () => {
    const stats: Record<string, { signed: number; unsigned: number }> = {};
    
    ["routine", "shift", "aluf70"].forEach(procedureType => {
      const signedNames = getSignedNames(procedureType);
      // Count how many soldiers have their name in the signed set
      const signedCount = soldiers.filter(s => 
        signedNames.has(s.full_name.trim().toLowerCase())
      ).length;
      stats[procedureType] = {
        signed: signedCount,
        unsigned: soldiers.length - signedCount
      };
    });
    
    return stats;
  };

  const getFilteredSoldiers = () => {
    if (!selectedProcedure) return [];
    
    const signedMap = getSignedNamesWithDate(selectedProcedure);
    
    let filtered = soldiers.map(soldier => {
      const normalizedName = soldier.full_name.trim().toLowerCase();
      const signedDate = signedMap.get(normalizedName);
      return {
        ...soldier,
        isSigned: !!signedDate,
        signedDate: signedDate || null
      };
    });
    
    if (filterType === "signed") {
      filtered = filtered.filter(s => s.isSigned);
    } else if (filterType === "unsigned") {
      filtered = filtered.filter(s => !s.isSigned);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort: unsigned first, then signed
    return filtered.sort((a, b) => {
      if (a.isSigned === b.isSigned) return a.full_name.localeCompare(b.full_name, 'he');
      return a.isSigned ? 1 : -1;
    });
  };

  const openProcedureList = (procedureType: string) => {
    setSelectedProcedure(procedureType);
    setSearchTerm("");
    setFilterType("all");
    setDialogOpen(true);
  };

  const stats = getComplianceStats();
  const totalSoldiers = soldiers.length;

  if (loading) {
    return (
      <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-purple-500/10 rounded-full blur-2xl" />
        
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg">
              <FileSignature className="w-5 h-5 text-white" />
            </div>
            <span>חתימות על נהלים</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Users className="w-5 h-5 text-slate-500" />
            <span className="text-sm text-slate-600">{totalSoldiers} נהגים בטבלת שליטה</span>
          </div>
          
          {/* Procedure Cards */}
          {(["routine", "shift", "aluf70"] as const).map(procedureType => {
            const { signed, unsigned } = stats[procedureType] || { signed: 0, unsigned: 0 };
            const percentage = totalSoldiers > 0 ? Math.round((signed / totalSoldiers) * 100) : 0;
            const colors = procedureColors[procedureType];
            
            return (
              <div
                key={procedureType}
                onClick={() => openProcedureList(procedureType)}
                className={cn(
                  "relative p-4 rounded-xl border cursor-pointer transition-all duration-300",
                  "bg-white hover:shadow-md hover:border-primary/30",
                  colors.border
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">{procedureLabels[procedureType]}</span>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">{signed} חתמו</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">{unsigned} לא חתמו</span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", colors.bg)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Soldiers List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden" dir="rtl">
          {selectedProcedure && (
            <>
              <DialogHeader className={cn(
                "p-5",
                procedureColors[selectedProcedure].bg,
                "text-white"
              )}>
                <DialogTitle className="text-white text-lg font-bold">
                  {procedureLabels[selectedProcedure]}
                </DialogTitle>
                <p className="text-white/80 text-sm">
                  {stats[selectedProcedure]?.signed || 0} מתוך {totalSoldiers} חתמו
                </p>
              </DialogHeader>
              
              {/* Search and Filter */}
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חיפוש לפי שם..."
                    className="pr-10 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                    className="flex-1 rounded-lg"
                  >
                    הכל
                  </Button>
                  <Button
                    variant={filterType === "signed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("signed")}
                    className="flex-1 rounded-lg text-emerald-600 hover:text-emerald-700"
                  >
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                    חתמו
                  </Button>
                  <Button
                    variant={filterType === "unsigned" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("unsigned")}
                    className="flex-1 rounded-lg text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-3 h-3 ml-1" />
                    לא חתמו
                  </Button>
                </div>
              </div>
              
              {/* Soldiers List */}
              <ScrollArea className="max-h-[50vh]">
                <div className="p-4 space-y-2">
                  {getFilteredSoldiers().length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">לא נמצאו נהגים</p>
                    </div>
                  ) : (
                    getFilteredSoldiers().map(soldier => (
                      <div
                        key={soldier.id}
                        className={cn(
                          "p-3 rounded-xl border flex items-center gap-3 transition-colors",
                          soldier.isSigned 
                            ? "bg-emerald-50 border-emerald-200" 
                            : "bg-red-50 border-red-200"
                        )}
                      >
                        {soldier.isSigned ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{soldier.full_name}</p>
                          {soldier.outpost && (
                            <p className="text-xs text-slate-500">{soldier.outpost}</p>
                          )}
                          {soldier.isSigned && soldier.signedDate && (
                            <div className="flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3 text-emerald-500" />
                              <p className="text-xs text-emerald-600">
                                חתם ב-{format(new Date(soldier.signedDate), "dd/MM/yyyy", { locale: he })}
                              </p>
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            soldier.isSigned 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-red-100 text-red-700"
                          )}
                        >
                          {soldier.isSigned ? "חתם" : "לא חתם"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}