import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

// Generate hours 00-23
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

// Generate minutes 00, 05, 10, ..., 55
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

export function TimePicker({ value, onChange, placeholder = "בחר שעה", className }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string>("08");
  const [selectedMinute, setSelectedMinute] = useState<string>("00");

  // Parse value when it changes
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      if (h) setSelectedHour(h);
      if (m) {
        // Round to nearest 5 minutes
        const mins = parseInt(m);
        const rounded = Math.round(mins / 5) * 5;
        setSelectedMinute(rounded.toString().padStart(2, "0"));
      }
    }
  }, [value]);

  const handleConfirm = () => {
    const time = `${selectedHour}:${selectedMinute}`;
    onChange(time);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-right font-normal bg-white text-slate-800 border-slate-300 hover:bg-slate-50",
            !value && "text-slate-400",
            className
          )}
        >
          <Clock className="w-4 h-4 ml-2 text-slate-400" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0 bg-white" align="start" sideOffset={4}>
        <div className="p-3 border-b border-slate-200">
          <div className="text-center text-lg font-bold text-slate-800">
            {selectedHour}:{selectedMinute}
          </div>
        </div>
        
        <div className="flex">
          {/* Hours Column */}
          <div className="flex-1 border-l border-slate-200">
            <div className="text-center text-xs font-medium text-slate-500 py-2 bg-slate-50">
              שעה
            </div>
            <ScrollArea className="h-48">
              <div className="p-1">
                {HOURS.map((hour) => (
                  <Button
                    key={hour}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-center text-slate-700 hover:bg-primary/10 hover:text-primary",
                      selectedHour === hour && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                    )}
                    onClick={() => setSelectedHour(hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Minutes Column */}
          <div className="flex-1">
            <div className="text-center text-xs font-medium text-slate-500 py-2 bg-slate-50">
              דקות
            </div>
            <ScrollArea className="h-48">
              <div className="p-1">
                {MINUTES.map((minute) => (
                  <Button
                    key={minute}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-center text-slate-700 hover:bg-primary/10 hover:text-primary",
                      selectedMinute === minute && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold"
                    )}
                    onClick={() => setSelectedMinute(minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex gap-2 p-3 border-t border-slate-200">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleClear}
          >
            נקה
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleConfirm}
          >
            אישור
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}