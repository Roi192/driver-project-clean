import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Crosshair, Loader2, Map, Satellite } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_LAYERS = {
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP",
  },
};

// Fix leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapPickerProps {
  latitude?: number | string | null;
  longitude?: number | string | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

// Component to fly to position when it changes
function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 0.5 });
    }
  }, [position, map]);
  
  return null;
}

function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}) {
  // iOS Safari sometimes swallows synthetic 'click' events on Leaflet maps.
  // Listen to multiple event types to ensure taps register on iPhone.
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
    // Leaflet's tap handler fires on touch devices when 'tap: true'
    // (cast: type def doesn't include 'tap' but Leaflet emits it)
    ...({
      tap(e: L.LeafletMouseEvent) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      },
    } as Record<string, unknown>),
  });

  return position ? <Marker position={position} /> : null;
}

export function MapPicker({ latitude, longitude, onLocationSelect }: MapPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [isSatellite, setIsSatellite] = useState(false);
  
  // Default center for Israel region
  const defaultCenter: [number, number] = [31.9, 35.2];
  
  useEffect(() => {
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      setPosition([lat, lng]);
    }
  }, [latitude, longitude]);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
          setGettingLocation(false);
        },
        (error) => {
          console.error("Location error:", error);
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGettingLocation(false);
    }
  };

  const handleConfirm = () => {
    if (position) {
      onLocationSelect(position[0], position[1]);
      setDialogOpen(false);
    }
  };

  const displayLat = typeof latitude === 'string' ? latitude : latitude?.toFixed(6) || "";
  const displayLng = typeof longitude === 'string' ? longitude : longitude?.toFixed(6) || "";
  const hasLocation = displayLat && displayLng;

  return (
    <div className="space-y-2">
      {hasLocation ? (
        <div
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-500/40 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:border-green-500/70 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">מיקום נבחר ✓</p>
            <p className="text-xs font-mono text-muted-foreground">{displayLat}, {displayLng}</p>
          </div>
          <Map className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="w-full h-12 rounded-xl border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 gap-2 font-bold"
        >
          <Map className="w-5 h-5" />
          דקירה במפה
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" dir="rtl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              בחר מיקום במפה
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-4 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 gap-2"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crosshair className="w-4 h-4" />
                )}
                {gettingLocation ? "מקבל מיקום..." : "מיקום נוכחי"}
              </Button>
              <Button
                type="button"
                variant={isSatellite ? "default" : "outline"}
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setIsSatellite(v => !v)}
              >
                {isSatellite ? <Map className="w-4 h-4" /> : <Satellite className="w-4 h-4" />}
                {isSatellite ? "מפה" : "לווין"}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              לחץ על המפה לבחירת מיקום
            </p>
          </div>
          
          <div className="h-[350px] w-full">
            <MapContainer
              {...({ tap: true, tapTolerance: 25 } as Record<string, unknown>)}
              center={position || defaultCenter}
              zoom={position ? 15 : 10}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
              maxBounds={[[29.5, 34.2], [33.3, 35.9]]}
              maxBoundsViscosity={1.0}
              minZoom={8}
            >
              <TileLayer
                attribution={TILE_LAYERS[isSatellite ? "satellite" : "map"].attribution}
                url={TILE_LAYERS[isSatellite ? "satellite" : "map"].url}
              />
              <LocationMarker position={position} setPosition={setPosition} />
              <FlyToPosition position={position} />
            </MapContainer>
          </div>
          
          {position && (
            <div className="px-4 py-2 bg-muted/50 text-center text-sm">
              <span className="font-medium">מיקום נבחר:</span>{" "}
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
          )}
          
          <DialogFooter className="p-4 pt-2 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              ביטול
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!position}
              className="flex-1 gap-2"
            >
              <MapPin className="w-4 h-4" />
              אישור מיקום
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}