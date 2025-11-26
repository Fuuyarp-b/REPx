
export type MuscleGroup = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';

export type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Custom';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number | '';
  weight: number | '';
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  targetReps: string; // e.g., "8-12"
  sets: WorkoutSet[];
  note?: string;
}

export interface WorkoutSession {
  id: string;
  type: WorkoutType;
  title: string;
  date: string;
  startTime?: number;
  endTime?: number;
  exercises: Exercise[];
  status: 'active' | 'completed';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface UserProfile {
  username: string;
  displayName: string;
  age: string;
  weight: string;
  height: string;
}
