import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
        <Icon className="w-10 h-10 text-slate-400" />
      </div>
      <p className="text-slate-700 dark:text-slate-200 font-bold text-lg mb-1">{title}</p>
      {description && (
        <p className="text-slate-400 text-sm mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          variant="outline"
          className="mt-5"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
