import { FieldConfig, FormValues } from "@/components/admin/AddEditDialog";

/**
 * Wraps all fields except "safety_category" so they are hidden
 * until the user picks a category. Existing condition/dependsOn
 * logic is preserved inside the new condition function.
 */
export const withCategoryGate = (fields: FieldConfig[]): FieldConfig[] =>
  fields.map((f) => {
    if (f.name === "safety_category") return f;
    const origCondition = f.condition;
    const origDependsOn = f.dependsOn;
    return {
      ...f,
      dependsOn: undefined,
      condition: (formData: FormValues) => {
        if (!String(formData.safety_category || "")) return false;
        if (origCondition) return origCondition(formData);
        if (origDependsOn) {
          const depVal = formData[origDependsOn.field];
          if (Array.isArray(origDependsOn.value)) {
            return origDependsOn.value.includes(String(depVal ?? ""));
          }
          return depVal === origDependsOn.value;
        }
        return true;
      },
    };
  });
