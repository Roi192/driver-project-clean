import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { FileText, Download, Search, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format, parseISO, differenceInDays, addDays, addYears } from "date-fns";
import { he } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  defensive_driving_passed: boolean | null;
  correct_driving_in_service_date: string | null;
  qualified_date: string | null;
  is_active: boolean | null;
}

type FitnessStatus = "fit" | "warning" | "unfit";

interface SoldierFitness extends Soldier {
  militaryLicenseStatus: FitnessStatus;
  civilianLicenseStatus: FitnessStatus;
  correctDrivingStatus: FitnessStatus;
  overallStatus: FitnessStatus;
  needsCorrectDriving: boolean;
}

export default function FitnessReport() {
  const { isAdmin, canAccessFitnessReport, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = canAccessFitnessReport;
  const [soldiers, setSoldiers] = useState<SoldierFitness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDefensiveDriving, setFilterDefensiveDriving] = useState<string>("all");
  const [filterNeedsCorrectDriving, setFilterNeedsCorrectDriving] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      navigate("/");
    }
  }, [hasAccess, authLoading, navigate]);

  useEffect(() => {
    if (hasAccess) {
      fetchSoldiers();
    }
  }, [hasAccess]);

  const getDateStatus = (dateStr: string | null, daysWarning: number = 30): FitnessStatus => {
    if (!dateStr) return "unfit";
    const date = parseISO(dateStr);
    const today = new Date();
    const daysUntil = differenceInDays(date, today);
    if (daysUntil < 0) return "unfit";
    if (daysUntil <= daysWarning) return "warning";
    return "fit";
  };

  // Updated logic: correct driving is required 1 year from qualified_date OR from last correct_driving_in_service_date
  const getCorrectDrivingStatus = (soldier: Soldier): { status: FitnessStatus; needsDriving: boolean } => {
    const today = new Date();
    
    // Get the reference date: either correct_driving_in_service_date or qualified_date
    const correctDrivingDate = soldier.correct_driving_in_service_date ? parseISO(soldier.correct_driving_in_service_date) : null;
    const qualifiedDate = soldier.qualified_date ? parseISO(soldier.qualified_date) : null;
    
    // Use the most recent between correctDriving and qualified date
    let referenceDate = correctDrivingDate || qualifiedDate;
    
    if (!referenceDate) {
      return { status: "unfit", needsDriving: true };
    }
    
    // The deadline is 1 year from the reference date
    const deadline = addYears(referenceDate, 1);
    const daysUntilDeadline = differenceInDays(deadline, today);
    
    if (daysUntilDeadline < 0) {
      return { status: "unfit", needsDriving: true };
    } else if (daysUntilDeadline <= 60) {
      return { status: "warning", needsDriving: true };
    }
    return { status: "fit", needsDriving: false };
  };

  const fetchSoldiers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("soldiers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      const soldiersWithFitness: SoldierFitness[] = (data || []).map(soldier => {
        const militaryLicenseStatus = getDateStatus(soldier.military_license_expiry);
        const civilianLicenseStatus = getDateStatus(soldier.civilian_license_expiry);
        const correctDrivingResult = getCorrectDrivingStatus(soldier);

        // Overall status: only based on licenses (not defensive driving)
        // Defensive driving is informational, not a fitness requirement
        let overallStatus: FitnessStatus = "fit";
        const statuses = [militaryLicenseStatus, civilianLicenseStatus, correctDrivingResult.status];
        if (statuses.includes("unfit")) overallStatus = "unfit";
        else if (statuses.includes("warning")) overallStatus = "warning";

        return {
          ...soldier,
          militaryLicenseStatus,
          civilianLicenseStatus,
          correctDrivingStatus: correctDrivingResult.status,
          overallStatus,
          needsCorrectDriving: correctDrivingResult.needsDriving,
        };
      });

      setSoldiers(soldiersWithFitness);
    } catch (error) {
      console.error("Error fetching soldiers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate deadline for correct driving (for sorting by urgency)
  const getCorrectDrivingDeadline = (soldier: Soldier): Date | null => {
    const correctDrivingDate = soldier.correct_driving_in_service_date ? parseISO(soldier.correct_driving_in_service_date) : null;
    const qualifiedDate = soldier.qualified_date ? parseISO(soldier.qualified_date) : null;
    
    let referenceDate = correctDrivingDate || qualifiedDate;
    if (!referenceDate) return null;
    
    return addYears(referenceDate, 1);
  };

  const filteredSoldiers = soldiers.filter(soldier => {
    const matchesSearch = soldier.full_name.includes(searchQuery) || 
                          soldier.personal_number.includes(searchQuery);
    const matchesStatus = filterStatus === "all" || soldier.overallStatus === filterStatus;
    
    // Defensive driving filter
    const matchesDefensiveDriving = filterDefensiveDriving === "all" || 
      (filterDefensiveDriving === "passed" && soldier.defensive_driving_passed) ||
      (filterDefensiveDriving === "not_passed" && !soldier.defensive_driving_passed);
    
    // Needs correct driving filter
    const matchesNeedsCorrectDriving = filterNeedsCorrectDriving === "all" ||
      (filterNeedsCorrectDriving === "needs" && soldier.needsCorrectDriving) ||
      (filterNeedsCorrectDriving === "ok" && !soldier.needsCorrectDriving);
    
    return matchesSearch && matchesStatus && matchesDefensiveDriving && matchesNeedsCorrectDriving;
  }).sort((a, b) => {
    // When filtering by "needs correct driving", sort by urgency
    if (filterNeedsCorrectDriving === "needs") {
      const deadlineA = getCorrectDrivingDeadline(a);
      const deadlineB = getCorrectDrivingDeadline(b);
      
      // No deadline = most urgent (put first)
      if (!deadlineA && !deadlineB) return 0;
      if (!deadlineA) return -1;
      if (!deadlineB) return 1;
      
      // Earlier deadline = more urgent (put first)
      return differenceInDays(deadlineA, new Date()) - differenceInDays(deadlineB, new Date());
    }
    return 0;
  });

  const stats = {
    total: soldiers.length,
    fit: soldiers.filter(s => s.overallStatus === "fit").length,
    warning: soldiers.filter(s => s.overallStatus === "warning").length,
    unfit: soldiers.filter(s => s.overallStatus === "unfit").length,
  };

  const getStatusBadge = (status: FitnessStatus) => {
    switch (status) {
      case "fit":
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 ml-1" />תקין</Badge>;
      case "warning":
        return <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 ml-1" />בקרוב</Badge>;
      case "unfit":
        return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 ml-1" />לא כשיר</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "לא מוזן";
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: he });
  };

  const exportToExcel = () => {
    const exportData = filteredSoldiers.map(soldier => ({
      "שם מלא": soldier.full_name,
      "מספר אישי": soldier.personal_number,
      "רישיון צבאי": formatDate(soldier.military_license_expiry),
      "סטטוס רישיון צבאי": soldier.militaryLicenseStatus === "fit" ? "תקין" : soldier.militaryLicenseStatus === "warning" ? "בקרוב" : "פג",
      "רישיון אזרחי": formatDate(soldier.civilian_license_expiry),
      "סטטוס רישיון אזרחי": soldier.civilianLicenseStatus === "fit" ? "תקין" : soldier.civilianLicenseStatus === "warning" ? "בקרוב" : "פג",
      "נהיגה מונעת": soldier.defensive_driving_passed ? "עבר" : "לא עבר",
      "תאריך הכשרה": formatDate(soldier.qualified_date),
      "נהיגה נכונה בשירות": formatDate(soldier.correct_driving_in_service_date),
      "סטטוס נה\"נ בשירות": soldier.correctDrivingStatus === "fit" ? "תקין" : soldier.correctDrivingStatus === "warning" ? "בקרוב" : "פג",
      "סטטוס כללי": soldier.overallStatus === "fit" ? "כשיר" : soldier.overallStatus === "warning" ? "אזהרה" : "לא כשיר",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "דוח כשירות");
    XLSX.writeFile(wb, `דוח_כשירות_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <header className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-5 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-xl text-slate-800">דוח כשירות מרוכז</h1>
                  <p className="text-sm text-slate-500">סטטוס כשירות כל הנהגים</p>
                </div>
              </div>
              <Button onClick={exportToExcel} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                ייצוא
              </Button>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="text-center p-3">
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">סה"כ</p>
            </Card>
            <Card className="text-center p-3 bg-green-50 border-green-200">
              <p className="text-2xl font-black text-green-600">{stats.fit}</p>
              <p className="text-xs text-green-600">כשירים</p>
            </Card>
            <Card className="text-center p-3 bg-amber-50 border-amber-200">
              <p className="text-2xl font-black text-amber-600">{stats.warning}</p>
              <p className="text-xs text-amber-600">בקרוב</p>
            </Card>
            <Card className="text-center p-3 bg-red-50 border-red-200">
              <p className="text-2xl font-black text-red-600">{stats.unfit}</p>
              <p className="text-xs text-red-600">לא כשירים</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם או מ.א..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-white text-slate-800">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="fit">כשיר</SelectItem>
                  <SelectItem value="warning">אזהרה</SelectItem>
                  <SelectItem value="unfit">לא כשיר</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDefensiveDriving} onValueChange={setFilterDefensiveDriving}>
                <SelectTrigger className="w-40 bg-white text-slate-800">
                  <SelectValue placeholder="נהיגה מונעת" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="passed">עבר נהיגה מונעת</SelectItem>
                  <SelectItem value="not_passed">לא עבר נהיגה מונעת</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterNeedsCorrectDriving} onValueChange={setFilterNeedsCorrectDriving}>
                <SelectTrigger className="w-48 bg-white text-slate-800">
                  <SelectValue placeholder="נהיגה נכונה בשירות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="needs">צריך נהיגה נכונה</SelectItem>
                  <SelectItem value="ok">תקין</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-center">רש' צבאי</TableHead>
                    <TableHead className="text-center">רש' אזרחי</TableHead>
                    <TableHead className="text-center">נהיגה מונעת</TableHead>
                    <TableHead className="text-center">נה"נ בשירות</TableHead>
                    <TableHead className="text-center">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSoldiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        לא נמצאו תוצאות
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSoldiers.map(soldier => (
                      <TableRow key={soldier.id}>
                        <TableCell className="font-medium">{soldier.full_name}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.militaryLicenseStatus)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.civilianLicenseStatus)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={soldier.defensive_driving_passed ? "bg-blue-500 text-white" : "bg-slate-400 text-white"}>
                            {soldier.defensive_driving_passed ? "עבר" : "לא עבר"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.correctDrivingStatus)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.overallStatus)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}