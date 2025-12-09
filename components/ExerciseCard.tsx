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
    <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-slate-700 shadow-lg">
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
                        className="flex-1 bg-slate-900 text-white text-lg font-bold px-2 py-1 rounded border border-blue-500 focus:outline-none"
                    />
                    <button onClick={saveName} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500">
                        <Check size={16} />
                    </button>
                    <button onClick={cancelEdit} className="p-1 bg-slate-600 text-white rounded hover:bg-slate-500">
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 group">
                    <h3 className="text-lg font-bold text-white break-words">{exercise.name}</h3>
                    <button 
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                        <Pencil size={14} />
                    </button>
                </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-sm text-slate-400">{exercise.targetSets} Sets × {exercise.targetReps} Reps</p>
                {lastWeight && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-500/20">
                        <History size={10} />
                        ล่าสุด: {lastWeight} kg
                    </span>
                )}
            </div>
        </div>
        {!isEditingName && (
            <button 
                onClick={() => onRemove(exercise.id)}
                className="text-slate-600 hover:text-red-500 transition-colors p-1 -mr-1"
                title="ลบท่าออกกำลังกาย"
            >
                <Trash2 size={18} />
            </button>
        )}
      </div>
      
      {exercise.note && (
        <div className="mb-4 text-xs text-amber-400 bg-amber-900/20 p-2 rounded border border-amber-900/30">
            💡 {exercise.note}
        </div>
      )}

      <div className="space-y-2">
        <div className="grid grid-cols-10 gap-2 text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1 px-1">
            <div className="col-span-1 text-center pt-1">Set</div>
            <div className="col-span-3 text-center pt-1">นน. (kg)</div>
            <div className="col-span-3 text-center pt-1">ครั้ง</div>
            <div className="col-span-3 text-center"></div>
        </div>
        {exercise.sets.map((set, index) => (
          <div key={set.id} className={`grid grid-cols-10 gap-2 items-center p-2 rounded-lg transition-all duration-300 ${set.completed ? 'bg-emerald-900/10 border border-emerald-900/30' : 'bg-slate-900/50 border border-slate-700'}`}>
            <div className="col-span-1 text-center font-mono text-slate-400 font-bold text-lg">
                {index + 1}
            </div>
            <div className="col-span-3">
                <input 
                    type="number" 
                    placeholder="0"
                    value={set.weight}
                    onChange={(e) => handleSetChange(set, 'weight', e.target.value)}
                    className={`w-full h-[42px] bg-slate-800 text-center text-white text-lg font-bold rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${set.completed ? 'opacity-60' : ''}`}
                />
            </div>
            <div className="col-span-3">
                <input 
                    type="number" 
                    placeholder="0"
                    value={set.reps}
                    onChange={(e) => handleSetChange(set, 'reps', e.target.value)}
                    className={`w-full h-[42px] bg-slate-800 text-center text-white text-lg font-bold rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${set.completed ? 'opacity-60' : ''}`}
                />
            </div>
            <div className="col-span-3 flex justify-center h-[42px]">
                <button 
                    onClick={() => toggleComplete(set)}
                    className={`w-full h-full rounded-lg flex items-center justify-center transition-all active:scale-95 shadow-sm ${
                        set.completed 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-900/20' 
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    {set.completed ? <Check size={24} strokeWidth={3} /> : <Check size={24} className="opacity-20" />}
                </button>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => onAddSet(exercise.id)}
        className="w-full py-3 mt-4 text-sm font-medium text-slate-400 border border-dashed border-slate-700 rounded-xl hover:bg-slate-700/50 hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <Plus size={16} />
        เพิ่มเซ็ต
      </button>
    </div>
  );
};