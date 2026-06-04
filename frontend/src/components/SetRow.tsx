import { Check } from 'lucide-react';
import { useUnit } from '../context/UnitContext';

interface SetRowProps {
  setNumber: number;
  weight: string;
  reps: string;
  done: boolean;
  is_drop?: boolean;
  onChange: (weight: string, reps: string) => void;
  onToggleDone: () => void;
}

export function SetRow({ setNumber, weight, reps, done, is_drop, onChange, onToggleDone }: SetRowProps) {
  const unit = useUnit();
  return (
    <div className={`flex items-end gap-3 transition-opacity ${done ? 'opacity-60' : ''}`}>
      {is_drop ? (
        <span className="font-label mb-3.5 w-5 shrink-0 text-center text-[10px] font-bold text-primary/50">
          ↓
        </span>
      ) : (
        <span className="font-label mb-3.5 w-5 shrink-0 text-center text-sm font-bold text-secondary/60">
          {setNumber}
        </span>
      )}

      <div className="flex flex-1 gap-2">
        <div className="flex-1">
          <p className="font-label mb-1 text-center text-[9px] font-bold uppercase tracking-widest text-secondary/60">
            Weight ({unit})
          </p>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => onChange(e.target.value, reps)}
            placeholder="—"
            className="w-full rounded-xl bg-surface-container px-3 py-3 text-center font-headline text-xl font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex-1">
          <p className="font-label mb-1 text-center text-[9px] font-bold uppercase tracking-widest text-secondary/60">
            Reps
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => onChange(weight, e.target.value)}
            placeholder="—"
            className="w-full rounded-xl bg-surface-container px-3 py-3 text-center font-headline text-xl font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleDone}
        aria-label={done ? 'Mark undone' : 'Mark done'}
        className={`mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
          done
            ? 'bg-primary text-on-primary'
            : 'border-2 border-outline-variant text-secondary/40'
        }`}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
