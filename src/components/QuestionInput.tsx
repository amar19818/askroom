
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface QuestionInputProps {
  onSubmit: (text: string) => Promise<void>;
  roomId?: string;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({ onSubmit, roomId }) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const [timeUntilCanSubmit, setTimeUntilCanSubmit] = useState(0);
  const { isDark } = useTheme();

  // Check if user can submit based on localStorage
  useEffect(() => {
    if (!roomId) return;
    
    const lastSubmitTime = localStorage.getItem(`lastQuestionSubmit_${roomId}`);
    if (lastSubmitTime) {
      const timeDiff = Date.now() - parseInt(lastSubmitTime);
      const cooldownMs = 60000; // 60 seconds
      
      if (timeDiff < cooldownMs) {
        setCanSubmit(false);
        setTimeUntilCanSubmit(Math.ceil((cooldownMs - timeDiff) / 1000));
        
        const interval = setInterval(() => {
          const newTimeDiff = Date.now() - parseInt(lastSubmitTime);
          const remainingTime = Math.ceil((cooldownMs - newTimeDiff) / 1000);
          
          if (remainingTime <= 0) {
            setCanSubmit(true);
            setTimeUntilCanSubmit(0);
            clearInterval(interval);
          } else {
            setTimeUntilCanSubmit(remainingTime);
          }
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim() || !canSubmit || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(newQuestion);
      setNewQuestion('');
      
      // Set cooldown
      if (roomId) {
        localStorage.setItem(`lastQuestionSubmit_${roomId}`, Date.now().toString());
        setCanSubmit(false);
        setTimeUntilCanSubmit(60);
        
        const interval = setInterval(() => {
          setTimeUntilCanSubmit(prev => {
            if (prev <= 1) {
              setCanSubmit(true);
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`backdrop-blur-sm border-t px-6 py-4 ${
      isDark 
        ? 'bg-gray-900/80 border-gray-700/20' 
        : 'bg-white/80 border-white/20'
    }`}>
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a question..."
            className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm ${
              isDark 
                ? 'bg-gray-800/70 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white/70 border-gray-200 text-gray-800'
            }`}
            maxLength={200}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!newQuestion.trim() || !canSubmit || isSubmitting}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              !newQuestion.trim() || !canSubmit || isSubmitting
                ? isDark 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg'
            }`}
          >
            {isSubmitting ? 'Sending...' : canSubmit ? 'Send' : `Wait ${timeUntilCanSubmit}s`}
          </button>
        </form>
        
        {!canSubmit && (
          <p className={`text-sm mt-2 text-center ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            You can submit another question in {timeUntilCanSubmit} seconds
          </p>
        )}
      </div>
    </div>
  );
};
