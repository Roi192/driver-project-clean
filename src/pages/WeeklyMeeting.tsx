import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Calendar, Users, Heart, Shield, Clock, FileText, Lock, AlertTriangle, LayoutDashboard } from "lucide-react";
import { REGIONS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useWeeklyMeeting, useCommanderSchedule, useMPNotesStatus } from "@/hooks/useWeeklyMeeting";
import { startOfWeek, addWeeks, format } from "date-fns";
import { he } from "date-fns/locale";

// Import sub-components
import { ManpowerSection } from "@/components/weekly-meeting/ManpowerSection";
import { FitnessSection } from "@/components/weekly-meeting/FitnessSection";
import { SafetySection } from "@/components/weekly-meeting/SafetySection";
import { ScheduleSection } from "@/components/weekly-meeting/ScheduleSection";
import { CommanderSummarySection } from "@/components/weekly-meeting/CommanderSummarySection";
import { ClosingSection } from "@/components/weekly-meeting/ClosingSection";
import { CommanderPrivateSchedule } from "@/components/weekly-meeting/CommanderPrivateSchedule";
import { ConcernsSection } from "@/components/weekly-meeting/ConcernsSection";
import { MPConsolidatedView } from "@/components/weekly-meeting/MPConsolidatedView";

const SUB_TAB_ICONS = [
  { id: "manpower", icon: Users, label: "כח אדם" },
  { id: "fitness", icon: Heart, label: "כשירות" },
  { id: "safety", icon: Shield, label: "בטיחות" },
  { id: "concerns", icon: AlertTriangle, label: "חששות" },
  { id: "schedule", icon: Clock, label: "לוז" },
  { id: "summary", icon: FileText, label: "סיכום" },
];

export default function WeeklyMeeting() {
  const { isAdmin, isPlatoonCommander } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [activeTab, setActiveTab] = useState("opening");
  const [activeSubTab, setActiveSubTab] = useState("manpower");
  const [viewMode, setViewMode] = useState<"mm" | "mp">(isAdmin ? "mp" : "mm");
  
  const contentRef = useRef<HTMLDivElement>(null);

  const weeklyMeeting = useWeeklyMeeting(selectedWeek, selectedRegion);
  const commanderSchedule = useCommanderSchedule(selectedWeek);
  const mpNotesStatus = useMPNotesStatus(selectedWeek);
  
  // Lock schedule for MM if MP notes exist (and user is not admin)
  const isScheduleLocked = !isAdmin && mpNotesStatus.hasNotes;

  const handlePrevWeek = () => setSelectedWeek(prev => addWeeks(prev, -1));
  const handleNextWeek = () => setSelectedWeek(prev => addWeeks(prev, 1));

  const endOfWeekDate = addWeeks(selectedWeek, 1);
  const weekRangeLabel = `${format(selectedWeek, "dd/MM", { locale: he })} - ${format(endOfWeekDate, "dd/MM", { locale: he })}`;

  const handleSubTabChange = (tabId: string) => {
    setActiveSubTab(tabId);
    contentRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24">
        <PageHeader
          title="פתיחת שבוע"
          subtitle="ניהול ישיבות פתיחה וסיכום שבועיות"
        />

        <div className="p-4 space-y-4">
          {/* Week Navigation */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-sm text-slate-500">שבוע</p>
                <p className="font-bold text-lg text-slate-800">{weekRangeLabel}</p>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* View Mode Toggle - Only for Admin (MP role) */}
          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "mm" | "mp")} className="w-full">
                <TabsList className="w-full grid grid-cols-2 bg-slate-100 rounded-xl">
                  <TabsTrigger value="mp" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-600 rounded-lg">
                    <LayoutDashboard className="w-4 h-4" />
                    תצוגת מ"פ
                  </TabsTrigger>
                  <TabsTrigger value="mm" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm text-slate-600 rounded-lg">
                    <Users className="w-4 h-4" />
                    תצוגת מ"מ
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* MP View - Only visible for Admin role */}
          {isAdmin && viewMode === "mp" && (
            <div className="space-y-4">
              {/* Main tabs for MP */}
              <Tabs defaultValue="consolidated" className="space-y-4">
                <TabsList className="w-full grid grid-cols-2 h-auto p-1 bg-slate-100 rounded-xl">
                  <TabsTrigger value="consolidated" className="py-3 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-700">
                    <div className="flex flex-col items-center gap-1">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>סקירה מ"מים</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="private" className="py-3 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-700">
                    <div className="flex flex-col items-center gap-1">
                      <Lock className="w-4 h-4" />
                      <span>לוז מ"פ פרטי</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consolidated">
                  <MPConsolidatedView weekStart={selectedWeek} />
                </TabsContent>

                <TabsContent value="private">
                  <CommanderPrivateSchedule 
                    schedule={commanderSchedule.schedule}
                    onAdd={commanderSchedule.addItem}
                    onUpdate={commanderSchedule.updateItem}
                    onDelete={commanderSchedule.deleteItem}
                    isLoading={commanderSchedule.isLoading}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* MP Consolidated View */}
          {isAdmin && viewMode === "mp" && (
            <div className="space-y-4">
              {/* Main tabs for MP */}
              <Tabs defaultValue="consolidated" className="space-y-4">
                <TabsList className="w-full grid grid-cols-2 h-auto p-1 bg-slate-100 rounded-xl">
                  <TabsTrigger value="consolidated" className="py-3 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-700">
                    <div className="flex flex-col items-center gap-1">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>סקירה מ"מים</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="private" className="py-3 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-800 text-slate-700">
                    <div className="flex flex-col items-center gap-1">
                      <Lock className="w-4 h-4" />
                      <span>לוז מ"פ פרטי</span>
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consolidated">
                  <MPConsolidatedView weekStart={selectedWeek} />
                </TabsContent>

                <TabsContent value="private">
                  <CommanderPrivateSchedule 
                    schedule={commanderSchedule.schedule}
                    onAdd={commanderSchedule.addItem}
                    onUpdate={commanderSchedule.updateItem}
                    onDelete={commanderSchedule.deleteItem}
                    isLoading={commanderSchedule.isLoading}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* MM View - for Platoon Commanders directly, or Admin when in MM mode */}
          {(isPlatoonCommander || (isAdmin && viewMode === "mm")) && (
            <>
              {/* Region Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <label className="block text-sm font-medium text-slate-700 mb-2">בחר גזרה</label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full bg-white text-slate-800 border-slate-300">
                    <SelectValue placeholder="בחר גזרה..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {REGIONS.map((region) => (
                      <SelectItem key={region} value={region} className="text-slate-800">
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRegion && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="w-full grid grid-cols-2 h-auto p-1 bg-slate-100 rounded-xl">
                    <TabsTrigger value="opening" className="py-3 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm rounded-lg text-slate-700">
                      <div className="flex flex-col items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>פתיחת שבוע</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="closing" className="py-3 text-xs data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm rounded-lg text-slate-700">
                      <div className="flex flex-col items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>סיכום שבוע</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  {/* Opening Meeting Tab */}
                  <TabsContent value="opening" className="space-y-4 mt-4">
                    {/* Sub-tabs navigation buttons */}
                    <div className="grid grid-cols-6 gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      {SUB_TAB_ICONS.map(({ id, icon: Icon, label }) => (
                        <Button
                          key={id}
                          variant={activeSubTab === id ? "default" : "ghost"}
                          size="sm"
                          className={`flex flex-col items-center gap-1 h-auto py-2 px-1 ${
                            activeSubTab === id 
                              ? "bg-primary text-primary-foreground" 
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                          onClick={() => handleSubTabChange(id)}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] leading-tight">{label}</span>
                        </Button>
                      ))}
                    </div>

                    {/* Content area */}
                    <div ref={contentRef}>
                      {activeSubTab === "manpower" && (
                        <ManpowerSection 
                          region={selectedRegion}
                          manpower={weeklyMeeting.manpower}
                          onAdd={weeklyMeeting.addManpower}
                          onUpdate={weeklyMeeting.updateManpower}
                          onDelete={weeklyMeeting.deleteManpower}
                          isLoading={weeklyMeeting.isLoading}
                        />
                      )}

                      {activeSubTab === "fitness" && (
                        <FitnessSection 
                          region={selectedRegion}
                          fitnessIssues={weeklyMeeting.fitnessIssues}
                          manpower={weeklyMeeting.manpower}
                          onAdd={weeklyMeeting.addFitnessIssue}
                          onToggleResolved={weeklyMeeting.toggleFitnessResolved}
                          isLoading={weeklyMeeting.isLoading}
                        />
                      )}

                      {activeSubTab === "safety" && (
                        <SafetySection 
                          region={selectedRegion}
                          activities={weeklyMeeting.safetyActivities}
                          onAdd={weeklyMeeting.addSafetyActivity}
                          onUpdate={weeklyMeeting.updateSafetyActivity}
                          isLoading={weeklyMeeting.isLoading}
                        />
                      )}

                      {activeSubTab === "concerns" && (
                        <ConcernsSection 
                          weeklyOpeningId={weeklyMeeting.weeklyOpening?.id}
                          concerns={weeklyMeeting.weeklyOpening?.concerns || ""}
                          needsCommanderHelp={weeklyMeeting.weeklyOpening?.needs_commander_help || false}
                          commanderHelpDescription={weeklyMeeting.weeklyOpening?.commander_help_description || ""}
                          onSave={weeklyMeeting.saveConcerns}
                          isLoading={weeklyMeeting.isLoading}
                        />
                      )}

                      {activeSubTab === "schedule" && (
                        <ScheduleSection 
                          schedule={weeklyMeeting.schedule}
                          onAdd={weeklyMeeting.addScheduleItem}
                          onUpdate={weeklyMeeting.updateScheduleItem}
                          onDelete={weeklyMeeting.deleteScheduleItem}
                          isLoading={weeklyMeeting.isLoading}
                          isLocked={isScheduleLocked}
                        />
                      )}

                      {activeSubTab === "summary" && (
                        <CommanderSummarySection 
                          summary={weeklyMeeting.commanderSummary}
                          onSave={weeklyMeeting.saveCommanderSummary}
                          isAdmin={isAdmin}
                          weekStart={selectedWeek}
                        />
                      )}
                    </div>
                  </TabsContent>

                  {/* Closing Tab */}
                  <TabsContent value="closing" className="mt-4">
                    <ClosingSection 
                      closing={weeklyMeeting.closing}
                      weeklyOpeningId={weeklyMeeting.weeklyOpening?.id}
                      schedule={weeklyMeeting.schedule}
                      safetyActivities={weeklyMeeting.safetyActivities}
                      fitnessIssues={weeklyMeeting.fitnessIssues}
                      onSave={weeklyMeeting.saveClosing}
                      isLoading={weeklyMeeting.isLoading}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {!selectedRegion && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                  <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">בחר גזרה כדי להציג את פרטי הישיבה</p>
                </div>
              )}

              {/* Bottom Quick Navigation */}
              {selectedRegion && activeTab === "opening" && (
                <div className="fixed bottom-20 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg p-2 z-40">
                  <div className="flex justify-around">
                    {SUB_TAB_ICONS.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${
                          activeSubTab === id 
                            ? "bg-primary text-primary-foreground" 
                            : "text-slate-500 hover:bg-slate-100"
                        }`}
                        onClick={() => handleSubTabChange(id)}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[9px]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}