import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit, Car, Shield, AlertTriangle, TrendingUp, FileSpreadsheet, Filter, Eye } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { StorageImage } from '@/components/shared/StorageImage';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { REGIONS, OUTPOSTS } from '@/lib/constants';

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface SectorEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  video_url: string | null;
  file_url: string | null;
  event_date: string | null;
  latitude: number | null;
  longitude: number | null;
  event_type: string | null;
  driver_type: string | null;
  region: string | null;
  outpost: string | null;
  soldier_id: string | null;
  driver_name: string | null;
  vehicle_number: string | null;
  severity: string | null;
  soldiers?: Soldier;
}

type DriverType = 'security' | 'combat';
type Severity = 'minor' | 'moderate' | 'severe';
type IncidentType = 'accident' | 'stuck' | 'other';

const driverTypeLabels: Record<DriverType, string> = {
  security: 'נהג בט"ש',
  combat: 'נהג גדוד'
};

const severityLabels: Record<string, string> = {
  minor: 'קל',
  moderate: 'בינוני',
  severe: 'חמור'
};

const severityColors: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800'
};

const incidentTypeLabels: Record<IncidentType, string> = {
  accident: 'תאונה',
  stuck: 'התחפרות',
  other: 'אחר'
};

const incidentTypeColors: Record<string, string> = {
  accident: 'bg-red-100 text-red-800',
  stuck: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800'
};

const AccidentsTracking = () => {
  const { isAdmin, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SectorEvent | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [viewDetailEvent, setViewDetailEvent] = useState<SectorEvent | null>(null);
  
  // Filters
  const [filterDriverType, setFilterDriverType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterIncidentType, setFilterIncidentType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_type: 'accident' as IncidentType,
    driver_type: 'security' as DriverType,
    soldier_id: '',
    driver_name: '',
    vehicle_number: '',
    severity: 'minor' as Severity,
    region: '',
    outpost: '',
    image_url: '',
    video_url: '',
    file_url: '',
    latitude: '',
    longitude: '',
  });

  // Fetch soldiers
  const { data: soldiers = [] } = useQuery({
    queryKey: ['soldiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soldiers')
        .select('id, full_name, personal_number')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Soldier[];
    }
  });

  // Fetch sector events from safety_content
  const { data: sectorEvents = [], isLoading } = useQuery({
    queryKey: ['sector-events-for-accidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_content')
        .select('*, soldiers(id, full_name, personal_number)')
        .eq('category', 'sector_events')
        .order('event_date', { ascending: false });
      if (error) throw error;
      return (data || []) as SectorEvent[];
    }
  });

  // Add event mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData = {
        category: 'sector_events',
        title: data.title,
        description: data.description || null,
        event_date: data.event_date || null,
        event_type: data.event_type,
        driver_type: data.driver_type,
        soldier_id: data.driver_type === 'security' ? data.soldier_id : null,
        driver_name: data.driver_type === 'combat' ? (data.driver_name || null) : null,
        vehicle_number: data.vehicle_number || null,
        severity: data.severity,
        region: data.region || null,
        outpost: data.outpost || null,
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        file_url: data.file_url || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
      };
      const { error } = await supabase.from('safety_content').insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sector-events-for-accidents'] });
      queryClient.invalidateQueries({ queryKey: ['safety-content'] });
      toast.success('האירוע נוסף בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('שגיאה בהוספת האירוע')
  });

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const updateData = {
        title: data.title,
        description: data.description || null,
        event_date: data.event_date || null,
        event_type: data.event_type,
        driver_type: data.driver_type,
        soldier_id: data.driver_type === 'security' ? data.soldier_id : null,
        driver_name: data.driver_type === 'combat' ? (data.driver_name || null) : null,
        vehicle_number: data.vehicle_number || null,
        severity: data.severity,
        region: data.region || null,
        outpost: data.outpost || null,
        image_url: data.image_url || null,
        video_url: data.video_url || null,
        file_url: data.file_url || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
      };
      const { error } = await supabase
        .from('safety_content')
        .update(updateData)
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sector-events-for-accidents'] });
      queryClient.invalidateQueries({ queryKey: ['safety-content'] });
      toast.success('האירוע עודכן בהצלחה');
      setEditingEvent(null);
      resetForm();
    },
    onError: () => toast.error('שגיאה בעדכון האירוע')
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('safety_content').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sector-events-for-accidents'] });
      queryClient.invalidateQueries({ queryKey: ['safety-content'] });
      toast.success('האירוע נמחק בהצלחה');
    },
    onError: () => toast.error('שגיאה במחיקת האירוע')
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: format(new Date(), 'yyyy-MM-dd'),
      event_type: 'accident',
      driver_type: 'security',
      soldier_id: '',
      driver_name: '',
      vehicle_number: '',
      severity: 'minor',
      region: '',
      outpost: '',
      image_url: '',
      video_url: '',
      file_url: '',
      latitude: '',
      longitude: '',
    });
  };

  const openEditDialog = (event: SectorEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || format(new Date(), 'yyyy-MM-dd'),
      event_type: (event.event_type as IncidentType) || 'accident',
      driver_type: (event.driver_type as DriverType) || 'security',
      soldier_id: event.soldier_id || '',
      driver_name: event.driver_name || '',
      vehicle_number: event.vehicle_number || '',
      severity: (event.severity as Severity) || 'minor',
      region: event.region || '',
      outpost: event.outpost || '',
      image_url: event.image_url || '',
      video_url: event.video_url || '',
      file_url: event.file_url || '',
      latitude: event.latitude?.toString() || '',
      longitude: event.longitude?.toString() || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('יש להזין כותרת');
      return;
    }
    
    if (formData.driver_type === 'security' && !formData.soldier_id) {
      toast.error('יש לבחור חייל');
      return;
    }
    
    if (editingEvent) {
      updateMutation.mutate({ ...formData, id: editingEvent.id });
    } else {
      addMutation.mutate(formData);
    }
  };

  // Get driver name for display
  const getDriverName = (event: SectorEvent): string => {
    if (event.driver_type === 'security' && event.soldiers) {
      return event.soldiers.full_name;
    }
    if (event.driver_type === 'combat' && event.driver_name) {
      return event.driver_name;
    }
    return 'לא הוזן';
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return sectorEvents.filter(e => {
      if (filterDriverType !== 'all' && e.driver_type !== filterDriverType) return false;
      if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
      if (filterIncidentType !== 'all' && e.event_type !== filterIncidentType) return false;
      if (filterDateFrom && e.event_date && e.event_date < filterDateFrom) return false;
      if (filterDateTo && e.event_date && e.event_date > filterDateTo) return false;
      return true;
    });
  }, [sectorEvents, filterDriverType, filterSeverity, filterIncidentType, filterDateFrom, filterDateTo]);

  // Calculate statistics
  const stats = useMemo(() => {
    const securityCount = filteredEvents.filter(e => e.driver_type === 'security').length;
    const combatCount = filteredEvents.filter(e => e.driver_type === 'combat').length;
    return {
      security: securityCount,
      combat: combatCount,
      total: securityCount + combatCount,
    };
  }, [filteredEvents]);

  // Calculate monthly trends (last 12 months)
  const monthlyTrends = useMemo(() => {
    const months: { month: string; security: number; combat: number; total: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MMM yy', { locale: he });
      
      const monthEvents = sectorEvents.filter(e => {
        if (!e.event_date) return false;
        const eventDate = parseISO(e.event_date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });
      
      const security = monthEvents.filter(e => e.driver_type === 'security').length;
      const combat = monthEvents.filter(e => e.driver_type === 'combat').length;
      
      months.push({
        month: monthLabel,
        security,
        combat,
        total: security + combat
      });
    }
    
    return months;
  }, [sectorEvents]);

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredEvents.map(event => ({
      'תאריך': event.event_date ? format(parseISO(event.event_date), 'dd/MM/yyyy') : '-',
      'שם נהג': getDriverName(event),
      'סוג נהג': event.driver_type ? driverTypeLabels[event.driver_type as DriverType] : '-',
      'סוג אירוע': event.event_type ? incidentTypeLabels[event.event_type as IncidentType] : '-',
      'חומרה': event.severity ? severityLabels[event.severity] : '-',
      'תיאור': event.title || '-',
      'מספר רכב': event.vehicle_number || '-',
      'גזרה': event.region || '-',
      'מוצב': event.outpost || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'אירועי בטיחות');
    XLSX.writeFile(wb, `מעקב_תאונות_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('הקובץ יוצא בהצלחה');
  };

  const clearFilters = () => {
    setFilterDriverType('all');
    setFilterSeverity('all');
    setFilterIncidentType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>כותרת האירוע *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
          placeholder="תיאור קצר של האירוע"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>תאריך</Label>
          <Input
            type="date"
            value={formData.event_date}
            onChange={(e) => setFormData(p => ({ ...p, event_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>סוג אירוע</Label>
          <Select value={formData.event_type} onValueChange={(v: IncidentType) => setFormData(p => ({ ...p, event_type: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accident">תאונה</SelectItem>
              <SelectItem value="stuck">התחפרות</SelectItem>
              <SelectItem value="other">אחר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>סוג נהג *</Label>
          <Select 
            value={formData.driver_type} 
            onValueChange={(v: DriverType) => setFormData(p => ({ ...p, driver_type: v, soldier_id: '', driver_name: '' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="security">נהג בט"ש</SelectItem>
              <SelectItem value="combat">נהג גדוד</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>חומרה</Label>
          <Select value={formData.severity} onValueChange={(v: Severity) => setFormData(p => ({ ...p, severity: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minor">קל</SelectItem>
              <SelectItem value="moderate">בינוני</SelectItem>
              <SelectItem value="severe">חמור</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formData.driver_type === 'security' ? (
        <div className="space-y-2">
          <Label>בחר חייל (מהרשימה) *</Label>
          <Select value={formData.soldier_id} onValueChange={(v) => setFormData(p => ({ ...p, soldier_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="בחר חייל" />
            </SelectTrigger>
            <SelectContent>
              {soldiers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.personal_number})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>שם הנהג</Label>
          <Input
            value={formData.driver_name}
            onChange={(e) => setFormData(p => ({ ...p, driver_name: e.target.value }))}
            placeholder="הזן שם נהג גדוד"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>מספר רכב</Label>
          <Input
            value={formData.vehicle_number}
            onChange={(e) => setFormData(p => ({ ...p, vehicle_number: e.target.value }))}
            placeholder="מספר רכב"
          />
        </div>
        <div className="space-y-2">
          <Label>גזרה</Label>
          <Select value={formData.region} onValueChange={(v) => setFormData(p => ({ ...p, region: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="בחר גזרה" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>מוצב</Label>
        <Select value={formData.outpost} onValueChange={(v) => setFormData(p => ({ ...p, outpost: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="בחר מוצב" />
          </SelectTrigger>
          <SelectContent>
            {OUTPOSTS.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>תיאור מפורט</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
          placeholder="תיאור מפורט של האירוע"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={addMutation.isPending || updateMutation.isPending}>
        {editingEvent ? 'עדכון אירוע' : 'הוסף אירוע'}
      </Button>
    </form>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeader
          icon={Car}
          title="מעקב תאונות"
          subtitle="ניהול ומעקב אירועי בטיחות בגזרה"
          badge="מעקב תאונות"
        />
        
        <div className="flex flex-wrap gap-2 w-full justify-end">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex-shrink-0">
              <Filter className="ml-2 h-4 w-4" /> סינון
            </Button>
            <Button variant="outline" onClick={exportToExcel} className="flex-shrink-0">
              <FileSpreadsheet className="ml-2 h-4 w-4" /> ייצוא
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="flex-shrink-0"><Plus className="ml-2 h-4 w-4" /> הוסף אירוע</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>הוספת אירוע חדש</DialogTitle>
                </DialogHeader>
                {formContent}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-800">סינון מתקדם</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">סוג אירוע</Label>
                  <Select value={filterIncidentType} onValueChange={setFilterIncidentType}>
                    <SelectTrigger className="bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="accident" className="text-slate-700">תאונות</SelectItem>
                      <SelectItem value="stuck" className="text-slate-700">התחפרויות</SelectItem>
                      <SelectItem value="other" className="text-slate-700">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">סוג נהג</Label>
                  <Select value={filterDriverType} onValueChange={setFilterDriverType}>
                    <SelectTrigger className="bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="security" className="text-slate-700">נהגי בט"ש</SelectItem>
                      <SelectItem value="combat" className="text-slate-700">נהגי גדוד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">חומרה</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="minor" className="text-slate-700">קל</SelectItem>
                      <SelectItem value="moderate" className="text-slate-700">בינוני</SelectItem>
                      <SelectItem value="severe" className="text-slate-700">חמור</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">מתאריך</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="bg-white text-slate-700 border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">עד תאריך</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="bg-white text-slate-700 border-slate-300"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    נקה סינון
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">נהגי בט"ש</CardTitle>
              <Shield className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.security}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">נהגי גדוד</CardTitle>
              <Car className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.combat}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">סה"כ</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>מגמות חודשיות (12 חודשים אחרונים)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="security" name='נהגי בט"ש' stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="combat" name="נהגי גדוד" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" name="סה״כ" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>רשימת אירועים ({filteredEvents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">טוען...</p>
            ) : filteredEvents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">לא נמצאו אירועים</p>
            ) : (
              <div className="max-h-[65vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תאריך</TableHead>
                      <TableHead>שם נהג</TableHead>
                      <TableHead>סוג נהג</TableHead>
                      <TableHead>סוג אירוע</TableHead>
                      <TableHead>חומרה</TableHead>
                      <TableHead>תיאור</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          {event.event_date ? format(parseISO(event.event_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{getDriverName(event)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${event.driver_type === 'security' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {event.driver_type ? driverTypeLabels[event.driver_type as DriverType] : 'לא הוזן'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${incidentTypeColors[event.event_type || 'other']}`}>
                            {incidentTypeLabels[(event.event_type as IncidentType) || 'other']}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${severityColors[event.severity || 'minor']}`}>
                            {severityLabels[event.severity || 'minor']}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{event.title}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setViewDetailEvent(event)}
                              title="צפייה"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(event)}
                              title="עריכה"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEventToDelete(event.id);
                                  setDeleteConfirmOpen(true);
                                }}
                                title="מחיקה"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
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

        {/* Edit Dialog */}
        <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) { setEditingEvent(null); resetForm(); } }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>עריכת אירוע</DialogTitle>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>

        {/* View Detail Dialog */}
        <Dialog open={!!viewDetailEvent} onOpenChange={(open) => { if (!open) setViewDetailEvent(null); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            {viewDetailEvent && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    {viewDetailEvent.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">תאריך</p>
                      <p className="font-medium">
                        {viewDetailEvent.event_date ? format(parseISO(viewDetailEvent.event_date), 'dd/MM/yyyy') : 'לא הוזן'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">שם נהג</p>
                      <p className="font-medium">{getDriverName(viewDetailEvent)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">סוג אירוע</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${incidentTypeColors[viewDetailEvent.event_type || 'other']}`}>
                        {incidentTypeLabels[(viewDetailEvent.event_type as IncidentType) || 'other']}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">חומרה</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${severityColors[viewDetailEvent.severity || 'minor']}`}>
                        {severityLabels[viewDetailEvent.severity || 'minor']}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">סוג נהג</p>
                      <p className="font-medium">
                        {viewDetailEvent.driver_type ? driverTypeLabels[viewDetailEvent.driver_type as DriverType] : 'לא הוזן'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">מספר רכב</p>
                      <p className="font-medium">{viewDetailEvent.vehicle_number || 'לא הוזן'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">גזרה</p>
                      <p className="font-medium">{viewDetailEvent.region || 'לא הוזן'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">מוצב</p>
                      <p className="font-medium">{viewDetailEvent.outpost || 'לא הוזן'}</p>
                    </div>
                  </div>
                  
                  {viewDetailEvent.description && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">תיאור מפורט</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                        {viewDetailEvent.description}
                      </p>
                    </div>
                  )}
                  
                  {viewDetailEvent.image_url && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-2">תמונה</p>
                      <StorageImage
                        src={viewDetailEvent.image_url}
                        alt={viewDetailEvent.title}
                        className="w-full rounded-lg max-h-64 object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={() => {
                        openEditDialog(viewDetailEvent);
                        setViewDetailEvent(null);
                      }}
                      className="flex-1"
                    >
                      <Edit className="ml-2 h-4 w-4" />
                      עריכה
                    </Button>
                    {canDelete && (
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          setEventToDelete(viewDetailEvent.id);
                          setDeleteConfirmOpen(true);
                          setViewDetailEvent(null);
                        }}
                        className="flex-1"
                      >
                        <Trash2 className="ml-2 h-4 w-4" />
                        מחיקה
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="מחיקת אירוע"
          description="האם אתה בטוח שברצונך למחוק אירוע זה? פעולה זו אינה ניתנת לביטול."
          onConfirm={() => {
            if (eventToDelete) {
              deleteMutation.mutate(eventToDelete);
            }
            setDeleteConfirmOpen(false);
            setEventToDelete(null);
            return Promise.resolve();
          }}
        />
      </div>
    </AppLayout>
  );
};

export default AccidentsTracking;