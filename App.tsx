
import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Trophy, MessageCircle, Plus, LayoutDashboard, CalendarClock, Timer, History as HistoryIcon, Trash2, Pencil, BarChart3, TrendingUp, Zap, Flame, Anchor, Settings, Loader2, AlertTriangle, User, LogOut, Save } from 'lucide-react';
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
       // Attempt to restore session immediately if username exists locally
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

  // --- API Functions ---

  const fetchUserProfile = async (username: string) => {
    if (!isSupabaseConfigured) {
        // Fallback for offline/no-db mode
        setUserProfile({ username, displayName: username, age: '', weight: '', height: '', avatarUrl: PRESET_AVATARS[0] });
        return;
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
             console.error("Error fetching profile:", error);
        }

        if (data) {
             setUserProfile({
                 username: data.username,
                 displayName: data.display_name,
                 age: data.age || '',
                 weight: data.weight || '',
                 height: data.height || '',
                 avatarUrl: data.avatar_url || PRESET_AVATARS[0]
             });
        } else {
            // Profile doesn't exist remotely (maybe first time on new device but skipped creation?)
            // We just treat it as a new session locally for now
             setUserProfile({ username, displayName: username, age: '', weight: '', height: '', avatarUrl: PRESET_AVATARS[0] });
        }
    } catch (err) {
        console.error("Profile fetch error:", err);
        setUserProfile({ username, displayName: username, age: '', weight: '', height: '', avatarUrl: PRESET_AVATARS[0] });
    }
  };

  const fetchHistory = async (username: string) => {
      // Prevent fetching if Supabase is not configured (avoids unnecessary errors)
      if (!isSupabaseConfigured) {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('user_id', username) // Use username as user_id
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const parsedHistory = data.map(item => item.data as WorkoutSession);
          setHistory(parsedHistory);
        }
      } catch (error: any) {
        // Detailed error logging to fix [object Object] issue
        console.error('Error fetching history:', error.message || JSON.stringify(error));
      } finally {
        setIsLoadingHistory(false);
      }
  };

  const handleLogin = async () => {
      if (!loginForm.username.trim()) return;
      
      setIsLoggingIn(true);
      const username = loginForm.username.trim().toLowerCase();
      
      if (!isSupabaseConfigured) {
          // Offline mode login
          const newProfile: UserProfile = {
              username,
              displayName: loginForm.displayName || username,
              age: loginForm.age,
              weight: loginForm.weight,
              height: loginForm.height,
              avatarUrl: loginForm.avatarUrl
          };
          localStorage.setItem('repx_username', username);
          setUserProfile(newProfile);
          setIsLoggingIn(false);
          return;
      }

      try {
          // 1. Check if user exists
          const { data: existingUser } = await supabase
              .from('profiles')
              .select('*')
              .eq('username', username)
              .single();

          if (existingUser) {
              // User exists, log them in (Update profile if new info provided)
              const updatedProfile = {
                 username: existingUser.username,
                 display_name: loginForm.displayName || existingUser.display_name,
                 age: loginForm.age || existingUser.age,
                 weight: loginForm.weight || existingUser.weight,
                 height: loginForm.height || existingUser.height,
                 avatar_url: existingUser.avatar_url || loginForm.avatarUrl
              };
              
              // Only update DB if we have new info provided in login form (optional logic)
              if (loginForm.displayName || loginForm.age) {
                  await supabase.from('profiles').upsert(updatedProfile);
              }

              setUserProfile({
                 username: updatedProfile.username,
                 displayName: updatedProfile.display_name,
                 age: updatedProfile.age || '',
                 weight: updatedProfile.weight || '',
                 height: updatedProfile.height || '',
                 avatarUrl: updatedProfile.avatar_url
             });
          } else {
              // Create new user
              const newProfile = {
                  username,
                  display_name: loginForm.displayName || username,
                  age: loginForm.age,
                  weight: loginForm.weight,
                  height: loginForm.height,
                  avatar_url: loginForm.avatarUrl
              };

              const { error } = await supabase
                  .from('profiles')
                  .insert(newProfile);

              if (error) throw error;

              setUserProfile({
                  username: newProfile.username,
                  displayName: newProfile.display_name,
                  age: newProfile.age,
                  weight: newProfile.weight,
                  height: newProfile.height,
                  avatarUrl: newProfile.avatar_url
              });
          }
          
          localStorage.setItem('repx_username', username);

      } catch (error: any) {
          console.error("Login error:", error);
          if (error.message?.includes('row-level security')) {
              alert('⚠️ กรุณาปิด RLS ในตาราง profiles โดยรันไฟล์ supabase_setup.sql ใน Supabase');
          } else {
              alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message);
          }
      } finally {
          setIsLoggingIn(false);
      }
  };

  const handleUpdateProfile = async () => {
      if (!userProfile) return;
      
      try {
          if (isSupabaseConfigured) {
              const { error } = await supabase
                .from('profiles')
                .upsert({
                    username: userProfile.username,
                    display_name: userProfile.displayName,
                    age: userProfile.age,
                    weight: userProfile.weight,
                    height: userProfile.height,
                    avatar_url: userProfile.avatarUrl
                });
              if (error) throw error;
          }
          
          alert('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว');
      } catch (error: any) {
           console.error("Update profile error:", error);
           alert('ไม่สามารถบันทึกข้อมูลได้: ' + error.message);
      }
  };

  const handleLogout = () => {
      setConfirmModal({
          isOpen: true,
          title: 'ออกจากระบบ',
          message: 'คุณต้องการออกจากระบบใช่หรือไม่?',
          isDangerous: false,
          confirmText: 'ออกระบบ',
          onConfirm: () => {
              localStorage.removeItem('repx_username');
              setUserProfile(null);
              setHistory([]);
              setActiveSession(null);
              setActiveTab('workout');
              setLoginForm({ username: '', displayName: '', age: '', weight: '', height: '', avatarUrl: PRESET_AVATARS[0] });
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  // --- Actions ---

  const startWorkout = (type: WorkoutType) => {
    let routine: Exercise[] = [];
    
    if (type === 'Push') routine = JSON.parse(JSON.stringify(PUSH_ROUTINE));
    else if (type === 'Pull') routine = JSON.parse(JSON.stringify(PULL_ROUTINE));
    else if (type === 'Legs') routine = JSON.parse(JSON.stringify(LEGS_ROUTINE));
    else if (type === 'Custom') {
        // Start with one empty exercise for custom workout
        routine = [{
            id: crypto.randomUUID(),
            name: 'ท่าฝึกที่ 1 (แตะเพื่อแก้ไข)',
            muscleGroup: 'Core',
            targetSets: 3,
            targetReps: '8-12',
            sets: createSets(3),
            note: 'Custom Workout'
        }];
    }

    const newSession: WorkoutSession = {
      id: crypto.randomUUID(),
      type,
      title: type === 'Custom' ? 'Custom Workout' : `${type} Day`,
      date: new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      startTime: Date.now(),
      exercises: routine,
      status: 'active'
    };
    setActiveSession(newSession);
    setShowSummary(false);
    setActiveTab('workout');
  };

  const updateSet = (exerciseId: string, updatedSet: WorkoutSet) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === updatedSet.id ? updatedSet : s)
      };
    });

    setActiveSession({ ...activeSession, exercises: updatedExercises });
  };

  const addSetToExercise = (exerciseId: string) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
        if (ex.id !== exerciseId) return ex;

        // Copy weight from the last set if available for convenience
        const lastSet = ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : null;
        const newWeight = lastSet ? lastSet.weight : '';

        const newSet: WorkoutSet = {
            id: crypto.randomUUID(),
            setNumber: ex.sets.length + 1,
            reps: '',
            weight: newWeight,
            completed: false
        };

        return {
            ...ex,
            sets: [...ex.sets, newSet]
        };
    });

    setActiveSession({ ...activeSession, exercises: updatedExercises });
  };

  const updateExerciseName = (exerciseId: string, newName: string) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return { ...ex, name: newName };
    });

    setActiveSession({ ...activeSession, exercises: updatedExercises });
  };

  const addExercise = () => {
    if (!activeSession) return;

    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: 'New Exercise',
      muscleGroup: 'Core', // Default group, user can ignore visuals
      targetSets: 3,
      targetReps: '8-12',
      sets: createSets(3),
      note: 'เพิ่มรายการใหม่'
    };

    setActiveSession({
      ...activeSession,
      exercises: [...activeSession.exercises, newExercise]
    });
  };

  // Phase 1: Show Summary (Review)
  const finishWorkout = () => {
    if (!activeSession) return;
    
    // Just capture the end timestamp for calculation, but don't save to history yet
    const endTime = activeSession.endTime || Date.now();
    
    // We update the active session with this tentative end time
    setActiveSession({ ...activeSession, endTime }); 
    setShowSummary(true);
  };

  // Phase 2: Back to Edit
  const resumeWorkout = () => {
    if (!activeSession) return;
    // Remove endTime to indicate session is still ongoing
    const { endTime, ...rest } = activeSession;
    setActiveSession(rest as WorkoutSession); 
    setShowSummary(false);
  };

  // Phase 3: Confirm and Save (Sync to Supabase)
  const saveWorkout = async () => {
    if (!activeSession || !userProfile) return;
    
    // Ensure we have an end time
    const endTime = activeSession.endTime || Date.now();
    
    const completedSession: WorkoutSession = { 
        ...activeSession, 
        status: 'completed', 
        endTime 
    };

    // Optimistic Update (Update UI immediately)
    setHistory(prev => {
        const exists = prev.some(s => s.id === completedSession.id);
        if (exists) {
            return prev.map(s => s.id === completedSession.id ? completedSession : s);
        }
        return [completedSession, ...prev];
    });

    setActiveSession(null);
    setShowSummary(false);
    setActiveTab('dashboard');

    // Sync to Supabase
    if (isSupabaseConfigured) {
      try {
          const { error } = await supabase
              .from('workouts')
              .upsert({
                  id: completedSession.id,
                  user_id: userProfile.username, // Using username as link
                  data: completedSession,
                  created_at: new Date(endTime).toISOString()
              });
          
          if (error) throw error;
      } catch (error: any) {
          const msg = error.message || 'Unknown Error';
          console.error("Failed to save workout to Supabase:", msg);
          
          if (msg.includes('row-level security')) {
              alert('⚠️ บันทึกไม่ได้: ติดสิทธิ์ความปลอดภัย (RLS)\n\nกรุณาไปที่ Supabase > SQL Editor แล้วรันคำสั่งในไฟล์ supabase_setup.sql');
          } else {
              alert(`ไม่สามารถบันทึกข้อมูลออนไลน์ได้: ${msg}`);
          }
      }
    }
  };

  const editHistoryItem = (id: string) => {
    const sessionToEdit = history.find(s => s.id === id);
    if (sessionToEdit) {
        // Set as active session to enable editing UI
        setActiveSession({ ...sessionToEdit, status: 'active' });
        setActiveTab('workout');
    }
  };

  const requestClearHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: 'รีเซ็ตข้อมูลทั้งหมด',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการฝึกซ้อมทั้งหมดและเริ่มต้นใหม่? การกระทำนี้ไม่สามารถย้อนกลับได้',
      isDangerous: true,
      onConfirm: async () => {
        // Optimistic UI update
        setHistory([]);
        setActiveSession(null);
        setActiveTab('workout');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        // Delete from Supabase
        if (isSupabaseConfigured && userProfile) {
          try {
              const { error } = await supabase
                  .from('workouts')
                  .delete()
                  .eq('user_id', userProfile.username);
              
              if (error) throw error;
          } catch (error: any) {
              const msg = error.message || 'Unknown Error';
              console.error("Failed to clear history from Supabase:", msg);
              if (msg.includes('row-level security')) {
                  alert('⚠️ ลบข้อมูลไม่ได้: ติดสิทธิ์ RLS กรุณารันไฟล์ supabase_setup.sql');
              }
          }
        }
      }
    });
  };

  const requestDeleteItem = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'ลบรายการ',
      message: 'คุณต้องการลบรายการบันทึกนี้ใช่หรือไม่?',
      isDangerous: true,
      onConfirm: async () => {
        // Optimistic UI update
        setHistory(prev => prev.filter(item => item.id !== id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        // Delete from Supabase
        if (isSupabaseConfigured) {
          try {
              const { error } = await supabase
                  .from('workouts')
                  .delete()
                  .eq('id', id);
              
              if (error) throw error;
          } catch (error: any) {
              const msg = error.message || 'Unknown Error';
              console.error("Failed to delete item from Supabase:", msg);
              if (msg.includes('row-level security')) {
                   alert('⚠️ ลบข้อมูลไม่ได้: ติดสิทธิ์ RLS กรุณารันไฟล์ supabase_setup.sql');
              }
          }
        }
      }
    });
  };

  // --- Helpers ---

  const formatDuration = (start?: number, end?: number) => {
    if (!start || !end) return "0 นาที";
    const diff = end - start;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) return `${hours} ชม. ${remainingMinutes} นาที`;
    return `${minutes} นาที`;
  };

  const calculateVolume = useCallback((session: WorkoutSession) => {
    return session.exercises.reduce((total, ex) => {
        return total + ex.sets.reduce((subTotal, set) => {
            if (set.completed && typeof set.weight === 'number' && typeof set.reps === 'number') {
                return subTotal + (set.weight * set.reps);
            }
            return subTotal;
        }, 0);
    }, 0);
  }, []);

  const calculateBMI = () => {
    if (!userProfile?.weight || !userProfile?.height) return { value: 0, label: 'N/A', color: 'text-slate-500' };
    const w = parseFloat(userProfile.weight);
    const h = parseFloat(userProfile.height) / 100; // cm to m
    if (h <= 0) return { value: 0, label: 'N/A', color: 'text-slate-500' };
    
    const bmi = w / (h * h);
    let label = '';
    let color = '';
    
    if (bmi < 18.5) { label = 'ผอมเกินไป'; color = 'text-blue-400'; }
    else if (bmi < 22.9) { label = 'น้ำหนักปกติ'; color = 'text-emerald-400'; }
    else if (bmi < 24.9) { label = 'น้ำหนักเกิน'; color = 'text-yellow-400'; }
    else if (bmi < 29.9) { label = 'อ้วน'; color = 'text-orange-400'; }
    else { label = 'อ้วนมาก'; color = 'text-red-400'; }

    return { value: bmi.toFixed(1), label, color };
  };

  // --- Renders ---

  const renderBottomNav = () => {
    // Don't show nav if in active session or summary
    if (activeSession || showSummary) return null;

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 z-40 pb-safe">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('workout')}
            className={`flex flex-col items-center p-2 rounded-xl w-full transition-colors ${activeTab === 'workout' ? 'text-blue-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Dumbbell size={24} />
            <span className="text-xs mt-1">ฝึกซ้อม</span>
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-2 rounded-xl w-full transition-colors ${activeTab === 'dashboard' ? 'text-emerald-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutDashboard size={24} />
            <span className="text-xs mt-1">ภาพรวม</span>
          </button>
           <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center p-2 rounded-xl w-full transition-colors ${activeTab === 'profile' ? 'text-purple-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <User size={24} />
            <span className="text-xs mt-1">โปรไฟล์</span>
          </button>
        </div>
      </div>
    );
  };

  const renderLoginScreen = () => (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
              <div className="text-center mb-6">
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
                    REPx
                  </h1>
                  <p className="text-slate-400">เข้าสู่ระบบเพื่อเริ่มบันทึกการฝึกซ้อม</p>
              </div>

              <div className="space-y-4">
                  {/* Avatar Selection */}
                  <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 text-center">เลือกรูปโปรไฟล์</label>
                      <div className="flex justify-center mb-3">
                          <img src={loginForm.avatarUrl} alt="Selected Avatar" className="w-24 h-24 rounded-full border-4 border-blue-500 bg-slate-800" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                          {PRESET_AVATARS.map((avatar, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => setLoginForm({ ...loginForm, avatarUrl: avatar })}
                                  className={`rounded-full p-1 border-2 transition-all ${loginForm.avatarUrl === avatar ? 'border-blue-500 scale-110' : 'border-transparent hover:border-slate-600'}`}
                              >
                                  <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full rounded-full" />
                              </button>
                          ))}
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">ชื่อผู้ใช้ (Username)</label>
                      <input 
                          type="text" 
                          value={loginForm.username}
                          onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                          placeholder="ตั้งชื่อผู้ใช้ของคุณ..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                  </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">ชื่อเล่น</label>
                      <input 
                          type="text" 
                          value={loginForm.displayName}
                          onChange={e => setLoginForm({...loginForm, displayName: e.target.value})}
                          placeholder="ชื่อที่อยากให้เรียก..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">อายุ</label>
                        <input 
                            type="number" 
                            value={loginForm.age}
                            onChange={e => setLoginForm({...loginForm, age: e.target.value})}
                            placeholder="ปี"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">น้ำหนัก (kg)</label>
                        <input 
                            type="number" 
                            value={loginForm.weight}
                            onChange={e => setLoginForm({...loginForm, weight: e.target.value})}
                            placeholder="kg"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                  </div>
                   <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">ส่วนสูง (cm)</label>
                        <input 
                            type="number" 
                            value={loginForm.height}
                            onChange={e => setLoginForm({...loginForm, height: e.target.value})}
                            placeholder="cm"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                  
                  <button 
                      onClick={handleLogin}
                      disabled={isLoggingIn || !loginForm.username.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 disabled:opacity-50 mt-4"
                  >
                      {isLoggingIn ? <Loader2 className="animate-spin mx-auto" /> : 'เริ่มต้นใช้งาน'}
                  </button>
              </div>

              {!isSupabaseConfigured && (
                  <div className="mt-6 p-3 bg-amber-900/20 border border-amber-900/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200/70">ไม่ได้เชื่อมต่อ Database: ข้อมูลจะถูกบันทึกเฉพาะในเครื่องนี้เท่านั้น</p>
                  </div>
              )}
          </div>
      </div>
  );

  const renderProfileScreen = () => {
    if (!userProfile) return null;
    const bmi = calculateBMI();

    return (
        <div className="max-w-md mx-auto px-4 py-8 pb-24 animate-in fade-in duration-500">
             <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-1">Profile</h1>
                    <p className="text-slate-400 text-sm">ข้อมูลส่วนตัวของคุณ</p>
                </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg mb-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-purple-900/30 to-transparent"></div>
                
                {/* Profile Picture */}
                <div className="w-24 h-24 rounded-full bg-slate-700 border-4 border-slate-800 mx-auto mb-4 flex items-center justify-center relative z-10 shadow-xl overflow-hidden group">
                    <img 
                      src={userProfile.avatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                </div>

                <h2 className="text-2xl font-bold text-white relative z-10">{userProfile.displayName}</h2>
                <p className="text-slate-500 text-sm relative z-10">@{userProfile.username}</p>
                
                <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">อายุ</p>
                        <p className="text-lg font-bold text-white">{userProfile.age || '-'}</p>
                    </div>
                     <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">น้ำหนัก</p>
                        <p className="text-lg font-bold text-white">{userProfile.weight || '-'} <span className="text-[10px]">kg</span></p>
                    </div>
                     <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">ส่วนสูง</p>
                        <p className="text-lg font-bold text-white">{userProfile.height || '-'} <span className="text-[10px]">cm</span></p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <TrendingUp size={16} /> ค่าดัชนีมวลกาย (BMI)
                </h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className={`text-3xl font-bold ${bmi.color}`}>{bmi.value}</p>
                        <p className={`text-sm ${bmi.color}`}>{bmi.label}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                        <p>BMI = น้ำหนัก(kg) / ส่วนสูง(m)²</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-lg mb-6">
                 <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Settings size={16} /> แก้ไขข้อมูล
                </h3>
                <div className="space-y-4">
                     {/* Avatar Edit */}
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">เปลี่ยนรูปโปรไฟล์</label>
                         <div className="grid grid-cols-4 gap-2">
                          {PRESET_AVATARS.map((avatar, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => setUserProfile({ ...userProfile, avatarUrl: avatar })}
                                  className={`rounded-full p-1 border-2 transition-all ${userProfile.avatarUrl === avatar ? 'border-blue-500 scale-110' : 'border-transparent hover:border-slate-600'}`}
                              >
                                  <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full rounded-full" />
                              </button>
                          ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <input 
                            type="number" 
                            value={userProfile.age}
                            onChange={(e) => setUserProfile({...userProfile, age: e.target.value})}
                            placeholder="อายุ"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                         <input 
                            type="number" 
                            value={userProfile.weight}
                            onChange={(e) => setUserProfile({...userProfile, weight: e.target.value})}
                            placeholder="นน."
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                         <input 
                            type="number" 
                            value={userProfile.height}
                            onChange={(e) => setUserProfile({...userProfile, height: e.target.value})}
                            placeholder="ส่วนสูง"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => handleUpdateProfile()}
                        className="w-full py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={16} /> บันทึกการเปลี่ยนแปลง
                    </button>
                </div>
            </div>

            <button 
                onClick={handleLogout}
                className="w-full py-4 border border-red-900/30 bg-red-900/10 text-red-500 rounded-xl hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 font-medium"
            >
                <LogOut size={20} />
                ออกจากระบบ
            </button>
        </div>
    );
  }

  const renderDashboard = () => {
    // Filter History Logic
    const getFilteredHistory = () => {
        const now = new Date();
        return history.filter(session => {
            if (!session.startTime) return false;
            const date = new Date(session.startTime);
            
            if (filterRange === 'all') return true;
            
            if (filterRange === 'day') {
                 return date.getDate() === now.getDate() &&
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear();
            }

            if (filterRange === 'week') {
                // Get start of the current week (Sunday)
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                return date >= startOfWeek;
            }

            if (filterRange === 'month') {
                return date.getMonth() === now.getMonth() &&
                       date.getFullYear() === now.getFullYear();
            }

            if (filterRange === 'year') {
                return date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    };

    const filteredHistory = getFilteredHistory();

    // Calculate Stats from filtered history
    const totalWorkouts = filteredHistory.length;
    const totalVolume = filteredHistory.reduce((acc, s) => acc + calculateVolume(s), 0);
    const totalDurationMs = filteredHistory.reduce((acc, s) => acc + ((s.endTime || 0) - (s.startTime || 0)), 0);
    const avgDurationMinutes = totalWorkouts > 0 ? Math.floor((totalDurationMs / totalWorkouts) / 60000) : 0;

    const pushCount = filteredHistory.filter(s => s.type === 'Push').length;
    const pullCount = filteredHistory.filter(s => s.type === 'Pull').length;
    const legsCount = filteredHistory.filter(s => s.type === 'Legs').length;
    const customCount = filteredHistory.filter(s => s.type === 'Custom').length;

    // Prepare Graph Data (Last 7 sessions from filtered list)
    // Note: Graph usually shows trend, if we filter by Day, graph might show only 1 item which is expected.
    const last7Sessions = [...filteredHistory].reverse().slice(0, 7).reverse();
    const maxVol = last7Sessions.length > 0 ? Math.max(...last7Sessions.map(s => calculateVolume(s))) : 100;

    return (
      <div className="max-w-md mx-auto px-4 py-8 pb-24 animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-6">
          <div className="flex items-center gap-3">
              {userProfile?.avatarUrl && (
                  <img src={userProfile.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-800" />
              )}
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-1">Dashboard</h1>
                <p className="text-slate-400 text-sm">สวัสดีคุณ <span className="text-white font-bold">{userProfile?.displayName}</span></p>
              </div>
          </div>
          {history.length > 0 && (
              <button 
                  onClick={requestClearHistory}
                  className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium border border-red-900/30"
              >
                  <Trash2 size={16} />
              </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
            {['all', 'day', 'week', 'month', 'year'].map((range) => (
                <button
                    key={range}
                    onClick={() => setFilterRange(range as any)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        filterRange === range 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                >
                    {range === 'all' && 'ทั้งหมด'}
                    {range === 'day' && 'วันนี้'}
                    {range === 'week' && 'สัปดาห์นี้'}
                    {range === 'month' && 'เดือนนี้'}
                    {range === 'year' && 'ปีนี้'}
                </button>
            ))}
        </div>

        {/* Missing Config Warning */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-900/50 rounded-xl flex gap-3 items-start">
            <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-amber-400 text-sm mb-1">ไม่ได้เชื่อมต่อ Database</h3>
              <p className="text-xs text-amber-200/70 leading-relaxed">
                ข้อมูลของคุณจะถูกบันทึกชั่วคราวเท่านั้น กรุณาตั้งค่า Environment Variables (VITE_SUPABASE_URL) ใน Vercel Dashboard
              </p>
            </div>
          </div>
        )}

        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 size={48} className="animate-spin mb-4 text-blue-500" />
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <HistoryIcon size={48} className="mb-4 opacity-50 text-blue-500" />
              <p className="text-lg font-medium text-slate-300">ยังไม่มีข้อมูล</p>
              <p className="text-xs mb-6">เริ่มบันทึกการฝึกครั้งแรกของคุณเลย!</p>
              <button onClick={() => setActiveTab('workout')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-all">
                  เริ่มฝึกซ้อม
              </button>
          </div>
        ) : (
          <div className="space-y-6">
              {/* Highlight Cards */}
              <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 p-4 rounded-2xl border border-blue-500/20 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><Trophy size={48} /></div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">จำนวนครั้ง</p>
                      <h3 className="text-2xl font-bold text-blue-400">{totalWorkouts}</h3>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-900/40 to-slate-800 p-4 rounded-2xl border border-emerald-500/20 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10"><Dumbbell size={48} /></div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">นน.รวม (kg)</p>
                      <h3 className="text-2xl font-bold text-emerald-400">{(totalVolume / 1000).toFixed(1)}k</h3>
                  </div>
                  <div className="bg-gradient-to-br from-orange-900/40 to-slate-800 p-4 rounded-2xl border border-orange-500/20 shadow-lg relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-2 opacity-10"><Timer size={48} /></div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">เวลาเฉลี่ย</p>
                      <h3 className="text-2xl font-bold text-orange-400">{avgDurationMinutes}<span className="text-sm font-medium text-slate-500 ml-1">น.</span></h3>
                  </div>
              </div>

               {/* Distribution Bar */}
               <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                   <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                       <BarChart3 size={16} className="text-slate-400" /> สัดส่วนการฝึก
                   </h3>
                   <div className="flex h-4 rounded-full overflow-hidden bg-slate-900 mb-2">
                       {totalWorkouts > 0 ? (
                           <>
                            <div style={{ width: `${(pushCount / totalWorkouts) * 100}%` }} className="bg-red-500 h-full"></div>
                            <div style={{ width: `${(pullCount / totalWorkouts) * 100}%` }} className="bg-blue-500 h-full"></div>
                            <div style={{ width: `${(legsCount / totalWorkouts) * 100}%` }} className="bg-green-500 h-full"></div>
                            <div style={{ width: `${(customCount / totalWorkouts) * 100}%` }} className="bg-purple-500 h-full"></div>
                           </>
                       ) : (
                           <div className="w-full bg-slate-800 h-full"></div>
                       )}
                   </div>
                   <div className="flex justify-between text-xs text-slate-400 mt-2">
                       <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Push ({pushCount})</div>
                       <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Pull ({pullCount})</div>
                       <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Legs ({legsCount})</div>
                       <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Custom ({customCount})</div>
                   </div>
               </div>

              {/* Volume Trend Graph */}
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                   <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                       <TrendingUp size={16} className="text-slate-400" /> แนวโน้มความแข็งแรง (Volume)
                   </h3>
                   <div className="h-40 flex items-end gap-2">
                        {last7Sessions.length > 0 ? last7Sessions.map((s, i) => {
                             const vol = calculateVolume(s);
                             const heightPercent = (vol / maxVol) * 100;
                             const colorClass = s.type === 'Push' ? 'bg-red-500' : s.type === 'Pull' ? 'bg-blue-500' : s.type === 'Legs' ? 'bg-green-500' : 'bg-purple-500';
                             return (
                                 <div key={i} className="flex-1 flex flex-col items-center group">
                                     <div 
                                        className={`w-full rounded-t-sm opacity-60 group-hover:opacity-100 transition-all ${colorClass}`} 
                                        style={{ height: `${Math.max(heightPercent, 10)}%` }}
                                     ></div>
                                     <span className="text-[10px] text-slate-500 mt-1 truncate w-full text-center">
                                         {new Date(s.startTime || 0).getDate()}
                                     </span>
                                 </div>
                             )
                        }) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">ไม่มีข้อมูลกราฟ</div>
                        )}
                   </div>
              </div>

              {/* History List */}
              <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase mb-3 px-1">ประวัติการฝึกซ้อม ({filteredHistory.length})</h3>
                  <div className="space-y-3">
                      {filteredHistory.map((session) => (
                          <div key={session.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center group">
                              <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-full ${
                                      session.type === 'Push' ? 'bg-red-900/30 text-red-400' : 
                                      session.type === 'Pull' ? 'bg-blue-900/30 text-blue-400' : 
                                      session.type === 'Legs' ? 'bg-green-900/30 text-green-400' :
                                      'bg-purple-900/30 text-purple-400'
                                  }`}>
                                      {session.type === 'Push' ? <Flame size={20} /> : 
                                       session.type === 'Pull' ? <Anchor size={20} /> : 
                                       session.type === 'Legs' ? <Zap size={20} /> :
                                       <Settings size={20} />}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-white">{session.title}</h4>
                                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                          <CalendarClock size={12} />
                                          {session.date}
                                      </p>
                                      <div className="flex gap-3 mt-2">
                                          <span className="text-xs text-emerald-400 font-medium bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                              {(calculateVolume(session)).toLocaleString()} kg
                                          </span>
                                           <span className="text-xs text-orange-400 font-medium bg-orange-900/20 px-1.5 py-0.5 rounded">
                                              {formatDuration(session.startTime, session.endTime)}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                   <button 
                                      onClick={() => editHistoryItem(session.id)}
                                      className="p-2 text-slate-500 hover:text-blue-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                                  >
                                      <Pencil size={16} />
                                  </button>
                                  <button 
                                      onClick={() => requestDeleteItem(session.id)}
                                      className="p-2 text-slate-500 hover:text-red-400 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
                                  >
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
        )}
      </div>
    );
  };

  const renderWorkoutScreen = () => {
    // If Summary is shown (Review Phase)
    if (showSummary && activeSession) {
      const volume = calculateVolume(activeSession);
      const duration = formatDuration(activeSession.startTime, activeSession.endTime);
      
      // Filter only exercises that have at least one completed set
      const playedExercises = activeSession.exercises.filter(ex => 
          ex.sets.some(s => s.completed)
      );

      return (
        <div className="max-w-md mx-auto px-4 py-8 pb-32 animate-in slide-in-from-right duration-300">
           <div className="text-center mb-8">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/20 animate-bounce">
                  <Trophy size={40} className="text-slate-900" strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl font-extrabold text-white mb-2">ยอดเยี่ยมมาก!</h1>
              <p className="text-slate-400">คุณทำสำเร็จไปอีกวันแล้ว</p>
           </div>

           <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">เวลารวม</p>
                  <p className="text-2xl font-bold text-white">{duration}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">น้ำหนักรวม</p>
                  <p className="text-2xl font-bold text-emerald-400">{(volume / 1000).toFixed(2)} <span className="text-sm text-slate-500">ตัน</span></p>
              </div>
           </div>

           {/* Workout Details Summary */}
           <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-8">
               <div className="bg-slate-700/50 p-3 border-b border-slate-700">
                   <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                       <LayoutDashboard size={16} /> รายละเอียดการฝึก
                   </h3>
               </div>
               <div className="p-4 space-y-4">
                   {playedExercises.length > 0 ? playedExercises.map((ex, i) => (
                       <div key={i} className="text-sm">
                           <div className="flex justify-between items-center mb-1">
                               <span className="font-bold text-slate-200">{ex.name}</span>
                               <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">{ex.muscleGroup}</span>
                           </div>
                           <div className="space-y-1 pl-2 border-l-2 border-slate-700">
                               {ex.sets.filter(s => s.completed).map((s, idx) => (
                                   <div key={idx} className="flex justify-between text-xs text-slate-400">
                                       <span>Set {s.setNumber}</span>
                                       <span>{s.weight} kg × {s.reps} ครั้ง</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )) : (
                       <p className="text-center text-slate-500 text-sm py-2">ไม่มีท่าที่เล่นจบเซ็ต</p>
                   )}
               </div>
           </div>

           <div className="flex gap-3">
              <button 
                onClick={resumeWorkout}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-xl transition-all"
              >
                กลับไปแก้ไข
              </button>
              <button 
                onClick={saveWorkout}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                บันทึกการฝึกซ้อม
              </button>
           </div>
        </div>
      );
    }

    // Active Session Screen
    if (activeSession) {
      return (
        <div className="max-w-md mx-auto px-4 py-6 pb-24 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-950/80 backdrop-blur-md py-4 z-30 -mx-4 px-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
               <div className={`p-2 rounded-lg ${
                   activeSession.type === 'Push' ? 'bg-red-500/20 text-red-500' : 
                   activeSession.type === 'Pull' ? 'bg-blue-500/20 text-blue-500' : 
                   activeSession.type === 'Legs' ? 'bg-green-500/20 text-green-500' :
                   'bg-purple-500/20 text-purple-500'
               }`}>
                  {activeSession.type === 'Push' ? <Flame size={24} fill="currentColor" className="opacity-50" /> : 
                   activeSession.type === 'Pull' ? <Anchor size={24} /> : 
                   activeSession.type === 'Legs' ? <Zap size={24} fill="currentColor" className="opacity-50" /> :
                   <Settings size={24} />}
               </div>
               <div>
                   <h1 className="text-xl font-bold text-white leading-tight">{activeSession.title}</h1>
                   <p className="text-xs text-slate-400 flex items-center gap-1">
                       <CalendarClock size={12} /> {activeSession.date}
                   </p>
               </div>
            </div>
            <button 
                onClick={finishWorkout}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/30 transition-all active:scale-95"
            >
                จบการฝึก
            </button>
          </div>

          <div className="space-y-1">
            {activeSession.exercises.map(exercise => (
              <ExerciseCard 
                key={exercise.id} 
                exercise={exercise} 
                onUpdateSet={updateSet}
                onUpdateName={updateExerciseName}
                onAddSet={addSetToExercise}
              />
            ))}
          </div>

          <button 
            onClick={addExercise}
            className="w-full py-4 mt-6 border-2 border-dashed border-slate-700 rounded-2xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 font-medium"
          >
              <Plus size={20} /> เพิ่มท่าออกกำลังกาย
          </button>
          
          {/* AI Coach Floating Button */}
           <button 
            onClick={() => setIsCoachOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50 hover:scale-110 transition-transform z-40 border border-white/10"
          >
            <MessageCircle size={28} className="text-white" />
          </button>
        </div>
      );
    }

    // Program Selection Screen (Start Screen)
    return (
      <div className="max-w-md mx-auto px-6 py-10 flex flex-col min-h-[90vh] animate-in fade-in duration-500">
        <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-10">
                <div className="inline-block p-1 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 mb-4">
                    <div className="bg-slate-950 rounded-full p-1">
                         {userProfile?.avatarUrl ? (
                             <img src={userProfile.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full" />
                         ) : (
                             <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center">
                                 <User className="text-slate-500" />
                             </div>
                         )}
                    </div>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight mb-2">REPx</h1>
                <p className="text-slate-400 font-medium tracking-wide text-sm">SELECT YOUR WORKOUT</p>
            </div>

            <div className="grid grid-cols-1 gap-4 w-full mb-8">
            <button 
                onClick={() => startWorkout('Push')}
                className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500/50 p-6 rounded-2xl transition-all duration-300 active:scale-95"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Flame size={80} className="text-red-500" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-red-500/20 p-3 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                        <Flame size={32} fill="currentColor" className="opacity-70 group-hover:opacity-100" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white group-hover:text-red-400 transition-colors">PUSH</h2>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Chest • Shoulders • Triceps</p>
                    </div>
                </div>
            </button>

            <button 
                onClick={() => startWorkout('Pull')}
                className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/50 p-6 rounded-2xl transition-all duration-300 active:scale-95"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Anchor size={80} className="text-blue-500" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <Anchor size={32} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">PULL</h2>
                         <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Back • Biceps • Rear Delt</p>
                    </div>
                </div>
            </button>

            <button 
                onClick={() => startWorkout('Legs')}
                className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-500/50 p-6 rounded-2xl transition-all duration-300 active:scale-95"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap size={80} className="text-green-500" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-green-500/20 p-3 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                        <Zap size={32} fill="currentColor" className="opacity-70 group-hover:opacity-100" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">LEGS</h2>
                         <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Quads • Hamstrings • Calves</p>
                    </div>
                </div>
            </button>

            <button 
                onClick={() => startWorkout('Custom')}
                className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 p-6 rounded-2xl transition-all duration-300 active:scale-95"
            >
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Settings size={80} className="text-purple-500" />
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-purple-500/20 p-3 rounded-xl text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <Settings size={32} />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">CUSTOM</h2>
                         <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Build Your Own Routine</p>
                    </div>
                </div>
            </button>
            </div>

            <div className="mt-auto pt-8 border-t border-slate-800/50 text-center">
                <p className="text-white text-lg font-medium italic mb-2">"{quote}"</p>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Motivation of the day</p>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
        {!userProfile ? (
            renderLoginScreen()
        ) : (
            <>
                <div className="mx-auto w-full max-w-md bg-slate-950 min-h-screen shadow-2xl overflow-hidden relative">
                    {activeTab === 'workout' && renderWorkoutScreen()}
                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'profile' && renderProfileScreen()}
                    
                    {renderBottomNav()}
                    
                    <AICoachModal isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
                    
                    <ConfirmModal 
                        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                        {...confirmModal}
                    />
                </div>
            </>
        )}
    </div>
  );
};

export default App;
