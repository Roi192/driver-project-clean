import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, Polygon, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { REGIONS, REGION_OUTPOSTS, OUTPOSTS, getRegionFromOutpost } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { 
  Map, 
  Flame, 
  AlertTriangle, 
  Plus,
  ArrowRight,
  X,
  Crosshair,
  Trash2,
  Route,
  Pencil,
  Search,
  Star,
  MapPinned,
  MapPin,
  Building2,
  Layers,
  Navigation,
  Target,
  Shield,
  Eye,
  EyeOff,
  LocateFixed,
  Maximize2,
  Filter,
  ChevronLeft,
  List
} from "lucide-react";

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create custom icons
// Outpost icon - small house/building style
const createOutpostIcon = () => {
  return L.divIcon({
    className: "outpost-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border-radius: 6px;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1">
          <path d="M3 21h18v-9l-9-7-9 7v9z"/>
          <path d="M9 21v-6h6v6"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Event icon - car crash/accident style
const createEventIcon = () => {
  return L.divIcon({
    className: "event-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
      ">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          background: rgba(239, 68, 68, 0.3);
          border-radius: 50%;
          animation: eventPulse 2s infinite;
        "></div>
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Heatmap event icon - styled crash/accident marker
const createHeatmapEventIcon = () => {
  return L.divIcon({
    className: "heatmap-event-marker",
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
      ">
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          animation: heatPulse 1.5s infinite;
        "></div>
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #fbbf24 0%, #ef4444 50%, #dc2626 100%);
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 12px rgba(239, 68, 68, 0.6);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createRoutePointIcon = (index: number) => {
  return L.divIcon({
    className: "route-point-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-radius: 50%;
        color: white;
        font-size: 12px;
        font-weight: bold;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">${index + 1}</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: "user-location-marker",
    html: `
      <div style="position: relative;">
        <div style="
          width: 20px;
          height: 20px;
          background: #3b82f6;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 0 2px #3b82f6, 0 4px 12px rgba(59, 130, 246, 0.5);
        "></div>
        <div style="
          position: absolute;
          top: -8px;
          left: -8px;
          width: 36px;
          height: 36px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

interface MapPoint {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  point_type: string;
  severity: string | null;
  is_active: boolean;
}

interface SafetyEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  outpost: string | null;
  event_type: string | null;
  driver_type: string | null;
  image_url: string | null;
}

interface DangerousRoute {
  id: string;
  name: string;
  description: string | null;
  route_points: Array<{ lat: number; lng: number }>;
  severity: string;
  danger_type: string | null;
  is_active: boolean;
}

interface SectorBoundary {
  id: string;
  name: string;
  description: string | null;
  boundary_points: Array<{ lat: number; lng: number }>;
  color: string;
  is_active: boolean;
}

interface SafetyFile {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  category: "vardim" | "vulnerability" | "parsa";
  outpost: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
}

interface ClickPosition {
  lat: number;
  lng: number;
}

// Safety file icons
const createVardimIcon = () => {
  return L.divIcon({
    className: "vardim-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="10" r="3"/>
          <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createVulnerabilityIcon = () => {
  return L.divIcon({
    className: "vulnerability-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        border-radius: 6px;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(245, 158, 11, 0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createParsaIcon = () => {
  return L.divIcon({
    className: "parsa-marker",
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component to fly to a specific location
const FlyToLocation = ({ position, zoom }: { position: [number, number] | null; zoom?: number }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom || 14, { duration: 1 });
    }
  }, [map, position, zoom]);
  
  return null;
};

// Heat layer component - 50m red center, 100m yellow/green outer
const HeatLayer = ({ points }: { points: Array<[number, number, number]> }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    if (points.length > 0) {
      // @ts-ignore
      heatLayerRef.current = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 18,
        max: 1.0,
        minOpacity: 0.6,
        gradient: {
          0.0: 'rgba(34, 197, 94, 0.7)',
          0.3: 'rgba(132, 204, 22, 0.8)',
          0.5: 'rgba(234, 179, 8, 0.9)',
          0.7: 'rgba(249, 115, 22, 0.95)',
          0.85: 'rgba(239, 68, 68, 1)',
          1.0: 'rgba(185, 28, 28, 1)'
        }
      }).addTo(map);
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points]);

  return null;
};

// Map click handler
const MapClickHandler = ({ onMapClick, enabled }: { onMapClick: (pos: ClickPosition) => void; enabled: boolean }) => {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

// Helper to parse route_points
const parseRoutePoints = (points: any): Array<{ lat: number; lng: number }> => {
  if (!points) return [];
  if (Array.isArray(points)) return points;
  if (typeof points === 'string') {
    try {
      return JSON.parse(points);
    } catch {
      return [];
    }
  }
  return [];
};

const KnowTheArea = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, canEdit, canDelete } = useUserRole();
  const mapRef = useRef<L.Map | null>(null);
  
  // Data states
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [dangerousRoutes, setDangerousRoutes] = useState<DangerousRoute[]>([]);
  const [sectorBoundaries, setSectorBoundaries] = useState<SectorBoundary[]>([]);
  const [safetyFiles, setSafetyFiles] = useState<SafetyFile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User location
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);
  
  // View/Filter states
  const [viewMode, setViewMode] = useState<"map" | "heatmap">("map");
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOutposts, setShowOutposts] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showVardim, setShowVardim] = useState(true);
  const [showVulnerability, setShowVulnerability] = useState(true);
  const [showParsa, setShowParsa] = useState(true);
  
  // Expanded list panel state
  const [expandedListPanel, setExpandedListPanel] = useState<"outposts" | "routes" | "events" | "safetyPoints" | null>(null);
  
  // Region filter states
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedOutpostFilter, setSelectedOutpostFilter] = useState<string>("all");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  
  // Map click context menu
  const [showMapClickMenu, setShowMapClickMenu] = useState(false);
  const [clickPosition, setClickPosition] = useState<ClickPosition | null>(null);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  
  // Route drawing states
  const [isDrawingRoute, setIsDrawingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<ClickPosition[]>([]);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  
  // Sector boundary drawing states
  const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<ClickPosition[]>([]);
  const [showBoundaryDialog, setShowBoundaryDialog] = useState(false);
  
  // Edit mode states
  const [editingRoute, setEditingRoute] = useState<DangerousRoute | null>(null);
  const [editingEvent, setEditingEvent] = useState<SafetyEvent | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    point_type: "outpost",
    severity: "medium",
  });
  
  const [routeFormData, setRouteFormData] = useState({
    name: "",
    description: "",
    severity: "high",
    danger_type: "general",
  });
  
  const [boundaryFormData, setBoundaryFormData] = useState({
    name: "",
    description: "",
    color: "#000000",
  });
  
  const [eventFormData, setEventFormData] = useState<Record<string, any>>({});
  const [soldiers, setSoldiers] = useState<{ id: string; full_name: string; personal_number: string }[]>([]);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  // Event types for the form
  const EVENT_TYPES = [
    { value: "accident", label: "תאונה" },
    { value: "stuck", label: "התחפרות" },
    { value: "other", label: "אחר" },
  ];

  const DRIVER_TYPES = [
    { value: "security", label: 'נהג בט"ש' },
    { value: "combat", label: "נהג גדוד" },
  ];

  const SEVERITY_TYPES = [
    { value: "minor", label: "קל" },
    { value: "moderate", label: "בינוני" },
    { value: "severe", label: "חמור" },
  ];

  // Field configuration for event form - matches SafetyEvents
  const getEventFields = (): FieldConfig[] => {
    return [
      { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
      { name: "event_date", label: "תאריך", type: "date", placeholder: "בחר תאריך" },
      { 
        name: "region", 
        label: "גזרה", 
        type: "select",
        options: REGIONS.map(r => ({ value: r, label: r })),
        placeholder: "בחר גזרה"
      },
      { 
        name: "outpost", 
        label: "מוצב", 
        type: "select",
        options: OUTPOSTS.map(o => ({ value: o, label: o })),
        placeholder: "בחר מוצב"
      },
      { 
        name: "event_type", 
        label: "סוג אירוע", 
        type: "select",
        options: EVENT_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר סוג אירוע"
      },
      { 
        name: "driver_type", 
        label: "סוג נהג", 
        type: "select",
        options: DRIVER_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר סוג נהג"
      },
      { 
        name: "soldier_id", 
        label: "בחר חייל", 
        type: "select",
        options: soldiers.map(s => ({ value: s.id, label: `${s.full_name} (${s.personal_number})` })),
        placeholder: "בחר חייל מהרשימה",
        dependsOn: { field: "driver_type", value: "security" }
      },
      { 
        name: "driver_name", 
        label: "שם הנהג", 
        type: "text",
        placeholder: "הזן שם נהג...",
        dependsOn: { field: "driver_type", value: "combat" }
      },
      { name: "vehicle_number", label: "מספר רכב צבאי", type: "text", placeholder: "הזן מספר רכב..." },
      { 
        name: "severity", 
        label: "חומרת האירוע", 
        type: "select",
        options: SEVERITY_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר חומרה"
      },
      { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט..." },
      { name: "image_url", label: "תמונה", type: "image" },
      { name: "map_picker", label: "דקירה במפה", type: "map_picker", latField: "latitude", lngField: "longitude" },
    ];
  };

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
        },
        (error) => {
          console.log("Location access denied or unavailable");
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSoldiers();
  }, []);

  const fetchSoldiers = async () => {
    const { data } = await supabase
      .from("soldiers")
      .select("id, full_name, personal_number")
      .eq("is_active", true)
      .order("full_name");
    if (data) setSoldiers(data);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [pointsRes, eventsRes, routesRes, boundariesRes, safetyFilesRes] = await Promise.all([
        supabase.from("map_points_of_interest").select("*").eq("is_active", true),
        supabase.from("safety_content")
          .select("*")
          .in("category", ["sector_events", "neighbor_events"])
          .not("latitude", "is", null)
          .order("event_date", { ascending: false })
          .limit(100),
        supabase.from("dangerous_routes").select("*").eq("is_active", true),
        supabase.from("sector_boundaries").select("*").eq("is_active", true),
        supabase.from("safety_files").select("*").not("latitude", "is", null),
      ]);
      
      if (pointsRes.data) setMapPoints(pointsRes.data);
      if (eventsRes.data) setSafetyEvents(eventsRes.data as SafetyEvent[]);
      if (routesRes.data) {
        const routes = routesRes.data.map((route: any) => ({
          ...route,
          route_points: parseRoutePoints(route.route_points),
        }));
        setDangerousRoutes(routes);
      }
      if (boundariesRes.data) {
        const boundaries = boundariesRes.data.map((b: any) => ({
          ...b,
          boundary_points: parseRoutePoints(b.boundary_points),
        }));
        setSectorBoundaries(boundaries);
      }
      if (safetyFilesRes.data) setSafetyFiles(safetyFilesRes.data as SafetyFile[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  // Get outposts available for the selected region
  const availableOutposts = useMemo(() => {
    if (selectedRegion === "all") return [];
    return REGION_OUTPOSTS[selectedRegion] || [];
  }, [selectedRegion]);

  // Helper to check if an outpost belongs to the selected region
  const matchesRegionFilter = (outpostName: string | null | undefined): boolean => {
    if (selectedRegion === "all") return true;
    if (!outpostName) return false;
    const regionOutposts = REGION_OUTPOSTS[selectedRegion] || [];
    if (selectedOutpostFilter !== "all") {
      return outpostName === selectedOutpostFilter;
    }
    return regionOutposts.includes(outpostName);
  };

  // Filtered data
  const filteredOutposts = useMemo(() => {
    return mapPoints
      .filter(p => p.point_type === "outpost" || p.point_type === "checkpoint")
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(p => matchesRegionFilter(p.name));
  }, [mapPoints, searchQuery, selectedRegion, selectedOutpostFilter]);

  // Helper to check if an event matches the region filter
  const matchesEventRegionFilter = (eventRegion: string | null | undefined): boolean => {
    if (selectedRegion === "all") return true;
    if (!eventRegion) return false;
    return eventRegion === selectedRegion;
  };

  const filteredEvents = useMemo(() => {
    return safetyEvents
      .filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .filter(e => matchesEventRegionFilter(e.region));
  }, [safetyEvents, searchQuery, selectedRegion]);

  const filteredRoutes = useMemo(() => {
    return dangerousRoutes.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [dangerousRoutes, searchQuery]);

  const eventsWithLocation = useMemo(() => {
    return filteredEvents.filter(e => e.latitude && e.longitude);
  }, [filteredEvents]);

  // Filtered safety files by category and region
  const filteredVardim = useMemo(() => {
    return safetyFiles
      .filter(f => f.category === "vardim" && f.latitude && f.longitude)
      .filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(f => matchesRegionFilter(f.outpost));
  }, [safetyFiles, searchQuery, selectedRegion, selectedOutpostFilter]);

  const filteredVulnerability = useMemo(() => {
    return safetyFiles
      .filter(f => f.category === "vulnerability" && f.latitude && f.longitude)
      .filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(f => matchesRegionFilter(f.outpost));
  }, [safetyFiles, searchQuery, selectedRegion, selectedOutpostFilter]);

  const filteredParsa = useMemo(() => {
    return safetyFiles
      .filter(f => f.category === "parsa" && f.latitude && f.longitude)
      .filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(f => matchesRegionFilter(f.outpost));
  }, [safetyFiles, searchQuery, selectedRegion, selectedOutpostFilter]);

  // Calculate center
  const outposts = mapPoints.filter(p => p.point_type === "outpost");
  const centerLat = userLocation ? userLocation[0] : 
    outposts.length > 0 ? outposts.reduce((sum, p) => sum + p.latitude, 0) / outposts.length : 31.9;
  const centerLng = userLocation ? userLocation[1] :
    outposts.length > 0 ? outposts.reduce((sum, p) => sum + p.longitude, 0) / outposts.length : 35.2;

  // Handlers
  const handleMapClick = (pos: ClickPosition) => {
    if (isDrawingRoute) {
      setRoutePoints(prev => [...prev, pos]);
    } else if (isDrawingBoundary) {
      setBoundaryPoints(prev => [...prev, pos]);
    } else if (isAdmin) {
      setClickPosition(pos);
      setShowMapClickMenu(true);
    }
  };

  const handleAddOutpostFromMenu = () => {
    setShowMapClickMenu(false);
    setShowAddDialog(true);
  };

  const handleAddEventFromMenu = () => {
    setShowMapClickMenu(false);
    if (clickPosition) {
      setEventFormData(prev => ({ 
        ...prev, 
        latitude: clickPosition.lat, 
        longitude: clickPosition.lng 
      }));
    }
    setShowAddEventDialog(true);
  };

  const handleFocusOnItem = (lat: number, lng: number) => {
    setFlyToPosition([lat, lng]);
    setTimeout(() => setFlyToPosition(null), 1500);
  };

  const handleFocusOnRoute = (route: DangerousRoute) => {
    if (route.route_points.length > 0) {
      const midIndex = Math.floor(route.route_points.length / 2);
      const midPoint = route.route_points[midIndex];
      handleFocusOnItem(midPoint.lat, midPoint.lng);
    }
  };

  const handleGoToUserLocation = () => {
    if (userLocation) {
      setFlyToPosition(userLocation);
      setTimeout(() => setFlyToPosition(null), 1500);
    } else {
      toast.error("לא ניתן לאתר את המיקום שלך");
    }
  };

  const handleStartDrawingRoute = () => {
    setIsDrawingRoute(true);
    setRoutePoints([]);
    toast.info("לחץ על המפה להוספת נקודות לציר");
  };

  const handleFinishDrawingRoute = () => {
    if (routePoints.length < 2) {
      toast.error("יש להוסיף לפחות 2 נקודות");
      return;
    }
    setIsDrawingRoute(false);
    setShowRouteDialog(true);
  };

  const handleCancelDrawingRoute = () => {
    setIsDrawingRoute(false);
    setRoutePoints([]);
  };

  const handleSaveRoute = async () => {
    if (!routeFormData.name.trim()) {
      toast.error("יש למלא את שם הציר");
      return;
    }

    try {
      const { error } = await supabase.from("dangerous_routes").insert([{
        name: routeFormData.name,
        description: routeFormData.description || null,
        route_points: JSON.stringify(routePoints),
        severity: routeFormData.severity,
        danger_type: routeFormData.danger_type,
        is_active: true,
        created_by: user?.id,
      }]);

      if (error) throw error;

      toast.success("הציר נוסף בהצלחה");
      setShowRouteDialog(false);
      setRoutePoints([]);
      setRouteFormData({ name: "", description: "", severity: "high", danger_type: "general" });
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בהוספת הציר");
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm("האם למחוק את הציר?")) return;
    try {
      const { error } = await supabase.from("dangerous_routes").delete().eq("id", id);
      if (error) throw error;
      toast.success("הציר נמחק");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleEditRoute = (route: DangerousRoute) => {
    setEditingRoute(route);
    setRouteFormData({
      name: route.name,
      description: route.description || "",
      severity: route.severity,
      danger_type: route.danger_type || "general",
    });
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute || !routeFormData.name.trim()) {
      toast.error("יש למלא את שם הציר");
      return;
    }
    try {
      const { error } = await supabase.from("dangerous_routes").update({
        name: routeFormData.name,
        description: routeFormData.description || null,
        severity: routeFormData.severity,
        danger_type: routeFormData.danger_type,
      }).eq("id", editingRoute.id);
      if (error) throw error;
      toast.success("הציר עודכן");
      setEditingRoute(null);
      setRouteFormData({ name: "", description: "", severity: "high", danger_type: "general" });
      fetchData();
    } catch (error) {
      toast.error("שגיאה בעדכון");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("האם למחוק את האירוע?")) return;
    try {
      const { error } = await supabase.from("safety_content").delete().eq("id", id);
      if (error) throw error;
      toast.success("האירוע נמחק");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleEditEvent = (event: SafetyEvent) => {
    setEditingEvent(event);
    setEventFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date || new Date().toISOString().split('T')[0],
      latitude: event.latitude,
      longitude: event.longitude,
      region: event.region || "",
      outpost: event.outpost || "",
      event_type: event.event_type || "",
      driver_type: event.driver_type || "",
      image_url: event.image_url || "",
    });
    setShowAddEventDialog(true);
  };

  const handleUpdateEvent = async (data: Record<string, any>) => {
    if (!editingEvent) return;
    setIsSubmittingEvent(true);
    
    let latitude = data.latitude ? parseFloat(data.latitude) : null;
    let longitude = data.longitude ? parseFloat(data.longitude) : null;
    
    if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      latitude = null;
    }
    if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      longitude = null;
    }
    
    try {
      const { error } = await supabase.from("safety_content").update({
        title: data.title,
        description: data.description || null,
        event_date: data.event_date || null,
        latitude,
        longitude,
        region: data.region || null,
        outpost: data.outpost || null,
        event_type: data.event_type || null,
        driver_type: data.driver_type || null,
        image_url: data.image_url || null,
      }).eq("id", editingEvent.id);
      
      if (error) throw error;
      toast.success("האירוע עודכן");
      setShowAddEventDialog(false);
      setEditingEvent(null);
      setEventFormData({});
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בעדכון");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleAddPoint = async () => {
    if (!clickPosition || !formData.name.trim()) {
      toast.error("יש למלא את שם הנקודה");
      return;
    }

    try {
      const { error } = await supabase.from("map_points_of_interest").insert({
        name: formData.name,
        description: formData.description || null,
        latitude: clickPosition.lat,
        longitude: clickPosition.lng,
        point_type: formData.point_type,
        severity: formData.point_type === "danger_zone" ? formData.severity : null,
        is_active: true,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("הנקודה נוספה בהצלחה");
      setShowAddDialog(false);
      setClickPosition(null);
      setFormData({ name: "", description: "", point_type: "outpost", severity: "medium" });
      fetchData();
    } catch (error) {
      toast.error("שגיאה בהוספה");
    }
  };

  const handleDeletePoint = async (id: string) => {
    try {
      const { error } = await supabase.from("map_points_of_interest").delete().eq("id", id);
      if (error) throw error;
      toast.success("נמחק בהצלחה");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  // Sector boundary handlers
  const handleStartDrawingBoundary = () => {
    setIsDrawingBoundary(true);
    setBoundaryPoints([]);
    toast.info("לחץ על המפה להוספת נקודות גבול");
  };

  const handleFinishDrawingBoundary = () => {
    if (boundaryPoints.length < 3) {
      toast.error("יש להוסיף לפחות 3 נקודות לגבול");
      return;
    }
    setIsDrawingBoundary(false);
    setShowBoundaryDialog(true);
  };

  const handleCancelDrawingBoundary = () => {
    setIsDrawingBoundary(false);
    setBoundaryPoints([]);
  };

  const handleSaveBoundary = async () => {
    if (!boundaryFormData.name.trim()) {
      toast.error("יש למלא את שם הגבול");
      return;
    }

    try {
      const { error } = await supabase.from("sector_boundaries").insert([{
        name: boundaryFormData.name,
        description: boundaryFormData.description || null,
        boundary_points: JSON.stringify(boundaryPoints),
        color: boundaryFormData.color,
        is_active: true,
        created_by: user?.id,
      }]);

      if (error) throw error;

      toast.success("גבול הגזרה נוסף בהצלחה");
      setShowBoundaryDialog(false);
      setBoundaryPoints([]);
      setBoundaryFormData({ name: "", description: "", color: "#000000" });
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בהוספת הגבול");
    }
  };

  const handleDeleteBoundary = async (id: string) => {
    try {
      const { error } = await supabase.from("sector_boundaries").delete().eq("id", id);
      if (error) throw error;
      toast.success("גבול הגזרה נמחק");
      fetchData();
    } catch (error) {
      toast.error("שגיאה במחיקה");
    }
  };

  // Add safety event handler - uses AddEditDialog onSubmit format
  const handleAddSafetyEvent = async (data: Record<string, any>) => {
    if (editingEvent) {
      await handleUpdateEvent(data);
      return;
    }
    
    if (!data.title?.trim()) {
      toast.error("יש למלא את כותרת האירוע");
      return;
    }

    setIsSubmittingEvent(true);
    
    let latitude = data.latitude ? parseFloat(data.latitude) : null;
    let longitude = data.longitude ? parseFloat(data.longitude) : null;
    
    if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
      latitude = null;
    }
    if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
      longitude = null;
    }

    try {
      const { error } = await supabase.from("safety_content").insert([{
        title: data.title,
        description: data.description || null,
        category: "sector_events", // Always save as sector_events for map display
        event_date: data.event_date || null,
        latitude,
        longitude,
        region: data.region || null,
        outpost: data.outpost || null,
        event_type: data.event_type || null,
        driver_type: data.driver_type || null,
        image_url: data.image_url || null,
      }]);

      if (error) throw error;

      toast.success("אירוע הבטיחות נוסף בהצלחה");
      setShowAddEventDialog(false);
      setEventFormData({});
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("שגיאה בהוספת האירוע");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const getEventTypeLabel = (eventType: string | null) => {
    const labels: Record<string, string> = {
      accident: "תאונה", 
      stuck: "התחפרות", 
      fire: "שריפה", 
      weapon: "נשק", 
      vehicle: "רכב", 
      other: "אחר"
    };
    return labels[eventType || "other"] || "אחר";
  };

  // Build heat map points - uses filtered events for region filtering
  const heatPoints = useMemo(() => {
    const points: Array<[number, number, number]> = [];
    const eventsWithCoords = filteredEvents.filter(e => e.latitude && e.longitude);
    
    eventsWithCoords.forEach(e => {
      if (e.latitude && e.longitude) {
        const nearbyCount = eventsWithCoords.filter(other => {
          if (!other.latitude || !other.longitude) return false;
          const latDiff = Math.abs(other.latitude - e.latitude!);
          const lngDiff = Math.abs(other.longitude - e.longitude!);
          return latDiff < 0.01 && lngDiff < 0.01;
        }).length;
        
        const intensity = nearbyCount >= 2 ? 1.0 : nearbyCount === 1 ? 0.5 : 0.25;
        points.push([e.latitude, e.longitude, intensity]);
      }
    });
    
    return points;
  }, [filteredEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <Map className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader 
          icon={Map}
          title="הכר את הגזרה"
          subtitle="מפה מבצעית - מוצבים, צירים ואירועים"
          badge="מודיעין גזרה"
        />

        <main className="pb-8">
      {/* Hero Stats Banner */}
        <div className="p-4">
          <div className="glass-card p-5 mb-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">סקירת גזרה</h2>
                  <p className="text-sm text-muted-foreground">מידע מבצעי בזמן אמת</p>
                </div>
              </div>
              {userLocation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGoToUserLocation}
                  className="gap-2 rounded-xl"
                >
                  <LocateFixed className="w-4 h-4" />
                  מיקומי
                </Button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button 
                onClick={() => setExpandedListPanel(expandedListPanel === "outposts" ? null : "outposts")}
                className={cn(
                  "text-center p-3 rounded-xl transition-all",
                  expandedListPanel === "outposts" 
                    ? "bg-amber-500/30 border-2 border-amber-500/50 ring-2 ring-amber-500/20" 
                    : "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
                )}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <div className="text-xl font-bold text-amber-700">{filteredOutposts.length}</div>
                <div className="text-[10px] text-amber-600/80 font-medium">מוצבים</div>
              </button>
              <button 
                onClick={() => setExpandedListPanel(expandedListPanel === "routes" ? null : "routes")}
                className={cn(
                  "text-center p-3 rounded-xl transition-all",
                  expandedListPanel === "routes" 
                    ? "bg-red-500/30 border-2 border-red-500/50 ring-2 ring-red-500/20" 
                    : "bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                )}
              >
                <Route className="w-5 h-5 mx-auto mb-1 text-red-600" />
                <div className="text-xl font-bold text-red-700">{filteredRoutes.length}</div>
                <div className="text-[10px] text-red-600/80 font-medium">צירים</div>
              </button>
              <button 
                onClick={() => setExpandedListPanel(expandedListPanel === "events" ? null : "events")}
                className={cn(
                  "text-center p-3 rounded-xl transition-all",
                  expandedListPanel === "events" 
                    ? "bg-orange-500/30 border-2 border-orange-500/50 ring-2 ring-orange-500/20" 
                    : "bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20"
                )}
              >
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <div className="text-xl font-bold text-orange-700">{eventsWithLocation.length}</div>
                <div className="text-[10px] text-orange-600/80 font-medium">אירועים</div>
              </button>
              <button 
                onClick={() => setExpandedListPanel(expandedListPanel === "safetyPoints" ? null : "safetyPoints")}
                className={cn(
                  "text-center p-3 rounded-xl transition-all",
                  expandedListPanel === "safetyPoints" 
                    ? "bg-purple-500/30 border-2 border-purple-500/50 ring-2 ring-purple-500/20" 
                    : "bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20"
                )}
              >
                <Shield className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <div className="text-xl font-bold text-purple-700">{filteredVardim.length + filteredVulnerability.length + filteredParsa.length}</div>
                <div className="text-[10px] text-purple-600/80 font-medium">נקודות</div>
              </button>
            </div>

            {/* Expanded List Panels */}
            {expandedListPanel === "outposts" && (
              <div className="mt-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    רשימת מוצבים ({filteredOutposts.length})
                  </h3>
                  {canEdit && (
                    <Button size="sm" className="gap-1 h-8" onClick={() => {
                      setClickPosition({ lat: centerLat, lng: centerLng });
                      setShowAddDialog(true);
                    }}>
                      <Plus className="w-4 h-4" />
                      הוסף
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredOutposts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">אין מוצבים להצגה</p>
                    ) : (
                      filteredOutposts.map((outpost) => (
                        <div 
                          key={outpost.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{outpost.name}</p>
                              {outpost.description && (
                                <p className="text-xs text-muted-foreground truncate">{outpost.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleFocusOnItem(outpost.latitude, outpost.longitude)}
                            >
                              <Target className="w-4 h-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeletePoint(outpost.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {expandedListPanel === "routes" && (
              <div className="mt-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Route className="w-4 h-4 text-red-600" />
                    רשימת צירים ({filteredRoutes.length})
                  </h3>
                  {canEdit && (
                    <Button size="sm" className="gap-1 h-8 bg-red-500 hover:bg-red-600" onClick={handleStartDrawingRoute}>
                      <Plus className="w-4 h-4" />
                      צייר ציר
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredRoutes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">אין צירים מסוכנים להצגה</p>
                    ) : (
                      filteredRoutes.map((route) => (
                        <div 
                          key={route.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                              <Route className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{route.name}</p>
                              {route.description && (
                                <p className="text-xs text-muted-foreground truncate">{route.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleFocusOnRoute(route)}
                            >
                              <Target className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditRoute(route)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteRoute(route.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {expandedListPanel === "events" && (
              <div className="mt-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    רשימת אירועים ({eventsWithLocation.length})
                  </h3>
                  {canEdit && (
                    <Button size="sm" className="gap-1 h-8 bg-orange-500 hover:bg-orange-600" onClick={() => {
                      setEventFormData({
                        title: "",
                        description: "",
                        category: "other",
                        event_date: new Date().toISOString().split('T')[0],
                        latitude: centerLat,
                        longitude: centerLng,
                      });
                      setShowAddEventDialog(true);
                    }}>
                      <Plus className="w-4 h-4" />
                      הוסף
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {eventsWithLocation.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">אין אירועים להצגה</p>
                    ) : (
                      eventsWithLocation.map((event) => (
                        <div 
                          key={event.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{event.title}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{getEventTypeLabel(event.event_type)}</span>
                                {event.event_date && <span>• {new Date(event.event_date).toLocaleDateString('he-IL')}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => event.latitude && event.longitude && handleFocusOnItem(event.latitude, event.longitude)}
                            >
                              <Target className="w-4 h-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditEvent(event)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {expandedListPanel === "safetyPoints" && (
              <div className="mt-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    נקודות מתיק בטיחות
                  </h3>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="gap-1 h-8"
                    onClick={() => navigate('/safety-files')}
                  >
                    <List className="w-4 h-4" />
                    לתיקי בטיחות
                  </Button>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {/* Vardim */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-sm font-medium text-foreground">נקודות ורדים ({filteredVardim.length})</span>
                      </div>
                      {filteredVardim.length === 0 ? (
                        <p className="text-xs text-muted-foreground pr-5">אין נקודות ורדים</p>
                      ) : (
                        <div className="space-y-1 pr-5">
                          {filteredVardim.slice(0, 5).map((point) => (
                            <div 
                              key={point.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer"
                              onClick={() => point.latitude && point.longitude && handleFocusOnItem(point.latitude, point.longitude)}
                            >
                              <span className="text-sm text-foreground truncate">{point.title}</span>
                              <Target className="w-3 h-3 text-purple-600 shrink-0" />
                            </div>
                          ))}
                          {filteredVardim.length > 5 && (
                            <p className="text-xs text-muted-foreground">+{filteredVardim.length - 5} עוד</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Vulnerability */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-sm font-medium text-foreground">נקודות תורפה ({filteredVulnerability.length})</span>
                      </div>
                      {filteredVulnerability.length === 0 ? (
                        <p className="text-xs text-muted-foreground pr-5">אין נקודות תורפה</p>
                      ) : (
                        <div className="space-y-1 pr-5">
                          {filteredVulnerability.slice(0, 5).map((point) => (
                            <div 
                              key={point.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                              onClick={() => point.latitude && point.longitude && handleFocusOnItem(point.latitude, point.longitude)}
                            >
                              <span className="text-sm text-foreground truncate">{point.title}</span>
                              <Target className="w-3 h-3 text-amber-600 shrink-0" />
                            </div>
                          ))}
                          {filteredVulnerability.length > 5 && (
                            <p className="text-xs text-muted-foreground">+{filteredVulnerability.length - 5} עוד</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Parsa */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-foreground">נקודות פרסה ({filteredParsa.length})</span>
                      </div>
                      {filteredParsa.length === 0 ? (
                        <p className="text-xs text-muted-foreground pr-5">אין נקודות פרסה</p>
                      ) : (
                        <div className="space-y-1 pr-5">
                          {filteredParsa.slice(0, 5).map((point) => (
                            <div 
                              key={point.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                              onClick={() => point.latitude && point.longitude && handleFocusOnItem(point.latitude, point.longitude)}
                            >
                              <span className="text-sm text-foreground truncate">{point.title}</span>
                              <Target className="w-3 h-3 text-emerald-600 shrink-0" />
                            </div>
                          ))}
                          {filteredParsa.length > 5 && (
                            <p className="text-xs text-muted-foreground">+{filteredParsa.length - 5} עוד</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Region & Outpost Filters */}
          <div className="glass-card p-4 mb-4">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" />
              סינון לפי גזרה ומוצב
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">גזרה</Label>
                <Select 
                  value={selectedRegion} 
                  onValueChange={(v) => {
                    setSelectedRegion(v);
                    setSelectedOutpostFilter("all");
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-card border-border">
                    <SelectValue placeholder="כל הגזרות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הגזרות</SelectItem>
                    {REGIONS.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">מוצב</Label>
                <Select 
                  value={selectedOutpostFilter} 
                  onValueChange={setSelectedOutpostFilter}
                  disabled={selectedRegion === "all"}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-card border-border">
                    <SelectValue placeholder="כל המוצבים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל המוצבים בגזרה</SelectItem>
                    {availableOutposts.map(outpost => (
                      <SelectItem key={outpost} value={outpost}>{outpost}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedRegion !== "all" && (
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Navigation className="w-3 h-3" />
                  {selectedRegion}
                </Badge>
                {selectedOutpostFilter !== "all" && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {selectedOutpostFilter}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedRegion("all");
                    setSelectedOutpostFilter("all");
                  }}
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  נקה סינון
                </Button>
              </div>
            )}
          </div>

          {/* Unified Filter Toggles */}
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              סינון שכבות
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowOutposts(!showOutposts)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showOutposts 
                    ? "bg-amber-500/20 text-amber-700 border border-amber-500/30" 
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <Building2 className="w-4 h-4" />
                מוצבים
              </button>
              <button
                onClick={() => setShowEvents(!showEvents)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showEvents 
                    ? "bg-orange-500/20 text-orange-700 border border-orange-500/30" 
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                אירועי בטיחות
              </button>
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showRoutes 
                    ? "bg-red-500/20 text-red-700 border border-red-500/30" 
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <Route className="w-4 h-4" />
                צירים אדומים
              </button>
              <button
                onClick={() => setShowVardim(!showVardim)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showVardim 
                    ? "bg-purple-500/20 text-purple-700 border border-purple-500/30" 
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <MapPin className="w-4 h-4" />
                נקודות ורדים
              </button>
              <button
                onClick={() => setShowVulnerability(!showVulnerability)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showVulnerability 
                    ? "bg-amber-500/20 text-amber-700 border border-amber-500/30" 
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                נקודות תורפה
              </button>
              <button
                onClick={() => setShowParsa(!showParsa)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  showParsa 
                    ? "bg-emerald-500/20 text-emerald-700 border border-emerald-500/30" 
                    : "bg-muted text-muted-foreground border border-transparent"
                }`}
              >
                <Shield className="w-4 h-4" />
                נקודות פרסה
              </button>
            </div>
          </div>
        </div>

        {/* Search & View Mode */}
        <div className="px-4 space-y-3 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש במפה..."
              className="pr-12 h-12 bg-card border-border rounded-2xl text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex p-1 bg-card rounded-xl border border-border">
            <button
              onClick={() => setViewMode("map")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                viewMode === "map"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-4 h-4" />
              מפה רגילה
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                viewMode === "heatmap"
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Flame className="w-4 h-4" />
              מפת חום
            </button>
          </div>

          {/* Map Type Toggle */}
          <div className="flex p-1 bg-card rounded-xl border border-border">
            <button
              onClick={() => setMapType("standard")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                mapType === "standard"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Map className="w-4 h-4" />
              מפה
            </button>
            <button
              onClick={() => setMapType("satellite")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                mapType === "satellite"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Navigation className="w-4 h-4" />
              לוויין
            </button>
          </div>
        </div>

        {/* Admin Drawing Controls */}
        {canEdit && (
          <div className="px-4 mb-4">
            {isDrawingRoute ? (
              <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <Pencil className="w-5 h-5 text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">מצייר ציר מסוכן</p>
                      <p className="text-sm text-muted-foreground">{routePoints.length} נקודות</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelDrawingRoute}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleFinishDrawingRoute} disabled={routePoints.length < 2}
                      className="bg-red-500 hover:bg-red-600 text-white">
                      סיים
                    </Button>
                  </div>
                </div>
              </div>
            ) : isDrawingBoundary ? (
              <div className="glass-card p-4 border-foreground/30 bg-foreground/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-foreground/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-foreground animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">מצייר גבול גזרה</p>
                      <p className="text-sm text-muted-foreground">{boundaryPoints.length} נקודות</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelDrawingBoundary}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleFinishDrawingBoundary} disabled={boundaryPoints.length < 3}>
                      סיים
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleStartDrawingRoute} className="gap-2">
                  <Route className="w-4 h-4 text-red-500" />
                  צייר ציר מסוכן
                </Button>
                <Button size="sm" variant="outline" onClick={handleStartDrawingBoundary} className="gap-2">
                  <Shield className="w-4 h-4" />
                  צייר גבול גזרה
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Map Container */}
        <div className="px-4 mb-4">
          <div className="relative h-[55vh] rounded-3xl overflow-hidden border-2 border-border shadow-2xl">
            <MapContainer
              center={[centerLat, centerLng]}
              zoom={userLocation ? 13 : 11}
              className="h-full w-full"
              ref={mapRef}
              maxBounds={[[29.5, 34.2], [33.3, 35.9]]}
              maxBoundsViscosity={1.0}
              minZoom={8}
            >
              {mapType === "satellite" ? (
                <TileLayer
                  attribution='&copy; Esri'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}
              
              <MapClickHandler 
                onMapClick={handleMapClick} 
                enabled={isAdmin || isDrawingRoute || isDrawingBoundary} 
              />
              
              <FlyToLocation position={flyToPosition} />
              
              {/* User Location */}
              {userLocation && (
                <>
                  <Marker position={userLocation} icon={createUserLocationIcon()}>
                    <Popup>
                      <div className="text-center p-2" dir="rtl">
                        <p className="font-bold">המיקום שלך</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle 
                    center={userLocation} 
                    radius={100} 
                    pathOptions={{ 
                      color: '#3b82f6', 
                      fillColor: '#3b82f6', 
                      fillOpacity: 0.1,
                      weight: 2
                    }} 
                  />
                </>
              )}
              
              {/* Sector Boundaries - only in map mode */}
              {viewMode === "map" && showBoundaries && sectorBoundaries.map((boundary) => (
                <Polygon
                  key={boundary.id}
                  positions={boundary.boundary_points.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ 
                    color: boundary.color || '#000000', 
                    weight: 4, 
                    opacity: 0.9, 
                    fillOpacity: 0.1,
                  }}
                >
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{boundary.name}</h3>
                      <Badge className="mb-2" style={{ backgroundColor: boundary.color }}>גבול גזרה</Badge>
                      {boundary.description && <p className="text-sm text-gray-600 mt-2">{boundary.description}</p>}
                      {canDelete && (
                        <Button variant="destructive" size="sm" className="w-full mt-3" onClick={() => handleDeleteBoundary(boundary.id)}>
                          <Trash2 className="w-4 h-4 ml-2" />מחק
                        </Button>
                      )}
                    </div>
                  </Popup>
                </Polygon>
              ))}
              
              {/* Boundary drawing preview */}
              {isDrawingBoundary && boundaryPoints.length > 0 && (
                <Polygon
                  positions={boundaryPoints.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: '#000000', weight: 3, opacity: 0.6, fillOpacity: 0.1, dashArray: '10, 10' }}
                />
              )}
              
              {/* Boundary drawing points */}
              {isDrawingBoundary && boundaryPoints.map((point, idx) => (
                <Marker key={idx} position={[point.lat, point.lng]} icon={createRoutePointIcon(idx)} />
              ))}
              
              {/* Heat layer for heatmap mode */}
              {viewMode === "heatmap" && <HeatLayer points={heatPoints} />}
              
              {/* Dangerous Routes - only in map mode */}
              {viewMode === "map" && showRoutes && dangerousRoutes.map((route) => (
                <Polyline
                  key={route.id}
                  positions={route.route_points.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{
                    color: '#ef4444',
                    weight: 6,
                    opacity: 0.9,
                  }}
                >
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{route.name}</h3>
                      <Badge className="bg-red-500 text-white mb-2">ציר מסוכן</Badge>
                      {route.description && <p className="text-sm text-gray-600 mt-2">{route.description}</p>}
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2 mt-3">
                          {canEdit && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditRoute(route)}>
                              <Pencil className="w-4 h-4 ml-1" />עריכה
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteRoute(route.id)}>
                              <Trash2 className="w-4 h-4 ml-1" />מחק
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polyline>
              ))}
              
              {/* Route drawing preview */}
              {isDrawingRoute && routePoints.length > 0 && (
                <Polyline
                  positions={routePoints.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.6, dashArray: '10, 10' }}
                />
              )}
              
              {/* Route drawing points */}
              {isDrawingRoute && routePoints.map((point, idx) => (
                <Marker key={idx} position={[point.lat, point.lng]} icon={createRoutePointIcon(idx)} />
              ))}
              
              {/* Outposts - only in map mode */}
              {viewMode === "map" && showOutposts && filteredOutposts.map((point) => (
                <Marker key={point.id} position={[point.latitude, point.longitude]} icon={createOutpostIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{point.name}</h3>
                      <Badge className="bg-amber-500 text-white mb-2">מוצב</Badge>
                      {point.description && <p className="text-sm text-gray-600 mt-2">{point.description}</p>}
                      {canDelete && (
                        <Button variant="destructive" size="sm" className="w-full mt-3" onClick={() => handleDeletePoint(point.id)}>
                          <Trash2 className="w-4 h-4 ml-2" />מחק
                        </Button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Safety Events with coordinates - Map Mode */}
              {showEvents && viewMode === "map" && eventsWithLocation.map((event) => (
                <Marker key={event.id} position={[event.latitude!, event.longitude!]} icon={createEventIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                      <Badge className="bg-orange-500 text-white mb-2">{getEventTypeLabel(event.event_type)}</Badge>
                      {event.event_date && <p className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString("he-IL")}</p>}
                      {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2 mt-3">
                          {canEdit && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditEvent(event)}>
                              <Pencil className="w-4 h-4 ml-1" />עריכה
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleDeleteEvent(event.id)}>
                              <Trash2 className="w-4 h-4 ml-1" />מחק
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* In heatmap mode, we only show the HeatLayer - no individual markers */}

              {/* Safety Files - Vardim Points - only in map mode */}
              {viewMode === "map" && showVardim && filteredVardim.map((file) => (
                <Marker key={`vardim-${file.id}`} position={[file.latitude!, file.longitude!]} icon={createVardimIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{file.title}</h3>
                      <Badge className="bg-purple-500 text-white mb-2">נקודת ורדים</Badge>
                      <p className="text-xs text-gray-500 mb-1">{file.outpost}</p>
                      {file.content && <p className="text-sm text-gray-600 mt-2">{file.content}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Safety Files - Vulnerability Points - only in map mode */}
              {viewMode === "map" && showVulnerability && filteredVulnerability.map((file) => (
                <Marker key={`vuln-${file.id}`} position={[file.latitude!, file.longitude!]} icon={createVulnerabilityIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{file.title}</h3>
                      <Badge className="bg-amber-500 text-white mb-2">נקודת תורפה</Badge>
                      <p className="text-xs text-gray-500 mb-1">{file.outpost}</p>
                      {file.content && <p className="text-sm text-gray-600 mt-2">{file.content}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Safety Files - Parsa Points - only in map mode */}
              {viewMode === "map" && showParsa && filteredParsa.map((file) => (
                <Marker key={`parsa-${file.id}`} position={[file.latitude!, file.longitude!]} icon={createParsaIcon()}>
                  <Popup>
                    <div className="text-right p-3 min-w-[200px]" dir="rtl">
                      <h3 className="font-bold text-lg mb-2">{file.title}</h3>
                      <Badge className="bg-emerald-500 text-white mb-2">נקודת פרסה</Badge>
                      <p className="text-xs text-gray-500 mb-1">{file.outpost}</p>
                      {file.content && <p className="text-sm text-gray-600 mt-2">{file.content}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Controls Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-[1000]">
              <Button
                size="icon"
                variant="secondary"
                onClick={handleGoToUserLocation}
                className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-sm shadow-lg border border-border"
              >
                <LocateFixed className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Heat Map Legend */}
        {viewMode === "heatmap" && (
          <div className="px-4 mb-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-bold text-foreground">מקרא מפת חום</span>
              </div>
              <div className="h-4 rounded-full overflow-hidden bg-muted">
                <div className="h-full w-full" style={{
                  background: 'linear-gradient(to left, #dc2626, #ef4444, #f97316, #eab308, #84cc16, #22c55e)'
                }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>ללא אירועים</span>
                <span>אירוע בודד</span>
                <span>ריבוי אירועים</span>
              </div>
            </div>
          </div>
        )}

        {/* Lists Section */}
        <div className="px-4 space-y-4">
          {/* Quick List - Recent Events */}
          {eventsWithLocation.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                אירועי בטיחות אחרונים
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {eventsWithLocation.slice(0, 5).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleFocusOnItem(event.latitude!, event.longitude!)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground text-sm">{event.title}</p>
                        {event.event_date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.event_date).toLocaleDateString("he-IL")}
                          </p>
                        )}
                      </div>
                    </div>
                    <MapPinned className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick List - Dangerous Routes */}
          {filteredRoutes.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Route className="w-5 h-5 text-red-500" />
                צירים אדומים
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {filteredRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleFocusOnRoute(route)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Route className="w-4 h-4 text-red-500" />
                      </div>
                      <p className="font-medium text-foreground text-sm">{route.name}</p>
                    </div>
                    <MapPinned className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Map Click Context Menu Dialog */}
      <Dialog open={showMapClickMenu} onOpenChange={setShowMapClickMenu}>
        <DialogContent className="max-w-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">הוסף לנקודה זו</DialogTitle>
            <DialogDescription className="text-center">
              {clickPosition && (
                <span className="text-xs font-mono">
                  {clickPosition.lat.toFixed(5)}, {clickPosition.lng.toFixed(5)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleAddOutpostFromMenu}
            >
              <Building2 className="w-8 h-8 text-amber-500" />
              <span>מוצב</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={handleAddEventFromMenu}
            >
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <span>אירוע בטיחות</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Outpost Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת מוצב</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם המוצב</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
            {clickPosition && (
              <div className="p-3 rounded-xl bg-muted text-center">
                <p className="text-sm text-muted-foreground">קואורדינטות:</p>
                <p className="font-mono text-sm">{clickPosition.lat.toFixed(5)}, {clickPosition.lng.toFixed(5)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>ביטול</Button>
            <Button onClick={handleAddPoint}>הוסף</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Event Dialog - Using AddEditDialog for consistency with SafetyEvents */}
      <AddEditDialog
        open={showAddEventDialog}
        onOpenChange={(open) => {
          setShowAddEventDialog(open);
          if (!open) {
            setEditingEvent(null);
            setEventFormData({});
          }
        }}
        title={editingEvent ? "עריכת אירוע בטיחות" : "הוספת אירוע בטיחות"}
        fields={getEventFields()}
        initialData={editingEvent ? {
          ...eventFormData,
          latitude: clickPosition?.lat?.toFixed(6) || eventFormData.latitude,
          longitude: clickPosition?.lng?.toFixed(6) || eventFormData.longitude,
        } : {
          event_date: new Date().toISOString().split('T')[0],
          latitude: clickPosition?.lat?.toFixed(6) || "",
          longitude: clickPosition?.lng?.toFixed(6) || "",
        }}
        onSubmit={handleAddSafetyEvent}
        isLoading={isSubmittingEvent}
      />

      {/* Save Route Dialog */}
      <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>שמירת ציר מסוכן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הציר</Label>
              <Input
                value={routeFormData.name}
                onChange={(e) => setRouteFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={routeFormData.description}
                onChange={(e) => setRouteFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-sm text-muted-foreground">{routePoints.length} נקודות בציר</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRouteDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveRoute} className="bg-red-500 hover:bg-red-600">שמור ציר</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Route Dialog */}
      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת ציר מסוכן</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הציר</Label>
              <Input
                value={routeFormData.name}
                onChange={(e) => setRouteFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={routeFormData.description}
                onChange={(e) => setRouteFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoute(null)}>ביטול</Button>
            <Button onClick={handleUpdateRoute}>עדכן</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Boundary Dialog */}
      <Dialog open={showBoundaryDialog} onOpenChange={setShowBoundaryDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>שמירת גבול גזרה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שם הגבול</Label>
              <Input
                value={boundaryFormData.name}
                onChange={(e) => setBoundaryFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="הזן שם..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea
                value={boundaryFormData.description}
                onChange={(e) => setBoundaryFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>צבע</Label>
              <div className="flex gap-2 mt-1">
                {['#000000', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setBoundaryFormData(p => ({ ...p, color }))}
                    className={cn(
                      "w-10 h-10 rounded-xl border-2 transition-all",
                      boundaryFormData.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted text-center">
              <p className="text-sm text-muted-foreground">{boundaryPoints.length} נקודות בגבול</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBoundaryDialog(false)}>ביטול</Button>
            <Button onClick={handleSaveBoundary}>שמור גבול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSS for user location pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.1; }
        }
      `}</style>
      </div>
    </AppLayout>
  );
};

export default KnowTheArea;