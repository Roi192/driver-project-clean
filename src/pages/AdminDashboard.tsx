import { useState, useEffect } from 'react';
import { deleteStorageFiles } from '@/lib/storage-cleanup';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { OUTPOSTS } from '@/lib/constants';
import { ReportDetailDialog } from '@/components/admin/ReportDetailDialog';
import { WeeklyReportsChart } from '@/components/admin/WeeklyReportsChart';
import { VehicleReportsCard } from '@/components/admin/VehicleReportsCard';
import { ShiftStatsCard } from '@/components/admin/ShiftStatsCard';
import { OutpostStatsCard } from '@/components/admin/OutpostStatsCard';
import { ExportButton } from '@/components/admin/ExportButton';
import { IncompleteReportsCard } from '@/components/admin/IncompleteReportsCard';
import { ProcedureSignaturesCard } from '@/components/admin/ProcedureSignaturesCard';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { CleaningParadeCards } from '@/components/commander/CleaningParadeCards';
import { TripFormsCard } from '@/components/commander/TripFormsCard';
import { CleaningParadeSummary } from '@/components/commander/CleaningParadeSummary';

import unitLogo from '@/assets/unit-logo.png';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  FileText, 
  TrendingUp, 
  Calendar,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Shield,
  MapPin,
  Sparkles,
  Crown,
  Star,
  Zap,
  Award,
  Gem,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ShiftReport {
  id: string;
  report_date: string;
  report_time: string;
  outpost: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: string;
  is_complete: boolean;
  created_at: string;
  emergency_procedure_participation: boolean;
  commander_briefing_attendance: boolean;
  work_card_completed: boolean;
  has_ceramic_vest: boolean;
  has_helmet: boolean;
  has_personal_weapon: boolean;
  has_ammunition: boolean;
  pre_movement_checks_completed: boolean;
  pre_movement_items_checked?: string[] | null;
  driver_tools_checked: boolean;
  driver_tools_items_checked?: string[] | null;
  descent_drill_completed: boolean;
  rollover_drill_completed: boolean;
  fire_drill_completed: boolean;
  safety_vulnerabilities?: string;
  vardim_procedure_explanation?: string;
  vardim_points?: string;
  photo_front?: string;
  photo_left?: string;
  photo_right?: string;
  photo_back?: string;
  photo_steering_wheel?: string;
}

const shiftTypeMap: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
};

export default function AdminDashboard() {
  const { isAdmin, isPlatoonCommander, isBattalionAdmin, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutpost, setFilterOutpost] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ShiftReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Allow admin, platoon commander, and battalion admin access
  const hasAccess = isAdmin || isPlatoonCommander || isBattalionAdmin;

  useEffect(() => {
    if (!roleLoading && !hasAccess) {
      navigate('/');
    }
  }, [hasAccess, roleLoading, navigate]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('shift_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterOutpost && filterOutpost !== 'all') {
        query = query.eq('outpost', filterOutpost);
      }

      if (filterDate) {
        query = query.eq('report_date', filterDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Call cleanup function for old reports (runs once on admin load)
  useEffect(() => {
    const cleanupOldReports = async () => {
      try {
        const { data } = await supabase.functions.invoke('cleanup-old-reports');
        if (data?.deletedReports > 0) {
          console.log(`Cleaned up ${data.deletedReports} old reports and ${data.deletedPhotos} photos`);
        }
      } catch (error) {
        console.error('Error cleaning up old reports:', error);
      }
    };
    
    if (hasAccess) {
      cleanupOldReports();
    }
  }, [hasAccess]);

  useEffect(() => {
    if (hasAccess) {
      fetchReports();
    }
  }, [hasAccess, filterOutpost, filterDate]);

  const clearFilters = () => {
    setFilterOutpost('all');
    setFilterDate('');
    setSearchQuery('');
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    
    // Delete photos from storage
    await deleteStorageFiles([
      reportToDelete.photo_front,
      reportToDelete.photo_left,
      reportToDelete.photo_right,
      reportToDelete.photo_back,
      reportToDelete.photo_steering_wheel,
    ], "shift-photos");

    const { error } = await supabase
      .from('shift_reports')
      .delete()
      .eq('id', reportToDelete.id);

    if (error) {
      toast.error('שגיאה במחיקת הדיווח');
      console.error(error);
    } else {
      toast.success('הדיווח נמחק בהצלחה');
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      fetchReports();
    }
    setIsDeleting(false);
  };

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.driver_name?.toLowerCase().includes(query) ||
      report.vehicle_number?.toLowerCase().includes(query) ||
      report.outpost?.toLowerCase().includes(query)
    );
  });

  const stats = {
    totalReports: reports.length,
  };

  if (roleLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-white">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        {/* Premium Ambient Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-primary/8 to-transparent rounded-full blur-[100px] animate-float" style={{ animationDuration: '15s' }} />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-accent/8 to-transparent rounded-full blur-[100px] animate-float" style={{ animationDuration: '18s', animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-r from-primary/5 via-transparent to-accent/5 rounded-full blur-[120px]" />
          
          {/* Decorative Elements */}
          <div className="absolute top-20 left-10 w-24 h-24 border border-primary/10 rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-40 right-10 w-16 h-16 border border-accent/10 rounded-full animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          
          {/* Floating Sparkles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                width: `${3 + (i % 2)}px`,
                height: `${3 + (i % 2)}px`,
                background: i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
                top: `${15 + (i * 10) % 70}%`,
                left: `${5 + (i * 12) % 90}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${6 + (i % 3)}s`,
                opacity: 0.3
              }}
            />
          ))}
        </div>

        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Premium Header */}
          <div className="relative overflow-hidden rounded-[2rem] bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-8 shadow-[0_10px_50px_rgba(0,0,0,0.08)] animate-slide-up">
            {/* Multiple gradient layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-[2rem]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            
            {/* Decorative corner elements */}
            <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/15 to-transparent rounded-full blur-2xl" />
            
            {/* Animated border accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <div className="relative flex items-center justify-between">
              <ExportButton reports={reports} />
              
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                  {/* Enhanced Logo */}
                  <div className="relative group">
                    <div className="absolute inset-[-50%] bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-[-25%] bg-gradient-to-br from-accent/40 to-primary/40 rounded-full blur-xl opacity-40 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    <img 
                      src={unitLogo} 
                      alt="סמל" 
                      className="relative w-20 h-20 object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
                      style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.15))' }}
                    />
                  </div>
                  
                  {/* Badge */}
                  <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 shadow-lg backdrop-blur-sm animate-glow">
                    <Crown className="w-6 h-6 text-accent animate-bounce-soft" />
                    <span className="text-primary font-black text-xl">דשבורד מנהל</span>
                    <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                  </div>
                </div>
                
                <h1 className="text-4xl font-black text-slate-800">
                  ניהול דיווחים
                </h1>
              </div>
              
              <div className="w-28" />
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {/* Total Reports Card - Premium */}
            <Card className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_50px_rgba(0,0,0,0.12)] transition-all duration-500 rounded-3xl hover:scale-[1.02]">
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <CardContent className="p-6 relative">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
                      <FileText className="relative w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-4xl font-black text-slate-800 group-hover:text-primary transition-colors duration-300">
                      {stats.totalReports}
                    </p>
                    <p className="text-sm text-slate-500 font-bold">סה"כ דיווחים</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ShiftStatsCard reports={reports} />
            <VehicleReportsCard reports={reports} />
            <OutpostStatsCard reports={reports} />
            
            <IncompleteReportsCard 
              reports={reports} 
              onViewReport={(report) => {
                setSelectedReport(report);
                setIsDetailOpen(true);
              }}
            />
            <ProcedureSignaturesCard />
          </div>

          {/* Cleaning Parade Cards */}
          <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <CleaningParadeCards />
          </div>

          {/* Cleaning Parade Summary */}
          <div className="animate-slide-up" style={{ animationDelay: '0.16s' }}>
            <CleaningParadeSummary />
          </div>

          {/* Trip Forms Card */}
          <div className="animate-slide-up" style={{ animationDelay: '0.17s' }}>
            <TripFormsCard />
          </div>
          {/* Weekly Reports Chart */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <WeeklyReportsChart reports={reports} />
          </div>

          {/* Filters - Premium */}
          <Card className="overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] rounded-3xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-4 text-slate-600">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg opacity-50" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                    <Filter className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div>
                  <span className="font-black text-lg text-slate-800">סינון וחיפוש</span>
                  <p className="text-sm text-slate-500">חפש לפי שם נהג, מספר רכב או מוצב</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="relative group">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="חיפוש לפי שם נהג, מספר רכב..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-12 h-14 bg-white/80 border-slate-200 rounded-2xl focus:border-primary/50 focus:shadow-lg transition-all shadow-sm text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select value={filterOutpost} onValueChange={(value) => setFilterOutpost(value)}>
                    <SelectTrigger className="h-14 bg-white/80 border-slate-200 rounded-2xl shadow-sm hover:border-primary/40 transition-colors text-base">
                      <SelectValue placeholder="כל המוצבים" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="all">כל המוצבים</SelectItem>
                      {OUTPOSTS.map((outpost) => (
                        <SelectItem key={outpost} value={outpost}>
                          {outpost}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="h-14 bg-white/80 border-slate-200 rounded-2xl shadow-sm hover:border-primary/40 transition-colors"
                  />
                </div>

                {(filterOutpost !== 'all' || filterDate || searchQuery) && (
                  <Button 
                    variant="ghost" 
                    size="lg" 
                    onClick={clearFilters}
                    className="text-slate-500 hover:text-destructive hover:bg-destructive/10 rounded-2xl h-12 font-bold"
                  >
                    <XCircle className="w-5 h-5 ml-2" />
                    נקה סינון
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reports Table - Premium */}
          <Card className="overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] rounded-3xl animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent">
              <CardTitle className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-lg" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="font-black text-xl text-slate-800">רשימת דיווחים</span>
                <Badge className="bg-primary/10 text-primary border-0 font-black shadow-sm text-base px-4 py-1">
                  {filteredReports.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-16 text-center">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="mt-4 text-slate-500 font-medium">טוען דיווחים...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-12 h-12 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-bold text-lg">לא נמצאו דיווחים</p>
                  <p className="text-slate-400 text-sm mt-2">נסה לשנות את הסינון</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50">
                        <TableHead className="text-right font-black text-slate-700">תאריך</TableHead>
                        <TableHead className="text-right font-black text-slate-700">נהג</TableHead>
                        <TableHead className="text-right font-black text-slate-700">מוצב</TableHead>
                        <TableHead className="text-right font-black text-slate-700">רכב</TableHead>
                        <TableHead className="text-right font-black text-slate-700">משמרת</TableHead>
                        <TableHead className="text-right font-black text-slate-700">סטטוס</TableHead>
                        <TableHead className="text-right font-black text-slate-700">פעולות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report, index) => (
                        <TableRow 
                          key={report.id} 
                          className="hover:bg-primary/5 transition-all duration-300 animate-slide-up"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <TableCell className="font-bold text-slate-700">
                            {format(new Date(report.report_date), 'dd/MM/yyyy', { locale: he })}
                          </TableCell>
                          <TableCell className="font-bold text-slate-800">{report.driver_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-bold rounded-xl">
                              {report.outpost}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Truck className="w-4 h-4 text-accent" />
                              </div>
                              <span className="font-bold text-slate-700">{report.vehicle_number}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 font-medium">{shiftTypeMap[report.shift_type] || report.shift_type}</TableCell>
                          <TableCell>
                            {report.is_complete ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 font-bold shadow-sm rounded-xl">
                                <CheckCircle className="w-3.5 h-3.5 ml-1" />
                                הושלם
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-0 font-bold shadow-sm rounded-xl">
                                <Clock className="w-3.5 h-3.5 ml-1" />
                                חלקי
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsDetailOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportToDelete(report);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ReportDetailDialog
        report={selectedReport}
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setSelectedReport(null);
        }}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת דיווח"
        description={`האם אתה בטוח שברצונך למחוק את הדיווח של ${reportToDelete?.driver_name} מתאריך ${reportToDelete ? format(new Date(reportToDelete.report_date), 'dd/MM/yyyy', { locale: he }) : ''}? פעולה זו לא ניתנת לביטול.`}
        onConfirm={handleDeleteReport}
        isLoading={isDeleting}
      />
    </AppLayout>
  );
}