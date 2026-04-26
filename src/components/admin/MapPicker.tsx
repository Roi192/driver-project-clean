import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Crosshair, Loader2, Map } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export function MapPicker({ latitude, longitude, onLocationSelect }: MapPickerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  
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
      <Button
        type="button"
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className="w-full h-12 rounded-xl border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 gap-2 font-bold"
      >
        <Map className="w-5 h-5" />
        {hasLocation ? "שינוי מיקום במפה" : "דקירה במפה"}
      </Button>
      
      {hasLocation && (
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded-lg">
          <MapPin className="w-3 h-3 inline-block mr-1" />
          {displayLat}, {displayLng}
        </div>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
              {gettingLocation ? "מקבל מיקום..." : "המיקום הנוכחי שלי"}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              לחץ על המפה לבחירת מיקום
            </p>
          </div>
          
          <div className="h-[350px] w-full">
            <MapContainer
              center={position || defaultCenter}
              zoom={position ? 15 : 10}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
              maxBounds={[[29.5, 34.2], [33.3, 35.9]]}
              maxBoundsViscosity={1.0}
              minZoom={8}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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