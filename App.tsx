
import { useState, useEffect } from 'react';
import { Dumbbell, Trophy, MessageCircle, ChevronLeft, Plus, LayoutDashboard, CalendarClock, Timer, History as HistoryIcon, Trash2, Pencil, BarChart3, TrendingUp, Zap, Flame, Anchor, Settings } from 'lucide-react';
import { WorkoutSession, WorkoutType, Exercise, WorkoutSet } from './types';
import { PUSH_ROUTINE, PULL_ROUTINE, LEGS_ROUTINE, createSets, MOTIVATIONAL_QUOTES } from './constants';
import { ExerciseCard } from './components/ExerciseCard';
import { AICoachModal } from './components/AICoachModal';
import { ConfirmModal } from './components/ConfirmModal';

const App = () => {
  // State
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [isCoachOpen, setIsCoachOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'workout' | 'dashboard'>('workout');
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  
  // Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false
  });

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('workout_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    // Randomize quote on initial load
    setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('workout_history', JSON.stringify(history));
  }, [history]);

  // Randomize quote when returning to selection screen
  useEffect(() => {
    if (!activeSession && !showSummary && activeTab === 'workout') {
      const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
      setQuote(MOTIVATIONAL_QUOTES[randomIndex]);
    }
  }, [activeSession, showSummary, activeTab]);

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

  // Phase 3: Confirm and Save
  const saveWorkout = () => {
    if (!activeSession) return;
    
    // Ensure we have an end time
    const endTime = activeSession.endTime || Date.now();
    
    const completedSession: WorkoutSession = { 
        ...activeSession, 
        status: 'completed', 
        endTime 
    };
    
    setHistory(prev => {
        // Check if this session ID already exists in history (Edit mode)
        const exists = prev.some(s => s.id === completedSession.id);
        if (exists) {
            return prev.map(s => s.id === completedSession.id ? completedSession : s);
        }
        // New session
        return [completedSession, ...prev];
    });

    setActiveSession(null);
    setShowSummary(false);
    setActiveTab('dashboard');
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
      onConfirm: () => {
        setHistory([]);
        setActiveSession(null);
        setActiveTab('workout');
        localStorage.removeItem('workout_history');
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestDeleteItem = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'ลบรายการ',
      message: 'คุณต้องการลบรายการบันทึกนี้ใช่หรือไม่?',
      isDangerous: true,
      onConfirm: () => {
        setHistory(prev => prev.filter(item => item.id !== id));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
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

  const calculateVolume = (session: WorkoutSession) => {
    return session.exercises.reduce((total, ex) => {
        return total + ex.sets.reduce((subTotal, set) => {
            if (set.completed && typeof set.weight === 'number' && typeof set.reps === 'number') {
                return subTotal + (set.weight * set.reps);
            }
            return subTotal;
        }, 0);
    }, 0);
  };

  // --- Renders ---

  const renderBottomNav = () => {
    // Don't show nav if in active session or summary
    if (activeSession || showSummary) return null;

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 z-40">
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
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    // Calculate Stats
    const totalWorkouts = history.length;
    const totalVolume = history.reduce((acc, s) => acc + calculateVolume(s), 0);
    const totalDurationMs = history.reduce((acc, s) => acc + ((s.endTime || 0) - (s.startTime || 0)), 0);
    const avgDurationMinutes = totalWorkouts > 0 ? Math.floor((totalDurationMs / totalWorkouts) / 60000) : 0;

    const pushCount = history.filter(s => s.type === 'Push').length;
    const pullCount = history.filter(s => s.type === 'Pull').length;
    const legsCount = history.filter(s => s.type === 'Legs').length;
    const customCount = history.filter(s => s.type === 'Custom').length;

    // Prepare Graph Data (Last 7 sessions)
    const last7Sessions = [...history].reverse().slice(0, 7).reverse();
    const maxVol = last7Sessions.length > 0 ? Math.max(...last7Sessions.map(s => calculateVolume(s))) : 100;

    return (
      <div className="max-w-md mx-auto px-4 py-8 pb-24 animate-in fade-in duration-500">
        <div className="flex justify-between items-end mb-6">
          <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-1">Dashboard</h1>
              <p className="text-slate-400 text-sm">วิเคราะห์ผลการฝึกซ้อมของคุณ</p>
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

        {history.length === 0 ? (
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
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Trophy size={40} />
                      </div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Workouts</p>
                      <p className="text-2xl font-bold text-white">{totalWorkouts}</p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
                          <Zap size={40} />
                      </div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Volume (kg)</p>
                      <p className="text-2xl font-bold text-emerald-400">{(totalVolume / 1000).toFixed(1)}k</p>
                  </div>
                   <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity text-orange-500">
                          <Timer size={40} />
                      </div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">Avg Time</p>
                      <p className="text-2xl font-bold text-orange-400">{avgDurationMinutes}<span className="text-xs ml-1 text-slate-500">น.</span></p>
                  </div>
              </div>

              {/* Volume Progress Chart */}
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
                  <div className="flex items-center gap-2 mb-6">
                      <TrendingUp size={20} className="text-blue-400" />
                      <h2 className="text-base font-bold text-white">แนวโน้ม Volume (7 ครั้งล่าสุด)</h2>
                  </div>
                  <div className="h-40 flex items-end justify-between gap-2 px-1">
                      {last7Sessions.map((session, index) => {
                          const vol = calculateVolume(session);
                          const heightPct = (vol / maxVol) * 100;
                          const colorClass = 
                            session.type === 'Push' ? 'bg-red-500' : 
                            session.type === 'Pull' ? 'bg-blue-500' : 
                            session.type === 'Legs' ? 'bg-emerald-500' : 
                            'bg-purple-500';
                          
                          return (
                              <div key={index} className="flex flex-col items-center gap-1 flex-1 group relative">
                                  <div 
                                      className={`w-full min-w-[8px] max-w-[24px] rounded-t-lg transition-all duration-500 hover:opacity-80 ${colorClass}`}
                                      style={{ height: `${Math.max(heightPct, 5)}%` }}
                                  ></div>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                      {new Date(session.startTime!).getDate()}
                                  </span>
                                  {/* Tooltip */}
                                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs p-2 rounded border border-slate-600 whitespace-nowrap z-10">
                                      {session.title}: {(vol/1000).toFixed(1)}k
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Workout Distribution */}
              <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
                   <div className="flex items-center gap-2 mb-4">
                      <BarChart3 size={20} className="text-purple-400" />
                      <h2 className="text-base font-bold text-white">สัดส่วนการฝึก</h2>
                  </div>
                  <div className="space-y-3">
                      <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                              <span className="text-slate-300">Push Day</span>
                              <span className="text-slate-500">{pushCount} ครั้ง</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-red-500 rounded-full" style={{ width: `${totalWorkouts ? (pushCount/totalWorkouts)*100 : 0}%` }}></div>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                              <span className="text-slate-300">Pull Day</span>
                              <span className="text-slate-500">{pullCount} ครั้ง</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalWorkouts ? (pullCount/totalWorkouts)*100 : 0}%` }}></div>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                              <span className="text-slate-300">Leg Day</span>
                              <span className="text-slate-500">{legsCount} ครั้ง</span>
                          </div>
                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalWorkouts ? (legsCount/totalWorkouts)*100 : 0}%` }}></div>
                          </div>
                      </div>
                      {customCount > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-300">Custom</span>
                                <span className="text-slate-500">{customCount} ครั้ง</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalWorkouts ? (customCount/totalWorkouts)*100 : 0}%` }}></div>
                            </div>
                        </div>
                      )}
                  </div>
              </div>

              <h2 className="text-lg font-bold text-white mt-4 mb-2 pl-1">ประวัติล่าสุด</h2>
              
              {history.map((session) => (
                  <div key={session.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm hover:border-slate-600 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                      session.type === 'Push' ? 'bg-red-500' : 
                                      session.type === 'Pull' ? 'bg-blue-500' : 
                                      session.type === 'Legs' ? 'bg-emerald-500' : 'bg-purple-500'
                                  }`}></span>
                                  <h3 className="font-bold text-white">{session.title}</h3>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                  <span className="flex items-center gap-1"><CalendarClock size={10} /> {session.date}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1"><Timer size={10} /> {formatDuration(session.startTime, session.endTime)}</span>
                              </div>
                          </div>
                          
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => editHistoryItem(session.id)}
                                  className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                  <Pencil size={16} />
                              </button>
                               <button 
                                  onClick={() => requestDeleteItem(session.id)}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-between items-center">
                          <div className="text-xs text-slate-500">
                             {session.exercises.reduce((acc, ex) => acc + ex.sets.filter(s=>s.completed).length, 0)} Sets Completed
                          </div>
                          <div className="text-sm font-mono font-bold text-emerald-400">
                              {calculateVolume(session).toLocaleString()} kg
                          </div>
                      </div>
                  </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  const renderSelectionScreen = () => (
    <div className="max-w-md mx-auto px-4 py-8 pb-24">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">
          REPx By FUUYARP
        </h1>
        <p className="text-slate-400">เลือกโปรแกรมฝึกสำหรับวันนี้</p>
      </div>

      <div className="space-y-4">
        <button onClick={() => startWorkout('Push')} className="w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border border-slate-700 bg-slate-800 hover:border-red-500/50">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">PUSH DAY</h2>
                <p className="text-sm text-slate-400">อก • ไหล่ • หลังแขน</p>
            </div>
            <div className="bg-red-500/20 p-3 rounded-full text-red-400 shadow-lg shadow-red-900/20">
                <Flame size={28} strokeWidth={2.5} />
            </div>
          </div>
        </button>

        <button onClick={() => startWorkout('Pull')} className="w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border border-slate-700 bg-slate-800 hover:border-blue-500/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">PULL DAY</h2>
                <p className="text-sm text-slate-400">หลัง • ไหล่หลัง • หน้าแขน</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-full text-blue-400 shadow-lg shadow-blue-900/20">
                <Anchor size={28} strokeWidth={2.5} />
            </div>
          </div>
        </button>

        <button onClick={() => startWorkout('Legs')} className="w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border border-slate-700 bg-slate-800 hover:border-emerald-500/50">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">LEG DAY</h2>
                <p className="text-sm text-slate-400">ขา • น่อง • ท้อง</p>
            </div>
            <div className="bg-emerald-500/20 p-3 rounded-full text-emerald-400 shadow-lg shadow-emerald-900/20">
                <Zap size={28} strokeWidth={2.5} />
            </div>
          </div>
        </button>

        {/* Custom Workout Button */}
        <button onClick={() => startWorkout('Custom')} className="w-full group relative overflow-hidden rounded-2xl p-6 text-left transition-all hover:scale-[1.02] active:scale-95 border border-slate-700 bg-slate-800 hover:border-purple-500/50">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">CUSTOM</h2>
                <p className="text-sm text-slate-400">เลือกท่าเอง • อิสระ</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-full text-purple-400 shadow-lg shadow-purple-900/20">
                <Settings size={28} strokeWidth={2.5} />
            </div>
          </div>
        </button>
      </div>

      <div className="mt-12 p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
        <p className="text-sm text-slate-500 italic">"{quote}"</p>
      </div>
    </div>
  );

  const renderActiveSession = () => {
    if (!activeSession) return null;

    const completedSets = activeSession.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    const totalSets = activeSession.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    return (
      <div className="pb-24">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shadow-xl">
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => setActiveSession(null)} className="p-2 -ml-2 text-slate-400 hover:text-white">
                    <ChevronLeft />
                </button>
                <div className="text-center">
                    <h2 className="font-bold text-lg text-white">{activeSession.title}</h2>
                    <p className="text-xs text-slate-400">{activeSession.date}</p>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>ความคืบหน้า</span>
                <span>{progress}%</span>
            </div>
        </div>

        {/* Exercises List */}
        <div className="px-4 py-6">
            {activeSession.exercises.map(ex => (
                <ExerciseCard 
                  key={ex.id} 
                  exercise={ex} 
                  onUpdateSet={updateSet} 
                  onUpdateName={updateExerciseName}
                  onAddSet={addSetToExercise}
                />
            ))}
            
            {/* Add Exercise Button */}
            <button 
                onClick={addExercise}
                className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-blue-500 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
                <Plus size={20} />
                <span className="font-medium">เพิ่มท่าออกกำลังกาย</span>
            </button>
        </div>

        {/* Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 flex justify-center gap-4 z-20">
            <button 
                onClick={finishWorkout}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
            >
                จบการฝึก
            </button>
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (!activeSession) return null;
    
    const totalVolume = calculateVolume(activeSession);
    const totalSetsCompleted = activeSession.exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
    const durationText = formatDuration(activeSession.startTime, activeSession.endTime);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
            <div className="w-full max-w-md bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="text-center mb-6 flex-shrink-0">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400 border border-emerald-500/30">
                        <Trophy size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">เก่งมาก!</h2>
                    <p className="text-slate-400 text-sm">สรุปผลการฝึกซ้อมวันนี้</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 flex-shrink-0">
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Volume</p>
                        <p className="text-lg font-bold text-white">{totalVolume.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">kg</span></p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Sets</p>
                        <p className="text-lg font-bold text-white">{totalSetsCompleted} <span className="text-[10px] text-slate-500 font-normal">sets</span></p>
                    </div>
                     <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Time</p>
                        <p className="text-lg font-bold text-blue-400">{durationText}</p>
                    </div>
                </div>
                
                {/* Detailed Breakdown List */}
                <div className="flex-1 overflow-y-auto pr-1 mb-4 space-y-3 custom-scrollbar">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-2">รายละเอียดการฝึก</h3>
                    {activeSession.exercises.map(ex => {
                        const completedSets = ex.sets.filter(s => s.completed);
                        if (completedSets.length === 0) return null;

                        return (
                            <div key={ex.id} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/30">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-slate-200 text-sm">{ex.name}</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-900/30">
                                        {completedSets.length} sets
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {completedSets.map((set) => (
                                        <div key={set.id} className="bg-slate-800 p-1.5 rounded text-center border border-slate-700">
                                            <div className="text-[10px] text-slate-500 mb-0.5">Set {set.setNumber}</div>
                                            <div className="text-xs font-mono text-white">
                                                <span className="font-bold">{set.weight || 0}</span>
                                                <span className="text-slate-500 mx-0.5">×</span>
                                                <span>{set.reps || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {activeSession.exercises.every(ex => ex.sets.filter(s => s.completed).length === 0) && (
                        <div className="text-center text-slate-500 py-4 text-sm">
                            ไม่มีท่าที่เล่นจบสมบูรณ์
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 w-full flex-shrink-0">
                    <button 
                        onClick={saveWorkout}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/50 flex justify-center items-center gap-2"
                    >
                        <Trophy size={18} />
                        ยืนยันและบันทึก
                    </button>
                    
                    <button 
                        onClick={resumeWorkout}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 rounded-xl transition-all"
                    >
                        กลับไปแก้ไข
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    if (showSummary) return renderSummary();
    if (activeSession) return renderActiveSession();
    
    if (activeTab === 'dashboard') return renderDashboard();
    return renderSelectionScreen();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {renderContent()}
      {renderBottomNav()}
      
      {/* AI Coach FAB - Only show on main screens, not summary */}
      {!showSummary && !activeSession && (
        <button 
            onClick={() => setIsCoachOpen(true)}
            className="fixed bottom-20 right-6 z-30 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-xl shadow-blue-900/50 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
        >
            <MessageCircle size={24} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
            </span>
        </button>
      )}
      
      {/* AI Coach FAB - Adjusted position for active session to avoid "Complete" button overlap */}
      {activeSession && !showSummary && (
         <button 
            onClick={() => setIsCoachOpen(true)}
            className="fixed bottom-24 right-6 z-30 bg-slate-800 border border-slate-600 text-blue-400 p-3 rounded-full shadow-lg transition-all hover:bg-slate-700 active:scale-95"
        >
            <MessageCircle size={24} />
        </button>
      )}

      <AICoachModal isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} />
      
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDangerous={confirmModal.isDangerous}
      />
    </div>
  );
};

export default App;
