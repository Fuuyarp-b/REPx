
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
  Plus
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
  const [view, setView] = useState<'home' | 'profile' | 'history'>('home');
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
                                <label className="text-xs font-medium text-slate-400 ml-1 mb-2 flex justify-between items-center">
                                    <span>รูปโปรไฟล์</span>
                                    <button 
                                        onClick={triggerFileInput} 
                                        className="text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors"
                                    >
                                        <Upload size={14} /> อัปโหลดรูปเอง
                                    </button>
                                </label>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleAvatarUpload}
                                    className="hidden" 
                                    accept="image/*"
                                />
                                
                                {/* Selected/Current Avatar Preview */}
                                <div className="flex justify-center mb-4">
                                    <div className="relative w-24 h-24 rounded-full border-4 border-blue-500 overflow-hidden shadow-lg shadow-blue-500/20 bg-slate-800">
                                        <img src={userProfile.avatarUrl} alt="Selected" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={triggerFileInput}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                        >
                                            <Camera size={24} className="text-white" />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-5 gap-2">
                                    {PRESET_AVATARS.map((url, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setUserProfile({...userProfile, avatarUrl: url})}
                                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${userProfile.avatarUrl === url ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30' : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'}`}
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

  const renderHome = () => {
    const workoutOptions: { id: string; type: WorkoutType; name: string; routine: Exercise[]; color: string }[] = [
      { id: 'push', type: 'Push', name: 'Push Day', routine: PUSH_ROUTINE, color: 'from-orange-500 to-red-500' },
      { id: 'pull', type: 'Pull', name: 'Pull Day', routine: PULL_ROUTINE, color: 'from-blue-500 to-cyan-500' },
      { id: 'legs', type: 'Legs', name: 'Leg Day', routine: LEGS_ROUTINE, color: 'from-emerald-500 to-green-500' },
      { id: 'custom', type: 'Custom', name: 'Custom', routine: [], color: 'from-purple-500 to-indigo-500' },
    ];

    return (
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
          <div className="grid grid-cols-2 gap-4">
            {workoutOptions.map((item) => (
              <button
                key={item.id}
                onClick={() => startWorkout(item.type, item.routine)}
                className="relative group overflow-hidden rounded-xl h-28 text-left transition-all hover:scale-[1.02]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                  <span className="text-xl font-bold text-white">{item.name}</span>
                  <span className="text-white/80 text-xs flex items-center gap-1">
                    เริ่มเลย <ChevronLeft className="rotate-180" size={14} />
                  </span>
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
    
    // Suggestion logic: Get unique exercises from history not in current session
    const uniqueHistoryExercises = Array.from(new Set(
        history.flatMap(s => s.exercises.map(e => e.name))
    )).filter(name => !currentSession?.exercises.some(e => e.name === name)).sort();

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
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
          >
            บันทึกการฝึก
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
           <div className={`p-3 rounded-xl bg-gradient-to-br ${
               currentSession.type === 'Push' ? 'from-orange-500 to-red-500' :
               currentSession.type === 'Pull' ? 'from-blue-500 to-cyan-500' :
               currentSession.type === 'Legs' ? 'from-emerald-500 to-green-500' :
               'from-purple-500 to-indigo-500'
           }`}>
               <Dumbbell className="text-white" size={24} />
           </div>
           <div>
               <h2 className="text-2xl font-bold text-white">{currentSession.title}</h2>
               <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
           </div>
        </div>
        
        {/* Exercise Suggestions Dropdown */}
        {uniqueHistoryExercises.length > 0 && (
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-6">
                <label className="text-xs text-slate-400 mb-2 block">เพิ่มท่าจากประวัติการเล่นของคุณ</label>
                <div className="flex gap-2">
                    <select
                        value={selectedSuggestion}
                        onChange={(e) => setSelectedSuggestion(e.target.value)}
                        className="flex-1 bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                        <option value="">-- เลือกท่าออกกำลังกาย --</option>
                        {uniqueHistoryExercises.map((name, idx) => (
                            <option key={idx} value={name}>{name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => addSuggestion(selectedSuggestion)}
                        disabled={!selectedSuggestion}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        )}

        <div className="space-y-4">
          {currentSession.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onUpdateSet={updateSet}
              onUpdateName={updateExerciseName}
              onAddSet={addSet}
              onRemove={removeExercise}
            />
          ))}
        </div>

        <button 
            onClick={addNewExercise}
            className="w-full py-4 bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
        >
            <Plus size={20} /> เพิ่มท่าออกกำลังกายเอง
        </button>
      </div>
    );
  };

  const renderHistoryDetail = () => {
      if (!viewingSession) return null;

      const duration = formatDuration(viewingSession.startTime, viewingSession.endTime);
      
      // Filter exercises that were actually performed (at least one completed set)
      const performedExercises = viewingSession.exercises.filter(ex => 
        ex.sets.some(s => s.completed)
      );

      return (
          <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 mb-4">
                  <button 
                    onClick={() => setViewingSession(null)}
                    className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:text-white"
                  >
                      <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-bold text-white">รายละเอียดการฝึก</h2>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                          <h3 className="text-2xl font-bold text-white mb-1">{viewingSession.title}</h3>
                          <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Calendar size={14} />
                              {new Date(viewingSession.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          viewingSession.type === 'Push' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                          viewingSession.type === 'Pull' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          viewingSession.type === 'Legs' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      }`}>
                          {viewingSession.type}
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs uppercase font-bold tracking-wider">
                              <Clock size={14} /> ระยะเวลา
                          </div>
                          <div className="text-xl font-bold text-white">{duration}</div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs uppercase font-bold tracking-wider">
                              <Target size={14} /> ท่าที่เล่น
                          </div>
                          <div className="text-xl font-bold text-white">{performedExercises.length} ท่า</div>
                      </div>
                  </div>
              </div>

              <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white px-1">รายการท่าออกกำลังกาย</h3>
                  {performedExercises.length === 0 ? (
                      <div className="text-center p-8 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
                          ไม่มีข้อมูลท่าที่เล่นจบในวันนั้น
                      </div>
                  ) : (
                      performedExercises.map((ex, i) => (
                          <div key={i} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-bold text-white">{ex.name}</h4>
                              </div>
                              <div className="space-y-2">
                                  {ex.sets.filter(s => s.completed).map((s, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                          <span className="text-slate-400 w-8">#{s.setNumber}</span>
                                          <span className="font-bold text-white">{s.weight} kg</span>
                                          <span className="text-slate-400">×</span>
                                          <span className="font-bold text-white">{s.reps} ครั้ง</span>
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
    // Filter Logic
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

    // Stats Calculation based on filtered data
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
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold text-white">ภาพรวมการฝึก</h2>
             {/* Simple Filter UI */}
             <div className="flex bg-slate-800 p-1 rounded-lg">
                 {(['all', 'week', 'month', 'year'] as const).map(f => (
                     <button
                        key={f}
                        onClick={() => setHistoryFilter(f)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${historyFilter === f ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                         {f === 'all' ? 'ทั้งหมด' : f === 'week' ? '7 วัน' : f === 'month' ? '30 วัน' : '1 ปี'}
                     </button>
                 ))}
             </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 p-5 rounded-2xl relative overflow-hidden">
             <div className="absolute right-0 top-0 p-3 opacity-10"><Calendar size={60} /></div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">จำนวนวันฝึก</p>
             <h3 className="text-3xl font-bold text-white">{totalSessions} <span className="text-sm font-normal text-slate-500">ครั้ง</span></h3>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/20 p-5 rounded-2xl relative overflow-hidden">
             <div className="absolute right-0 top-0 p-3 opacity-10"><Clock size={60} /></div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">เวลาฝึกรวม</p>
             <h3 className="text-3xl font-bold text-white">{totalHours} <span className="text-sm font-normal text-slate-500">ชม.</span></h3>
          </div>
        </div>

        {/* Distribution Bar */}
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
            <h4 className="text-sm font-bold text-slate-300 mb-3">สัดส่วนการฝึก (Distribution)</h4>
            <div className="flex h-4 rounded-full overflow-hidden bg-slate-900">
                <div style={{ width: `${(pushCount/totalSessions)*100}%` }} className="bg-orange-500 h-full" />
                <div style={{ width: `${(pullCount/totalSessions)*100}%` }} className="bg-blue-500 h-full" />
                <div style={{ width: `${(legsCount/totalSessions)*100}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${(customCount/totalSessions)*100}%` }} className="bg-purple-500 h-full" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"/> Push</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"/> Pull</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Legs</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Custom</div>
            </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-2">ประวัติล่าสุด</h3>
          {loadingHistory ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" /></div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
              <p className="text-slate-500">ไม่พบประวัติการฝึกซ้อมในช่วงนี้</p>
            </div>
          ) : (
            filteredHistory.map((session) => (
              <div 
                key={session.id} 
                className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-sm hover:border-slate-500 transition-colors flex flex-col gap-3"
              >
                  <div className="flex justify-between items-start">
                     <button onClick={() => setViewingSession(session)} className="flex-1 text-left">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h4 className="font-bold text-white text-lg">{session.title}</h4>
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Calendar size={14} />
                                    {new Date(session.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-bold border ${
                                session.type === 'Push' ? 'bg-orange-900/20 text-orange-400 border-orange-500/20' :
                                session.type === 'Pull' ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' :
                                session.type === 'Legs' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/20' :
                                'bg-purple-900/20 text-purple-400 border-purple-500/20'
                            }`}>
                                {session.type}
                            </div>
                        </div>
                    </button>
                    <button 
                        onClick={() => handleDeleteHistory(session.id)}
                        className="ml-2 p-2 text-slate-600 hover:text-red-500 transition-colors"
                        title="ลบรายการนี้"
                    >
                        <Trash2 size={18} />
                    </button>
                  </div>

                  {/* Exercise Summary List */}
                  <button onClick={() => setViewingSession(session)} className="text-left w-full">
                     <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-2">ท่าที่เล่น</p>
                        <div className="flex flex-wrap gap-2">
                             {/* Show only exercises that had at least one completed set */}
                             {session.exercises.filter(ex => ex.sets.some(s => s.completed)).length > 0 ? (
                                 session.exercises.filter(ex => ex.sets.some(s => s.completed)).map((ex, idx) => (
                                    <span key={idx} className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                        {ex.name}
                                    </span>
                                 ))
                             ) : (
                                 <span className="text-xs text-slate-500 italic">ไม่ได้บันทึกท่าที่เล่นจบ</span>
                             )}
                        </div>
                     </div>
                     <div className="flex justify-between items-center mt-3 text-xs font-medium text-slate-400 group">
                         <span>เวลา: {formatDuration(session.startTime, session.endTime)}</span>
                         <span className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">ดูรายละเอียด <ChevronRight size={14} /></span>
                     </div>
                  </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderProfile = () => {
    // Mifflin-St Jeor Equation
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

    // BMI Calculation
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
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden text-center">
            <div className="relative inline-block mb-4">
                 <div className="w-28 h-28 rounded-full border-4 border-blue-500 overflow-hidden shadow-xl mx-auto bg-slate-900">
                    <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                 </div>
                 <button 
                    onClick={triggerFileInput}
                    className="absolute bottom-0 right-0 bg-slate-800 p-2 rounded-full border border-slate-600 hover:bg-slate-700 text-white shadow-lg transition-colors"
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
            
            <h2 className="text-2xl font-bold text-white">{userProfile.displayName}</h2>
            <p className="text-slate-400 text-sm">@{userProfile.username}</p>
        </div>

        {/* Health Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs uppercase font-bold mb-1">อายุ</p>
                <p className="text-xl font-bold text-white">{userProfile.age} <span className="text-sm font-normal text-slate-500">ปี</span></p>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs uppercase font-bold mb-1">น้ำหนัก</p>
                <div className="flex items-baseline gap-1">
                    <input 
                        type="number" 
                        value={userProfile.weight} 
                        onChange={(e) => setUserProfile({...userProfile, weight: e.target.value})}
                        className="bg-transparent w-16 text-xl font-bold text-white focus:outline-none border-b border-dashed border-slate-600 focus:border-blue-500"
                    />
                    <span className="text-sm font-normal text-slate-500">kg</span>
                </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs uppercase font-bold mb-1">ส่วนสูง</p>
                <div className="flex items-baseline gap-1">
                    <input 
                        type="number" 
                        value={userProfile.height} 
                        onChange={(e) => setUserProfile({...userProfile, height: e.target.value})}
                        className="bg-transparent w-16 text-xl font-bold text-white focus:outline-none border-b border-dashed border-slate-600 focus:border-blue-500"
                    />
                    <span className="text-sm font-normal text-slate-500">cm</span>
                </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-xs uppercase font-bold mb-1">เพศ</p>
                <p className="text-xl font-bold text-white">
                    {userProfile.gender === 'male' ? 'ชาย' : 'หญิง'}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
             {/* BMI Card */}
             <div className="col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700">
                 <div className="flex justify-between items-start">
                     <div>
                         <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">BMI (ดัชนีมวลกาย)</p>
                         <h3 className="text-3xl font-bold text-white">{bmi.toFixed(1)}</h3>
                     </div>
                     <div className={`text-right ${bmiColor}`}>
                         <div className="text-lg font-bold">{bmiCategory}</div>
                     </div>
                 </div>
                 <div className="w-full bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                     <div 
                        className={`h-full transition-all duration-1000 ${
                            bmi < 18.5 ? 'bg-blue-400' : 
                            bmi < 23 ? 'bg-emerald-400' : 
                            bmi < 25 ? 'bg-yellow-400' : 
                            bmi < 30 ? 'bg-orange-400' : 'bg-red-400'
                        }`} 
                        style={{ width: `${Math.min(Math.max((bmi / 40) * 100, 5), 100)}%` }} 
                     />
                 </div>
             </div>
             
             {/* BMR & TDEE */}
             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                 <p className="text-slate-400 text-xs uppercase font-bold mb-1">BMR (เผาผลาญพื้นฐาน)</p>
                 <p className="text-2xl font-bold text-emerald-400">{Math.round(bmr)} <span className="text-xs text-slate-500">kcal</span></p>
             </div>
             <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                 <p className="text-slate-400 text-xs uppercase font-bold mb-1">TDEE (ใช้จริงต่อวัน)</p>
                 <p className="text-2xl font-bold text-blue-400">{Math.round(tdee)} <span className="text-xs text-slate-500">kcal</span></p>
             </div>
        </div>
        
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <label className="text-xs font-medium text-slate-400 ml-1">ระดับกิจกรรม (แก้ไขได้)</label>
            <select 
                value={userProfile.activityLevel}
                onChange={(e) => setUserProfile({...userProfile, activityLevel: e.target.value as ActivityLevel})}
                className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-3 mt-2 outline-none"
            >
                <option value="sedentary">ไม่ออกกำลังกาย (Sedentary)</option>
                <option value="light">ออกเล็กน้อย 1-3 วัน/สัปดาห์</option>
                <option value="moderate">ปานกลาง 3-5 วัน/สัปดาห์</option>
                <option value="active">หนัก 6-7 วัน/สัปดาห์</option>
                <option value="very_active">หนักมาก (นักกีฬา)</option>
            </select>
        </div>

        <button 
            onClick={() => {
                setIsLoggedIn(false);
                setAuthMode('login');
                setUserProfile(EMPTY_PROFILE);
                setHistory([]);
            }}
            className="w-full py-4 text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl font-bold transition-colors"
        >
            ออกจากระบบ
        </button>
      </div>
    );
  };

  // --- Main Render Logic ---

  if (!isLoggedIn) {
      return renderAuthScreen();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 max-w-md mx-auto shadow-2xl overflow-hidden relative selection:bg-blue-500/30">
      {/* Header */}
      {!currentSession && (
          <header className="p-6 pb-2 flex justify-between items-center bg-slate-950 sticky top-0 z-40">
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tighter">
                REPx <span className="text-xs font-medium text-slate-500 tracking-normal block -mt-1">By FUUYARP</span>
              </h1>
            </div>
            <button 
                onClick={() => setIsCoachOpen(true)}
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-blue-400 border border-slate-700 shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
            >
                <Bot size={20} />
            </button>
          </header>
      )}

      {/* Main Content Area */}
      <main className="p-6 pt-4">
        {currentSession ? (
            renderWorkout()
        ) : view === 'history' ? (
            viewingSession ? renderHistoryDetail() : renderHistory()
        ) : view === 'profile' ? (
            renderProfile()
        ) : (
            renderHome()
        )}
      </main>

      {/* Bottom Navigation */}
      {!currentSession && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 p-2 z-50 max-w-md mx-auto">
          <div className="flex justify-around items-center">
            <button
              onClick={() => { setView('home'); setViewingSession(null); }}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${view === 'home' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Dumbbell size={24} />
              <span className="text-[10px] font-bold">ฝึกซ้อม</span>
            </button>
            <button
              onClick={() => { setView('history'); setViewingSession(null); }}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${view === 'history' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Calendar size={24} />
              <span className="text-[10px] font-bold">ประวัติ</span>
            </button>
            <button
              onClick={() => { setView('profile'); setViewingSession(null); }}
              className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${view === 'profile' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <User size={24} />
              <span className="text-[10px] font-bold">โปรไฟล์</span>
            </button>
          </div>
        </nav>
      )}

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
