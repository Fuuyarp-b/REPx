import React, { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  User, 
  Play, 
  Bot,
  ChevronLeft,
  LogIn,
  UserPlus,
  Loader2,
  ArrowRight,
  Clock,
  ChevronRight,
  Target,
  Camera,
  Upload,
  Trash2,
  Plus,
  Trophy,
  Medal,
  Flame,
  Star,
  Crown,
  Check,
  Award,
  List,
  BarChart3
} from 'lucide-react';
import { 
  UserProfile, 
  WorkoutSession, 
  ActivityLevel,
  Exercise,
  WorkoutSet,
  WorkoutType,
  Gender,
  Achievement
} from './types';
import { 
  PUSH_ROUTINE, 
  PULL_ROUTINE, 
  LEGS_ROUTINE, 
  MOTIVATIONAL_QUOTES, 
  PRESET_AVATARS,
  createSets
} from './constants';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { AICoachModal } from './components/AICoachModal';
import { ExerciseCard } from './components/ExerciseCard';
import { ConfirmModal } from './components/ConfirmModal';

// Default empty profile
const EMPTY_PROFILE: UserProfile = {
  username: '',
  displayName: '',
  age: '',
  weight: '',
  height: '',
  avatarUrl: PRESET_AVATARS[0],
  gender: 'male',
  activityLevel: 'moderate'
};

const App: React.FC = () => {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // App State
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [view, setView] = useState<'home' | 'profile' | 'history' | 'challenges'>('home');
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  
  // History State
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // History Filter & View Detail State
  const [historyFilter, setHistoryFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [viewingSession, setViewingSession] = useState<WorkoutSession | null>(null);

  // Suggested Exercise State
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('');

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous: boolean;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false
  });

  useEffect(() => {
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  // Fetch history when logged in
  useEffect(() => {
    if (isLoggedIn && isSupabaseConfigured) {
      fetchHistory();
    }
  }, [isLoggedIn]);

  const fetchHistory = async () => {
    if (!userProfile.username) return;
    setLoadingHistory(true);
    
    try {
        const { data, error } = await supabase
            .from('workouts')
            .select('*')
            .eq('user_id', userProfile.username)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching history:', error.message);
        } else {
            const parsedHistory: WorkoutSession[] = (data || []).map(row => ({
                ...row.data,
                id: row.id // Use DB ID
            }));
            setHistory(parsedHistory);
        }
    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        setLoadingHistory(false);
    }
  };

  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);

    // Validation
    if (!userProfile.username.trim()) {
        setAuthError('กรุณากรอกชื่อผู้ใช้ (Username)');
        setAuthLoading(false);
        return;
    }

    if (authMode === 'register') {
        if (!userProfile.displayName || !userProfile.age || !userProfile.weight || !userProfile.height) {
            setAuthError('กรุณากรอกข้อมูลให้ครบถ้วน');
            setAuthLoading(false);
            return;
        }
    }

    try {
        if (!isSupabaseConfigured) {
            // Offline/Demo Mode
            setIsLoggedIn(true);
            setAuthLoading(false);
            return;
        }

        if (authMode === 'login') {
            // Login Logic
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', userProfile.username)
                .single();

            if (error || !data) {
                setAuthError('ไม่พบชื่อผู้ใช้นี้ หรือเกิดข้อผิดพลาด');
            } else {
                setUserProfile({
                    username: data.username,
                    displayName: data.display_name,
                    age: data.age,
                    weight: data.weight,
                    height: data.height,
                    avatarUrl: data.avatar_url || PRESET_AVATARS[0],
                    gender: (data.gender as Gender) || 'male',
                    activityLevel: (data.activity_level as ActivityLevel) || 'moderate'
                });
                setIsLoggedIn(true);
            }
        } else {
            // Register Logic
            // Check if user exists
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', userProfile.username)
                .single();

            if (existingUser) {
                setAuthError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
                setAuthLoading(false);
                return;
            }

            // Create new user
            const { error } = await supabase.from('profiles').insert({
                username: userProfile.username,
                display_name: userProfile.displayName,
                age: userProfile.age,
                weight: userProfile.weight,
                height: userProfile.height,
                avatar_url: userProfile.avatarUrl,
                gender: userProfile.gender,
                activity_level: userProfile.activityLevel
            });

            if (error) {
                setAuthError('ไม่สามารถสร้างบัญชีได้: ' + error.message);
            } else {
                setIsLoggedIn(true);
            }
        }
    } catch (err: any) {
        setAuthError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        console.error(err);
    } finally {
        setAuthLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];

    if (!isSupabaseConfigured) {
        setAuthError('⚠️ ต้องเชื่อมต่อ Supabase ก่อนจึงจะอัปโหลดรูปได้');
        return;
    }
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
        setAuthError('⚠️ รูปภาพต้องมีขนาดไม่เกิน 2MB');
        return;
    }

    setAuthLoading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userProfile.username || 'temp'}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        // Add timestamp to bypass cache
        const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
        
        setUserProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
        
        // If already logged in, update DB immediately
        if (isLoggedIn && userProfile.username) {
             await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('username', userProfile.username);
        }

    } catch (error: any) {
        console.error('Upload error:', error);
        setAuthError('อัปโหลดรูปไม่สำเร็จ: ' + (error.message || 'Unknown error'));
    } finally {
        setAuthLoading(false);
        // Clear input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Helper to get last weight for a specific exercise name
  const getLastWeight = (exerciseName: string): number | null => {
      // Find the first session in history (sorted desc) that contains this exercise
      // and has at least one completed set with a weight
      for (const session of history) {
          const ex = session.exercises.find(e => e.name === exerciseName);
          if (ex) {
              const completedSets = ex.sets.filter(s => s.completed && s.weight && Number(s.weight) > 0);
              if (completedSets.length > 0) {
                  // Find the max weight used in that session
                  const weights = completedSets.map(s => Number(s.weight));
                  return Math.max(...weights);
              }
          }
      }
      return null;
  };

  const startWorkout = (type: WorkoutType, routine: Exercise[]) => {
    let initialExercises: Exercise[] = [];

    if (type === 'Custom') {
        // Initialize Custom workout with one default exercise to avoid empty screen confusion
        initialExercises = [{
            id: crypto.randomUUID(),
            name: 'ท่าออกกำลังกายใหม่ (แตะเพื่อแก้ไข)',
            muscleGroup: 'Chest', // Default fallback
            targetSets: 3,
            targetReps: '10',
            sets: createSets(3)
        }];
    } else {
        initialExercises = JSON.parse(JSON.stringify(routine));
    }

    const newSession: WorkoutSession = {
      id: crypto.randomUUID(),
      type,
      title: type === 'Custom' ? 'Custom Workout' : `${type} Workout`,
      date: new Date().toISOString(),
      startTime: Date.now(),
      exercises: initialExercises,
      status: 'active'
    };
    setCurrentSession(newSession);
  };

  const endWorkout = () => {
      setConfirmModal({
        isOpen: true,
        title: 'ยกเลิกการฝึกซ้อม?',
        message: 'ข้อมูลการฝึกซ้อมปัจจุบันจะหายไป ยืนยันที่จะกลับสู่หน้าหลักหรือไม่?',
        confirmText: 'กลับหน้าหลัก',
        cancelText: 'ฝึกต่อ',
        isDangerous: true,
        onConfirm: () => {
            setCurrentSession(null);
            setView('home');
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
  };

  const saveWorkout = async () => {
      if (!currentSession) return;
      
      const completedSession: WorkoutSession = {
          ...currentSession,
          endTime: Date.now(),
          status: 'completed'
      };

      // Update Local State
      setHistory(prev => [completedSession, ...prev]);
      
      // Save to Supabase
      if (isSupabaseConfigured) {
          await supabase.from('workouts').insert({
              id: completedSession.id,
              user_id: userProfile.username,
              data: completedSession
          });
      }

      setCurrentSession(null);
      setView('history');
  };

  const updateSet = (exerciseId: string, updatedSet: WorkoutSet) => {
    if (!currentSession) return;
    const updatedExercises = currentSession.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => s.id === updatedSet.id ? updatedSet : s)
        };
      }
      return ex;
    });
    setCurrentSession({ ...currentSession, exercises: updatedExercises });
  };

  const updateExerciseName = (exerciseId: string, newName: string) => {
    if (!currentSession) return;
    const updatedExercises = currentSession.exercises.map(ex => 
      ex.id === exerciseId ? { ...ex, name: newName } : ex
    );
    setCurrentSession({ ...currentSession, exercises: updatedExercises });
  };

  const addSet = (exerciseId: string) => {
    if (!currentSession) return;
    const updatedExercises = currentSession.exercises.map(ex => {
      if (ex.id === exerciseId) {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSetNumber = ex.sets.length + 1;
        const newSet: WorkoutSet = {
          id: crypto.randomUUID(),
          setNumber: newSetNumber,
          reps: lastSet ? lastSet.reps : '',
          weight: lastSet ? lastSet.weight : '',
          completed: false
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      }
      return ex;
    });
    setCurrentSession({ ...currentSession, exercises: updatedExercises });
  };

  const addNewExercise = () => {
      if (!currentSession) return;
      const newExercise: Exercise = {
          id: crypto.randomUUID(),
          name: 'ท่าออกกำลังกายใหม่',
          muscleGroup: 'Chest',
          targetSets: 3,
          targetReps: '10',
          sets: createSets(3)
      };
      setCurrentSession({
          ...currentSession,
          exercises: [...currentSession.exercises, newExercise]
      });
  };

  const removeExercise = (exerciseId: string) => {
    if (!currentSession) return;
    setConfirmModal({
        isOpen: true,
        title: 'ลบท่าออกกำลังกาย',
        message: 'คุณต้องการลบท่านี้ออกจากตารางวันนี้ใช่หรือไม่?',
        isDangerous: true,
        onConfirm: () => {
            const updatedExercises = currentSession.exercises.filter(ex => ex.id !== exerciseId);
            setCurrentSession({ ...currentSession, exercises: updatedExercises });
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  };

  const addSuggestion = (exerciseName: string) => {
      if (!currentSession || !exerciseName) return;
      const newExercise: Exercise = {
          id: crypto.randomUUID(),
          name: exerciseName,
          muscleGroup: 'Chest', // Default
          targetSets: 3,
          targetReps: '10',
          sets: createSets(3)
      };
      setCurrentSession({
          ...currentSession,
          exercises: [...currentSession.exercises, newExercise]
      });
      setSelectedSuggestion('');
  };

  const handleDeleteHistory = (sessionId: string) => {
      setConfirmModal({
          isOpen: true,
          title: 'ลบประวัติการฝึกซ้อม',
          message: 'คุณต้องการลบรายการนี้อย่างถาวรใช่หรือไม่?',
          isDangerous: true,
          confirmText: 'ลบข้อมูล',
          onConfirm: async () => {
              // Optimistic update
              setHistory(prev => prev.filter(s => s.id !== sessionId));
              
              if (isSupabaseConfigured) {
                  const { error } = await supabase.from('workouts').delete().eq('id', sessionId);
                  if (error) {
                      console.error('Error deleting workout:', error);
                      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
                  }
              }
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
              // If we were viewing details of this session, go back to list
              if (viewingSession?.id === sessionId) {
                  setViewingSession(null);
              }
          }
      });
  };

  // --- Logic for Streak and Achievements ---
  const calculateStreak = () => {
      if (history.length === 0) return 0;
      
      const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentStreak = 0;
      let lastDate = today;

      const lastWorkoutDate = new Date(sortedHistory[0].date);
      lastWorkoutDate.setHours(0, 0, 0, 0);
      
      if (lastWorkoutDate.getTime() === today.getTime()) {
          currentStreak = 1;
      } else {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (lastWorkoutDate.getTime() === yesterday.getTime()) {
              currentStreak = 1;
              lastDate = yesterday;
          } else {
              return 0; 
          }
      }

      for (let i = (currentStreak === 1 && lastWorkoutDate.getTime() === today.getTime() ? 1 : 0); i < sortedHistory.length; i++) {
          const sessionDate = new Date(sortedHistory[i].date);
          sessionDate.setHours(0, 0, 0, 0);

          const diffTime = Math.abs(lastDate.getTime() - sessionDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 0) continue; 
          if (diffDays === 1) {
              currentStreak++;
              lastDate = sessionDate;
          } else {
              break;
          }
      }
      return currentStreak;
  };

  // --- Helper Functions for Rendering ---
  
  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return '0 นาที';
    const diff = end - start;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours} ชม. ${mins} นาที`;
    return `${mins} นาที`;
  };

  // --- Render Functions ---

  const renderAuthScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#020617]">
        {/* Animated Background Blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-3">
                <div className="inline-flex bg-gradient-to-tr from-blue-500 to-indigo-600 p-5 rounded-3xl shadow-2xl shadow-blue-500/20 mb-2 transform hover:scale-105 transition-transform duration-500">
                    <Dumbbell className="text-white w-12 h-12" strokeWidth={2.5} />
                </div>
                <h1 className="text-4xl font-extrabold text-white tracking-tighter drop-shadow-lg">
                    REPx <span className="text-blue-500">.</span>
                </h1>
                <p className="text-slate-400 font-medium">บันทึก พัฒนา และก้าวข้ามขีดจำกัด</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
                <div className="flex bg-black/20 p-1.5 rounded-2xl mb-6">
                    <button 
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${authMode === 'login' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-white'}`}
                    >
                        <LogIn size={18} /> เข้าสู่ระบบ
                    </button>
                    <button 
                        onClick={() => { setAuthMode('register'); setAuthError(''); }}
                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${authMode === 'register' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-slate-400 hover:text-white'}`}
                    >
                        <UserPlus size={18} /> สมัครใหม่
                    </button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider mb-2 block">Username</label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={userProfile.username}
                                onChange={(e) => setUserProfile({...userProfile, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                                className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 group-hover:border-white/20"
                                placeholder="ตั้งชื่อผู้ใช้ภาษาอังกฤษ..."
                            />
                            <User className="absolute right-4 top-4 text-slate-600" size={20} />
                        </div>
                    </div>

                    {authMode === 'register' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                             <div>
                                <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider mb-2 block">Display Name</label>
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        value={userProfile.displayName}
                                        onChange={(e) => setUserProfile({...userProfile, displayName: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 group-hover:border-white/20"
                                        placeholder="ชื่อเล่นของคุณ..."
                                    />
                                    <Target className="absolute right-4 top-4 text-slate-600" size={20} />
                                </div>
                            </div>

                            {/* Gender Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider mb-2 block">เพศ</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setUserProfile({...userProfile, gender: 'male'})}
                                        className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${userProfile.gender === 'male' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black/20 border-transparent text-slate-500 hover:bg-black/40'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${userProfile.gender === 'male' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-600'}`} />
                                        ชาย
                                    </button>
                                    <button
                                        onClick={() => setUserProfile({...userProfile, gender: 'female'})}
                                        className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${userProfile.gender === 'female' ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-black/20 border-transparent text-slate-500 hover:bg-black/40'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full ${userProfile.gender === 'female' ? 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-slate-600'}`} />
                                        หญิง
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase mb-1 block">อายุ</label>
                                    <input type="number" value={userProfile.age} onChange={(e) => setUserProfile({...userProfile, age: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-2xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase mb-1 block">นน. (kg)</label>
                                    <input type="number" value={userProfile.weight} onChange={(e) => setUserProfile({...userProfile, weight: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-2xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase mb-1 block">สูง (cm)</label>
                                    <input type="number" value={userProfile.height} onChange={(e) => setUserProfile({...userProfile, height: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-2xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider mb-2 block">ระดับกิจกรรม</label>
                                <div className="relative">
                                    <select 
                                        value={userProfile.activityLevel}
                                        onChange={(e) => setUserProfile({...userProfile, activityLevel: e.target.value as ActivityLevel})}
                                        className="w-full bg-black/20 border border-white/10 text-white rounded-2xl px-4 py-4 appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="sedentary">ไม่ออกกำลังกาย (Sedentary)</option>
                                        <option value="light">ออกเล็กน้อย 1-3 วัน/สัปดาห์</option>
                                        <option value="moderate">ปานกลาง 3-5 วัน/สัปดาห์</option>
                                        <option value="active">หนัก 6-7 วัน/สัปดาห์</option>
                                        <option value="very_active">หนักมาก (นักกีฬา)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <ArrowRight className="rotate-90 text-slate-500" size={16} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider mb-3 flex justify-between items-center">
                                    <span>รูปโปรไฟล์</span>
                                    <button 
                                        onClick={triggerFileInput} 
                                        className="text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors text-[10px] bg-blue-500/10 px-2 py-1 rounded-lg"
                                    >
                                        <Upload size={12} /> อัปโหลดเอง
                                    </button>
                                </label>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    className="hidden" 
                                    accept="image/*"
                                />
                                
                                <div className="flex justify-center mb-6">
                                    <div className="relative w-28 h-28 rounded-full border-4 border-blue-500/50 p-1 bg-gradient-to-tr from-blue-500/20 to-purple-500/20">
                                        <img src={userProfile.avatarUrl} alt="Selected" className="w-full h-full object-cover rounded-full shadow-2xl" />
                                        <button 
                                            onClick={triggerFileInput}
                                            className="absolute bottom-0 right-0 bg-white text-blue-600 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                        >
                                            <Camera size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-3">
                                    {PRESET_AVATARS.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setUserProfile({...userProfile, avatarUrl: url})}
                                            className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 ${userProfile.avatarUrl === url ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/30' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
                                        >
                                            <img src={url} alt={`Avatar ${index}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {authError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm text-center flex items-center justify-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            {authError}
                        </div>
                    )}

                    <button 
                        onClick={handleAuth}
                        disabled={authLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        {authLoading ? (
                            <> <Loader2 className="animate-spin" /> กำลังโหลด... </>
                        ) : (
                            <> {authMode === 'login' ? 'เข้าสู่ระบบ' : 'เริ่มใช้งานทันที'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /> </>
                        )}
                    </button>
                </div>
            </div>
            
            {!isSupabaseConfigured && (
                <p className="text-center text-xs text-white/30 font-medium">
                    ⚠️ Demo Mode (No Database)
                </p>
            )}
        </div>
    </div>
  );

  const renderHome = () => {
    const workoutOptions: { id: string; type: WorkoutType; name: string; routine: Exercise[]; color: string, icon: React.ReactNode }[] = [
      { id: 'push', type: 'Push', name: 'Push Day', routine: PUSH_ROUTINE, color: 'from-orange-500 to-red-600', icon: <Flame className="text-white" /> },
      { id: 'pull', type: 'Pull', name: 'Pull Day', routine: PULL_ROUTINE, color: 'from-cyan-500 to-blue-600', icon: <Target className="text-white" /> },
      { id: 'legs', type: 'Legs', name: 'Leg Day', routine: LEGS_ROUTINE, color: 'from-emerald-500 to-green-600', icon: <Trophy className="text-white" /> },
      { id: 'custom', type: 'Custom', name: 'Custom', routine: [], color: 'from-purple-500 to-fuchsia-600', icon: <Star className="text-white" /> },
    ];

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl shadow-indigo-500/30 text-white p-8">
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
             <Dumbbell size={200} />
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <Crown size={20} className="text-yellow-300" />
                </div>
                <span className="font-bold text-blue-100 tracking-wide uppercase text-sm">Welcome Back</span>
            </div>
            <h2 className="text-3xl font-extrabold mb-2 tracking-tight leading-tight">{userProfile.displayName}</h2>
            <div className="inline-block bg-black/20 backdrop-blur-sm px-4 py-2 rounded-xl mt-2 border border-white/10">
                <p className="text-sm font-medium italic text-blue-100">"{quote}"</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-blue-500"></div>
            เลือกโปรแกรมฝึก
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {workoutOptions.map((item) => (
              <button
                key={item.id}
                onClick={() => startWorkout(item.type, item.routine)}
                className="relative group overflow-hidden rounded-3xl h-28 text-left transition-all hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-90 transition-opacity`} />
                
                {/* Decorative Circles */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                
                <div className="absolute inset-0 p-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/20 group-hover:rotate-12 transition-transform duration-300">
                          {item.icon}
                      </div>
                      <div>
                          <span className="text-2xl font-bold text-white tracking-tight block">{item.name}</span>
                          <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Start Workout</span>
                      </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors">
                      <Play size={20} className="fill-current" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkout = () => {
    if (!currentSession) return null;
    
    // Suggestion logic
    const uniqueHistoryExercises = Array.from(new Set(
        history.flatMap(s => s.exercises.map(e => e.name))
    )).filter(name => !currentSession?.exercises.some(e => e.name === name)).sort();

    const themeGradient = 
       currentSession.type === 'Push' ? 'from-orange-500 to-red-600' :
       currentSession.type === 'Pull' ? 'from-cyan-500 to-blue-600' :
       currentSession.type === 'Legs' ? 'from-emerald-500 to-green-600' :
       'from-purple-500 to-fuchsia-600';

    return (
      <div className="space-y-6 pb-28 animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Header Bar */}
        <div className="flex justify-between items-center mb-2">
            <button 
                onClick={endWorkout}
                className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors border border-white/5"
            >
                <ChevronLeft size={18} /> ออก
            </button>
            <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${themeGradient} text-white text-xs font-bold shadow-lg shadow-black/20 uppercase tracking-wider`}>
                {currentSession.type} SESSION
            </div>
            <button 
                onClick={saveWorkout}
                className="bg-white text-blue-900 hover:bg-blue-50 px-5 py-2 rounded-xl text-sm font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
                บันทึก <Check size={16} />
            </button>
        </div>

        {/* Title Card */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
           <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${themeGradient} flex items-center justify-center shadow-lg`}>
                   <Dumbbell className="text-white" size={28} />
                </div>
               <div>
                   <h2 className="text-2xl font-extrabold text-white tracking-tight">{currentSession.title}</h2>
                   <p className="text-slate-400 text-sm font-medium flex items-center gap-2 mt-1">
                       <Calendar size={14} />
                       {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}
                   </p>
               </div>
           </div>
        </div>
        
        {/* Suggestion Box */}
        {uniqueHistoryExercises.length > 0 && (
            <div className="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/30 flex gap-3 items-center">
                <div className="flex-1">
                    <label className="text-[10px] text-blue-300 font-bold uppercase tracking-wider mb-1 block">Quick Add</label>
                    <div className="relative">
                        <select
                            value={selectedSuggestion}
                            onChange={(e) => setSelectedSuggestion(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 appearance-none"
                        >
                            <option value="">-- เลือกท่าจากประวัติ --</option>
                            {uniqueHistoryExercises.map((name, idx) => (
                                <option key={idx} value={name}>{name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" size={14} />
                    </div>
                </div>
                <button
                    onClick={() => addSuggestion(selectedSuggestion)}
                    disabled={!selectedSuggestion}
                    className="h-10 w-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50"
                >
                    <Plus size={20} />
                </button>
            </div>
        )}

        {/* Exercise List */}
        <div className="space-y-4">
          {currentSession.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onUpdateSet={updateSet}
              onUpdateName={updateExerciseName}
              onAddSet={addSet}
              onRemove={removeExercise}
              lastWeight={getLastWeight(exercise.name)}
            />
          ))}
        </div>

        <button 
            onClick={addNewExercise}
            className="w-full py-5 bg-slate-900/50 border-2 border-dashed border-slate-700 hover:border-blue-500 hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 rounded-3xl transition-all flex items-center justify-center gap-2 font-bold group"
        >
            <div className="bg-slate-800 group-hover:bg-blue-500 p-1 rounded-full text-white transition-colors">
                <Plus size={16} />
            </div>
            เพิ่มท่าออกกำลังกายใหม่
        </button>
      </div>
    );
  };

  const renderHistoryDetail = () => {
      if (!viewingSession) return null;

      const duration = formatDuration(viewingSession.startTime, viewingSession.endTime);
      const performedExercises = viewingSession.exercises.filter(ex => 
        ex.sets.some(s => s.completed)
      );
      
      const themeColor = 
           viewingSession.type === 'Push' ? 'orange' : 
           viewingSession.type === 'Pull' ? 'blue' : 
           viewingSession.type === 'Legs' ? 'emerald' : 
           'purple';

      return (
          <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="flex items-center gap-3 mb-2">
                  <button 
                    onClick={() => setViewingSession(null)}
                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/20 backdrop-blur-md"
                  >
                      <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-bold text-white">รายละเอียดการฝึก</h2>
              </div>

              <div className={`bg-gradient-to-br from-${themeColor}-900/50 to-slate-900 rounded-[2rem] p-6 border border-${themeColor}-500/30 shadow-xl overflow-hidden relative`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-${themeColor}-500/20 blur-[50px] rounded-full`}></div>
                  
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-2xl font-extrabold text-white mb-1 leading-tight">{viewingSession.title}</h3>
                              <div className="flex items-center gap-2 text-${themeColor}-300 text-sm font-medium">
                                  <Calendar size={14} />
                                  {new Date(viewingSession.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-${themeColor}-500 text-white shadow-lg shadow-${themeColor}-500/40`}>
                              {viewingSession.type}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                              <div className="flex items-center gap-2 text-slate-400 mb-2 text-[10px] uppercase font-bold tracking-widest">
                                  <Clock size={12} /> ระยะเวลา
                              </div>
                              <div className="text-xl font-bold text-white">{duration}</div>
                          </div>
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                              <div className="flex items-center gap-2 text-slate-400 mb-2 text-[10px] uppercase font-bold tracking-widest">
                                  <Dumbbell size={12} /> ท่าที่เล่น
                              </div>
                              <div className="text-xl font-bold text-white">{performedExercises.length} ท่า</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <div className="w-1 h-5 bg-white rounded-full"></div>
                      Timeline การฝึก
                  </h3>
                  {performedExercises.length === 0 ? (
                      <div className="text-center p-8 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                          ไม่มีข้อมูลท่าที่เล่นจบในวันนั้น
                      </div>
                  ) : (
                      performedExercises.map((ex, i) => (
                          <div key={i} className="bg-slate-800/40 rounded-2xl p-5 border border-white/5 relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-slate-500 to-transparent opacity-30"></div>
                              <div className="flex justify-between items-center mb-4 pl-3">
                                  <h4 className="font-bold text-white text-lg">{ex.name}</h4>
                              </div>
                              <div className="grid grid-cols-3 gap-2 pl-3">
                                  {ex.sets.filter(s => s.completed).map((s, idx) => (
                                      <div key={idx} className="flex flex-col items-center justify-center p-2 bg-black/20 rounded-xl border border-white/5">
                                          <span className="text-[10px] text-slate-500 font-bold mb-1">SET {s.setNumber}</span>
                                          <span className="font-extrabold text-white text-sm">
                                              {s.weight}<span className="text-[10px] font-normal text-slate-400 ml-0.5">kg</span> 
                                              <span className="mx-1 text-slate-600">/</span> 
                                              {s.reps}
                                          </span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  const renderHistory = () => {
    // Filter Logic (Same as before)
    const now = new Date();
    let filteredHistory = history;

    if (historyFilter === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(s => new Date(s.date) >= oneWeekAgo);
    } else if (historyFilter === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(s => new Date(s.date) >= oneMonthAgo);
    } else if (historyFilter === 'year') {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filteredHistory = history.filter(s => new Date(s.date) >= oneYearAgo);
    }

    const totalSessions = filteredHistory.length;
    const totalDuration = filteredHistory.reduce((acc, s) => {
        if (!s.startTime || !s.endTime) return acc;
        return acc + (s.endTime - s.startTime);
    }, 0);
    const totalHours = Math.floor(totalDuration / (1000 * 60 * 60));

    // Calculate distribution
    const pushCount = filteredHistory.filter(s => s.type === 'Push').length;
    const pullCount = filteredHistory.filter(s => s.type === 'Pull').length;
    const legsCount = filteredHistory.filter(s => s.type === 'Legs').length;
    const customCount = filteredHistory.filter(s => s.type === 'Custom').length;

    return (
      <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
             <h2 className="text-2xl font-extrabold text-white tracking-tight">Summary</h2>
             <div className="flex bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
                 {(['all', 'week', 'month', 'year'] as const).map(f => (
                     <button
                        key={f}
                        onClick={() => setHistoryFilter(f)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${historyFilter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                     >
                         {f === 'all' ? 'All' : f === 'week' ? 'Week' : f === 'month' ? 'Month' : 'Year'}
                     </button>
                 ))}
             </div>
        </div>

        {/* Stats Cards - Glassmorphism */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-900/30 to-slate-900/80 backdrop-blur-md border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-colors"></div>
             <Calendar className="text-blue-400 mb-2 relative z-10" size={24} />
             <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Total Workouts</p>
             <h3 className="text-4xl font-extrabold text-white relative z-10">{totalSessions}</h3>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-slate-900/80 backdrop-blur-md border border-purple-500/20 p-6 rounded-3xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-xl group-hover:bg-purple-500/30 transition-colors"></div>
             <Clock className="text-purple-400 mb-2 relative z-10" size={24} />
             <p className="text-purple-200/60 text-[10px] font-bold uppercase tracking-widest mb-1 relative z-10">Total Hours</p>
             <h3 className="text-4xl font-extrabold text-white relative z-10">{totalHours}</h3>
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="bg-slate-900/50 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
            <h4 className="text-xs font-bold text-slate-300 mb-4 uppercase tracking-wider flex justify-between">
                Type Distribution
                <span className="text-slate-500 font-normal normal-case">Based on filter</span>
            </h4>
            <div className="flex h-3 rounded-full overflow-hidden bg-black/40 mb-4">
                <div style={{ width: `${(pushCount/totalSessions)*100}%` }} className="bg-gradient-to-r from-orange-500 to-red-500 h-full" />
                <div style={{ width: `${(pullCount/totalSessions)*100}%` }} className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full" />
                <div style={{ width: `${(legsCount/totalSessions)*100}%` }} className="bg-gradient-to-r from-emerald-500 to-green-500 h-full" />
                <div style={{ width: `${(customCount/totalSessions)*100}%` }} className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-full" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                <div className="bg-orange-900/20 p-2 rounded-lg border border-orange-500/20 text-orange-400">Push</div>
                <div className="bg-blue-900/20 p-2 rounded-lg border border-blue-500/20 text-blue-400">Pull</div>
                <div className="bg-emerald-900/20 p-2 rounded-lg border border-emerald-500/20 text-emerald-400">Legs</div>
                <div className="bg-purple-900/20 p-2 rounded-lg border border-purple-500/20 text-purple-400">Custom</div>
            </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <List size={18} className="text-slate-400" />
              History Log
          </h3>
          {loadingHistory ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
              <p className="text-slate-500 font-medium">ไม่พบประวัติการฝึกซ้อม</p>
            </div>
          ) : (
            filteredHistory.map((session) => {
              const themeColor = session.type === 'Push' ? 'orange' : session.type === 'Pull' ? 'blue' : session.type === 'Legs' ? 'emerald' : 'purple';
              const gradient = session.type === 'Push' ? 'from-orange-500 to-red-500' : session.type === 'Pull' ? 'from-cyan-500 to-blue-500' : session.type === 'Legs' ? 'from-emerald-500 to-green-500' : 'from-purple-500 to-fuchsia-500';
              
              return (
              <div 
                key={session.id} 
                className="group relative bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/80 rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1"
                onClick={() => setViewingSession(session)}
              >
                  {/* Left Color Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${gradient}`}></div>

                  <div className="p-4 pl-6">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-white text-base">{session.title}</h4>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-${themeColor}-500/10 text-${themeColor}-400 border border-${themeColor}-500/20`}>
                                      {session.type}
                                  </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                 <Calendar size={12} />
                                 {new Date(session.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                          </div>
                          
                          <div className="text-right">
                              <p className="text-white font-bold text-sm">{formatDuration(session.startTime, session.endTime)}</p>
                          </div>
                      </div>

                      {/* Delete Button (Visible on Hover/Touch) */}
                      <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHistory(session.id);
                          }}
                          className="absolute bottom-4 right-4 p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                          <Trash2 size={16} />
                      </button>
                  </div>
              </div>
            )})
          )}
        </div>
      </div>
    );
  };

  const renderChallenges = () => {
    const streak = calculateStreak();
    
    // ... (Achievements array remains same, simplified here for brevity in logic, visual update below) ...
    // Note: Re-declaring achievements locally for the render function
    const achievements: Achievement[] = [
        {
            id: 'streak-3',
            title: 'จุดเริ่มต้น',
            description: 'ออกกำลังกายต่อเนื่อง 3 วัน',
            icon: 'flame',
            color: 'text-orange-500',
            targetLabel: '3 วัน',
            condition: (_, s) => s >= 3,
            progress: (_, s) => Math.min((s/3)*100, 100)
        },
        // ... (Include other achievements from previous code, just updating UI)
        {
            id: 'streak-7',
            title: 'สัปดาห์มหาโหด',
            description: 'ออกกำลังกายต่อเนื่อง 7 วัน',
            icon: 'flame',
            color: 'text-blue-400',
            targetLabel: '7 วัน',
            condition: (_, s) => s >= 7,
            progress: (_, s) => Math.min((s/7)*100, 100)
        },
        {
            id: 'streak-30',
            title: 'วินัยเหล็ก',
            description: 'ออกกำลังกายต่อเนื่อง 30 วัน',
            icon: 'crown',
            color: 'text-yellow-400',
            targetLabel: '30 วัน',
            condition: (_, s) => s >= 30,
            progress: (_, s) => Math.min((s/30)*100, 100)
        },
        {
            id: 'rookie',
            title: 'ก้าวแรก',
            description: 'สะสมการออกกำลังกายครบ 1 ครั้ง',
            icon: 'star',
            color: 'text-emerald-400',
            targetLabel: '1 ครั้ง',
            condition: (h) => h.length >= 1,
            progress: (h) => Math.min((h.length/1)*100, 100)
        },
        {
            id: 'regular',
            title: 'ขาประจำ',
            description: 'สะสมการออกกำลังกายครบ 10 ครั้ง',
            icon: 'medal',
            color: 'text-slate-300',
            targetLabel: '10 ครั้ง',
            condition: (h) => h.length >= 10,
            progress: (h) => Math.min((h.length/10)*100, 100)
        },
        {
            id: 'veteran',
            title: 'จอมเก๋า',
            description: 'สะสมการออกกำลังกายครบ 50 ครั้ง',
            icon: 'trophy',
            color: 'text-yellow-500',
            targetLabel: '50 ครั้ง',
            condition: (h) => h.length >= 50,
            progress: (h) => Math.min((h.length/50)*100, 100)
        }
    ];

    const getIcon = (name: string, isUnlocked: boolean) => {
        const className = isUnlocked ? "" : "opacity-30 grayscale";
        switch(name) {
            case 'flame': return <Flame className={className} size={24} />;
            case 'crown': return <Crown className={className} size={24} />;
            case 'star': return <Star className={className} size={24} />;
            case 'medal': return <Medal className={className} size={24} />;
            case 'trophy': return <Trophy className={className} size={24} />;
            default: return <Award className={className} size={24} />;
        }
    };

    return (
        <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Streak Card */}
             <div className="bg-gradient-to-br from-orange-600 via-red-600 to-rose-700 rounded-[2rem] p-8 shadow-2xl shadow-orange-900/50 relative overflow-hidden text-white text-center">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/30 rounded-full blur-[60px]"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-white/10 p-5 rounded-full mb-4 backdrop-blur-md border border-white/20 shadow-inner">
                        <Flame size={56} className="text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-pulse" />
                    </div>
                    <h2 className="text-6xl font-extrabold mb-1 drop-shadow-xl">{streak}</h2>
                    <p className="text-xl font-bold text-orange-100 uppercase tracking-widest">Day Streak</p>
                    <div className="mt-4 bg-black/20 px-4 py-2 rounded-xl backdrop-blur-sm">
                        <p className="text-sm font-medium text-white/90">Keep the fire burning! 🔥</p>
                    </div>
                </div>
             </div>

             <div className="space-y-4">
                 <h3 className="text-xl font-extrabold text-white flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                        <Trophy size={20} />
                     </div>
                     Achievements
                 </h3>
                 
                 <div className="grid grid-cols-1 gap-4">
                     {achievements.map((ach) => {
                         const isUnlocked = ach.condition(history, streak);
                         const progress = ach.progress(history, streak);
                         
                         return (
                             <div key={ach.id} className={`relative overflow-hidden rounded-3xl p-1 transition-all ${isUnlocked ? 'bg-gradient-to-r from-blue-500/50 to-purple-500/50 p-[1px]' : 'bg-slate-800'}`}>
                                 <div className={`relative h-full rounded-[23px] p-5 flex items-start gap-4 ${isUnlocked ? 'bg-slate-900/90' : 'bg-slate-900'}`}>
                                     
                                     {/* Icon */}
                                     <div className={`p-4 rounded-2xl flex-shrink-0 shadow-lg ${isUnlocked ? `bg-gradient-to-br from-slate-800 to-black border border-white/10 ${ach.color}` : 'bg-slate-800 text-slate-600 border border-white/5'}`}>
                                         {getIcon(ach.icon, isUnlocked)}
                                     </div>

                                     <div className="flex-1 min-w-0">
                                         <div className="flex justify-between items-start mb-1">
                                             <h4 className={`font-bold text-lg truncate pr-2 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</h4>
                                             {isUnlocked && (
                                                 <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border border-emerald-500/30">
                                                     Unlocked
                                                 </span>
                                             )}
                                         </div>
                                         <p className="text-xs text-slate-400 mb-4 line-clamp-2">{ach.description}</p>
                                         
                                         {/* Modern Progress Bar */}
                                         <div className="relative">
                                            <div className="flex mb-1.5 items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                    Progress
                                                </span>
                                                <span className={`text-[10px] font-bold ${isUnlocked ? 'text-blue-400' : 'text-slate-600'}`}>
                                                    {Math.round(progress)}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                                                <div 
                                                    style={{ width: `${progress}%` }} 
                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                        isUnlocked 
                                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                                                        : 'bg-slate-700'
                                                    }`}
                                                />
                                            </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>
    );
  };

  const renderProfile = () => {
    // Calculation Logic (Same as before)
    let bmr = 0;
    const w = parseFloat(userProfile.weight) || 0;
    const h = parseFloat(userProfile.height) || 0;
    const a = parseFloat(userProfile.age) || 0;

    if (w > 0 && h > 0 && a > 0) {
        if (userProfile.gender === 'male') {
            bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
        } else {
            bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
        }
    }

    let tdee = 0;
    const activityMultipliers: Record<ActivityLevel, number> = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9
    };
    tdee = bmr * (activityMultipliers[userProfile.activityLevel] || 1.2);

    let bmi = 0;
    let bmiCategory = '';
    let bmiColor = '';

    if (w > 0 && h > 0) {
        const heightInMeters = h / 100;
        bmi = w / (heightInMeters * heightInMeters);
        
        if (bmi < 18.5) { bmiCategory = 'น้ำหนักน้อย'; bmiColor = 'text-blue-400'; }
        else if (bmi < 23) { bmiCategory = 'สมส่วน'; bmiColor = 'text-emerald-400'; }
        else if (bmi < 25) { bmiCategory = 'ท้วม'; bmiColor = 'text-yellow-400'; }
        else if (bmi < 30) { bmiCategory = 'อ้วน'; bmiColor = 'text-orange-400'; }
        else { bmiCategory = 'อ้วนมาก'; bmiColor = 'text-red-400'; }
    }

    return (
      <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden text-center shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent"></div>
            
            <div className="relative z-10">
                <div className="relative inline-block mb-5">
                     <div className="w-32 h-32 rounded-full border-[6px] border-slate-900 overflow-hidden shadow-2xl mx-auto bg-slate-800 relative z-10">
                        <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                     </div>
                     <div className="absolute -inset-1 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur-md opacity-70 z-0"></div>
                     <button 
                        onClick={triggerFileInput}
                        className="absolute bottom-2 right-0 bg-white text-blue-900 p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform z-20 border-4 border-slate-900"
                     >
                        <Camera size={16} />
                     </button>
                     <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        className="hidden" 
                        accept="image/*"
                    />
                </div>
                
                <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">{userProfile.displayName}</h2>
                <div className="inline-block bg-white/5 px-3 py-1 rounded-full border border-white/5">
                    <p className="text-slate-400 text-xs font-mono">@{userProfile.username}</p>
                </div>
            </div>
        </div>

        {/* Health Stats Grid - Clean Glass Look */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Age</p>
                <p className="text-3xl font-extrabold text-white">{userProfile.age} <span className="text-sm font-medium text-slate-500">y</span></p>
            </div>
            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Weight</p>
                <div className="flex items-baseline gap-1">
                    <input 
                        type="number" 
                        value={userProfile.weight} 
                        onChange={(e) => setUserProfile({...userProfile, weight: e.target.value})}
                        className="bg-transparent w-full text-3xl font-extrabold text-white focus:outline-none border-b border-white/10 focus:border-blue-500 transition-colors"
                    />
                    <span className="text-sm font-medium text-slate-500">kg</span>
                </div>
            </div>
            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Height</p>
                <div className="flex items-baseline gap-1">
                    <input 
                        type="number" 
                        value={userProfile.height} 
                        onChange={(e) => setUserProfile({...userProfile, height: e.target.value})}
                        className="bg-transparent w-full text-3xl font-extrabold text-white focus:outline-none border-b border-white/10 focus:border-blue-500 transition-colors"
                    />
                    <span className="text-sm font-medium text-slate-500">cm</span>
                </div>
            </div>
            <div className="bg-white/5 p-5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Gender</p>
                <p className="text-2xl font-extrabold text-white">
                    {userProfile.gender === 'male' ? 'Male' : 'Female'}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
             {/* BMI Card */}
             <div className="col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl border border-white/10 shadow-lg relative overflow-hidden">
                 <div className="relative z-10 flex justify-between items-start">
                     <div>
                         <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">BMI Score</p>
                         <h3 className="text-5xl font-extrabold text-white tracking-tighter">{bmi.toFixed(1)}</h3>
                     </div>
                     <div className={`px-4 py-2 rounded-2xl bg-black/30 backdrop-blur-md border border-white/5 ${bmiColor}`}>
                         <div className="text-base font-bold">{bmiCategory}</div>
                     </div>
                 </div>
                 <div className="w-full bg-black/40 h-3 rounded-full mt-6 overflow-hidden border border-white/5">
                     <div 
                        className={`h-full transition-all duration-1000 ${
                            bmi < 18.5 ? 'bg-blue-500' : 
                            bmi < 23 ? 'bg-emerald-500' : 
                            bmi < 25 ? 'bg-yellow-500' : 
                            bmi < 30 ? 'bg-orange-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${Math.min(Math.max((bmi / 40) * 100, 5), 100)}%` }} 
                     />
                 </div>
             </div>
             
             {/* BMR & TDEE */}
             <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/5">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                     <Flame size={18} />
                 </div>
                 <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">BMR</p>
                 <p className="text-2xl font-extrabold text-white">{Math.round(bmr)}</p>
             </div>
             <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                     <Zap size={18} />
                 </div>
                 <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">TDEE</p>
                 <p className="text-2xl font-extrabold text-white">{Math.round(tdee)}</p>
             </div>
        </div>
        
        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
            <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider block mb-2">Activity Level</label>
            <div className="relative">
                <select 
                    value={userProfile.activityLevel}
                    onChange={(e) => setUserProfile({...userProfile, activityLevel: e.target.value as ActivityLevel})}
                    className="w-full bg-black/20 border border-white/10 text-white rounded-2xl px-4 py-4 outline-none appearance-none focus:border-blue-500 transition-colors"
                >
                    <option value="sedentary">ไม่ออกกำลังกาย (Sedentary)</option>
                    <option value="light">ออกเล็กน้อย 1-3 วัน/สัปดาห์</option>
                    <option value="moderate">ปานกลาง 3-5 วัน/สัปดาห์</option>
                    <option value="active">หนัก 6-7 วัน/สัปดาห์</option>
                    <option value="very_active">หนักมาก (นักกีฬา)</option>
                </select>
                <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" size={16} />
            </div>
        </div>

        <button 
            onClick={() => {
                setIsLoggedIn(false);
                setAuthMode('login');
                setUserProfile(EMPTY_PROFILE);
                setHistory([]);
            }}
            className="w-full py-4 text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-2xl font-bold transition-all active:scale-95"
        >
            ออกจากระบบ
        </button>
      </div>
    );
  };

  const Zap = ({ size }: { size: number }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );

  // --- Main Render Logic ---

  if (!isLoggedIn) {
      return renderAuthScreen();
  }

  const isWorkoutActiveView = view === 'home' && currentSession !== null;

  return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans max-w-md mx-auto relative selection:bg-blue-500/30">
      
      {/* Header - Glassmorphism Sticky */}
      {!isWorkoutActiveView && (
          <header className="px-6 py-4 flex justify-between items-center sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Dumbbell size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tighter text-white">
                REPx <span className="text-blue-500">.</span>
              </h1>
            </div>
            <button 
                onClick={() => setIsCoachOpen(true)}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-blue-400 border border-white/5 transition-all shadow-lg active:scale-95"
            >
                <Bot size={22} />
            </button>
          </header>
      )}

      {/* Main Content Area */}
      <main className="p-6 pt-6 min-h-[calc(100vh-100px)]">
        {view === 'challenges' ? (
            renderChallenges()
        ) : view === 'history' ? (
            viewingSession ? renderHistoryDetail() : renderHistory()
        ) : view === 'profile' ? (
            renderProfile()
        ) : (
            currentSession ? renderWorkout() : renderHome()
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50 max-w-[calc(28rem-3rem)] mx-auto">
        <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl flex justify-between items-center px-6">
          <button
            onClick={() => { setView('home'); setViewingSession(null); }}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all duration-300 relative ${view === 'home' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Dumbbell size={24} strokeWidth={view === 'home' ? 2.5 : 2} />
            {view === 'home' && <span className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full"></span>}
          </button>
          <button
            onClick={() => { setView('challenges'); setViewingSession(null); }}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all duration-300 relative ${view === 'challenges' ? 'text-yellow-400 bg-yellow-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Trophy size={24} strokeWidth={view === 'challenges' ? 2.5 : 2} />
            {view === 'challenges' && <span className="absolute -bottom-1 w-1 h-1 bg-yellow-500 rounded-full"></span>}
          </button>
          <button
            onClick={() => { setView('history'); setViewingSession(null); }}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all duration-300 relative ${view === 'history' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <BarChart3 size={24} strokeWidth={view === 'history' ? 2.5 : 2} />
            {view === 'history' && <span className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full"></span>}
          </button>
          <button
            onClick={() => { setView('profile'); setViewingSession(null); }}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all duration-300 relative ${view === 'profile' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <User size={24} strokeWidth={view === 'profile' ? 2.5 : 2} />
            {view === 'profile' && <span className="absolute -bottom-1 w-1 h-1 bg-purple-500 rounded-full"></span>}
          </button>
        </div>
      </nav>

      {/* Modals */}
      <AICoachModal isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDangerous={confirmModal.isDangerous}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

export default App;