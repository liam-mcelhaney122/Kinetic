import { useEffect, useRef, useState, useCallback } from 'react';
import { ActiveTopAppBar } from '../components/ActiveTopAppBar';
import { AdjustWorkoutSheet } from '../components/AdjustWorkoutSheet';
import { ExerciseCard } from '../components/ExerciseCard';
import { useWorkout } from '../hooks/useWorkout';
import { updateWorkout, completeWorkoutApi } from '../api/workouts';
import type { LocalExercise, LocalSet, WorkoutExercise } from '../types';

interface ActiveWorkoutScreenProps {
  workoutId: string;
  onBack: () => void;
  onFinished: (workoutId: string) => void;
}

// done-state persistence: keyed by workoutId so it survives navigation within the session
const doneKey = (id: string) => `kinetic:done:${id}`;

function saveDoneState(workoutId: string, exercises: LocalExercise[]) {
  const state: Record<string, boolean[]> = {};
  exercises.forEach((ex) => {
    state[ex.exercise_id] = ex.sets.map((s) => s.done);
  });
  localStorage.setItem(doneKey(workoutId), JSON.stringify(state));
}

function loadDoneState(workoutId: string): Record<string, boolean[]> {
  try {
    const raw = localStorage.getItem(doneKey(workoutId));
    return raw ? (JSON.parse(raw) as Record<string, boolean[]>) : {};
  } catch {
    return {};
  }
}

function clearDoneState(workoutId: string) {
  localStorage.removeItem(doneKey(workoutId));
}

function toLocal(exercises: WorkoutExercise[], doneState: Record<string, boolean[]> = {}): LocalExercise[] {
  return exercises.map((ex) => ({
    exercise_id: ex.exercise_id,
    name: ex.name,
    reasoning: ex.reasoning,
    coach_note: ex.coach_note,
    superset_id: ex.superset_id,
    sets: ex.sets.map((s, i) => ({
      weight: s.weight > 0 ? String(s.weight) : '',
      reps: s.reps > 0 ? String(s.reps) : '',
      done: doneState[ex.exercise_id]?.[i] ?? false,
      set_type: s.set_type ?? 'normal',
    })),
  }));
}

// Merges an adjusted workout response with current local state, preserving
// user-entered weights, reps, and done status for exercises that still exist.
function mergeWithLocal(current: LocalExercise[], updated: WorkoutExercise[]): LocalExercise[] {
  const byId = new Map(current.map((ex) => [ex.exercise_id, ex]));
  return updated.map((ex) => {
    const existing = byId.get(ex.exercise_id);
    return {
      exercise_id: ex.exercise_id,
      name: ex.name,
      reasoning: ex.reasoning,
      coach_note: ex.coach_note,
      superset_id: ex.superset_id,
      sets: ex.sets.map((s, i) => {
        const local = existing?.sets[i];
        if (local) return { ...local, set_type: s.set_type ?? 'normal' };
        return {
          weight: s.weight > 0 ? String(s.weight) : '',
          reps: s.reps > 0 ? String(s.reps) : '',
          done: false,
          set_type: s.set_type ?? 'normal',
        };
      }),
    };
  });
}

function toApi(exercises: LocalExercise[]): WorkoutExercise[] {
  return exercises.map((ex) => ({
    exercise_id: ex.exercise_id,
    name: ex.name,
    reasoning: ex.reasoning ?? '',
    coach_note: ex.coach_note ?? '',
    superset_id: ex.superset_id ?? null,
    sets: ex.sets.map((s) => ({
      weight: parseFloat(s.weight) || 0,
      reps: parseInt(s.reps) || 0,
      set_type: s.set_type,
    })),
  }));
}

type ExerciseGroup =
  | { kind: 'single'; ex: LocalExercise; idx: number }
  | { kind: 'superset'; id: string; entries: { ex: LocalExercise; idx: number }[] };

function buildGroups(exercises: LocalExercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  const seen = new Map<string, ExerciseGroup & { kind: 'superset' }>();
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const sid = ex.superset_id ?? null;
    if (!sid) {
      groups.push({ kind: 'single', ex, idx: i });
    } else if (seen.has(sid)) {
      seen.get(sid)!.entries.push({ ex, idx: i });
    } else {
      const g: ExerciseGroup & { kind: 'superset' } = { kind: 'superset', id: sid, entries: [{ ex, idx: i }] };
      seen.set(sid, g);
      groups.push(g);
    }
  }
  return groups;
}

function currentExerciseIndex(exercises: LocalExercise[]): number {
  const idx = exercises.findIndex((ex) => ex.sets.some((s) => !s.done));
  return idx === -1 ? exercises.length - 1 : idx;
}

function totalVolume(exercises: LocalExercise[]): number {
  return exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets
        .filter((s) => s.done)
        .reduce((s2, s) => s2 + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0),
    0,
  );
}

export function ActiveWorkoutScreen({ workoutId, onBack, onFinished }: ActiveWorkoutScreenProps) {
  const { data, loading, error } = useWorkout(workoutId);

  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const targets = useRef<WorkoutExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  // Initialize local state once data loads, restoring any persisted done state
  useEffect(() => {
    if (!data || initialized.current) return;
    initialized.current = true;
    targets.current = data.exercises;
    setExercises(toLocal(data.exercises, loadDoneState(workoutId)));

    const raw = data.created_at.endsWith('Z') ? data.created_at : data.created_at + 'Z';
    const start = new Date(raw).getTime();
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
  }, [data, workoutId]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Debounced auto-save
  const scheduleAutoSave = useCallback(
    (updated: LocalExercise[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateWorkout(workoutId, toApi(updated)).catch(() => {});
      }, 1500);
    },
    [workoutId],
  );

  function updateExercise(index: number, sets: LocalSet[]) {
    const next = exercises.map((ex, i) => (i === index ? { ...ex, sets } : ex));
    setExercises(next);
    scheduleAutoSave(next);
    saveDoneState(workoutId, next);
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      await completeWorkoutApi(workoutId, toApi(exercises));
      clearDoneState(workoutId);
      onFinished(workoutId);
    } catch {
      setFinishing(false);
    }
  }

  const currentIdx = currentExerciseIndex(exercises);
  const volume = totalVolume(exercises);
  const workoutName = data?.name ?? '';

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <div className="font-label text-sm uppercase tracking-widest text-secondary/60 animate-pulse">
          Loading…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6">
        <p className="font-body text-center text-secondary">Couldn't load workout.</p>
        <button
          type="button"
          onClick={onBack}
          className="font-label text-sm font-semibold uppercase tracking-wider text-primary"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      <ActiveTopAppBar
        workoutName={workoutName}
        totalVolume={volume}
        elapsedSeconds={elapsedSeconds}
        onBack={onBack}
        onAdjust={() => setAdjustOpen(true)}
      />

      <main
        className="mx-auto max-w-md px-4 pb-36"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)' }}
      >
        {/* Exercise counter */}
        <div className="mb-6 flex items-center gap-3">
          <h2 className="font-headline text-4xl font-extrabold uppercase tracking-tighter text-on-surface">
            {workoutName}
          </h2>
          <span className="shrink-0 rounded-full bg-surface-container px-3 py-1 font-label text-xs font-bold uppercase tracking-wider text-secondary">
            {currentIdx + 1} / {exercises.length}
          </span>
        </div>

        {/* Exercise cards (grouped by superset_id) */}
        <div className="space-y-4">
          {buildGroups(exercises).map((group) => {
            if (group.kind === 'single') {
              const { ex, idx } = group;
              return (
                <ExerciseCard
                  key={ex.exercise_id + idx}
                  name={ex.name}
                  sets={ex.sets}
                  target={targets.current[idx] ?? null}
                  isCurrent={idx === currentIdx}
                  reasoning={ex.reasoning}
                  coach_note={ex.coach_note}
                  onChange={(sets) => updateExercise(idx, sets)}
                />
              );
            }
            // superset group
            const groupActive = group.entries.some((e) => e.idx === currentIdx);
            return (
              <div key={`ss-${group.id}`} className="rounded-2xl border-2 border-secondary/20 overflow-hidden">
                <p className="px-4 py-2 font-label text-[10px] font-bold uppercase tracking-widest text-secondary/60 bg-surface-container">
                  Superset {group.id}
                </p>
                <div className="space-y-px">
                  {group.entries.map(({ ex, idx }) => (
                    <ExerciseCard
                      key={ex.exercise_id + idx}
                      name={ex.name}
                      sets={ex.sets}
                      target={targets.current[idx] ?? null}
                      isCurrent={groupActive}
                      reasoning={ex.reasoning}
                      coach_note={ex.coach_note}
                      onChange={(sets) => updateExercise(idx, sets)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Finish button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-6 font-headline text-xl font-extrabold uppercase tracking-[0.1em] text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ boxShadow: '0 12px 40px rgba(187,21,44,0.2)' }}
          >
            {finishing ? 'Saving…' : 'Finish Workout'}
          </button>
        </div>
      </main>

      <AdjustWorkoutSheet
        open={adjustOpen}
        workoutId={workoutId}
        onApply={(updatedExercises) => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          const merged = mergeWithLocal(exercises, updatedExercises);
          setExercises(merged);
          saveDoneState(workoutId, merged);
          setAdjustOpen(false);
        }}
        onClose={() => setAdjustOpen(false)}
      />
    </div>
  );
}
