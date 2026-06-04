export type WorkoutStatus = 'planned' | 'active' | 'completed';

export interface LocalSet {
  weight: string;
  reps: string;
  done: boolean;
  set_type: 'normal' | 'drop';
}

export interface LocalExercise {
  exercise_id: string;
  name: string;
  sets: LocalSet[];
  reasoning?: string;
  coach_note?: string;
  superset_id?: string | null;
}

export interface WorkoutSet {
  reps: number;
  weight: number;
  set_type: 'normal' | 'drop';
}

export interface WorkoutExercise {
  exercise_id: string;
  name: string;
  sets: WorkoutSet[];
  reasoning: string;
  coach_note: string;
  superset_id: string | null;
}

export interface Workout {
  _id: string;
  name: string;
  date: string;
  status: WorkoutStatus;
  exercises: WorkoutExercise[];
  created_at: string;
  completed_at: string | null;
}

export interface Exercise {
  _id: string;
  name: string;
  desc?: string | null;
  svg?: string | null;
  created_at: string;
}
