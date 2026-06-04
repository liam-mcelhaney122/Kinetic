import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { TopAppBar } from '../components/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { WorkoutCard } from '../components/WorkoutCard';
import { StartButton } from '../components/StartButton';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { NewWorkoutModal } from '../components/NewWorkoutModal';
import { useWorkouts } from '../hooks/useWorkouts';
import { deleteWorkout } from '../api/workouts';

interface StartWorkoutScreenProps {
  onOpenWorkout: (id: string) => void;
  onNavigateMetrics: () => void;
  onNavigateProfile: () => void;
}

export function StartWorkoutScreen({ onOpenWorkout, onNavigateMetrics, onNavigateProfile }: StartWorkoutScreenProps) {
  const { data, loading, error, refresh } = useWorkouts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);

  const activeWorkouts = useMemo(
    () => (data ?? []).filter((w) => w.status === 'active'),
    [data],
  );

  const highlightedId = useMemo(() => {
    if (activeWorkouts.length > 0) return activeWorkouts[0]._id;
    return null;
  }, [activeWorkouts]);

  const effectiveSelectedId = selectedId ?? highlightedId;
  const selectedWorkout = activeWorkouts.find((w) => w._id === effectiveSelectedId) ?? null;

  const isEmpty = !loading && !error && activeWorkouts.length === 0;

  return (
    <div className="min-h-dvh bg-surface">
      <TopAppBar />

      <main
        className="mx-auto max-w-md px-6 pb-32"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5.5rem)' }}
      >
        <section className="mb-10">
          <h2 className="font-headline mb-4 text-5xl font-extrabold leading-[0.9] tracking-tighter text-on-surface">
            READY TO
            <br />
            <span className="text-primary">TRAIN?</span>
          </h2>
          <p className="font-body max-w-[280px] text-lg leading-snug text-secondary">
            Select your focus for today's session.
          </p>
        </section>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowNewWorkoutModal(true)}
            className="flex items-center gap-2 rounded-full border-2 border-outline-variant px-5 py-2.5 font-label text-sm font-semibold uppercase tracking-wider text-secondary transition-transform active:scale-95"
          >
            New Workout
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <section className="mb-12">
          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <EmptyState
              title="Couldn't reach the server"
              message="Make sure the Kinetic API is running and try again."
            />
          )}

          {isEmpty && (
            <EmptyState
              title="No active workouts"
              message="Tap New Workout to generate a personalised session."
            />
          )}

          {!loading && !error && activeWorkouts.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {activeWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout._id}
                  workout={workout}
                  highlighted={workout._id === highlightedId && selectedId === null}
                  selected={workout._id === selectedId}
                  onSelect={() => setSelectedId(workout._id)}
                  onDelete={async () => {
                    await deleteWorkout(workout._id);
                    if (selectedId === workout._id) setSelectedId(null);
                    refresh();
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mb-8">
          <StartButton
            label="Resume Workout"
            disabled={loading || !selectedWorkout}
            onClick={() => {
              if (selectedWorkout) onOpenWorkout(selectedWorkout._id);
            }}
          />
          <p className="font-label mt-6 text-center text-[10px] uppercase tracking-widest text-secondary opacity-60">
            Performance tracking active
          </p>
        </div>
      </main>

      <BottomNav
        active="train"
        onSelect={(tab) => {
          if (tab === 'metrics') onNavigateMetrics();
          if (tab === 'profile') onNavigateProfile();
        }}
      />

      <NewWorkoutModal
        open={showNewWorkoutModal}
        onClose={() => setShowNewWorkoutModal(false)}
        onCreated={(workout) => onOpenWorkout(workout._id)}
      />
    </div>
  );
}
