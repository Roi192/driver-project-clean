import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  text?: string;
  fullPage?: boolean;
}

export const LoadingState = ({ text, fullPage = false }: LoadingStateProps) => {
  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          </div>
          {text && <p className="text-slate-400 text-sm font-medium">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
        {text && <p className="text-slate-400 text-sm">{text}</p>}
      </div>
    </div>
  );
};
