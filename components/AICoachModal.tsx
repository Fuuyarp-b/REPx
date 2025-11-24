
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2 } from 'lucide-react';
import { getFitnessAdvice } from '../services/geminiService';
import { ChatMessage } from '../types';

interface AICoachModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AICoachModal: React.FC<AICoachModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'สวัสดีครับ! ผมคือ AI Coach ของคุณ มีคำถามเรื่องท่าออกกำลังกาย หรืออยากปรับตารางฝึก ปรึกษาผมได้เลยครับ', timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await getFitnessAdvice(input);
    
    const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-full">
                    <Bot size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-white">AI Coach</h3>
                    <p className="text-xs text-slate-400">Powered by Gemini 2.5</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                    }`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-800 p-3 rounded-2xl rounded-bl-none border border-slate-700 flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-blue-500" />
                        <span className="text-xs text-slate-400">กำลังคิด...</span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="ถามเกี่ยวกับท่าออกกำลังกาย..."
                    className="flex-1 bg-slate-900 text-white border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
