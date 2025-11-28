
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
  avatarUrl: string; // Added avatar URL
}

export interface NutritionLog {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string; // Optional: base64 preview or url
  date: string; // ISO Date string for grouping
  timestamp: number;
}
