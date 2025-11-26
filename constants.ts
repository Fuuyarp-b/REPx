
import { Exercise } from './types';

export const createSets = (count: number): any[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: crypto.randomUUID(),
    setNumber: i + 1,
    reps: '',
    weight: '',
    completed: false,
  }));
};

export const MOTIVATIONAL_QUOTES = [
  "ความสม่ำเสมอคือกุญแจสู่ความสำเร็จ",
  "อย่าหยุดเมื่อคุณเหนื่อย หยุดเมื่อคุณทำสำเร็จ",
  "ความเจ็บปวดในวันนี้ คือความแข็งแกร่งในวันหน้า",
  "ไม่มีทางลัดสู่ความสำเร็จ มีแต่ต้องลงมือทำ",
  "วินัยคือสิ่งที่ทำให้คุณทำ ในสิ่งที่คุณไม่อยากทำ",
  "เหงื่อคือน้ำตาของไขมัน",
  "ร่างกายของคุณทำได้ทุกอย่าง มีแต่ใจของคุณที่ต้องเชื่อ",
  "คู่แข่งที่น่ากลัวที่สุด คือตัวคุณเองในเมื่อวาน",
  "อย่าอ้างว่าไม่มีเวลา ถ้าเรื่องนั้นสำคัญพอ คุณจะหาเวลาให้มันเอง",
  "โฟกัสที่ผลลัพธ์ แล้วความเจ็บปวดจะหายไป",
  "ทุกครั้งที่ยก คือการบอกลาร่างกายเดิม",
  "วันนี้เจ็บ พรุ่งนี้แกร่ง",
  "อย่ารอให้พร้อม เพราะคุณจะไม่มีวันพร้อม ลงมือทำเลย!",
  "เป้าหมายมีไว้พุ่งชน ไม่ใช่มีไว้แค่มอง",
  "คนเก่งไม่สำคัญ เท่ากับคนที่มีวินัย",
  "อยากหุ่นดีต้องอดทน อยากจนให้ทำตัวขี้เกียจ (หยอกๆ)",
  "ชัยชนะที่ยิ่งใหญ่ที่สุด คือการชนะใจตัวเอง"
];

// Cool and Cute Avatars from DiceBear
export const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Aneka&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Alexander&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Willow&backgroundColor=d1d4f9",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Ryan&backgroundColor=ffd5dc",
  "https://api.dicebear.com/9.x/adventurer/svg?seed=Nala&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Robot01&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Robot02&backgroundColor=b6e3f4",
];

export const PUSH_ROUTINE: Exercise[] = [
  {
    id: 'push-1',
    name: 'Barbell Bench Press',
    muscleGroup: 'Chest',
    targetSets: 4,
    targetReps: '8-10',
    sets: createSets(4),
    note: 'เน้นลงช้าๆ โฟกัสที่หน้าอก'
  },
  {
    id: 'push-2',
    name: 'Overhead Press',
    muscleGroup: 'Shoulders',
    targetSets: 3,
    targetReps: '8-12',
    sets: createSets(3),
  },
  {
    id: 'push-3',
    name: 'Incline Dumbbell Press',
    muscleGroup: 'Chest',
    targetSets: 3,
    targetReps: '10-12',
    sets: createSets(3),
  },
  {
    id: 'push-4',
    name: 'Lateral Raises',
    muscleGroup: 'Shoulders',
    targetSets: 4,
    targetReps: '12-15',
    sets: createSets(4),
  },
  {
    id: 'push-5',
    name: 'Tricep Pushdowns',
    muscleGroup: 'Arms',
    targetSets: 3,
    targetReps: '12-15',
    sets: createSets(3),
  }
];

export const PULL_ROUTINE: Exercise[] = [
  {
    id: 'pull-1',
    name: 'Pull Ups / Lat Pulldown',
    muscleGroup: 'Back',
    targetSets: 4,
    targetReps: '8-12',
    sets: createSets(4),
  },
  {
    id: 'pull-2',
    name: 'Barbell Row',
    muscleGroup: 'Back',
    targetSets: 4,
    targetReps: '8-10',
    sets: createSets(4),
  },
  {
    id: 'pull-3',
    name: 'Face Pulls',
    muscleGroup: 'Shoulders',
    targetSets: 3,
    targetReps: '15-20',
    sets: createSets(3),
  },
  {
    id: 'pull-4',
    name: 'Bicep Curls',
    muscleGroup: 'Arms',
    targetSets: 3,
    targetReps: '10-12',
    sets: createSets(3),
  },
  {
    id: 'pull-5',
    name: 'Hammer Curls',
    muscleGroup: 'Arms',
    targetSets: 3,
    targetReps: '10-12',
    sets: createSets(3),
  }
];

export const LEGS_ROUTINE: Exercise[] = [
  {
    id: 'legs-1',
    name: 'Barbell Squat',
    muscleGroup: 'Legs',
    targetSets: 4,
    targetReps: '6-8',
    sets: createSets(4),
    note: 'ระวังหลังตรง ต่ำกว่าเข่าเล็กน้อย'
  },
  {
    id: 'legs-2',
    name: 'Romanian Deadlift',
    muscleGroup: 'Legs',
    targetSets: 3,
    targetReps: '8-10',
    sets: createSets(3),
  },
  {
    id: 'legs-3',
    name: 'Leg Press',
    muscleGroup: 'Legs',
    targetSets: 3,
    targetReps: '10-12',
    sets: createSets(3),
  },
  {
    id: 'legs-4',
    name: 'Leg Extension',
    muscleGroup: 'Legs',
    targetSets: 3,
    targetReps: '12-15',
    sets: createSets(3),
  },
  {
    id: 'legs-5',
    name: 'Calf Raises',
    muscleGroup: 'Legs',
    targetSets: 4,
    targetReps: '15-20',
    sets: createSets(4),
  }
];
