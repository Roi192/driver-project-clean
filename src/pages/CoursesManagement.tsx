import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval } from "date-fns";
import { he } from "date-fns/locale";
import { 
  GraduationCap, 
  Plus, 
  Calendar as CalendarIcon, 
  Users, 
  Trash2, 
  Edit,
  BookOpen,
  UserCheck,
  Clock,
  AlertCircle
} from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string | null;
  duration_days: number | null;
  category: string | null;
  is_active: boolean | null;
  created_at: string;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
}

interface SoldierCourse {
  id: string;
  soldier_id: string;
  course_id: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  soldiers?: Soldier;
  courses?: { id: string; name: string; category: string };
}

// רשימת הקורסים העיקריים - קורסי רכב
const MAIN_COURSES = ["משא כבד", "משא", "דוד", "סוואנה", "טיגריס", "פנתר"];

const CoursesManagement = () => {
  const { brigade, isDivisionAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [soldierCourses, setSoldierCourses] = useState<SoldierCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form state for courses
  const [courseForm, setCourseForm] = useState({
    name: "",
    description: "",
    duration_days: 1,
    category: "vehicle",
  });

  // Form state for enrollment
  const [enrollForm, setEnrollForm] = useState({
    soldier_id: "",
    course_id: "",
    start_date: new Date(),
    end_date: new Date(),
    notes: "",
  });
  
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [brigade, isDivisionAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let coursesQuery = supabase.from("courses").select("*").order("name");
      let soldiersQuery = supabase.from("soldiers").select("id, full_name, personal_number, outpost").eq("is_active", true);
      let enrollmentsQuery = supabase.from("soldier_courses").select(`
          *,
          soldiers(id, full_name, personal_number, outpost),
          courses(id, name, category)
        `).order("start_date", { ascending: false });

      if (!isDivisionAdmin && brigade) {
        coursesQuery = coursesQuery.eq("brigade", brigade);
        soldiersQuery = soldiersQuery.eq("brigade", brigade);
        enrollmentsQuery = enrollmentsQuery.eq("brigade", brigade);
      }

      const [coursesRes, soldiersRes, enrollmentsRes] = await Promise.all([
        coursesQuery,
        soldiersQuery,
        enrollmentsQuery,
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (soldiersRes.data) setSoldiers(soldiersRes.data);
      if (enrollmentsRes.data) setSoldierCourses(enrollmentsRes.data as SoldierCourse[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name.trim()) {
      toast.error("יש להזין שם קורס");
      return;
    }

    try {
      if (editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update({
            name: courseForm.name,
            description: courseForm.description || null,
            duration_days: courseForm.duration_days,
            category: courseForm.category,
          })
          .eq("id", editingCourse.id);

        if (error) throw error;
        toast.success("הקורס עודכן בהצלחה");
      } else {
        const { error } = await supabase.from("courses").insert({
          name: courseForm.name,
          description: courseForm.description || null,
          duration_days: courseForm.duration_days,
          category: courseForm.category,
          brigade: brigade || "binyamin",
        });

        if (error) throw error;
        toast.success("הקורס נוסף בהצלחה");
      }

      setCourseDialogOpen(false);
      setEditingCourse(null);
      setCourseForm({ name: "", description: "", duration_days: 1, category: "vehicle" });
      fetchData();
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("שגיאה בשמירת הקורס");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("האם למחוק את הקורס?")) return;

    try {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);
      if (error) throw error;
      toast.success("הקורס נמחק");
      fetchData();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("שגיאה במחיקת הקורס");
    }
  };

  const handleEnrollSoldier = async () => {
    if (!enrollForm.soldier_id || !enrollForm.course_id) {
      toast.error("יש לבחור חייל וקורס");
      return;
    }

    if (enrollForm.start_date > enrollForm.end_date) {
      toast.error("תאריך התחלה חייב להיות לפני תאריך סיום");
      return;
    }

    try {
      const { error } = await supabase.from("soldier_courses").insert({
        soldier_id: enrollForm.soldier_id,
        course_id: enrollForm.course_id,
        start_date: format(enrollForm.start_date, "yyyy-MM-dd"),
        end_date: format(enrollForm.end_date, "yyyy-MM-dd"),
        status: "in_progress",
        notes: enrollForm.notes || null,
        brigade: brigade || "binyamin",
      });

      if (error) throw error;
      toast.success("החייל נרשם לקורס בהצלחה. הנוכחות תעודכן אוטומטית.");
      setEnrollDialogOpen(false);
      setEnrollForm({
        soldier_id: "",
        course_id: "",
        start_date: new Date(),
        end_date: new Date(),
        notes: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error enrolling soldier:", error);
      toast.error("שגיאה ברישום לקורס");
    }
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("soldier_courses")
        .update({ status })
        .eq("id", enrollmentId);

      if (error) throw error;
      toast.success("הסטטוס עודכן");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("שגיאה בעדכון הסטטוס");
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!confirm("האם למחוק את הרישום לקורס?")) return;

    try {
      const { error } = await supabase.from("soldier_courses").delete().eq("id", enrollmentId);
      if (error) throw error;
      toast.success("הרישום נמחק");
      fetchData();
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      toast.error("שגיאה במחיקת הרישום");
    }
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      description: course.description || "",
      duration_days: course.duration_days || 1,
      category: course.category ?? "",
    });
    setCourseDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-blue-500/20 text-blue-400">בקורס</Badge>;
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-400">הושלם</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400">בוטל</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get soldiers currently in course
  const activeCourses = soldierCourses.filter((sc) => {
    const today = new Date();
    const start = parseISO(sc.start_date);
    const end = parseISO(sc.end_date);
    return sc.status === "in_progress" && isWithinInterval(today, { start, end });
  });

  // Main courses vs custom courses
  const mainCourses = courses.filter(c => MAIN_COURSES.includes(c.name));
  const customCourses = courses.filter(c => !MAIN_COURSES.includes(c.name));

  return (
    <AppLayout>
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <PageHeader
          title="ניהול קורסים"
          subtitle="רישום חיילים לקורסים - הנוכחות מתעדכנת אוטומטית"
          icon={GraduationCap}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setEnrollDialogOpen(true)}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
          >
            <UserCheck className="w-4 h-4 ml-2" />
            רשום חייל לקורס
          </Button>
          <Button
            onClick={() => {
              setEditingCourse(null);
              setCourseForm({ name: "", description: "", duration_days: 1, category: "vehicle" });
              setCourseDialogOpen(true);
            }}
            variant="outline"
            className="border-primary/30 text-primary"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף קורס חדש
          </Button>
        </div>

        {/* Active Courses Alert */}
        {activeCourses.length > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-400 flex items-center gap-2 text-lg">
                <AlertCircle className="w-5 h-5" />
                חיילים בקורסים כרגע ({activeCourses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {activeCourses.map((sc) => (
                  <Badge key={sc.id} className="bg-amber-500/20 text-amber-300 text-sm py-1">
                    {sc.soldiers?.full_name} - {sc.courses?.name}
                    <span className="mr-2 opacity-70">
                      (עד {format(parseISO(sc.end_date), "dd/MM/yyyy")})
                    </span>
                  </Badge>
                ))}
              </div>
              <p className="text-amber-300/70 text-sm mt-3">
                💡 החיילים הללו יסומנו אוטומטית כ"בקורס" בכל מופעי תוכנית העבודה ומעקב הנוכחות בטווח התאריכים.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="enrollments" dir="rtl" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted">
            <TabsTrigger value="enrollments" className="text-slate-700 data-[state=active]:text-foreground">
              <Users className="w-4 h-4 ml-2" />
              חיילים בקורסים
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-slate-700 data-[state=active]:text-foreground">
              <BookOpen className="w-4 h-4 ml-2" />
              רשימת קורסים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="enrollments" className="mt-4">
            <Card className="bg-white border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Users className="w-5 h-5 text-emerald-600" />
                  רישומים לקורסים ({soldierCourses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {soldierCourses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>אין חיילים רשומים לקורסים</p>
                    <Button
                      variant="link"
                      onClick={() => setEnrollDialogOpen(true)}
                      className="text-primary mt-2"
                    >
                      רשום חייל לקורס
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-muted/50">
                          <TableHead className="text-right text-slate-700">חייל</TableHead>
                          <TableHead className="text-right text-slate-700">קורס</TableHead>
                          <TableHead className="text-right text-slate-700">תאריך התחלה</TableHead>
                          <TableHead className="text-right text-slate-700">תאריך סיום</TableHead>
                          <TableHead className="text-right text-slate-700">סטטוס</TableHead>
                          <TableHead className="text-right text-slate-700">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {soldierCourses.map((sc) => (
                          <TableRow key={sc.id} className="border-border/50 hover:bg-muted/30">
                            <TableCell className="font-medium text-slate-800">
                              {sc.soldiers?.full_name || "-"}
                            </TableCell>
                            <TableCell className="text-slate-700">{sc.courses?.name || "-"}</TableCell>
                            <TableCell className="text-slate-700">
                              {format(parseISO(sc.start_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-slate-700">
                              {format(parseISO(sc.end_date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell>{getStatusBadge(sc.status)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Select
                                  value={sc.status}
                                  onValueChange={(val) => handleUpdateEnrollmentStatus(sc.id, val)}
                                >
                                  <SelectTrigger className="w-24 h-8 text-xs bg-white text-slate-700 border-border">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-border">
                                    <SelectItem value="in_progress" className="text-slate-700">בקורס</SelectItem>
                                    <SelectItem value="completed" className="text-slate-700">הושלם</SelectItem>
                                    <SelectItem value="cancelled" className="text-slate-700">בוטל</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300 h-8 w-8"
                                  onClick={() => handleDeleteEnrollment(sc.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="mt-4 space-y-4">
            {/* Main Vehicle Courses */}
            <Card className="bg-white border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <BookOpen className="w-5 h-5 text-primary" />
                  קורסי רכב ({mainCourses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {mainCourses.map((course) => (
                    <div
                      key={course.id}
                      className="p-4 bg-muted/50 rounded-xl border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg text-slate-800">{course.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditCourse(course)}
                          className="h-7 w-7 text-slate-600 hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="w-3 h-3" />
                        {course.duration_days || "-"} ימים
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Courses */}
            {customCourses.length > 0 && (
              <Card className="bg-white border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Plus className="w-5 h-5 text-amber-600" />
                    קורסים נוספים ({customCourses.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border bg-muted/50">
                          <TableHead className="text-right text-slate-700">שם הקורס</TableHead>
                          <TableHead className="text-right text-slate-700">משך (ימים)</TableHead>
                          <TableHead className="text-right text-slate-700">תיאור</TableHead>
                          <TableHead className="text-right text-slate-700">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customCourses.map((course) => (
                          <TableRow key={course.id} className="border-border/50 hover:bg-muted/30">
                            <TableCell className="font-medium text-slate-800">{course.name}</TableCell>
                            <TableCell className="text-slate-700">{course.duration_days || "-"}</TableCell>
                            <TableCell className="text-slate-600 max-w-xs truncate">
                              {course.description || "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditCourse(course)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300"
                                  onClick={() => handleDeleteCourse(course.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add/Edit Course Dialog */}
        <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
          <DialogContent className="bg-white border-border max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <BookOpen className="w-5 h-5 text-primary" />
                {editingCourse ? "עריכת קורס" : "הוספת קורס חדש"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-700">שם הקורס *</Label>
                <Input
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="לדוגמה: קורס הנדסה"
                  className="bg-white text-slate-800 border-border"
                />
              </div>

              <div>
                <Label className="text-slate-700">משך הקורס (ימים)</Label>
                <Input
                  type="number"
                  min={1}
                  value={courseForm.duration_days}
                  onChange={(e) => setCourseForm({ ...courseForm, duration_days: parseInt(e.target.value) || 1 })}
                  className="bg-white text-slate-800 border-border"
                />
              </div>

              <div>
                <Label className="text-slate-700">תיאור</Label>
                <Textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="תיאור הקורס..."
                  className="bg-white text-slate-800 border-border"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setCourseDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveCourse}>
                {editingCourse ? "עדכון" : "הוספה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enroll Soldier Dialog */}
        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogContent className="bg-white border-border max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                רישום חייל לקורס
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-700">בחר חייל *</Label>
                <Select
                  value={enrollForm.soldier_id}
                  onValueChange={(val) => setEnrollForm({ ...enrollForm, soldier_id: val })}
                >
                  <SelectTrigger className="bg-white text-slate-800 border-border">
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border">
                    {soldiers.map((soldier) => (
                      <SelectItem key={soldier.id} value={soldier.id} className="text-slate-700">
                        {soldier.full_name} ({soldier.personal_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700">בחר קורס *</Label>
                <Select
                  value={enrollForm.course_id}
                  onValueChange={(val) => setEnrollForm({ ...enrollForm, course_id: val })}
                >
                  <SelectTrigger className="bg-white text-slate-800 border-border">
                    <SelectValue placeholder="בחר קורס" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border">
                    {/* Show only vehicle courses (MAIN_COURSES) and custom courses */}
                    {courses
                      .filter((course) => 
                        MAIN_COURSES.includes(course.name) || 
                        !["מכונאות בסיסית", "נהיגה מונעת", "נהיגה מתקדמת", "עזרה ראשונה", "רענון"].includes(course.name)
                      )
                      .map((course) => (
                        <SelectItem key={course.id} value={course.id} className="text-slate-700">
                          {course.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך התחלה *</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-right"
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {format(enrollForm.start_date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={enrollForm.start_date}
                        onSelect={(date) => {
                          if (date) {
                            setEnrollForm({ ...enrollForm, start_date: date });
                            setStartDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>תאריך סיום *</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-right"
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {format(enrollForm.end_date, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={enrollForm.end_date}
                        onSelect={(date) => {
                          if (date) {
                            setEnrollForm({ ...enrollForm, end_date: date });
                            setEndDateOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={enrollForm.notes}
                  onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                />
              </div>

              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-sm text-blue-300">
                  💡 לאחר הרישום, החייל יסומן אוטומטית כ"קורס" בכל מופעי תוכנית העבודה ומעקב הנוכחות בטווח התאריכים שנבחר.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setEnrollDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleEnrollSoldier} className="bg-emerald-500 hover:bg-emerald-600">
                רישום לקורס
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CoursesManagement;