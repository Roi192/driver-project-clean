import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StorageImage } from '@/components/shared/StorageImage';
import { Truck, ArrowLeft, Calendar, MapPin, User, Camera, ChevronLeft, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface ShiftReport {
  id: string;
  report_date: string;
  outpost: string;
  driver_name: string;
  vehicle_number: string;
  photo_front?: string;
  photo_left?: string;
  photo_right?: string;
  photo_back?: string;
  photo_steering_wheel?: string;
}

interface VehicleReportsCardProps {
  reports: ShiftReport[];
}

export function VehicleReportsCard({ reports }: VehicleReportsCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const vehicleGroups = useMemo(() => {
    const groups: Record<string, ShiftReport[]> = {};
    reports.forEach((report) => {
      if (!groups[report.vehicle_number]) {
        groups[report.vehicle_number] = [];
      }
      groups[report.vehicle_number].push(report);
    });
    
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());
    });
    
    return groups;
  }, [reports]);

  const vehicleList = Object.entries(vehicleGroups)
    .map(([vehicle, vehicleReports]) => ({
      vehicle,
      count: vehicleReports.length,
      lastReport: vehicleReports[0]?.report_date,
    }))
    .sort((a, b) => b.count - a.count);

  const selectedVehicleReports = selectedVehicle ? vehicleGroups[selectedVehicle] : [];

  const getPhotos = (report: ShiftReport) => {
    const photos: { label: string; url: string }[] = [];
    if (report.photo_front) photos.push({ label: 'חזית', url: report.photo_front });
    if (report.photo_left) photos.push({ label: 'שמאל', url: report.photo_left });
    if (report.photo_right) photos.push({ label: 'ימין', url: report.photo_right });
    if (report.photo_back) photos.push({ label: 'אחורי', url: report.photo_back });
    if (report.photo_steering_wheel) photos.push({ label: 'הגה', url: report.photo_steering_wheel });
    return photos;
  };

  return (
    <>
      <Card 
        className="group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_50px_rgba(0,0,0,0.12)] transition-all duration-500 cursor-pointer col-span-2 rounded-3xl hover:scale-[1.01] animate-slide-up"
        style={{ animationDelay: '0.15s' }}
        onClick={() => setIsOpen(true)}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-amber-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
                  <Truck className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xl font-black text-slate-800 group-hover:text-accent transition-colors">סינון לפי מספר רכב</p>
                <p className="text-sm text-slate-500 font-medium">{vehicleList.length} רכבים במערכת</p>
              </div>
            </div>
            <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-accent group-hover:-translate-x-1 transition-all duration-300" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setSelectedVehicle(null);
          setSelectedPhoto(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-transparent">
            <DialogTitle className="flex items-center gap-3">
              {selectedVehicle ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-primary/10"
                    onClick={() => setSelectedVehicle(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-lg">רכב {selectedVehicle}</span>
                  <Badge variant="secondary" className="mr-auto rounded-xl font-bold bg-accent/10 text-accent">
                    {selectedVehicleReports.length} דיווחים
                  </Badge>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-black text-lg">דיווחים לפי מספר רכב</span>
                  <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            {selectedVehicle ? (
              <div className="p-6 space-y-4">
                {selectedVehicleReports.map((report, i) => (
                  <Card key={report.id} className="bg-slate-50 border-slate-200 rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{format(new Date(report.report_date), 'dd/MM/yyyy', { locale: he })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-accent" />
                          </div>
                          <span className="font-medium">{report.outpost}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-600" />
                          </div>
                          <span className="font-medium">{report.driver_name}</span>
                        </div>
                      </div>

                      {getPhotos(report).length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                            <Camera className="w-4 h-4" />
                            <span>תמונות</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2">
                            {getPhotos(report).map((photo, idx) => (
                              <div 
                                key={idx} 
                                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all hover:scale-105"
                                onClick={() => setSelectedPhoto(photo.url)}
                              >
                                <StorageImage
                                  src={photo.url}
                                  bucket="shift-photos"
                                  alt={photo.label}
                                  className="w-full h-full object-cover"
                                  showLoader={false}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] text-center py-1 text-white font-bold">
                                  {photo.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {vehicleList.map(({ vehicle, count, lastReport }, i) => (
                  <div
                    key={vehicle}
                    className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 hover:bg-primary/5 cursor-pointer transition-all duration-300 border border-transparent hover:border-primary/20 hover:shadow-lg animate-slide-up group"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Truck className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="font-black text-lg text-slate-800 group-hover:text-primary transition-colors">{vehicle}</p>
                        <p className="text-sm text-slate-500">
                          {lastReport && `דיווח אחרון: ${format(new Date(lastReport), 'dd/MM/yyyy', { locale: he })}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="rounded-xl font-bold bg-accent/10 text-accent text-base px-3">{count}</Badge>
                      <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                ))}
                {vehicleList.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-10 h-10 text-slate-400" />
                    </div>
                    <p className="font-bold text-lg">אין דיווחים</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Full Photo Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl p-2 rounded-3xl">
          {selectedPhoto && (
            <StorageImage
              src={selectedPhoto}
              bucket="shift-photos"
              alt="תמונה מלאה"
              className="w-full h-auto rounded-2xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}