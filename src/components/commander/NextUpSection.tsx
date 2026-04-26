import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  ChevronLeft, 
  Clock, 
  Users,
  ClipboardList,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  event_date: string;
  category: string | null;
  status: string;
  description: string | null;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  status: string;
  assigned_to: string;
}

export function NextUpSection() {
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const today = new Date();

    try {
      // Fetch next upcoming event
      const { data: events } = await supabase
        .from('work_plan_events')
        .select('id, title, event_date, category, status, description')
        .gte('event_date', today.toISOString().split('T')[0])
        .eq('status', 'pending')
        .order('event_date', { ascending: true })
        .limit(1);

      if (events && events.length > 0) {
        setNextEvent(events[0]);
      }

      // Fetch pending tasks
      const { data: tasks } = await supabase
        .from('bom_tasks')
        .select('id, title, due_date, status, assigned_to')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(3);

      if (tasks) {
        setPendingTasks(tasks);
      }

    } catch (error) {
      console.error('Error fetching next up data:', error);
    }

    setIsLoading(false);
  };

  const getCategoryLabel = (category: string | null) => {
    switch (category) {
      case 'platoon': return 'כנס פלוגתי';
      case 'training': return 'אימון';
      case 'range': return 'מטווח';
      case 'drill': return 'תרגיל';
      default: return 'אירוע';
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'platoon': return 'bg-primary/10 text-primary border-primary/30';
      case 'training': return 'bg-accent/10 text-amber-700 border-accent/30';
      case 'range': return 'bg-danger/10 text-danger border-danger/30';
      case 'drill': return 'bg-success/10 text-success border-success/30';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-slate-200/50 rounded-2xl animate-pulse" />
        <div className="h-24 bg-slate-200/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Next Event Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800">הבא בתור</h2>
            <p className="text-sm text-slate-500">המופע הקרוב בלוח</p>
          </div>
        </div>

        {nextEvent ? (
          <div className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm border border-accent/30 p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5" />
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={cn(
                    "inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border",
                    getCategoryColor(nextEvent.category)
                  )}>
                    {getCategoryLabel(nextEvent.category)}
                  </span>
                  <h3 className="font-bold text-lg text-slate-800 mt-2">
                    {nextEvent.title}
                  </h3>
                </div>
                <Zap className="w-6 h-6 text-accent" />
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(parseISO(nextEvent.event_date), 'EEEE, d בMMMM', { locale: he })}
                  </span>
                </div>
              </div>

              {nextEvent.description && (
                <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                  {nextEvent.description}
                </p>
              )}

              <Link to="/attendance-tracking" className="block">
                <Button className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all">
                  <Users className="w-4 h-4" />
                  פתח נוכחות
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-100/80 border border-slate-200 p-5 text-center">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 font-medium">אין מופעים קרובים</p>
            <Link to="/annual-work-plan">
              <Button variant="ghost" size="sm" className="mt-2 gap-1">
                צור מופע חדש
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Pending Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-800">משימות פתוחות</h2>
              <p className="text-sm text-slate-500">{pendingTasks.length} משימות ממתינות</p>
            </div>
          </div>
          <Link to="/bom-report">
            <Button variant="ghost" size="sm" className="gap-1 text-primary">
              הכל
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {pendingTasks.length > 0 ? (
          <div className="space-y-2">
            {pendingTasks.map((task, index) => {
              const dueDate = parseISO(task.due_date);
              const isOverdue = isAfter(new Date(), dueDate);
              const isDueSoon = !isOverdue && isAfter(addDays(new Date(), 3), dueDate);
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "group relative overflow-hidden rounded-xl bg-white/80 backdrop-blur-sm",
                    "border p-4 transition-all duration-300 hover:shadow-md",
                    isOverdue ? "border-danger/30" : isDueSoon ? "border-warning/30" : "border-slate-200"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isOverdue ? "bg-danger/10" : isDueSoon ? "bg-warning/10" : "bg-primary/10"
                    )}>
                      <CheckCircle2 className={cn(
                        "w-4 h-4",
                        isOverdue ? "text-danger" : isDueSoon ? "text-warning" : "text-primary"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{task.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{task.assigned_to}</span>
                        <span>•</span>
                        <span className={cn(
                          isOverdue ? "text-danger font-medium" : isDueSoon ? "text-warning font-medium" : ""
                        )}>
                          {isOverdue ? 'באיחור' : format(dueDate, 'd/M', { locale: he })}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-success font-medium">אין משימות פתוחות</p>
          </div>
        )}
      </div>
    </div>
  );
}