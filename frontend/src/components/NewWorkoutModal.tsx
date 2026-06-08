import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { generateWorkout } from '../api/workouts';
import type { Workout } from '../types';

interface NewWorkoutModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (workout: Workout) => void;
}

export function NewWorkoutModal({ open, onClose, onCreated }: NewWorkoutModalProps) {
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setGoal('');
    setGenerating(false);
    setError(null);
    onClose();
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const workout = await generateWorkout(goal.trim());
      onCreated(workout);
      setGoal('');
      onClose();
    } catch {
      setError('Failed to generate workout. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={generating ? undefined : handleClose}
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
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-outline-variant/50" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-5">
          <h2 className="font-headline text-2xl font-bold text-on-surface">New Workout</h2>
          <button
            type="button"
            onClick={generating ? undefined : handleClose}
            disabled={generating}
            className="rounded-full p-2 text-secondary active:bg-surface-container disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 space-y-4">
          <div>
            <label className="font-label mb-1.5 block text-xs font-semibold uppercase tracking-widest text-secondary">
              What do you want to work on?
            </label>
            <textarea
              rows={4}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. chest day focused on cables, leg day heavy compounds, upper body hypertrophy…"
              className="w-full resize-none rounded-xl border-2 border-outline-variant bg-surface-container-low px-4 py-3 font-body text-base text-on-surface placeholder:text-secondary/40 focus:border-primary focus:outline-none"
            />
            {error && (
              <p className="mt-1.5 text-xs text-error">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pt-6">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-full border-2 border-outline-variant py-4 font-headline text-sm font-bold uppercase tracking-widest text-secondary active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || goal.trim().length === 0}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-container py-4 font-headline text-sm font-bold uppercase tracking-widest text-on-primary transition-opacity ${
              generating || goal.trim().length === 0
                ? 'opacity-40 cursor-not-allowed'
                : 'active:scale-95'
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : 'Generate'}
          </button>
        </div>
        {generating && (
          <p className="px-6 pt-3 text-center font-label text-xs text-secondary/60">
            Analyzing your history and building your plan…
          </p>
        )}
      </div>
    </>
  );
}
