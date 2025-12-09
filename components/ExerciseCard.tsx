import React, { useState, useEffect } from 'react';
import { Pencil, Check, X, Plus, Trash2, History } from 'lucide-react';
import { Exercise, WorkoutSet } from '../types';

interface ExerciseCardProps {
  exercise: Exercise;
  onUpdateSet: (exerciseId: string, set: WorkoutSet) => void;
  onUpdateName: (exerciseId: string, newName: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemove: (exerciseId: string) => void;
  lastWeight?: number | null; // New prop for last session weight
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ 
  exercise, 
  onUpdateSet, 
  onUpdateName, 
  onAddSet, 
  onRemove,
  lastWeight 
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(exercise.name);

  // Sync tempName if props change (though normally local state handles edit flow)
  useEffect(() => {
    if (!isEditingName) {
        setTempName(exercise.name);
    }
  }, [exercise.name, isEditingName]);

  const handleSetChange = (set: WorkoutSet, field: 'reps' | 'weight', value: string) => {
    const numValue = value === '' ? '' : Number(value);
    onUpdateSet(exercise.id, { ...set, [field]: numValue });
  };

  const toggleComplete = (set: WorkoutSet) => {
    onUpdateSet(exercise.id, { ...set, completed: !set.completed });
  };

  const saveName = () => {
    if (tempName.trim()) {
        onUpdateName(exercise.id, tempName);
        setIsEditingName(false);
    }
  };

  const cancelEdit = () => {
    setTempName(exercise.name);
    setIsEditingName(false);
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-sm rounded-3xl p-5 border border-white/5 shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
            {isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                    <input 
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveName()}
                        autoFocus
                        className="flex-1 bg-black/40 text-white text-lg font-bold px-3 py-2 rounded-xl border border-blue-500 focus:outline-none"
                    />
                    <button onClick={saveName} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/50">
                        <Check size={18} />
                    </button>
                    <button onClick={cancelEdit} className="p-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600">
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                    <h3 className="text-lg font-semibold text-white break-words leading-tight">{exercise.name}</h3>
                    <Pencil size={14} className="text-slate-600 opacity-50 hover:opacity-100 transition-opacity" />
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-md uppercase tracking-wide border border-white/5">
                    {exercise.targetSets} Sets × {exercise.targetReps} Reps
                </span>
                {lastWeight && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-900/30 px-2 py-1 rounded-md border border-blue-500/20">
                        <History size={10} />
                        LAST: {lastWeight} kg
                    </span>
                )}
            </div>
        </div>
        {!isEditingName && (
            <button 
                onClick={() => onRemove(exercise.id)}
                className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all p-2 rounded-xl"
                title="ลบท่าออกกำลังกาย"
            >
                <Trash2 size={18} />
            </button>
        )}
      </div>
      
      {exercise.note && (
        <div className="mb-4 text-xs font-medium text-amber-300/80 bg-amber-900/20 p-3 rounded-xl border border-amber-500/10 flex gap-2">
            <span>💡</span> {exercise.note}
        </div>
      )}

      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-10 gap-3 text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2 mb-1">
            <div className="col-span-1 text-center self-end">#</div>
            <div className="col-span-3 text-center self-end">KG</div>
            <div className="col-span-3 text-center self-end">REPS</div>
            <div className="col-span-3 text-center self-end">DONE</div>
        </div>
        
        {exercise.sets.map((set, index) => (
          <div key={set.id} className={`grid grid-cols-10 gap-3 items-center p-1 rounded-2xl transition-all duration-300 ${set.completed ? 'opacity-50' : ''}`}>
            
            {/* Set Number */}
            <div className="col-span-1 flex justify-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${set.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                    {index + 1}
                </div>
            </div>

            {/* Weight Input */}
            <div className="col-span-3 relative">
                <input 
                    type="number" 
                    placeholder="-"
                    value={set.weight}
                    onChange={(e) => handleSetChange(set, 'weight', e.target.value)}
                    className={`w-full h-12 bg-black/30 text-center text-white text-lg font-semibold rounded-2xl border border-transparent focus:border-blue-500/50 focus:bg-black/50 focus:outline-none transition-all placeholder:text-slate-700`}
                />
            </div>

            {/* Reps Input */}
            <div className="col-span-3 relative">
                <input 
                    type="number" 
                    placeholder="-"
                    value={set.reps}
                    onChange={(e) => handleSetChange(set, 'reps', e.target.value)}
                    className={`w-full h-12 bg-black/30 text-center text-white text-lg font-semibold rounded-2xl border border-transparent focus:border-blue-500/50 focus:bg-black/50 focus:outline-none transition-all placeholder:text-slate-700`}
                />
            </div>

            {/* Complete Button */}
            <div className="col-span-3 h-12">
                <button 
                    onClick={() => toggleComplete(set)}
                    className={`w-full h-full rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                        set.completed 
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-emerald-500/20' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-600 hover:text-slate-400 border border-white/5'
                    }`}
                >
                    <Check size={20} strokeWidth={3} className={set.completed ? "scale-110" : ""} />
                </button>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => onAddSet(exercise.id)}
        className="w-full py-3 mt-5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-400 bg-white/5 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/5"
      >
        <Plus size={14} /> Add Set
      </button>
    </div>
  );
};