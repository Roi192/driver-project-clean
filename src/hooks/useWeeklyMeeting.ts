import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';

export interface WeeklyOpening {
  id: string;
  week_start_date: string;
  region: string;
  commander_id: string | null;
  created_at: string;
  concerns: string | null;
  needs_commander_help: boolean | null;
  commander_help_description: string | null;
}

export interface WeeklyManpower {
  id: string;
  weekly_opening_id: string;
  soldier_id: string;
  status: string;
  absence_reason: string | null;
  notes: string | null;
  soldier?: { full_name: string; personal_number: string };
}

export interface WeeklyFitnessIssue {
  id: string;
  weekly_opening_id: string;
  soldier_id: string;
  issue_type: string;
  issue_details: string | null;
  resolved: boolean;
  soldier?: { full_name: string; personal_number: string };
}

export interface WeeklySafetyActivity {
  id: string;
  weekly_opening_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  soldier_id: string | null;
  needs_commander_help: boolean;
  commander_help_type: string | null;
  planned_date: string | null;
  completed: boolean;
  soldier?: { full_name: string } | null;
}

export interface WeeklyScheduleItem {
  id: string;
  weekly_opening_id: string;
  schedule_type: string;
  title: string;
  description: string | null;
  scheduled_day: number;
  scheduled_time: string | null;
  end_time?: string | null;
  completed: boolean;
}

export interface WeeklyClosing {
  id: string;
  weekly_opening_id: string;
  planning_vs_execution: string | null;
  unresolved_deviations: string | null;
  safety_events_summary: string | null;
  discipline_events_summary: string | null;
  commander_notes: string | null;
  created_at: string;
}

export interface CommanderSummary {
  id: string;
  weekly_opening_id: string;
  summary_text: string | null;
  action_items: string | null;
  created_at: string;
}

export function useWeeklyMeeting(selectedWeekStart?: Date, selectedRegion?: string) {
  const { user } = useAuth();
  const [weeklyOpening, setWeeklyOpening] = useState<WeeklyOpening | null>(null);
  const [manpower, setManpower] = useState<WeeklyManpower[]>([]);
  const [fitnessIssues, setFitnessIssues] = useState<WeeklyFitnessIssue[]>([]);
  const [safetyActivities, setSafetyActivities] = useState<WeeklySafetyActivity[]>([]);
  const [schedule, setSchedule] = useState<WeeklyScheduleItem[]>([]);
  const [closing, setClosing] = useState<WeeklyClosing | null>(null);
  const [commanderSummary, setCommanderSummary] = useState<CommanderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = selectedWeekStart || startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');

  const fetchOrCreateWeeklyOpening = async () => {
    if (!selectedRegion) return null;

    // Try to find existing
    const { data: existing } = await supabase
      .from('weekly_openings')
      .select('*')
      .eq('week_start_date', weekStartFormatted)
      .eq('region', selectedRegion)
      .maybeSingle();

    if (existing) return existing;

    // Create new
    const { data: created, error } = await supabase
      .from('weekly_openings')
      .insert({
        week_start_date: weekStartFormatted,
        region: selectedRegion,
        commander_id: user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating weekly opening:', error);
      return null;
    }

    return created;
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    
    const opening = await fetchOrCreateWeeklyOpening();
    if (!opening) {
      setIsLoading(false);
      return;
    }
    
    setWeeklyOpening(opening);

    // Fetch all related data in parallel
    const [manpowerRes, fitnessRes, safetyRes, scheduleRes, closingRes, summaryRes] = await Promise.all([
      supabase
        .from('weekly_manpower')
        .select('*, soldier:soldiers(full_name, personal_number)')
        .eq('weekly_opening_id', opening.id),
      supabase
        .from('weekly_fitness_issues')
        .select('*, soldier:soldiers(full_name, personal_number)')
        .eq('weekly_opening_id', opening.id),
      supabase
        .from('weekly_safety_activities')
        .select('*, soldier:soldiers(full_name)')
        .eq('weekly_opening_id', opening.id),
      supabase
        .from('weekly_schedule')
        .select('*')
        .eq('weekly_opening_id', opening.id)
        .order('scheduled_day'),
      supabase
        .from('weekly_closings')
        .select('*')
        .eq('weekly_opening_id', opening.id)
        .maybeSingle(),
      supabase
        .from('weekly_commander_summary')
        .select('*')
        .eq('weekly_opening_id', opening.id)
        .maybeSingle()
    ]);

    setManpower(manpowerRes.data || []);
    setFitnessIssues(fitnessRes.data || []);
    setSafetyActivities(safetyRes.data || []);
    setSchedule(scheduleRes.data || []);
    setClosing(closingRes.data);
    setCommanderSummary(summaryRes.data);
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedRegion) {
      fetchAllData();
    }
  }, [weekStartFormatted, selectedRegion, user?.id]);

  // CRUD operations
  const addManpower = async (soldierId: string, status: string, reason?: string, notes?: string) => {
    if (!weeklyOpening) return;
    const { data, error } = await supabase
      .from('weekly_manpower')
      .insert({
        weekly_opening_id: weeklyOpening.id,
        soldier_id: soldierId,
        status,
        absence_reason: reason,
        notes
      })
      .select('*, soldier:soldiers(full_name, personal_number)')
      .single();
    
    if (!error && data) {
      setManpower(prev => [...prev, data]);
    }
    return { data, error };
  };

  const updateManpower = async (id: string, updates: Partial<WeeklyManpower>) => {
    const { error } = await supabase
      .from('weekly_manpower')
      .update(updates)
      .eq('id', id);
    
    if (!error) {
      setManpower(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    }
    return { error };
  };

  const deleteManpower = async (id: string) => {
    const { error } = await supabase
      .from('weekly_manpower')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setManpower(prev => prev.filter(m => m.id !== id));
    }
    return { error };
  };

  const addFitnessIssue = async (soldierId: string, issueType: string, details?: string) => {
    if (!weeklyOpening) return;
    const { data, error } = await supabase
      .from('weekly_fitness_issues')
      .insert({
        weekly_opening_id: weeklyOpening.id,
        soldier_id: soldierId,
        issue_type: issueType,
        issue_details: details
      })
      .select('*, soldier:soldiers(full_name, personal_number)')
      .single();
    
    if (!error && data) {
      setFitnessIssues(prev => [...prev, data]);
    }
    return { data, error };
  };

  const toggleFitnessResolved = async (id: string, resolved: boolean) => {
    const { error } = await supabase
      .from('weekly_fitness_issues')
      .update({ resolved })
      .eq('id', id);
    
    if (!error) {
      setFitnessIssues(prev => prev.map(f => f.id === id ? { ...f, resolved } : f));
    }
    return { error };
  };

  const addSafetyActivity = async (activity: Omit<WeeklySafetyActivity, 'id' | 'weekly_opening_id' | 'soldier'>) => {
    if (!weeklyOpening) return;
    const { data, error } = await supabase
      .from('weekly_safety_activities')
      .insert({
        ...activity,
        weekly_opening_id: weeklyOpening.id
      })
      .select('*, soldier:soldiers(full_name)')
      .single();
    
    if (!error && data) {
      setSafetyActivities(prev => [...prev, data]);
    }
    return { data, error };
  };

  const updateSafetyActivity = async (id: string, updates: Partial<WeeklySafetyActivity>) => {
    const { error } = await supabase
      .from('weekly_safety_activities')
      .update(updates)
      .eq('id', id);
    
    if (!error) {
      setSafetyActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }
    return { error };
  };

  const addScheduleItem = async (item: Omit<WeeklyScheduleItem, 'id' | 'weekly_opening_id'>) => {
    if (!weeklyOpening) return;
    const { data, error } = await supabase
      .from('weekly_schedule')
      .insert({
        ...item,
        weekly_opening_id: weeklyOpening.id
      })
      .select()
      .single();
    
    if (!error && data) {
      setSchedule(prev => [...prev, data].sort((a, b) => a.scheduled_day - b.scheduled_day));
    }
    return { data, error };
  };

  const updateScheduleItem = async (id: string, updates: Partial<WeeklyScheduleItem>) => {
    const { error } = await supabase
      .from('weekly_schedule')
      .update(updates)
      .eq('id', id);
    
    if (!error) {
      setSchedule(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
    return { error };
  };

  const deleteScheduleItem = async (id: string) => {
    const { error } = await supabase
      .from('weekly_schedule')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setSchedule(prev => prev.filter(s => s.id !== id));
    }
    return { error };
  };

  const saveCommanderSummary = async (summaryText: string, actionItems: string) => {
    if (!weeklyOpening) return;
    
    if (commanderSummary) {
      const { error } = await supabase
        .from('weekly_commander_summary')
        .update({ summary_text: summaryText, action_items: actionItems, updated_at: new Date().toISOString() })
        .eq('id', commanderSummary.id);
      
      if (!error) {
        setCommanderSummary(prev => prev ? { ...prev, summary_text: summaryText, action_items: actionItems } : null);
      }
      return { error };
    } else {
      const { data, error } = await supabase
        .from('weekly_commander_summary')
        .insert({
          weekly_opening_id: weeklyOpening.id,
          summary_text: summaryText,
          action_items: actionItems,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (!error && data) {
        setCommanderSummary(data);
      }
      return { data, error };
    }
  };

  const saveClosing = async (closingData: Omit<WeeklyClosing, 'id' | 'weekly_opening_id' | 'created_at'>) => {
    if (!weeklyOpening) return;
    
    if (closing) {
      const { error } = await supabase
        .from('weekly_closings')
        .update({ ...closingData, updated_at: new Date().toISOString() })
        .eq('id', closing.id);
      
      if (!error) {
        setClosing(prev => prev ? { ...prev, ...closingData } : null);
      }
      return { error };
    } else {
      const { data, error } = await supabase
        .from('weekly_closings')
        .insert({
          ...closingData,
          weekly_opening_id: weeklyOpening.id,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (!error && data) {
        setClosing(data);
      }
      return { data, error };
    }
  };

  const saveConcerns = async (concerns: string, needsHelp: boolean, helpDescription: string) => {
    if (!weeklyOpening) return { error: new Error("No weekly opening") };
    
    const { error } = await supabase
      .from('weekly_openings')
      .update({ 
        concerns, 
        needs_commander_help: needsHelp, 
        commander_help_description: helpDescription,
        updated_at: new Date().toISOString() 
      })
      .eq('id', weeklyOpening.id);
    
    if (!error) {
      setWeeklyOpening(prev => prev ? { 
        ...prev, 
        concerns, 
        needs_commander_help: needsHelp, 
        commander_help_description: helpDescription 
      } : null);
    }
    return { error };
  };

  return {
    weeklyOpening,
    manpower,
    fitnessIssues,
    safetyActivities,
    schedule,
    closing,
    commanderSummary,
    isLoading,
    refetch: fetchAllData,
    // CRUD operations
    addManpower,
    updateManpower,
    deleteManpower,
    addFitnessIssue,
    toggleFitnessResolved,
    addSafetyActivity,
    updateSafetyActivity,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    saveCommanderSummary,
    saveClosing,
    saveConcerns
  };
}

// Hook for commander's private schedule
export function useCommanderSchedule(selectedWeekStart?: Date) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = selectedWeekStart || startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');

  const fetchSchedule = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('commander_weekly_schedule')
      .select('*')
      .eq('week_start_date', weekStartFormatted)
      .eq('commander_id', user.id)
      .order('scheduled_day');

    if (!error) {
      setSchedule(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSchedule();
  }, [weekStartFormatted, user?.id]);

  const addItem = async (item: { scheduled_day: number; scheduled_time?: string; title: string; description?: string }) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('commander_weekly_schedule')
      .insert({
        ...item,
        week_start_date: weekStartFormatted,
        commander_id: user.id
      })
      .select()
      .single();

    if (!error && data) {
      setSchedule(prev => [...prev, data].sort((a, b) => a.scheduled_day - b.scheduled_day));
    }
    return { data, error };
  };

  const updateItem = async (id: string, updates: any) => {
    const { error } = await supabase
      .from('commander_weekly_schedule')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      setSchedule(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
    return { error };
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('commander_weekly_schedule')
      .delete()
      .eq('id', id);

    if (!error) {
      setSchedule(prev => prev.filter(s => s.id !== id));
    }
    return { error };
  };

  return {
    schedule,
    isLoading,
    refetch: fetchSchedule,
    addItem,
    updateItem,
    deleteItem
  };
}

// Hook to check if MP notes exist for a week (for locking schedule)
export function useMPNotesStatus(selectedWeekStart?: Date) {
  const [hasNotes, setHasNotes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = selectedWeekStart || startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekStartFormatted = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    const checkNotes = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('mp_weekly_notes' as any)
        .select('id, general_notes, region_emphases')
        .eq('week_start_date', weekStartFormatted)
        .maybeSingle();

      // Consider notes exist if there's either general_notes or any region emphases
      const hasContent = data && (
        ((data as any).general_notes && (data as any).general_notes.trim() !== '') ||
        ((data as any).region_emphases && Object.keys((data as any).region_emphases).length > 0)
      );
      
      setHasNotes(!!hasContent);
      setIsLoading(false);
    };

    checkNotes();
  }, [weekStartFormatted]);

  return { hasNotes, isLoading };
}

// Helper to get day name in Hebrew
export const getDayName = (dayIndex: number): string => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[dayIndex] || '';
};