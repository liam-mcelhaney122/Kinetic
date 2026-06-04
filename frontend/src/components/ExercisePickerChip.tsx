import { ChevronDown } from 'lucide-react';

interface ExercisePickerChipProps {
  label: string;
  onTap: () => void;
}

export function ExercisePickerChip({ label, onTap }: ExercisePickerChipProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-outline-variant bg-surface-container-lowest px-5 py-4 text-left transition-transform active:scale-[0.98]"
    >
      <div className="min-w-0 flex-1">
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
          Exercise
        </p>
        <p className="font-headline mt-1 truncate text-lg font-extrabold text-on-surface">
          {label}
        </p>
      </div>
      <ChevronDown className="h-5 w-5 shrink-0 text-secondary" strokeWidth={2.5} />
    </button>
  );
}
