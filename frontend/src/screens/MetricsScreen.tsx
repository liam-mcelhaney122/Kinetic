import { useMemo, useState } from 'react';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { ExercisePickerChip } from '../components/ExercisePickerChip';
import { ExercisePickerSheet } from '../components/ExercisePickerSheet';
import { MetricsChart, type ChartPoint } from '../components/MetricsChart';
import { DeltaCard, StatCard } from '../components/StatCards';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { useExercises } from '../hooks/useExercises';
import { useWorkouts } from '../hooks/useWorkouts';
import { useUnit } from '../context/UnitContext';
import type { Workout, WorkoutExercise } from '../types';

interface MetricsScreenProps {
  onNavigateStart: () => void;
  onNavigateProfile: () => void;
}

interface SessionPoint {
  workoutId: string;
  date: string;
  topSet: number;
  topSetReps: number;
  totalVolume: number;
  setCount: number;
  repsAvg: number;
}

interface BestSet {
  weight: number;
  reps: number;
}

interface Metrics {
  points: SessionPoint[];
  latestTopSet: number;
  lastSessionDelta: number | null;
  avgVolume: number;
  sessions: number;
  avgReps: number;
  bestSet: BestSet | null;
}

function exerciseTopSet(ex: WorkoutExercise): { weight: number; reps: number } {
  let bestWeight = 0;
  let bestReps = 0;
  for (const s of ex.sets) {
    const w = s.weight || 0;
    const r = s.reps || 0;
    if (w > bestWeight || (w === bestWeight && r > bestReps)) {
      bestWeight = w;
      bestReps = r;
    }
  }
  return { weight: bestWeight, reps: bestReps };
}

function buildMetrics(exerciseId: string, workouts: Workout[]): Metrics {
  const points: SessionPoint[] = [];
  let best: BestSet | null = null;

  for (const w of workouts) {
    if (w.status !== 'completed') continue;
    for (const ex of w.exercises) {
      if (ex.exercise_id !== exerciseId) continue;

      const top = exerciseTopSet(ex);
      const totalVolume = ex.sets.reduce(
        (sum, s) => sum + (s.weight || 0) * (s.reps || 0),
        0,
      );
      const setCount = ex.sets.length;
      const repsAvg =
        setCount === 0
          ? 0
          : Math.round(ex.sets.reduce((sum, s) => sum + (s.reps || 0), 0) / setCount);

      points.push({
        workoutId: w._id,
        date: w.date,
        topSet: top.weight,
        topSetReps: top.reps,
        totalVolume,
        setCount,
        repsAvg,
      });

      for (const s of ex.sets) {
        const wt = s.weight || 0;
        const rp = s.reps || 0;
        if (
          !best ||
          wt > best.weight ||
          (wt === best.weight && rp > best.reps)
        ) {
          best = { weight: wt, reps: rp };
        }
      }
    }
  }

  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const latest = points[points.length - 1] ?? null;
  const previous = points[points.length - 2] ?? null;
  const latestTopSet = latest?.topSet ?? 0;
  const lastSessionDelta =
    latest && previous && previous.topSet > 0
      ? Math.round(((latest.topSet - previous.topSet) / previous.topSet) * 100)
      : null;

  const avgVolume =
    points.length === 0
      ? 0
      : Math.round(points.reduce((s, p) => s + p.totalVolume, 0) / points.length);

  const avgReps =
    points.length === 0
      ? 0
      : Math.round(points.reduce((s, p) => s + p.repsAvg, 0) / points.length);

  return {
    points,
    latestTopSet,
    lastSessionDelta,
    avgVolume,
    sessions: points.length,
    avgReps,
    bestSet: best && best.weight > 0 ? best : null,
  };
}

function pickDefaultExerciseId(workouts: Workout[] | null): string | null {
  if (!workouts) return null;
  for (const w of workouts) {
    if (w.status !== 'completed') continue;
    for (const ex of w.exercises) {
      if (ex.sets.some((s) => (s.weight || 0) > 0)) return ex.exercise_id;
    }
  }
  for (const w of workouts) {
    for (const ex of w.exercises) return ex.exercise_id;
  }
  return null;
}

export function MetricsScreen({ onNavigateStart, onNavigateProfile }: MetricsScreenProps) {
  const { data: exercises, loading: exercisesLoading } = useExercises();
  const { data: workouts, loading: workoutsLoading, error } = useWorkouts();
  const unit = useUnit();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const effectiveId =
    selectedId ?? (workouts ? pickDefaultExerciseId(workouts) : null);

  const selectedExercise = useMemo(() => {
    if (!exercises || !effectiveId) return null;
    return exercises.find((e) => e._id === effectiveId) ?? null;
  }, [exercises, effectiveId]);

  const metrics = useMemo<Metrics | null>(() => {
    if (!workouts || !effectiveId) return null;
    return buildMetrics(effectiveId, workouts);
  }, [workouts, effectiveId]);

  const chartPoints: ChartPoint[] = useMemo(
    () =>
      (metrics?.points ?? []).map((p) => ({
        date: p.date,
        topSet: p.topSet,
        reps: p.topSetReps,
      })),
    [metrics],
  );

  const loading = exercisesLoading || workoutsLoading;

  const exerciseLabel = selectedExercise?.name ?? 'Choose exercise';

  return (
    <div className="min-h-dvh bg-surface">
      <TopAppBar />

      <main
        className="mx-auto max-w-md px-6 pb-32"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5.5rem)' }}
      >
        <h2 className="font-headline mb-4 text-5xl font-extrabold leading-[0.9] tracking-tighter text-on-surface">
          METRICS
        </h2>
        <p className="font-body mb-6 max-w-[280px] text-base leading-snug text-secondary">
          Track every lift across every session.
        </p>

        <div className="mb-6">
          <ExercisePickerChip label={exerciseLabel} onTap={() => setPickerOpen(true)} />
        </div>

        {loading && <LoadingSkeleton />}

        {!loading && error && (
          <EmptyState
            title="Couldn't reach the server"
            message="Make sure the Kinetic API is running and try again."
          />
        )}

        {!loading && !error && metrics && metrics.sessions === 0 && (
          <div className="rounded-2xl bg-surface-container-lowest p-8">
            <p className="font-body text-center text-secondary">
              No history yet for this lift.
            </p>
          </div>
        )}

        {!loading && !error && metrics && metrics.sessions > 0 && (
          <>
            {/* Latest top set + delta */}
            <section className="mb-6">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                Latest Top Set
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-headline text-5xl font-extrabold leading-none tracking-tighter text-on-surface">
                  {metrics.latestTopSet > 0 ? metrics.latestTopSet : '—'}
                </span>
                {metrics.latestTopSet > 0 && (
                  <span className="font-label text-base font-semibold text-secondary/70">{unit}</span>
                )}
              </div>
              <div className="mt-4">
                <DeltaCard delta={metrics.lastSessionDelta} caption="vs last session" />
              </div>
            </section>

            {/* Chart */}
            <section className="mb-6">
              <p className="font-label mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                Weight Over Time
              </p>
              <div className="rounded-2xl bg-surface-container-lowest p-4">
                <MetricsChart points={chartPoints} />
              </div>
            </section>

            {/* Stat grid */}
            <section className="mb-10 grid grid-cols-2 gap-3">
              <StatCard
                label="Avg Volume"
                value={metrics.avgVolume > 0 ? `${Math.round(metrics.avgVolume).toLocaleString()} ${unit}` : '—'}
              />
              <StatCard label="Sessions" value={`${metrics.sessions}`} />
              <StatCard
                label="Avg Reps"
                value={metrics.avgReps > 0 ? `${metrics.avgReps}` : '—'}
              />
              <StatCard
                label="Best Set"
                value={
                  metrics.bestSet
                    ? `${metrics.bestSet.weight}×${metrics.bestSet.reps} ${unit}`
                    : '—'
                }
              />
            </section>
          </>
        )}
      </main>

      <BottomNav
        active="metrics"
        onSelect={(tab) => {
          if (tab === 'train') onNavigateStart();
          if (tab === 'profile') onNavigateProfile();
        }}
      />

      <ExercisePickerSheet
        open={pickerOpen}
        exercises={exercises ?? []}
        selectedId={effectiveId}
        onSelect={(ex) => {
          setSelectedId(ex._id);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
