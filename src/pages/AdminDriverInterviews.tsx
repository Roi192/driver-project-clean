import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ClipboardCheck, 
  Users, 
  Eye, 
  Building2, 
  ChevronRight,
  ChevronLeft,
  MapPin,
  Shield,
  UserCheck,
  Edit,
  Trash2
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Interview {
  id: string;
  driver_name: string;
  interviewer_name: string;
  interview_date: string;
  battalion: string;
  region: string;
  outpost: string;
  license_type: string | null;
  permits: string | null;
  civilian_license_expiry: string | null;
  military_license_expiry: string | null;
  defensive_driving_passed: boolean | null;
  military_accidents: string | null;
  family_status: string | null;
  financial_status: string | null;
  additional_notes: string | null;
  interviewer_summary: string | null;
  signature: string;
  created_at: string;
}

// Region to Outposts mapping
const REGIONS_OUTPOSTS: Record<string, string[]> = {
  "ארץ בנימין": ["בית אל", "עפרה", "מבו\"ש", "עטרת"],
  "גבעת בנימין": ["ענתות", "רמה", "כוכב יעקב"],
  "טלמונים": ["חורש ירון", "נווה יאיר", "רנתיס"],
  "מכבים": ["מכבים", "חשמונאים"]
};

const REGIONS = Object.keys(REGIONS_OUTPOSTS);

type ViewLevel = "regions" | "battalions" | "outposts" | "interviews";

export default function AdminDriverInterviews() {
  const { canAccessDriverInterviews, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>("regions");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedBattalion, setSelectedBattalion] = useState<string | null>(null);
  const [selectedOutpost, setSelectedOutpost] = useState<string | null>(null);
  
  // Dialog state
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<Interview | null>(null);

  useEffect(() => {
    if (!authLoading && !canAccessDriverInterviews) {
      navigate("/");
      return;
    }
    if (canAccessDriverInterviews) {
      fetchData();
    }
  }, [canAccessDriverInterviews, authLoading, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_interviews')
        .select('*')
        .order('interview_date', { ascending: false });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setIsLoading(false);
    }
  };

  // Get interviews for a specific region (any outpost in that region)
  const getRegionInterviews = (region: string) => {
    const regionOutposts = REGIONS_OUTPOSTS[region] || [];
    return interviews.filter(i => regionOutposts.includes(i.outpost));
  };

  // Get unique battalions for a region based on actual interviews
  const getRegionBattalions = (region: string) => {
    const regionInterviews = getRegionInterviews(region);
    const battalions = [...new Set(regionInterviews.map(i => i.battalion))];
    return battalions.sort();
  };

  // Get interviews for a specific battalion in a region
  const getBattalionInterviews = (region: string, battalion: string) => {
    const regionOutposts = REGIONS_OUTPOSTS[region] || [];
    return interviews.filter(i => 
      regionOutposts.includes(i.outpost) && i.battalion === battalion
    );
  };

  // Get unique outposts for a battalion in a region
  const getBattalionOutposts = (region: string, battalion: string) => {
    const battalionInterviews = getBattalionInterviews(region, battalion);
    const outposts = [...new Set(battalionInterviews.map(i => i.outpost))];
    return outposts.sort();
  };

  // Get interviews for a specific outpost by a specific battalion
  const getOutpostInterviews = (region: string, battalion: string, outpost: string) => {
    return interviews.filter(i => 
      i.outpost === outpost && i.battalion === battalion
    );
  };

  const handleRegionClick = (region: string) => {
    setSelectedRegion(region);
    setViewLevel("battalions");
  };

  const handleBattalionClick = (battalion: string) => {
    setSelectedBattalion(battalion);
    setViewLevel("outposts");
  };

  const handleOutpostClick = (outpost: string) => {
    setSelectedOutpost(outpost);
    setViewLevel("interviews");
  };

  const goBack = () => {
    if (viewLevel === "interviews") {
      setSelectedOutpost(null);
      setViewLevel("outposts");
    } else if (viewLevel === "outposts") {
      setSelectedBattalion(null);
      setViewLevel("battalions");
    } else if (viewLevel === "battalions") {
      setSelectedRegion(null);
      setViewLevel("regions");
    }
  };

  const handleViewInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setIsViewDialogOpen(true);
  };

  const handleEditInterview = (interview: Interview) => {
    // Navigate to driver interviews page with edit mode (for now just redirect)
    navigate(`/driver-interviews?edit=${interview.id}`);
  };

  const handleDeleteInterview = async () => {
    if (!interviewToDelete) return;
    
    try {
      const { error } = await supabase
        .from('driver_interviews')
        .delete()
        .eq('id', interviewToDelete.id);
      
      if (error) throw error;
      
      toast.success("הראיון נמחק בהצלחה");
      setInterviews(prev => prev.filter(i => i.id !== interviewToDelete.id));
    } catch (error) {
      console.error('Error deleting interview:', error);
      toast.error("שגיאה במחיקת הראיון");
    } finally {
      setIsDeleteDialogOpen(false);
      setInterviewToDelete(null);
    }
  };

  const totalInterviews = interviews.length;
  const uniqueDrivers = new Set(interviews.map(i => i.driver_name.toLowerCase())).size;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const renderBreadcrumb = () => {
    const parts = [];
    parts.push(
      <span 
        key="regions"
        className={`cursor-pointer hover:text-primary ${viewLevel === 'regions' ? 'text-primary font-bold' : 'text-slate-500'}`}
        onClick={() => { setViewLevel('regions'); setSelectedRegion(null); setSelectedBattalion(null); setSelectedOutpost(null); }}
      >
        גזרות
      </span>
    );

    if (selectedRegion) {
      parts.push(<ChevronLeft key="sep1" className="w-4 h-4 text-slate-400 mx-1" />);
      parts.push(
        <span 
          key="region"
          className={`cursor-pointer hover:text-primary ${viewLevel === 'battalions' ? 'text-primary font-bold' : 'text-slate-500'}`}
          onClick={() => { setViewLevel('battalions'); setSelectedBattalion(null); setSelectedOutpost(null); }}
        >
          {selectedRegion}
        </span>
      );
    }

    if (selectedBattalion) {
      parts.push(<ChevronLeft key="sep2" className="w-4 h-4 text-slate-400 mx-1" />);
      parts.push(
        <span 
          key="battalion"
          className={`cursor-pointer hover:text-primary ${viewLevel === 'outposts' ? 'text-primary font-bold' : 'text-slate-500'}`}
          onClick={() => { setViewLevel('outposts'); setSelectedOutpost(null); }}
        >
          {selectedBattalion}
        </span>
      );
    }

    if (selectedOutpost) {
      parts.push(<ChevronLeft key="sep3" className="w-4 h-4 text-slate-400 mx-1" />);
      parts.push(
        <span key="outpost" className="text-primary font-bold">
          {selectedOutpost}
        </span>
      );
    }

    return (
      <div className="flex items-center text-sm mb-4 flex-wrap">
        {parts}
      </div>
    );
  };

  const renderRegionsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {REGIONS.map(region => {
        const regionInterviews = getRegionInterviews(region);
        const battalions = getRegionBattalions(region);
        const outposts = REGIONS_OUTPOSTS[region];
        
        return (
          <Card 
            key={region}
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
            onClick={() => handleRegionClick(region)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{region}</h3>
                    <p className="text-sm text-slate-500">
                      {outposts.length} מוצבים • {battalions.length} גדודות
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {regionInterviews.length}
                  </Badge>
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderBattalionsView = () => {
    if (!selectedRegion) return null;
    const battalions = getRegionBattalions(selectedRegion);

    if (battalions.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">לא נמצאו גדודות בגזרה זו</p>
            <p className="text-sm text-slate-400 mt-1">גדודות יופיעו כאן לאחר שיזינו ראיונות</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {battalions.map(battalion => {
          const battalionInterviews = getBattalionInterviews(selectedRegion, battalion);
          const outposts = getBattalionOutposts(selectedRegion, battalion);
          const uniqueDrivers = new Set(battalionInterviews.map(i => i.driver_name.toLowerCase())).size;
          
          return (
            <Card 
              key={battalion}
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
              onClick={() => handleBattalionClick(battalion)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{battalion}</h3>
                      <p className="text-sm text-slate-500">
                        {outposts.length} מוצבים • {uniqueDrivers} נהגים רואיינו
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary">{battalionInterviews.length} ראיונות</Badge>
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderOutpostsView = () => {
    if (!selectedRegion || !selectedBattalion) return null;
    const outposts = getBattalionOutposts(selectedRegion, selectedBattalion);

    if (outposts.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">לא נמצאו מוצבים</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {outposts.map(outpost => {
          const outpostInterviews = getOutpostInterviews(selectedRegion, selectedBattalion, outpost);
          const uniqueDrivers = new Set(outpostInterviews.map(i => i.driver_name.toLowerCase())).size;
          
          return (
            <Card 
              key={outpost}
              className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all"
              onClick={() => handleOutpostClick(outpost)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{outpost}</h3>
                      <p className="text-sm text-slate-500">{uniqueDrivers} נהגים רואיינו</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{outpostInterviews.length} ראיונות</Badge>
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderInterviewsView = () => {
    if (!selectedRegion || !selectedBattalion || !selectedOutpost) return null;
    const outpostInterviews = getOutpostInterviews(selectedRegion, selectedBattalion, selectedOutpost);

    if (outpostInterviews.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">לא נמצאו ראיונות</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {outpostInterviews.map(interview => (
          <Card 
            key={interview.id}
            className="hover:border-primary/30 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-800">{interview.driver_name}</h4>
                    {interview.defensive_driving_passed ? (
                      <Badge className="bg-emerald-500 text-xs">נהיגה מונעת ✓</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">ללא נהיגה מונעת</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    מראיין: {interview.interviewer_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(interview.interview_date), "dd/MM/yyyy", { locale: he })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewInterview(interview)}
                    className="text-primary hover:bg-primary/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditInterview(interview)}
                    className="text-amber-600 hover:bg-amber-50"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInterviewToDelete(interview);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader 
        title="מעקב ראיונות נהגי קו" 
        subtitle="צפייה ובקרה על ראיונות כל הגדודות"
        icon={ClipboardCheck}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-primary">{totalInterviews}</p>
                <p className="text-xs text-slate-500">סה"כ ראיונות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{uniqueDrivers}</p>
                <p className="text-xs text-slate-500">נהגים רואיינו</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breadcrumb */}
      {viewLevel !== "regions" && (
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={goBack} className="mb-2">
            <ChevronRight className="w-4 h-4 ml-1" />
            חזרה
          </Button>
          {renderBreadcrumb()}
        </div>
      )}

      {/* Content based on view level */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {viewLevel === "regions" && <><MapPin className="w-5 h-5 text-primary" />בחר גזרה</>}
            {viewLevel === "battalions" && <><Shield className="w-5 h-5 text-primary" />גדודות ב{selectedRegion}</>}
            {viewLevel === "outposts" && <><Building2 className="w-5 h-5 text-primary" />מוצבים של {selectedBattalion}</>}
            {viewLevel === "interviews" && <><ClipboardCheck className="w-5 h-5 text-primary" />ראיונות במוצב {selectedOutpost}</>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewLevel === "regions" && renderRegionsView()}
          {viewLevel === "battalions" && renderBattalionsView()}
          {viewLevel === "outposts" && renderOutpostsView()}
          {viewLevel === "interviews" && renderInterviewsView()}
        </CardContent>
      </Card>

      {/* View Interview Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              פרטי ראיון
            </DialogTitle>
          </DialogHeader>
          
          {selectedInterview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">שם הנהג</p>
                  <p className="font-bold text-slate-800">{selectedInterview.driver_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">תאריך ראיון</p>
                  <p className="font-bold text-slate-800">{format(new Date(selectedInterview.interview_date), "dd/MM/yyyy")}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">גדוד</p>
                  <p className="font-bold text-slate-800">{selectedInterview.battalion}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">מוצב</p>
                  <p className="font-bold text-slate-800">{selectedInterview.outpost}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">גזרה</p>
                  <p className="font-bold text-slate-800">{selectedInterview.region}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">מראיין</p>
                  <p className="font-bold text-slate-800">{selectedInterview.interviewer_name}</p>
                </div>
              </div>

              {selectedInterview.license_type && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">סוג רישיון</p>
                  <p className="font-medium text-slate-700">{selectedInterview.license_type}</p>
                </div>
              )}

              {selectedInterview.permits && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">היתרים</p>
                  <p className="font-medium text-slate-700">{selectedInterview.permits}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedInterview.civilian_license_expiry && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">תוקף רישיון אזרחי</p>
                    <p className="font-medium text-slate-700">{format(new Date(selectedInterview.civilian_license_expiry), "dd/MM/yyyy")}</p>
                  </div>
                )}
                {selectedInterview.military_license_expiry && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">תוקף רישיון צבאי</p>
                    <p className="font-medium text-slate-700">{format(new Date(selectedInterview.military_license_expiry), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">נהיגה מונעת</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedInterview.defensive_driving_passed ? (
                    <Badge className="bg-emerald-500">עבר</Badge>
                  ) : (
                    <Badge variant="destructive">לא עבר</Badge>
                  )}
                </div>
              </div>

              {selectedInterview.military_accidents && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-600">תאונות צבאיות</p>
                  <p className="font-medium text-amber-800">{selectedInterview.military_accidents}</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-bold mb-2">מצב משפחתי ורקע כללי</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-blue-500">מצב משפחתי:</p>
                    <p className="font-medium text-blue-800">{selectedInterview.family_status || "לא צוין"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500">מצב כלכלי:</p>
                    <p className="font-medium text-blue-800">{selectedInterview.financial_status || "לא צוין"}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">הערות נוספות</p>
                <p className="font-medium text-slate-700">{selectedInterview.additional_notes || "אין הערות"}</p>
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary font-bold">סיכום המראיין</p>
                <p className="font-medium text-slate-700 mt-1">{selectedInterview.interviewer_summary || "לא הוזן סיכום"}</p>
              </div>

              {selectedInterview.signature && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500 mb-2">חתימה</p>
                  <img 
                    src={selectedInterview.signature} 
                    alt="חתימה"
                    className="max-h-20 border rounded bg-white"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק את הראיון?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הראיון של {interviewToDelete?.driver_name} לצמיתות ולא ניתן יהיה לשחזר אותו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInterview} className="bg-red-600 hover:bg-red-700">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}