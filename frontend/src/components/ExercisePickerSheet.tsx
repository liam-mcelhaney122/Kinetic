import { Check, X } from 'lucide-react';
import type { Exercise } from '../types';

interface ExercisePickerSheetProps {
  open: boolean;
  exercises: Exercise[];
  selectedId: string | null;
  onSelect: (ex: Exercise) => void;
  onClose: () => void;
}

export function ExercisePickerSheet({
  open,
  exercises,
  selectedId,
  onSelect,
  onClose,
}: ExercisePickerSheetProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[80dvh] max-w-md flex-col rounded-t-3xl bg-surface-container-lowest transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-outline-variant/50" />
        </div>

        <div className="flex items-center justify-between px-6 pb-3">
          <h2 className="font-headline text-2xl font-bold text-on-surface">Choose Exercise</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-secondary active:bg-surface-container"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto px-3 pb-2">
          {exercises.map((ex) => {
            const isSelected = ex._id === selectedId;
            return (
              <li key={ex._id}>
                <button
                  type="button"
                  onClick={() => onSelect(ex)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors active:scale-[0.99] ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <span
                    className={`font-headline text-base font-bold ${
                      isSelected ? 'text-primary' : 'text-on-surface'
                    }`}
                  >
                    {ex.name}
                  </span>
                  {isSelected && (
                    <Check className="h-5 w-5 shrink-0 text-primary" strokeWidth={2.5} />
                  )}
                </button>
              </li>
            );
          })}
          {exercises.length === 0 && (
            <li className="px-4 py-6 text-center font-body text-sm text-secondary">
              No exercises yet.
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
