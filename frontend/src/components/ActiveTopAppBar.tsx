import { ArrowLeft, Sparkles } from 'lucide-react';
import { useUnit } from '../context/UnitContext';

interface ActiveTopAppBarProps {
  workoutName: string;
  totalVolume: number;
  elapsedSeconds: number;
  onBack: () => void;
  onAdjust?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ActiveTopAppBar({
  workoutName,
  totalVolume,
  elapsedSeconds,
  onBack,
  onAdjust,
}: ActiveTopAppBarProps) {
  const unit = useUnit();
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
      }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface active:scale-90 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <h1 className="font-headline flex-1 truncate text-center text-base font-black uppercase tracking-tight text-on-surface">
          {workoutName}
        </h1>

        {onAdjust && (
          <button
            type="button"
            onClick={onAdjust}
            aria-label="Ask AI trainer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary active:scale-90 transition-transform"
          >
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </button>
        )}

        <div className="shrink-0 text-right">
          <p className="font-label text-[9px] font-bold uppercase tracking-widest text-secondary">
            Volume
          </p>
          <p className="font-headline text-sm font-black text-primary leading-tight">
            {totalVolume > 0 ? `${totalVolume.toLocaleString()} ${unit.toUpperCase()}` : `— ${unit.toUpperCase()}`}
          </p>
          <p className="font-headline text-sm font-black text-on-surface leading-tight">
            {formatTime(elapsedSeconds)}
          </p>
        </div>
      </div>
    </header>
  );
}
