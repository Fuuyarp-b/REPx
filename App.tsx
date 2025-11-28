import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { 
  UserProfile, 
  WorkoutSession, 
  ActivityLevel,
  Exercise,
  WorkoutSet,
  WorkoutType,
  Gender
} from './types';
import { 
  PUSH_ROUTINE, 
  PULL_ROUTINE, 
  LEGS_ROUTINE, 
  MOTIVATIONAL_QUOTES,
  PRESET_AVATARS
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
  const [view, setView] = useState<'home' | 'profile' | 'history'>('home');
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  
  // History State for Dashboard
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    } catch (err) {
        setAuthError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        console.error(err);
    } finally {
        setAuthLoading(false);
    }
  };

  const startWorkout = (type: WorkoutType, routine: Exercise[]) => {
    const newSession: WorkoutSession = {
      id: crypto.randomUUID(),
      type,
      title: `${type} Workout`,
      date: new Date().toISOString(),
      startTime: Date.now(),
      exercises: JSON.parse(JSON.stringify(routine)),
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

  // --- Render Functions ---

  const renderAuthScreen = () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-600/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-[80px]" />

        <div className="w-full max-w-md space-y-8 relative z-10">
            <div className="text-center space-y-2">
                <div className="inline-flex bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-xl mb-4">
                    <Dumbbell className="text-white w-10 h-10" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">REPx By FUUYARP</h1>
                <p className="text-slate-400">บันทึก พัฒนา และก้าวข้ามขีดจำกัด</p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl shadow-xl">
                <div className="flex bg-slate-800 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => { setAuthMode('login'); setAuthError(''); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${authMode === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}
                    >
                        <LogIn size={16} /> เข้าสู่ระบบ
                    </button>
                    <button 
                        onClick={() => { setAuthMode('register'); setAuthError(''); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${authMode === 'register' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'}`}
                    >
                        <UserPlus size={16} /> สมัครใหม่
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-400 ml-1">ชื่อผู้ใช้ (Username)</label>
                        <input 
                            type="text" 
                            value={userProfile.username}
                            onChange={(e) => setUserProfile({...userProfile, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mt-1"
                            placeholder="กรอกชื่อผู้ใช้ภาษาอังกฤษ..."
                        />
                    </div>

                    {authMode === 'register' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                             <div>
                                <label className="text-xs font-medium text-slate-400 ml-1">ชื่อเล่น / ชื่อที่แสดง</label>
                                <input 
                                    type="text" 
                                    value={userProfile.displayName}
                                    onChange={(e) => setUserProfile({...userProfile, displayName: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mt-1"
                                    placeholder="ชื่อเล่นของคุณ..."
                                />
                            </div>

                            {/* Gender Selection */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 ml-1">เพศ (สำหรับคำนวณค่าพลังงาน)</label>
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                    <button
                                        onClick={() => setUserProfile({...userProfile, gender: 'male'})}
                                        className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${userProfile.gender === 'male' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${userProfile.gender === 'male' ? 'border-blue-500' : 'border-slate-600'}`}>
                                            {userProfile.gender === 'male' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        </div>
                                        ชาย
                                    </button>
                                    <button
                                        onClick={() => setUserProfile({...userProfile, gender: 'female'})}
                                        className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${userProfile.gender === 'female' ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-slate-950 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${userProfile.gender === 'female' ? 'border-pink-500' : 'border-slate-600'}`}>
                                            {userProfile.gender === 'female' && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                                        </div>
                                        หญิง
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-400 ml-1">อายุ (ปี)</label>
                                    <input type="number" value={userProfile.age} onChange={(e) => setUserProfile({...userProfile, age: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 ml-1">นน. (kg)</label>
                                    <input type="number" value={userProfile.weight} onChange={(e) => setUserProfile({...userProfile, weight: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400 ml-1">สูง (cm)</label>
                                    <input type="number" value={userProfile.height} onChange={(e) => setUserProfile({...userProfile, height: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none mt-1" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-400 ml-1">ระดับกิจกรรม</label>
                                <select 
                                    value={userProfile.activityLevel}
                                    onChange={(e) => setUserProfile({...userProfile, activityLevel: e.target.value as ActivityLevel})}
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-3 mt-1 outline-none"
                                >
                                    <option value="sedentary">ไม่ออกกำลังกาย (Sedentary)</option>
                                    <option value="light">ออกเล็กน้อย 1-3 วัน/สัปดาห์</option>
                                    <option value="moderate">ปานกลาง 3-5 วัน/สัปดาห์</option>
                                    <option value="active">หนัก 6-7 วัน/สัปดาห์</option>
                                    <option value="very_active">หนักมาก (นักกีฬา)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-400 ml-1 mb-2 block">เลือกรูปแทนตัว</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {PRESET_AVATARS.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setUserProfile({...userProfile, avatarUrl: url})}
                                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${userProfile.avatarUrl === url ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={url} alt={`Avatar ${index}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {authError && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm text-center">
                            {authError}
                        </div>
                    )}

                    <button 
                        onClick={handleAuth}
                        disabled={authLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {authLoading ? (
                            <> <Loader2 className="animate-spin" /> กำลังโหลด... </>
                        ) : (
                            <> {authMode === 'login' ? 'เข้าสู่ระบบ' : 'เริ่มใช้งานทันที'} <ArrowRight size={20} /> </>
                        )}
                    </button>
                </div>
            </div>
            
            {!isSupabaseConfigured && (
                <p className="text-center text-xs text-yellow-500/80">
                    ⚠️ ยังไม่ได้เชื่อมต่อ Database (ข้อมูลจะหายเมื่อรีเฟรช)
                </p>
            )}
        </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">ยินดีต้อนรับ, {userProfile.displayName}</h2>
          <p className="opacity-90 italic">"{quote}"</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
          <Dumbbell size={120} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Play size={20} className="text-blue-500" />
          เริ่มออกกำลังกาย
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'push', name: 'Push Day', routine: PUSH_ROUTINE, color: 'from-orange-500 to-red-500' },
            { id: 'pull', name: 'Pull Day', routine: PULL_ROUTINE, color: 'from-blue-500 to-cyan-500' },
            { id: 'legs', name: 'Leg Day', routine: LEGS_ROUTINE, color: 'from-emerald-500 to-green-500' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => startWorkout(item.name as WorkoutType, item.routine)}
              className="relative group overflow-hidden rounded-xl h-32 text-left transition-all hover:scale-[1.02]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
              <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                <span className="text-2xl font-bold text-white">{item.name}</span>
                <span className="text-white/80 text-sm flex items-center gap-1">
                  เริ่มเลย <ChevronLeft className="rotate-180" size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWorkout = () => {
    if (!currentSession) return null;
    return (
      <div className="space-y-4 pb-20">
        <div className="flex justify-between items-center mb-6">
            <button 
                onClick={endWorkout}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-sm font-medium"
            >
                <ChevronLeft size={20} /> กลับหน้าหลัก
            </button>
          <button 
            onClick={saveWorkout}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            บันทึกผล
          </button>
        </div>
        
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">{currentSession.title}</h2>
            <p className="text-slate-400 text-sm">เริ่มเมื่อ: {new Date(currentSession.startTime || Date.now()).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>

        {currentSession.exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id} 
            exercise={exercise}
            onUpdateSet={updateSet}
            onUpdateName={updateExerciseName}
            onAddSet={addSet}
            onRemove={removeExercise}
          />
        ))}
        
        <button className="w-full py-4 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 font-medium hover:border-blue-500 hover:text-blue-500 transition-all">
          + เพิ่มท่าออกกำลังกาย
        </button>
      </div>
    );
  };

  const renderProfile = () => {
     // Calculate BMI
     const weight = parseFloat(userProfile.weight) || 0;
     const height = parseFloat(userProfile.height) || 0;
     const heightM = height / 100;
     const bmi = heightM > 0 ? (weight / (heightM * heightM)).toFixed(1) : '0';
     
     let bmiColor = 'text-slate-400';
     let bmiText = 'N/A';
     const bmiNum = parseFloat(bmi);
     if (bmiNum > 0) {
        if (bmiNum < 18.5) { bmiColor = 'text-blue-400'; bmiText = 'ผอมเกินไป'; }
        else if (bmiNum < 23) { bmiColor = 'text-emerald-400'; bmiText = 'สมส่วน'; }
        else if (bmiNum < 25) { bmiColor = 'text-yellow-400'; bmiText = 'ท้วม'; }
        else if (bmiNum < 30) { bmiColor = 'text-orange-400'; bmiText = 'อ้วน'; }
        else { bmiColor = 'text-red-400'; bmiText = 'อ้วนมาก'; }
     }

     // Calculate BMR (Mifflin-St Jeor)
     const age = parseFloat(userProfile.age) || 0;
     let bmr = 0;
     if (userProfile.gender === 'male') {
         bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
     } else {
         bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
     }

     // Calculate TDEE
     const activityMultipliers: Record<string, number> = {
         sedentary: 1.2,
         light: 1.375,
         moderate: 1.55,
         active: 1.725,
         very_active: 1.9
     };
     const tdee = bmr * (activityMultipliers[userProfile.activityLevel] || 1.2);

     return (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 max-w-lg mx-auto">
        <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-slate-700 mb-4 overflow-hidden border-4 border-slate-600 relative group">
                <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                <button 
                    onClick={() => {
                        // In a real app, this would open a modal. 
                        // For now, we'll just cycle through avatars for demo purposes or show alert
                        alert('สามารถเปลี่ยนรูปได้ในหน้าแก้ไขข้อมูล');
                    }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <User size={24} className="text-white" />
                </button>
            </div>
            <h2 className="text-xl font-bold text-white">{userProfile.displayName}</h2>
            <p className="text-slate-400">@{userProfile.username}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                 <span className="text-xs text-slate-400 mb-1">BMI</span>
                 <span className={`text-2xl font-bold ${bmiColor}`}>{bmi}</span>
                 <span className={`text-xs ${bmiColor} opacity-80`}>{bmiText}</span>
             </div>
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center">
                 <span className="text-xs text-slate-400 mb-1">BMR (เผาผลาญพื้นฐาน)</span>
                 <span className="text-xl font-bold text-white">{Math.round(bmr)}</span>
                 <span className="text-xs text-slate-500">kcal/day</span>
             </div>
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col items-center col-span-2">
                 <span className="text-xs text-slate-400 mb-1">TDEE (ใช้พลังงานต่อวัน)</span>
                 <span className="text-3xl font-bold text-blue-400">{Math.round(tdee)}</span>
                 <span className="text-xs text-slate-500">kcal/day ({userProfile.activityLevel})</span>
             </div>
        </div>

        <div className="space-y-4 border-t border-slate-700 pt-6">
            <h3 className="text-sm font-bold text-white mb-2">แก้ไขข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">เพศ</label>
                    <div className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 opacity-80 cursor-default">
                        {userProfile.gender === 'male' ? 'ชาย' : 'หญิง'} (แก้ไขไม่ได้)
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">ระดับกิจกรรม</label>
                    <select 
                        value={userProfile.activityLevel}
                        onChange={async (e) => {
                            const newLevel = e.target.value as ActivityLevel;
                            setUserProfile({...userProfile, activityLevel: newLevel});
                            if (isSupabaseConfigured) {
                                await supabase.from('profiles').update({ activity_level: newLevel }).eq('username', userProfile.username);
                            }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-2 py-2 outline-none"
                    >
                        <option value="sedentary">ไม่ออก (Sedentary)</option>
                        <option value="light">เล็กน้อย (Light)</option>
                        <option value="moderate">ปานกลาง (Moderate)</option>
                        <option value="active">หนัก (Active)</option>
                        <option value="very_active">หนักมาก (Very Active)</option>
                    </select>
                </div>
            </div>
            
            <div>
            <label className="text-xs text-slate-400 mb-1 block">ชื่อที่แสดง</label>
            <input 
                type="text" 
                value={userProfile.displayName}
                onChange={(e) => setUserProfile({...userProfile, displayName: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            />
            </div>
            
            <div className="grid grid-cols-3 gap-3">
                <div>
                <label className="text-xs text-slate-400 mb-1 block">อายุ</label>
                <input 
                    type="number" 
                    value={userProfile.age}
                    onChange={(e) => setUserProfile({...userProfile, age: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                </div>
                <div>
                <label className="text-xs text-slate-400 mb-1 block">น้ำหนัก (kg)</label>
                <input 
                    type="number" 
                    value={userProfile.weight}
                    onChange={(e) => setUserProfile({...userProfile, weight: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                </div>
                <div>
                <label className="text-xs text-slate-400 mb-1 block">ส่วนสูง (cm)</label>
                <input 
                    type="number" 
                    value={userProfile.height}
                    onChange={(e) => setUserProfile({...userProfile, height: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                />
                </div>
            </div>

            <button 
                onClick={async () => {
                    if (isSupabaseConfigured) {
                        const { error } = await supabase.from('profiles').update({
                            display_name: userProfile.displayName,
                            age: userProfile.age,
                            weight: userProfile.weight,
                            height: userProfile.height,
                            avatar_url: userProfile.avatarUrl
                        }).eq('username', userProfile.username);
                        
                        if (!error) {
                            alert('บันทึกข้อมูลสำเร็จ');
                        }
                    }
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl mt-2 transition-colors text-sm font-bold"
            >
                บันทึกการเปลี่ยนแปลง
            </button>
            
            <button 
                onClick={() => {
                   setConfirmModal({
                       isOpen: true,
                       title: 'ออกจากระบบ',
                       message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
                       isDangerous: true,
                       onConfirm: () => {
                           setIsLoggedIn(false);
                           setAuthMode('login');
                           setUserProfile(EMPTY_PROFILE);
                           setConfirmModal(prev => ({ ...prev, isOpen: false }));
                       }
                   });
                }}
                className="w-full text-red-400 hover:bg-red-900/20 py-3 rounded-xl mt-2 transition-colors text-sm"
            >
                ออกจากระบบ
            </button>
        </div>
        </div>
    );
  };

  const renderHistory = () => (
      <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">ประวัติการฝึกซ้อม</h2>
          {loadingHistory ? (
              <div className="text-center text-slate-400 py-10">
                  <Loader2 className="animate-spin mx-auto mb-2" />
                  กำลังโหลดข้อมูล...
              </div>
          ) : history.length === 0 ? (
              <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <Calendar size={48} className="mx-auto mb-3 opacity-20" />
                  <p>ยังไม่มีประวัติการฝึกซ้อม</p>
                  <p className="text-sm mt-1">เริ่มออกกำลังกายเลย!</p>
              </div>
          ) : (
              history.map(session => (
                  <div key={session.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-white">{session.title}</h3>
                          <p className="text-xs text-slate-400">{new Date(session.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                      </div>
                      <div className="text-right">
                          <span className="block text-xl font-bold text-blue-400">
                             {session.exercises.length} ท่า
                          </span>
                      </div>
                  </div>
              ))
          )}
      </div>
  );

  // --- Main Render ---

  if (!isLoggedIn) {
      return renderAuthScreen();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-40 px-4 py-3">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
                <Dumbbell className="text-white" size={20} />
            </div>
            <h1 className="font-bold text-lg text-white tracking-tight">REPx</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsCoachOpen(true)}
                className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-full text-white shadow-lg shadow-purple-900/20 hover:scale-105 transition-transform"
            >
                <Bot size={20} />
            </button>
            <button onClick={() => setView('profile')}>
                <img src={userProfile.avatarUrl} alt="User" className="w-9 h-9 rounded-full border border-slate-600 object-cover" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-24 px-4 pb-24">
        {currentSession ? renderWorkout() : (
            view === 'home' ? renderHome() : 
            view === 'profile' ? renderProfile() : 
            view === 'history' ? renderHistory() :
            null
        )}
      </main>

      {!currentSession && (
          <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe z-40">
            <div className="max-w-md mx-auto flex justify-around p-3">
                <button 
                    onClick={() => setView('home')}
                    className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-blue-500' : 'text-slate-500'}`}
                >
                    <Dumbbell size={24} />
                    <span className="text-[10px] font-bold">ออกกำลังกาย</span>
                </button>
                <button 
                    onClick={() => setView('history')}
                    className={`flex flex-col items-center gap-1 ${view === 'history' ? 'text-blue-500' : 'text-slate-500'}`}
                >
                    <Calendar size={24} />
                    <span className="text-[10px] font-bold">ประวัติ</span>
                </button>
                <button 
                    onClick={() => setView('profile')}
                    className={`flex flex-col items-center gap-1 ${view === 'profile' ? 'text-blue-500' : 'text-slate-500'}`}
                >
                    <User size={24} />
                    <span className="text-[10px] font-bold">โปรไฟล์</span>
                </button>
            </div>
          </nav>
      )}

      <AICoachModal isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDangerous={confirmModal.isDangerous}
      />
    </div>
  );
};

export default App;