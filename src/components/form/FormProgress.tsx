import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function FormProgress({ currentStep, totalSteps, stepLabels }: FormProgressProps) {
  return (
    <div className="sticky top-20 z-30 mx-4 mb-6 mt-4">
      <div className="rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="overflow-x-auto pb-1">
          <div className="mx-auto flex min-w-[540px] items-center justify-between gap-2">
            {Array.from({ length: totalSteps }, (_, i) => {
              const step = i + 1;
              const isCompleted = step < currentStep;
              const isActive = step === currentStep;

              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex min-w-[88px] flex-col items-center">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-black transition-all duration-300",
                        isCompleted && "border-primary bg-primary text-primary-foreground",
                        isActive && "border-primary bg-primary/10 text-primary",
                        !isCompleted && !isActive && "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : isActive ? <Sparkles className="h-4 w-4" /> : step}
                    </div>
                    <span
                      className={cn(
                        "mt-1 text-center text-[11px] font-bold",
                        isActive ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {stepLabels[i]}
                    </span>
                  </div>

                  {i < totalSteps - 1 && (
                    <div
                      className={cn(
                        "h-1 w-5 rounded-full transition-all duration-300",
                        step < currentStep ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}