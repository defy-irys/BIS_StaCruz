import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { BARANGAY } from "@/lib/navigation";

/**
 * Application splash screen shown while the frontend initializes.
 * Presentational only  the boot sequence (progress + status text) is driven
 * by `useBootSequence` in App.
 */
export default function LoadingScreen({ progress, message }: { progress: number; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-sm text-center" role="status" aria-live="polite">
        {/* Barangay Sta. Cruz logo */}
        <div className="flex justify-center">
          <BarangayLogo size={96} className="drop-shadow-md" />
        </div>

        <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">BIMS-BIPS</h1>
        <p className="mx-auto mt-1 max-w-72 text-xs leading-relaxed text-slate-500">
          Barangay Information Management System · Barangay Inhabitant Profiling System
        </p>

        {/* Status message above the progress bar */}
        <p className="mt-7 text-xs font-medium text-slate-600">{message}</p>

        <div className="mx-auto mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {BARANGAY.name}, {BARANGAY.city}
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
