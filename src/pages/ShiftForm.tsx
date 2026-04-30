import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FormProgress } from "@/components/form/FormProgress";
import { GeneralDetails } from "@/components/form/steps/GeneralDetails";
import { BriefingsStep } from "@/components/form/steps/BriefingsStep";
import { EquipmentStep } from "@/components/form/steps/EquipmentStep";
import { DrillsStep } from "@/components/form/steps/DrillsStep";
import { PhotosStep } from "@/components/form/steps/PhotosStep";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Send, Check, Sparkles, FileText, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useShiftReport } from "@/hooks/useShiftReport";
import { useAuth } from "@/hooks/useAuth";
import { VEHICLE_PHOTOS } from "@/lib/constants";

const STEP_LABELS = ["פרטים", "תדריכים", "ציוד", "תרגולות", "תמונות"];

const steps = [
  GeneralDetails,
  BriefingsStep,
  EquipmentStep,
  DrillsStep,
  PhotosStep,
];

const SHIFT_FORM_STEP_STORAGE_KEY = "shiftFormStep";
const SHIFT_FORM_DATA_STORAGE_KEY = "shiftFormData";

const createDefaultShiftFormValues = () => ({
  dateTime: new Date(),
  outpost: "",
  driverName: "",
  vehicleNumber: "",
  shiftType: "",
  emergencyProcedure: undefined as boolean | undefined,
  commanderBriefing: undefined as boolean | undefined,
  workCardFilled: undefined as boolean | undefined,
  combatEquipment: [] as string[],
  preMovementChecks: [] as string[],
  driverTools: [] as string[],
  drillsCompleted: [] as string[],
  safetyVulnerabilities: "",
  vardimProcedure: "",
  photos: {} as Record<string, string | undefined>,
  vehicleNotes: "",
});

type ShiftFormValues = ReturnType<typeof createDefaultShiftFormValues>;

const saveFormToStorage = (userId: string, data: ShiftFormValues) => {
  try {
    const toStore = {
      ...data,
      dateTime: data.dateTime instanceof Date ? data.dateTime.toISOString() : data.dateTime,
    };
    sessionStorage.setItem(`${SHIFT_FORM_DATA_STORAGE_KEY}:${userId}`, JSON.stringify(toStore));
  } catch {
    // storage full or unavailable – non-critical
  }
};

const loadFormFromStorage = (userId: string): ShiftFormValues | null => {
  try {
    const raw = sessionStorage.getItem(`${SHIFT_FORM_DATA_STORAGE_KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Restore dateTime as Date object
    if (parsed.dateTime) {
      parsed.dateTime = new Date(parsed.dateTime);
    }
    return parsed as ShiftFormValues;
  } catch {
    return null;
  }
};

const clearFormStorage = (userId: string) => {
  try {
    sessionStorage.removeItem(`${SHIFT_FORM_DATA_STORAGE_KEY}:${userId}`);
  } catch {
    // ignore
  }
};

const parseStoredStep = (value: string | null): number => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= steps.length) {
    return parsed;
  }

  return 1;
};

export default function ShiftForm() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();
  const { submitReport, isSubmitting } = useShiftReport();

  const methods = useForm({
    defaultValues: createDefaultShiftFormValues(),
  });
  const { reset, watch } = methods;
  const stepStorageKey = user?.id ? `${SHIFT_FORM_STEP_STORAGE_KEY}:${user.id}` : null;
  const previousUserIdRef = useRef<string | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    sessionStorage.removeItem(SHIFT_FORM_STEP_STORAGE_KEY);
  }, []);

  // Restore form data from sessionStorage on mount / user change
  useEffect(() => {
    if (!user?.id) {
      previousUserIdRef.current = null;
      setCurrentStep(1);
      return;
    }

    if (previousUserIdRef.current && previousUserIdRef.current !== user.id) {
      reset(createDefaultShiftFormValues());
      clearFormStorage(previousUserIdRef.current);
      setIsSubmitted(false);
    }

    previousUserIdRef.current = user.id;

    // Restore saved form data
    if (!restoredRef.current) {
      const saved = loadFormFromStorage(user.id);
      if (saved) {
        reset(saved);
      }
      restoredRef.current = true;
    }

    if (!stepStorageKey) {
      setCurrentStep(1);
      return;
    }

    setCurrentStep(parseStoredStep(sessionStorage.getItem(stepStorageKey)));
  }, [reset, stepStorageKey, user?.id]);

  // Persist form data to sessionStorage on every change
  useEffect(() => {
    if (!user?.id) return;
    const subscription = watch((values) => {
      saveFormToStorage(user.id, values as ShiftFormValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, user?.id]);

  const CurrentStepComponent = steps[currentStep - 1];

  const updateStep = (step: number) => {
    setCurrentStep(step);
    if (stepStorageKey) {
      sessionStorage.setItem(stepStorageKey, String(step));
    }
  };

  const hasPhotoValue = (value: unknown) => {
    return typeof value === "string" && value.trim().length > 0;
  };

  const hasAllRequiredPhotos = (formData: Record<string, unknown>) => {
    return VEHICLE_PHOTOS.every((photo) => {
      const value = formData[`photos.${photo.id}`] ?? (formData.photos as Record<string, unknown> | undefined)?.[photo.id];
      return hasPhotoValue(value);
    });
  };

  const goToNextStep = () => {
    if (currentStep < steps.length) {
      updateStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      updateStep(currentStep - 1);
    }
  };

  const validateCurrentStep = () => {
    const formData = methods.getValues();

    switch (currentStep) {
      case 1: // General Details
        if (!formData.outpost || !formData.driverName || !formData.vehicleNumber || !formData.shiftType) {
          toast({
            title: "שגיאה",
            description: "יש למלא את כל השדות בשלב זה",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 2: // Briefings
        if (
          formData.emergencyProcedure === undefined ||
          formData.commanderBriefing === undefined ||
          formData.workCardFilled === undefined
        ) {
          toast({
            title: "שגיאה",
            description: "יש לענות על כל השאלות בשלב זה",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 3: // Equipment
        // No minimum-items requirement: empty categories are allowed (e.g. no driver tools in vehicle)
        break;
      case 4: // Drills
        if (
          !formData.safetyVulnerabilities ||
          !formData.vardimProcedure
        ) {
          toast({
            title: "שגיאה",
            description: "יש למלא את כל השדות בשלב זה",
            variant: "destructive",
          });
          return false;
        }
        break;
      case 5: {
        if (!hasAllRequiredPhotos(formData)) {
          toast({
            title: "שגיאה",
            description: "יש להעלות את כל התמונות הנדרשות",
            variant: "destructive",
          });
          return false;
        }
        break;
      }
      default:
        break;
    }

    return true;
  };

  const validateAllSteps = () => {
    const formData = methods.getValues();

    // Step 1: General Details
    if (!formData.outpost || !formData.driverName || !formData.vehicleNumber || !formData.shiftType) {
      toast({
        title: "שגיאה",
        description: "חסרים פרטים בסיסיים (מוצב, שם, רכב, סוג משמרת). יש למלא מחדש.",
        variant: "destructive",
      });
      updateStep(1);
      return false;
    }

    // Step 2: Briefings
    if (
      formData.emergencyProcedure === undefined ||
      formData.commanderBriefing === undefined ||
      formData.workCardFilled === undefined
    ) {
      toast({
        title: "שגיאה",
        description: "חסרים פרטי תדריכים. יש למלא מחדש.",
        variant: "destructive",
      });
      updateStep(2);
      return false;
    }

    // Step 3: Equipment — no minimum-items requirement

    // Step 4: Drills
    if (!formData.safetyVulnerabilities || !formData.vardimProcedure) {
      toast({
        title: "שגיאה",
        description: "חסרים פרטי תרגולות. יש למלא מחדש.",
        variant: "destructive",
      });
      updateStep(4);
      return false;
    }

    // Step 5: Photos
    if (!hasAllRequiredPhotos(formData)) {
      toast({
        title: "שגיאה",
        description: "יש להעלות את כל התמונות הנדרשות",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateAllSteps()) return;

    const formData = methods.getValues();
    const success = await submitReport(formData);

    if (success) {
      setIsSubmitted(true);
      if (stepStorageKey) {
        sessionStorage.removeItem(stepStorageKey);
      }
      if (user?.id) {
        clearFormStorage(user.id);
      }
      toast({
        title: "הדיווח נשלח בהצלחה!",
        description: "הטופס שלך נשמר במערכת",
      });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    }
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      goToNextStep();
    }
  };

  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className="text-center animate-scale-in">
            {/* Success animation container */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto shadow-luxury">
                <Check className="w-12 h-12 text-white animate-bounce" />
              </div>
            </div>

            <h2 className="text-3xl font-black mb-3 bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              הדיווח נשלח בהצלחה!
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">הטופס שלך נשמר במערכת</p>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <span className="mr-2">מעביר לדף הבית</span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FormProvider {...methods}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Clean Premium Header */}
          <div className="relative px-4 pt-6 pb-4 overflow-hidden">
            {/* Subtle background elements */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-10 left-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute top-16 right-1/4 w-24 h-24 bg-accent/10 rounded-full blur-2xl opacity-50" />

            <div className="relative flex items-center justify-center gap-4 mb-2 animate-slide-up">
              {/* Clean icon container */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl blur-xl opacity-60" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
                  <FileText className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-black text-foreground">טופס לפני משמרת</h1>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  מלא את כל השדות בכל שלב
                </p>
              </div>
            </div>
          </div>

          <FormProgress currentStep={currentStep} totalSteps={steps.length} stepLabels={STEP_LABELS} />

          <div className="px-4 pb-32 max-w-lg mx-auto animate-fade-in">
            <CurrentStepComponent />
          </div>

          {/* Clean Fixed Bottom Navigation */}
          <div className="fixed bottom-0 right-0 left-0 bg-white/95 backdrop-blur-xl border-t border-border/30 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
            {/* Subtle top line */}
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

            <div className="max-w-lg mx-auto flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPreviousStep}
                  className="group flex-1 h-14 text-base font-bold rounded-xl border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                >
                  <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                  הקודם
                </Button>
              )}

              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="group relative flex-1 h-14 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden"
                >
                  {/* Subtle shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center gap-1">
                    הבא
                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="group relative flex-1 h-14 text-base font-bold rounded-xl bg-gradient-to-r from-accent to-primary shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden"
                >
                  {isSubmitting ? (
                    <span className="relative flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                      <span>שולח...</span>
                    </span>
                  ) : (
                    <span className="relative flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      שלח דיווח
                      <Send className="w-5 h-5 group-hover:translate-x-[-4px] transition-transform duration-300" />
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </FormProvider>
    </AppLayout>
  );
}