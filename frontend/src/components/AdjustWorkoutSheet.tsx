import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { adjustWorkout } from '../api/workouts';
import type { WorkoutExercise } from '../types';

interface AdjustWorkoutSheetProps {
  open: boolean;
  workoutId: string;
  onApply: (exercises: WorkoutExercise[]) => void;
  onClose: () => void;
}

export function AdjustWorkoutSheet({ open, workoutId, onApply, onClose }: AdjustWorkoutSheetProps) {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    } else {
      setInstruction('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function handleSend() {
    if (!instruction.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await adjustWorkout(workoutId, instruction.trim());
      onApply(updated.exercises);
      onClose();
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
  }

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
        className={`fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-surface-container-lowest transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-outline-variant/50" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div>
            <p className="font-label text-[9px] font-bold uppercase tracking-[0.2em] text-secondary/60">
              AI Trainer
            </p>
            <h2 className="font-headline text-xl font-extrabold uppercase tracking-tight text-on-surface">
              Adjust Workout
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-secondary active:bg-surface-container transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input */}
        <div className="px-6 pb-4">
          <textarea
            ref={textareaRef}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="e.g. My shoulder hurts, swap overhead press for lateral raises…"
            rows={3}
            className="w-full resize-none rounded-2xl bg-surface-container px-4 py-3 font-body text-sm text-on-surface placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          />
          {error && (
            <p className="mt-2 font-label text-xs text-primary">{error}</p>
          )}
        </div>

        {/* Send button */}
        <div className="px-6">
          <button
            type="button"
            onClick={handleSend}
            disabled={!instruction.trim() || loading}
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-4 font-headline text-base font-extrabold uppercase tracking-[0.1em] text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ boxShadow: '0 8px 32px rgba(187,21,44,0.18)' }}
          >
            {loading ? 'Updating…' : 'Update Workout'}
          </button>
        </div>
      </div>
    </>
  );
}
