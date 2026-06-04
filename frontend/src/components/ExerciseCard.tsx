import { SetRow } from './SetRow';
import { useUnit } from '../context/UnitContext';
import type { LocalSet, WorkoutExercise } from '../types';

interface ExerciseCardProps {
  name: string;
  sets: LocalSet[];
  target: WorkoutExercise | null;
  isCurrent: boolean;
  reasoning?: string;
  coach_note?: string;
  onChange: (sets: LocalSet[]) => void;
}

function targetLabel(target: WorkoutExercise | null): string {
  if (!target || target.sets.length === 0) return '';
  const normalSets = target.sets.filter((s) => s.set_type !== 'drop');
  const count = normalSets.length;
  if (count === 0) return '';
  const repValues = normalSets.map((s) => s.reps);
  const minReps = Math.min(...repValues);
  const maxReps = Math.max(...repValues);
  const repStr = minReps === maxReps ? String(minReps) : `${minReps}–${maxReps}`;
  const dropCount = target.sets.length - count;
  const dropSuffix = dropCount > 0 ? ` + ${dropCount} drop` : '';
  return `Target: ${count} sets • ${repStr} reps${dropSuffix}`;
}

type SetGroup = { normalIdx: number; dropIdxs: number[] };

function buildSetGroups(sets: LocalSet[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (let i = 0; i < sets.length; i++) {
    if (sets[i].set_type !== 'drop') {
      const group: SetGroup = { normalIdx: i, dropIdxs: [] };
      let j = i + 1;
      while (j < sets.length && sets[j].set_type === 'drop') {
        group.dropIdxs.push(j);
        j++;
      }
      groups.push(group);
    }
  }
  return groups;
}

function exerciseVolume(sets: LocalSet[]): number {
  return sets
    .filter((s) => s.done)
    .reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
}

export function ExerciseCard({
  name,
  sets,
  target,
  isCurrent,
  reasoning,
  coach_note,
  onChange,
}: ExerciseCardProps) {
  const unit = useUnit();
  const vol = exerciseVolume(sets);
  const label = targetLabel(target);

  function updateSet(index: number, weight: string, reps: string) {
    const next = sets.map((s, i) => (i === index ? { ...s, weight, reps } : s));
    onChange(next);
  }

  function toggleDone(index: number) {
    const next = sets.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    onChange(next);
  }

  return (
    <div
      className={`rounded-2xl bg-surface-container-lowest p-5 transition-opacity ${
        isCurrent ? '' : 'opacity-55'
      }`}
      style={
        isCurrent
          ? { boxShadow: '0 4px 24px rgba(187,21,44,0.07)' }
          : undefined
      }
    >
      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3 className="font-headline text-xl font-extrabold uppercase leading-tight tracking-tighter text-on-surface">
          {name}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {isCurrent && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
              Current
            </span>
          )}
          {vol > 0 && (
            <span className="font-label text-[10px] font-semibold text-secondary/60">
              {vol.toLocaleString()} {unit}
            </span>
          )}
        </div>
      </div>

      {label && (
        <p className="font-label mb-1 text-[10px] font-semibold uppercase tracking-wider text-secondary/60">
          {label}
        </p>
      )}

      {reasoning && (
        <p className="font-label mb-1 text-[10px] leading-snug text-secondary/50">
          {reasoning}
        </p>
      )}

      {coach_note && (
        <p className="font-label mb-4 text-[10px] font-semibold uppercase tracking-wide leading-snug text-primary/70">
          Coach: {coach_note}
        </p>
      )}

      {!reasoning && !coach_note && label && <div className="mb-4" />}

      {/* Set rows */}
      <div className="space-y-2">
        {buildSetGroups(sets).map((group) => {
          const normalCount = sets.slice(0, group.normalIdx).filter((s) => s.set_type !== 'drop').length + 1;
          if (group.dropIdxs.length === 0) {
            return (
              <div key={group.normalIdx} className="rounded-xl p-2">
                <SetRow
                  setNumber={normalCount}
                  weight={sets[group.normalIdx].weight}
                  reps={sets[group.normalIdx].reps}
                  done={sets[group.normalIdx].done}
                  onChange={(w, r) => updateSet(group.normalIdx, w, r)}
                  onToggleDone={() => toggleDone(group.normalIdx)}
                />
              </div>
            );
          }
          return (
            <div key={group.normalIdx} className="rounded-xl bg-primary/5 p-2 space-y-2">
              <SetRow
                setNumber={normalCount}
                weight={sets[group.normalIdx].weight}
                reps={sets[group.normalIdx].reps}
                done={sets[group.normalIdx].done}
                onChange={(w, r) => updateSet(group.normalIdx, w, r)}
                onToggleDone={() => toggleDone(group.normalIdx)}
              />
              {group.dropIdxs.map((idx) => (
                <SetRow
                  key={idx}
                  setNumber={normalCount}
                  weight={sets[idx].weight}
                  reps={sets[idx].reps}
                  done={sets[idx].done}
                  is_drop
                  onChange={(w, r) => updateSet(idx, w, r)}
                  onToggleDone={() => toggleDone(idx)}
                />
              ))}
            </div>
          );
        })}
      </div>

    </div>
  );
}
