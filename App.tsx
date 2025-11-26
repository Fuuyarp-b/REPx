
import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Trophy, MessageCircle, Plus, LayoutDashboard, CalendarClock, Timer, History as HistoryIcon, Trash2, Pencil, BarChart3, TrendingUp, Zap, Flame, Anchor, Settings, Loader2, AlertTriangle, User, LogOut, Save, ChevronLeft, Filter, Check } from 'lucide-react';
import { WorkoutSession, WorkoutType, Exercise, WorkoutSet, UserProfile } from './types';
import { PUSH_ROUTINE, PULL_ROUTINE, LEGS_ROUTINE, createSets, MOTIVATIONAL_QUOTES, PRESET_AVATARS } from './constants';
import { ExerciseCard } from './components/ExerciseCard';
import { AICoachModal } from './components/AICoachModal';
import { ConfirmModal } from './components/ConfirmModal';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

const App = () => {
  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'workout' | 'dashboard' | 'profile'>('workout');
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(false); // Toggle between Register and Login
  const [filterRange, setFilterRange] = useState<'all' | 'day' | 'week' | 'month' | 'year'>('all');
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ username: '', displayName: '', age: '', weight: '', height: '', avatarUrl: PRESET_AVATARS[0] });

  // Modal State
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

  // Initialize - Check for local session
  useEffect(() => {
    const savedUsername = localStorage.getItem('repx_username');
    if (savedUsername) {
       fetchUserProfile(savedUsername);
    }
  }, []);

  // Fetch History when profile is set
  useEffect(() => {
    if (userProfile) {
        fetchHistory(userProfile.username);
    }
  }, [userProfile]);

  // Randomize quote when returning to selection screen
  useEffect(() => {
    if (!activeSession && !showSummary && activeTab === 'workout') {
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      setQuote(MOTIVATIONAL_QUOTES[randomIndex]);
    }
  }, [activeSession, showSummary, activeTab]);

  const fetchUserProfile = async (username: string) => {
      if (!isSupabaseConfigured) return;
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();
          
          if (data) {
              setUserProfile({
                  username: data.username,
                  displayName: data.display_name,
                  age: data.age,
                  weight: data.weight,
                  height: data.height,
                  avatarUrl: data.avatar_url || PRESET_AVATARS[0]
              });
          } else {
              // Handle case where local storage has username but DB doesn't (cleared DB)
              localStorage.removeItem('repx_username');
          }
      } catch (error) {
          console.error("Error fetching profile:", error);
      }
  };

  const fetchHistory = async (username: string) => {
    if (!isSupabaseConfigured) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', username)
        .order('created_at', { ascending: false });

      if (error) {
          throw error;
      }

      if (data) {
        const loadedHistory = data.map((item: any) => ({
            ...item.data,
            id: item.id // Ensure ID matches DB ID
        }));
        setHistory(loadedHistory);
      }
    } catch (error: any) {
      console.error("Error fetching history:", error.message || error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.username.trim()) {
        alert("กรุณากรอกชื่อผู้ใช้");
        return;
    }

    if (!isSupabaseConfigured) {
        alert("ไม่ได้เชื่อมต่อ Database (Supabase) ไม่สามารถเข้าสู่ระบบได้");
        return;
    }

    setIsLoggingIn(true);

    try {
        if (isLoginMode) {
            // --- LOGIN MODE: Check existing user ---
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', loginForm.username)
                .single();

            if (error || !data) {
                alert("ไม่พบผู้ใช้งานนี้ กรุณาตรวจสอบชื่อผู้ใช้ หรือสมัครสมาชิกใหม่");
                setIsLoggingIn(false);
                return;
            }

            const profile: UserProfile = {
                username: data.username,
                displayName: data.display_name,
                age: data.age,
                weight: data.weight,
                height: data.height,
                avatarUrl: data.avatar_url || PRESET_AVATARS[0]
            };

            localStorage.setItem('repx_username', profile.username);
            setUserProfile(profile);

        } else {
            // --- REGISTER MODE: Create new user ---
            if (!loginForm.displayName) {
                alert("กรุณากรอกชื่อเล่น");
                setIsLoggingIn(false);
                return;
            }

            // Check duplicate
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', loginForm.username)
                .single();
            
            if (existingUser) {
                alert("ชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
                setIsLoggingIn(false);
                return;
            }

            // Create
            const newProfile: UserProfile = {
                username: loginForm.username,
                displayName: loginForm.displayName,
                age: loginForm.age,
                weight: loginForm.weight,
                height: loginForm.height,
                avatarUrl: loginForm.avatarUrl
            };

            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{
                    username: newProfile.username,
                    display_name: newProfile.displayName,
                    age: newProfile.age,
                    weight: newProfile.weight,
                    height: newProfile.height,
                    avatar_url: newProfile.avatarUrl
                }]);
            
            if (insertError) throw insertError;

            localStorage.setItem('repx_username', newProfile.username);
            setUserProfile(newProfile);
            setHistory([]); 
        }

    } catch (error: any) {
        console.error("Login failed:", error);
        // Handle specific RLS error nicely
        if (error.message?.includes('row-level security')) {
            alert("เกิดข้อผิดพลาด: ไม่สามารถบันทึกข้อมูลได้เนื่องจากติดสิทธิ์ความปลอดภัย (RLS) กรุณาแจ้งผู้ดูแลระบบให้รันไฟล์ 'supabase_setup.sql'");
        } else {
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        }
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
      setConfirmModal({
          isOpen: true,
          title: 'ออกจากระบบ',
          message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
          confirmText: 'ออก',
          cancelText: 'ยกเลิก',
          isDangerous: false,
          onConfirm: () => {
              localStorage.removeItem('repx_username');
              setUserProfile(null);
              setHistory([]);
              setLoginForm({ username: '', displayName: '', age: '', weight: '', height: '', avatarUrl: PRESET_AVATARS[0] });
              setIsLoginMode(true); // Default to login screen on logout
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  // Workout Logic
  const startWorkout = (type: WorkoutType) => {
    let exercises: Exercise[] = [];
    let title = '';

    if (type === 'Push') {
      exercises = JSON.parse(JSON.stringify(PUSH_ROUTINE)); // Deep copy
      title = 'Push Day';
    } else if (type === 'Pull') {
      exercises = JSON.parse(JSON.stringify(PULL_ROUTINE));
      title = 'Pull Day';
    } else if (type === 'Legs') {
      exercises = JSON.parse(JSON.stringify(LEGS_ROUTINE));
      title = 'Leg Day';
    } else if (type === 'Custom') {
      exercises = [{
          id: crypto.randomUUID(),
          name: 'New Exercise',
          muscleGroup: 'Chest',
          targetSets: 3,
          targetReps: '10',
          sets: createSets(3),
      }];
      title = 'Custom Workout';
    }

    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      type,
      title,
      date: new Date().toLocaleDateString('th-TH'),
      startTime: Date.now(),
      exercises,
      status: 'active',
    };

    setActiveSession(session);
    setActiveTab('workout');
  };

  const resumeHistorySession = (session: WorkoutSession) => {
      // Create a copy of the history session to be active
      const newSession = JSON.parse(JSON.stringify(session));
      newSession.id = session.id; // Keep ID to update existing record
      newSession.status = 'active';
      newSession.startTime = Date.now(); // Reset timer for the editing session? Or keep? Let's reset for duration tracking of this "edit"
      delete newSession.endTime;
      
      setActiveSession(newSession);
      setActiveTab('workout');
  };

  const addExercise = () => {
    if (!activeSession) return;
    const newExercise: Exercise = {
        id: crypto.randomUUID(),
        name: 'New Exercise',
        muscleGroup: 'Chest', // Default
        targetSets: 3,
        targetReps: '10',
        sets: createSets(3)
    };
    
    setActiveSession(prev => {
        if (!prev) return null;
        return {
            ...prev,
            exercises: [...prev.exercises, newExercise]
        };
    });
  };

  const updateSet = (exerciseId: string, updatedSet: WorkoutSet) => {
    if (!activeSession) return;

    setActiveSession((prev) => {
      if (!prev) return null;
      const updatedExercises = prev.exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const updatedSets = ex.sets.map((s) => (s.id === updatedSet.id ? updatedSet : s));
          return { ...ex, sets: updatedSets };
        }
        return ex;
      });
      return { ...prev, exercises: updatedExercises };
    });
  };

  const updateExerciseName = (exerciseId: string, newName: string) => {
      if (!activeSession) return;
      setActiveSession(prev => {
          if (!prev) return null;
          return {
              ...prev,
              exercises: prev.exercises.map(ex => ex.id === exerciseId ? { ...ex, name: newName } : ex)
          }
      })
  };

  const addSetToExercise = (exerciseId: string) => {
    if (!activeSession) return;
    setActiveSession(prev => {
        if (!prev) return null;
        return {
            ...prev,
            exercises: prev.exercises.map(ex => {
                if (ex.id === exerciseId) {
                    const lastSet = ex.sets[ex.sets.length - 1];
                    const newSet: WorkoutSet = {
                        id: crypto.randomUUID(),
                        setNumber: ex.sets.length + 1,
                        reps: lastSet ? lastSet.reps : '',
                        weight: lastSet ? lastSet.weight : '',
                        completed: false
                    };
                    return { ...ex, sets: [...ex.sets, newSet] };
                }
                return ex;
            })
        }
    });
  };

  const finishWorkout = () => {
    if (!activeSession) return;
    setActiveSession(prev => prev ? { ...prev, endTime: Date.now() } : null);
    setShowSummary(true);
  };

  const resumeWorkout = () => {
      setShowSummary(false);
      setActiveSession(prev => {
          if (!prev) return null;
          const { endTime, ...rest } = prev;
          return rest as WorkoutSession;
      });
  };

  const saveWorkout = async () => {
    if (!activeSession || !userProfile) return;

    const completedSession: WorkoutSession = {
      ...activeSession,
      status: 'completed',
    };

    // Save to Supabase
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase
                .from('workouts')
                .upsert({
                    id: completedSession.id,
                    user_id: userProfile.username,
                    data: completedSession, // Store full JSON
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            
            // Reload history to ensure sync
            fetchHistory(userProfile.username);

        } catch (error: any) {
            console.error("Save error:", error);
            alert(`บันทึกไม่สำเร็จ: ${error.message}`);
            return; // Don't close if save failed
        }
    } else {
        // Fallback for offline/no-db demo
        setHistory(prev => [completedSession, ...prev]);
    }

    setActiveSession(null);
    setShowSummary(false);
    setActiveTab('dashboard');
  };

  const requestClearHistory = () => {
      setConfirmModal({
          isOpen: true,
          title: 'ลบประวัติทั้งหมด',
          message: 'คุณต้องการลบประวัติการฝึกซ้อมทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
          onConfirm: clearHistory,
          isDangerous: true,
          confirmText: 'ลบข้อมูล',
          cancelText: 'ยกเลิก'
      });
  };

  const clearHistory = async () => {
    if (!userProfile) return;
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase
                .from('workouts')
                .delete()
                .eq('user_id', userProfile.username);
            
            if (error) throw error;
        } catch (error) {
            console.error("Clear history error:", error);
            alert("ลบข้อมูลไม่สำเร็จ");
        }
    }
    setHistory([]);
    setActiveSession(null);
    setShowSummary(false);
    setActiveTab('workout');
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const deleteHistoryItem = async (sessionId: string) => {
      if (isSupabaseConfigured) {
          const { error } = await supabase.from('workouts').delete().eq('id', sessionId);
          if (error) {
              console.error("Delete item error:", error);
              return;
          }
      }
      setHistory(prev => prev.filter(item => item.id !== sessionId));
  };

  // -- Render Helpers --

  // Filter History Logic
  const getFilteredHistory = () => {
      const now = new Date();
      return history.filter(session => {
          if (!session.endTime && !session.date) return false;
          
          // Parse date "D/M/YYYY" to Date object
          const parts = session.date.split('/');
          const sessionDate = new Date(parseInt(parts[2]) - 543, parseInt(parts[1]) - 1, parseInt(parts[0])); // Handle Thai Year if needed, but assuming standard format or simple parsing
          // Note: toLocaleDateString('th-TH') gives Buddhist year usually. Let's handle generic case or timestamp if available.
          // Better to use session.startTime if available
          const compareDate = session.startTime ? new Date(session.startTime) : new Date(); // Fallback

          const diffTime = Math.abs(now.getTime() - compareDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          switch (filterRange) {
              case 'day': return diffDays <= 1;
              case 'week': return diffDays <= 7;
              case 'month': return diffDays <= 30;
              case 'year': return diffDays <= 365;
              default: return true;
          }
      });
  };

  const calculateTotalVolume = (exercises: Exercise[]) => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.reduce((setTotal, set) => {
        if (set.completed && typeof set.weight === 'number' && typeof set.reps === 'number') {
          return setTotal + (set.weight * set.reps);
        }
        return setTotal;
      }, 0);
    }, 0);
  };

  const formatDuration = (start?: number, end?: number) => {
      if (!start || !end) return '0 นาที';
      const minutes = Math.floor((end - start) / 60000);
      return `${minutes} นาที`;
  };

  // --- Login Screen ---
  const renderLoginScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px]" />

        <div className="relative z-10 w-full max-w-sm bg-slate-800/50 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl">
            <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50 transform rotate-3">
                    <Dumbbell size={40} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    REPx
                </h1>
                <p className="text-slate-400 text-sm mt-1">Personal Fitness Tracker</p>
            </div>

            <div className="space-y-4">
                {/* Toggle Header */}
                <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 border border-slate-700">
                    <button 
                        onClick={() => setIsLoginMode(false)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLoginMode ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        สมัครใหม่
                    </button>
                    <button 
                        onClick={() => setIsLoginMode(true)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLoginMode ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        เข้าสู่ระบบ
                    </button>
                </div>

                {/* Avatar Selection (Register Only) */}
                {!isLoginMode && (
                    <div className="mb-6">
                        <label className="text-xs text-slate-400 mb-2 block text-center">เลือกตัวละครของคุณ</label>
                        <div className="flex justify-center mb-4">
                             <div className="w-24 h-24 rounded-full border-4 border-slate-700 overflow-hidden bg-slate-900 shadow-xl relative group">
                                <img src={loginForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                             </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {PRESET_AVATARS.map((url, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setLoginForm({...loginForm, avatarUrl: url})}
                                    className={`relative w-full aspect-square rounded-full border-2 overflow-hidden transition-all ${loginForm.avatarUrl === url ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105' : 'border-slate-700 opacity-60 hover:opacity-100 hover:scale-105'}`}
                                >
                                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                                    {loginForm.avatarUrl === url && (
                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                            <Check size={16} className="text-white drop-shadow-md" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Username */}
                <div>
                    <label className="text-xs font-medium text-slate-400 ml-1">ชื่อผู้ใช้ (Username)</label>
                    <input 
                        type="text" 
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all mt-1"
                        placeholder="กรอกชื่อผู้ใช้..."
                    />
                </div>

                {/* Register Fields */}
                {!isLoginMode && (
                    <>
                        <div>
                            <label className="text-xs font-medium text-slate-400 ml-1">ชื่อเล่น (Display Name)</label>
                            <input 
                                type="text" 
                                value={loginForm.displayName}
                                onChange={(e) => setLoginForm({...loginForm, displayName: e.target.value})}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all mt-1"
                                placeholder="ชื่อเล่นของคุณ..."
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-400 ml-1">อายุ</label>
                                <input type="number" value={loginForm.age} onChange={(e) => setLoginForm({...loginForm, age: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none mt-1" placeholder="ปี" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 ml-1">น้ำหนัก</label>
                                <input type="number" value={loginForm.weight} onChange={(e) => setLoginForm({...loginForm, weight: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none mt-1" placeholder="kg" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 ml-1">ส่วนสูง</label>
                                <input type="number" value={loginForm.height} onChange={(e) => setLoginForm({...loginForm, height: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-3 text-white text-center focus:ring-2 focus:ring-blue-500 outline-none mt-1" placeholder="cm" />
                            </div>
                        </div>
                    </>
                )}

                <button 
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transform transition-all active:scale-95 mt-4 flex items-center justify-center gap-2"
                >
                    {isLoggingIn ? <Loader2 className="animate-spin" /> : (isLoginMode ? 'เข้าสู่ระบบ' : 'เริ่มใช้งาน')}
                </button>
            </div>
        </div>
    </div>
  );

  // --- Main App Screens ---

  const renderSelectionScreen = () => (
    <div className="p-4 pb-24 max-w-md mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-2xl font-bold italic tracking-tighter text-white">REPx <span className="text-xs font-normal text-slate-400 not-italic">By FUUYARP</span></h1>
            <p className="text-slate-400 text-xs">เลือกโปรแกรมฝึกของคุณวันนี้</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="bg-slate-800 p-1 pl-3 pr-1 rounded-full border border-slate-700 flex items-center gap-2">
                <span className="text-xs font-medium text-white">{userProfile?.displayName}</span>
                <img src={userProfile?.avatarUrl} alt="Profile" className="w-8 h-8 rounded-full border border-slate-600" />
             </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8 text-center relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageCircle size={64} />
         </div>
         <p className="text-slate-300 italic font-light text-lg relative z-10">"{quote}"</p>
         <button 
            onClick={() => setIsCoachOpen(true)}
            className="mt-4 text-xs flex items-center justify-center gap-2 mx-auto text-blue-400 hover:text-blue-300 transition-colors"
         >
            <MessageCircle size={14} />
            ปรึกษา AI Coach
         </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => startWorkout('Push')}
          className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-2xl p-6 shadow-lg shadow-red-900/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                <Flame size={32} />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold italic">PUSH DAY</h2>
              <p className="text-red-200 text-xs">อก • ไหล่ • หลังแขน</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Plus size={24} />
          </div>
        </button>

        <button
          onClick={() => startWorkout('Pull')}
          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-900/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                <Anchor size={32} />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold italic">PULL DAY</h2>
              <p className="text-blue-200 text-xs">หลัง • ไหล่หลัง • หน้าแขน</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Plus size={24} />
          </div>
        </button>

        <button
          onClick={() => startWorkout('Legs')}
          className="bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 text-white rounded-2xl p-6 shadow-lg shadow-emerald-900/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                <Zap size={32} />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold italic">LEG DAY</h2>
              <p className="text-emerald-200 text-xs">ขา • น่อง • ท้อง</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Plus size={24} />
          </div>
        </button>

        <button
          onClick={() => startWorkout('Custom')}
          className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white rounded-2xl p-6 shadow-lg shadow-purple-900/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl group-hover:bg-white/20 transition-colors">
                <Settings size={32} />
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold italic">CUSTOM</h2>
              <p className="text-purple-200 text-xs">กำหนดเอง</p>
            </div>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Plus size={24} />
          </div>
        </button>
      </div>
    </div>
  );

  const renderActiveSession = () => {
    if (!activeSession) return null;

    return (
      <div className="pb-24 max-w-md mx-auto animate-in slide-in-from-bottom-10 duration-500">
        <div className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 py-4 border-b border-slate-800 flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {activeSession.type === 'Push' ? <Flame className="text-red-500" /> : 
                     activeSession.type === 'Pull' ? <Anchor className="text-blue-500" /> : 
                     activeSession.type === 'Legs' ? <Zap className="text-emerald-500" /> :
                     <Settings className="text-purple-500" />}
                    {activeSession.title}
                </h2>
                <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                    <CalendarClock size={12} />
                    <span>{activeSession.date}</span>
                    <span className="mx-1">•</span>
                    <Timer size={12} />
                    <span>{formatDuration(activeSession.startTime, Date.now())} (Running)</span>
                </div>
            </div>
            <button 
                onClick={finishWorkout}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-900/20 text-sm"
            >
                จบการฝึก
            </button>
        </div>

        <div className="px-4">
            {activeSession.exercises.map((exercise) => (
            <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onUpdateSet={updateSet}
                onUpdateName={updateExerciseName}
                onAddSet={addSetToExercise}
            />
            ))}
            
            <button
                onClick={addExercise}
                className="w-full py-4 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mb-8"
            >
                <Plus size={20} />
                เพิ่มท่าออกกำลังกาย
            </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!activeSession) return null;
    const totalVolume = calculateTotalVolume(activeSession.exercises);
    const duration = formatDuration(activeSession.startTime, activeSession.endTime);
    
    // Filter out exercises that have at least one completed set
    const playedExercises = activeSession.exercises.filter(ex => ex.sets.some(s => s.completed));

    return (
      <div className="p-6 pb-24 max-w-md mx-auto animate-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <Trophy size={40} className="text-yellow-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">เยี่ยมมาก!</h2>
            <p className="text-slate-400">คุณทำสำเร็จแล้ว วันนี้สุดยอดมาก</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">เวลาที่ใช้</p>
                <p className="text-2xl font-bold text-white">{duration}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">น้ำหนักรวม</p>
                <p className="text-2xl font-bold text-blue-400">{(totalVolume).toLocaleString()} <span className="text-sm text-slate-500">kg</span></p>
            </div>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-8">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-400"/> รายละเอียดการฝึก
            </h3>
            <div className="space-y-4">
                {playedExercises.length === 0 ? (
                    <p className="text-slate-500 text-center text-sm py-4">ไม่ได้เล่นท่าไหนเลย</p>
                ) : (
                    playedExercises.map((ex, idx) => (
                        <div key={idx} className="border-b border-slate-700 last:border-0 pb-3 last:pb-0">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-slate-200 font-medium">{ex.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">{ex.sets.filter(s => s.completed).length} sets</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ex.sets.filter(s => s.completed).map((s, sIdx) => (
                                    <span key={sIdx} className="text-xs bg-slate-900 text-slate-400 px-2 py-1 rounded border border-slate-700">
                                        {s.weight}kg x {s.reps}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <div className="flex gap-3">
             <button 
                onClick={resumeWorkout}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
                <ChevronLeft size={20} />
                กลับไปแก้ไข
            </button>
            <button 
                onClick={saveWorkout}
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-900/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
                <Save size={20} />
                บันทึกผล
            </button>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const filteredHistory = getFilteredHistory();
    const totalSessions = filteredHistory.length;
    const totalVolume = filteredHistory.reduce((acc, session) => acc + calculateTotalVolume(session.exercises), 0);
    const pushCount = filteredHistory.filter(s => s.type === 'Push').length;
    const pullCount = filteredHistory.filter(s => s.type === 'Pull').length;
    const legsCount = filteredHistory.filter(s => s.type === 'Legs').length;
    const customCount = filteredHistory.filter(s => s.type === 'Custom').length;

    // Calculate max volume for chart scaling
    const volumes = filteredHistory.slice(0, 7).map(s => calculateTotalVolume(s.exercises)).reverse();
    const maxVol = Math.max(...volumes, 1);

    return (
      <div className="p-4 pb-24 max-w-md mx-auto animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">ภาพรวม <span className="text-blue-500">.</span></h1>
            
            <div className="flex items-center gap-2">
                {!isSupabaseConfigured && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded flex items-center gap-1">
                        <AlertTriangle size={12} /> Offline
                    </div>
                )}
                <button 
                    onClick={requestClearHistory}
                    className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-red-900/20 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>

        {/* Filter Bar */}
        <div className="flex bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
             {['all', 'day', 'week', 'month', 'year'].map((range) => (
                 <button
                    key={range}
                    onClick={() => setFilterRange(range as any)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterRange === range ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                 >
                    {range === 'all' ? 'ทั้งหมด' : range === 'day' ? 'วันนี้' : range === 'week' ? 'สัปดาห์นี้' : range === 'month' ? 'เดือนนี้' : 'ปีนี้'}
                 </button>
             ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/20 p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10"><Trophy size={40} /></div>
                <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">การฝึกทั้งหมด</p>
                <p className="text-3xl font-bold text-white">{totalSessions}</p>
                <p className="text-slate-500 text-xs mt-1">ครั้ง</p>
            </div>
            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/20 p-4 rounded-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-3 opacity-10"><Dumbbell size={40} /></div>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">น้ำหนักรวม</p>
                <p className="text-3xl font-bold text-white">{(totalVolume/1000).toFixed(1)}k</p>
                <p className="text-slate-500 text-xs mt-1">กิโลกรัม</p>
            </div>
        </div>

        {/* Workout Distribution */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm">
                <BarChart3 size={16} className="text-slate-400"/> สัดส่วนการฝึก
            </h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-3">
                <div style={{width: `${(pushCount/totalSessions)*100}%`}} className="bg-red-500 h-full" />
                <div style={{width: `${(pullCount/totalSessions)*100}%`}} className="bg-blue-500 h-full" />
                <div style={{width: `${(legsCount/totalSessions)*100}%`}} className="bg-emerald-500 h-full" />
                <div style={{width: `${(customCount/totalSessions)*100}%`}} className="bg-purple-500 h-full" />
            </div>
            <div className="flex justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"/> Push</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"/> Pull</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"/> Legs</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"/> Custom</div>
            </div>
        </div>

        {/* Recent History List */}
        <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm px-1">
            <HistoryIcon size={16} className="text-slate-400"/> ประวัติการฝึก ({filteredHistory.length})
        </h3>
        
        {isLoadingHistory ? (
             <div className="flex justify-center py-10">
                 <Loader2 className="animate-spin text-blue-500" />
             </div>
        ) : filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                <p className="text-slate-500 text-sm">ยังไม่มีประวัติการฝึกในช่วงเวลานี้</p>
            </div>
        ) : (
            <div className="space-y-3">
                {filteredHistory.map((session) => (
                    <div key={session.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                session.type === 'Push' ? 'bg-red-900/20 text-red-500' :
                                session.type === 'Pull' ? 'bg-blue-900/20 text-blue-500' :
                                session.type === 'Legs' ? 'bg-emerald-900/20 text-emerald-500' :
                                'bg-purple-900/20 text-purple-500'
                            }`}>
                                {session.type === 'Push' ? <Flame size={20} /> :
                                 session.type === 'Pull' ? <Anchor size={20} /> :
                                 session.type === 'Legs' ? <Zap size={20} /> :
                                 <Settings size={20} />}
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{session.title}</h4>
                                <p className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
                                    <span>{session.date}</span>
                                    <span>•</span>
                                    <span>{(calculateTotalVolume(session.exercises)).toLocaleString()} kg</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={() => resumeHistorySession(session)}
                                className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                            >
                                <Pencil size={16} />
                            </button>
                            <button 
                                onClick={() => deleteHistoryItem(session.id)}
                                className="p-2 bg-slate-700 text-slate-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
  };

  const renderProfile = () => (
      <div className="p-6 pb-24 max-w-md mx-auto animate-in fade-in duration-500">
          <h1 className="text-2xl font-bold text-white mb-6">โปรไฟล์</h1>
          
          <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 text-center relative overflow-hidden mb-6">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-purple-600 opacity-20" />
              <div className="relative z-10">
                  <div className="w-28 h-28 mx-auto bg-slate-900 rounded-full border-4 border-slate-700 p-1 mb-4 shadow-xl">
                      <img src={userProfile?.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  </div>
                  
                  {/* Avatar Switcher Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-6">
                        {PRESET_AVATARS.map((url, idx) => (
                            <button 
                                key={idx}
                                onClick={async () => {
                                    if (!userProfile) return;
                                    const updated = { ...userProfile, avatarUrl: url };
                                    setUserProfile(updated);
                                    // Update DB
                                    if (isSupabaseConfigured) {
                                        await supabase.from('profiles').update({ avatar_url: url }).eq('username', userProfile.username);
                                    }
                                }}
                                className={`relative w-full aspect-square rounded-full border-2 overflow-hidden transition-all ${userProfile?.avatarUrl === url ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105' : 'border-slate-700 opacity-60 hover:opacity-100 hover:scale-105'}`}
                            >
                                <img src={url} alt="av" className="w-full h-full object-cover" />
                                {userProfile?.avatarUrl === url && (
                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                        <Check size={16} className="text-white drop-shadow-md" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                  </div>

                  <h2 className="text-2xl font-bold text-white">{userProfile?.displayName}</h2>
                  <p className="text-slate-400 text-sm">@{userProfile?.username}</p>
              </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                  <p className="text-slate-400 text-xs mb-1">อายุ</p>
                  <p className="text-xl font-bold text-white">{userProfile?.age} <span className="text-xs font-normal text-slate-500">ปี</span></p>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                  <p className="text-slate-400 text-xs mb-1">น้ำหนัก</p>
                  <p className="text-xl font-bold text-white">{userProfile?.weight} <span className="text-xs font-normal text-slate-500">kg</span></p>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                  <p className="text-slate-400 text-xs mb-1">ส่วนสูง</p>
                  <p className="text-xl font-bold text-white">{userProfile?.height} <span className="text-xs font-normal text-slate-500">cm</span></p>
              </div>
          </div>

          <button 
              onClick={handleLogout}
              className="w-full py-4 bg-slate-800 text-red-400 hover:bg-red-900/20 hover:text-red-500 rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
              <LogOut size={20} />
              ออกจากระบบ
          </button>
      </div>
  );

  if (!userProfile) {
    return renderLoginScreen();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-blue-500/30">
      
      {activeSession && !showSummary ? renderActiveSession() :
       showSummary ? renderSummary() :
       activeTab === 'workout' ? renderSelectionScreen() :
       activeTab === 'dashboard' ? renderDashboard() :
       renderProfile()
      }

      {/* Bottom Navigation */}
      {!activeSession && !showSummary && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-4 pb-6 z-50">
              <div className="flex justify-around max-w-md mx-auto">
                  <button 
                    onClick={() => setActiveTab('workout')}
                    className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'workout' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <Dumbbell size={24} />
                      <span className="text-[10px] font-medium">ฝึกซ้อม</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <LayoutDashboard size={24} />
                      <span className="text-[10px] font-medium">ภาพรวม</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                      <User size={24} />
                      <span className="text-[10px] font-medium">โปรไฟล์</span>
                  </button>
              </div>
          </div>
      )}

      <AICoachModal 
        isOpen={isCoachOpen} 
        onClose={() => setIsCoachOpen(false)} 
      />

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        onConfirm={confirmModal.onConfirm}
        isDangerous={confirmModal.isDangerous}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

export default App;
