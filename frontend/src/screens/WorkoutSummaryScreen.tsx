import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useWorkout } from '../hooks/useWorkout';
import { useWorkouts } from '../hooks/useWorkouts';
import { pickQuote } from '../data/quotes';
import { DeltaCard, StatCard } from '../components/StatCards';
import { useUnit } from '../context/UnitContext';
import type { Workout, WorkoutExercise } from '../types';

interface WorkoutSummaryScreenProps {
  workoutId: string;
  onContinue: () => void;
}

const MONTH_MS = 25 * 24 * 60 * 60 * 1000;

function parseUtc(value: string): number {
  const raw = value.endsWith('Z') ? value : value + 'Z';
  return new Date(raw).getTime();
}

function parseDate(value: string): number {
  // YYYY-MM-DD → UTC midnight ms
  return new Date(value + 'T00:00:00Z').getTime();
}

function exerciseVolume(ex: WorkoutExercise): number {
  return ex.sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
}

function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

function topSetWeight(ex: WorkoutExercise): number {
  return ex.sets.reduce((max, s) => Math.max(max, s.weight || 0), 0);
}

function repsAvg(ex: WorkoutExercise): number {
  if (ex.sets.length === 0) return 0;
  return Math.round(ex.sets.reduce((sum, s) => sum + (s.reps || 0), 0) / ex.sets.length);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '<1m';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return '<1m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface ExerciseRow {
  ex: WorkoutExercise;
  vol: number;
  repsAvg: number;
  isPr: boolean;
}

export function WorkoutSummaryScreen({ workoutId, onContinue }: WorkoutSummaryScreenProps) {
  const { data, loading, error } = useWorkout(workoutId);
  const { data: allWorkouts } = useWorkouts();
  const unit = useUnit();

  const stats = useMemo(() => {
    if (!data) return null;

    const volume = workoutVolume(data);

    const start = parseUtc(data.created_at);
    const end = data.completed_at ? parseUtc(data.completed_at) : Date.now();
    const duration = formatDuration(end - start);

    let setsTotal = 0;
    let setsDone = 0;
    for (const ex of data.exercises) {
      for (const s of ex.sets) {
        setsTotal += 1;
        if ((s.weight || 0) > 0 && (s.reps || 0) > 0) setsDone += 1;
      }
    }

    const others = (allWorkouts ?? []).filter(
      (w) => w._id !== data._id && w.status === 'completed',
    );
    const currentDate = parseDate(data.date);
    const sameName = others
      .filter((w) => w.name.toLowerCase() === data.name.toLowerCase())
      .map((w) => ({ w, date: parseDate(w.date) }))
      .filter(({ date }) => date < currentDate)
      .sort((a, b) => b.date - a.date);

    const lastSession = sameName[0]?.w ?? null;
    const lastMonth =
      sameName.find(({ date }) => currentDate - date >= MONTH_MS)?.w ?? null;

    function pct(prev: Workout | null): number | null {
      if (!prev) return null;
      const prevVol = workoutVolume(prev);
      if (prevVol <= 0) return null;
      return Math.round(((volume - prevVol) / prevVol) * 100);
    }

    const lastSessionDelta = pct(lastSession);
    const lastMonthDelta = pct(lastMonth);

    const priorTopByExercise = new Map<string, number>();
    const exercisesWithPrior = new Set<string>();
    for (const w of others) {
      for (const o of w.exercises) {
        exercisesWithPrior.add(o.exercise_id);
        const top = topSetWeight(o);
        const cur = priorTopByExercise.get(o.exercise_id) ?? 0;
        if (top > cur) priorTopByExercise.set(o.exercise_id, top);
      }
    }

    const rows: ExerciseRow[] = data.exercises.map((ex) => {
      const top = topSetWeight(ex);
      const priorTop = priorTopByExercise.get(ex.exercise_id) ?? 0;
      const hasPrior = exercisesWithPrior.has(ex.exercise_id);
      const isPr = top > 0 && hasPrior && top > priorTop;
      return { ex, vol: exerciseVolume(ex), repsAvg: repsAvg(ex), isPr };
    });

    return {
      volume,
      duration,
      setsDone,
      setsTotal,
      lastSessionDelta,
      lastMonthDelta,
      rows,
    };
  }, [data, allWorkouts]);

  const quote = useMemo(() => pickQuote(workoutId), [workoutId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface">
        <div className="font-label text-sm uppercase tracking-widest text-secondary/60 animate-pulse">
          Loading…
        </div>
      </div>
    );
  }

  if (error || !data || !stats) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-6">
        <p className="font-body text-center text-secondary">Couldn't load workout.</p>
        <button
          type="button"
          onClick={onContinue}
          className="font-label text-sm font-semibold uppercase tracking-wider text-primary"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-container to-on-surface px-6 pb-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onContinue}
            aria-label="Back"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-on-primary/90 active:scale-90 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.25em] text-on-primary/80">
            Workout Complete
          </p>
          <span className="h-10 w-10" aria-hidden />
        </div>

        <div className="mt-10">
          <h1 className="font-headline text-5xl font-extrabold uppercase leading-[0.95] tracking-tighter text-on-primary">
            {data.name}
          </h1>
        </div>

        <p className="mt-12 line-clamp-3 font-body text-sm italic leading-snug text-on-primary/85">
          “{quote}”
        </p>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-md px-6 pb-12 pt-8">
        {/* Total volume + deltas */}
        <section className="mb-6">
          <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
            Total Volume
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-headline text-5xl font-extrabold leading-none tracking-tighter text-on-surface">
              {Math.round(stats.volume).toLocaleString()}
            </span>
            <span className="font-label text-base font-semibold text-secondary/70">{unit}</span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <DeltaCard delta={stats.lastSessionDelta} caption="vs last session" />
            <DeltaCard delta={stats.lastMonthDelta} caption="vs last month" />
          </div>
        </section>

        {/* Secondary stats */}
        <section className="mb-10 grid grid-cols-2 gap-3">
          <StatCard label="Duration" value={stats.duration} />
          <StatCard label="Sets" value={`${stats.setsDone} / ${stats.setsTotal}`} />
        </section>

        {/* Breakdown */}
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="font-headline text-2xl font-extrabold uppercase leading-none tracking-tighter text-on-surface">
              Exercise<br />Breakdown
            </h2>
            <p className="font-label pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
              {stats.rows.length} {stats.rows.length === 1 ? 'Exercise' : 'Exercises'}
            </p>
          </div>

          <div className="space-y-3">
            {stats.rows.map((row, i) => (
              <div
                key={row.ex.exercise_id + i}
                className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-lowest px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline truncate text-lg font-extrabold leading-tight text-primary">
                      {row.ex.name}
                    </h3>
                    {row.isPr && (
                      <span className="shrink-0 rounded-full bg-primary-fixed px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                        PR
                      </span>
                    )}
                  </div>
                  <p className="font-label mt-1 text-xs font-semibold text-secondary/70">
                    {row.ex.sets.length} {row.ex.sets.length === 1 ? 'Set' : 'Sets'} • {row.repsAvg} Reps Avg
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <p className="font-headline text-2xl font-extrabold leading-none text-on-surface">
                      {row.vol > 0 ? Math.round(row.vol).toLocaleString() : '—'}
                    </p>
                    {row.vol > 0 && (
                      <span className="font-label text-xs font-semibold text-secondary/70">{unit}</span>
                    )}
                  </div>
                  <p className="font-label mt-1 text-[9px] font-bold uppercase tracking-widest text-secondary/60">
                    Volume
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Continue */}
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary-container py-6 font-headline text-xl font-extrabold uppercase tracking-[0.1em] text-on-primary transition-transform active:scale-95"
          style={{ boxShadow: '0 12px 40px rgba(187,21,44,0.2)' }}
        >
          Continue
        </button>
      </main>
    </div>
  );
}

