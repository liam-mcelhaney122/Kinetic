import { useState } from 'react';
import { Dumbbell, Clock, ListChecks, Trash2 } from 'lucide-react';
import type { Workout } from '../types';

interface WorkoutCardProps {
  workout: Workout;
  highlighted: boolean;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => Promise<void>;
  past?: boolean;
}

function statusLabel(workout: Workout): string {
  if (workout.status === 'active') return 'In Progress';
  return 'Completed';
}

function durationMinutes(workout: Workout): number | null {
  if (!workout.completed_at) return null;
  const start = new Date(workout.created_at).getTime();
  const end = new Date(workout.completed_at).getTime();
  const mins = Math.round((end - start) / 60_000);
  return mins > 0 ? mins : null;
}

export function WorkoutCard({ workout, highlighted, selected, onSelect, onDelete, past }: WorkoutCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tag = statusLabel(workout);
  const mins = durationMinutes(workout);
  const exerciseCount = workout.exercises.length;
  const isActive = highlighted || selected;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete!();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div
        className={`relative w-full rounded-xl p-6 border-2 border-error/40 bg-surface-container-lowest`}
        style={{ boxShadow: '0 4px 20px rgba(187,21,44,0.06)' }}
      >
        <p className="font-headline mb-5 text-lg font-bold text-on-surface">
          Delete this workout?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
            className="flex-1 rounded-full border-2 border-outline-variant py-3 font-label text-sm font-semibold uppercase tracking-wider text-secondary active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-full bg-error py-3 font-label text-sm font-semibold uppercase tracking-wider text-white active:scale-95 transition-transform disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full text-left rounded-xl p-6 transition-all active:scale-[0.98] ${
        isActive
          ? 'bg-surface-container-lowest border-2 border-primary'
          : 'bg-surface-container-low border-2 border-transparent'
      }`}
      style={isActive ? { boxShadow: '0 12px 40px rgba(187, 21, 44, 0.06)' } : undefined}
    >
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          {!past && (
            <span
              className={`font-label mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] ${
                isActive ? 'text-primary' : 'text-secondary'
              }`}
            >
              {tag}
            </span>
          )}
          <h3
            className={`font-headline truncate text-3xl font-bold text-on-surface ${
              isActive ? '' : 'opacity-60'
            }`}
          >
            {workout.name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
              className="rounded-full p-2 text-secondary/40 transition-colors hover:text-error active:scale-95"
              aria-label="Delete workout"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          <div
            className={`rounded-full p-3 ${
              isActive ? 'bg-primary/10' : 'bg-surface-container-highest'
            }`}
          >
            <Dumbbell
              className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-secondary'}`}
              strokeWidth={2.25}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {mins !== null && (
          <>
            <div className="flex items-center gap-1.5">
              <Clock
                className={`h-3.5 w-3.5 ${isActive ? 'text-secondary' : 'text-secondary/40'}`}
                strokeWidth={2.5}
              />
              <span
                className={`font-label text-xs font-semibold uppercase tracking-wider ${
                  isActive ? 'text-secondary' : 'text-secondary/60'
                }`}
              >
                {mins} mins
              </span>
            </div>
            <div className="h-1 w-1 rounded-full bg-outline-variant/30" />
          </>
        )}
        <div className="flex items-center gap-1.5">
          <ListChecks
            className={`h-3.5 w-3.5 ${isActive ? 'text-secondary' : 'text-secondary/40'}`}
            strokeWidth={2.5}
          />
          <span
            className={`font-label text-xs font-semibold uppercase tracking-wider ${
              isActive ? 'text-secondary' : 'text-secondary/60'
            }`}
          >
            {exerciseCount} {exerciseCount === 1 ? 'Exercise' : 'Exercises'}
          </span>
        </div>
      </div>
    </button>
  );
}
