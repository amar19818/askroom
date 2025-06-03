
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface QuestionInputProps {
  onSubmit: (text: string) => Promise<void>;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({ onSubmit }) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const [timeUntilCanSubmit, setTimeUntilCanSubmit] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const { isDark } = useTheme();

  // Check penalty status and cooldown
  useEffect(() => {
    const checkPenaltyStatus = () => {
      const penaltyData = localStorage.getItem('penalty_data');
      const penaltyInfo = penaltyData ? JSON.parse(penaltyData) : { violations: 0, isBlocked: false };
      
      if (penaltyInfo.isBlocked) {
        setIsBlocked(true);
        setCanSubmit(false);
        return;
      }

      const lastSubmitTime = localStorage.getItem('lastQuestionSubmit');
      const penaltyCooldown = localStorage.getItem('penaltyCooldown');
      
      if (lastSubmitTime && penaltyCooldown) {
        const timeDiff = Date.now() - parseInt(lastSubmitTime);
        const cooldownMs = parseInt(penaltyCooldown) * 1000;
        
        if (timeDiff < cooldownMs) {
          setCanSubmit(false);
          setTimeUntilCanSubmit(Math.ceil((cooldownMs - timeDiff) / 1000));
          
          const interval = setInterval(() => {
            const newTimeDiff = Date.now() - parseInt(lastSubmitTime);
            const remainingTime = Math.ceil((cooldownMs - newTimeDiff) / 1000);
            
            if (remainingTime <= 0) {
              setCanSubmit(true);
              setTimeUntilCanSubmit(0);
              localStorage.removeItem('penaltyCooldown');
              clearInterval(interval);
            } else {
              setTimeUntilCanSubmit(remainingTime);
            }
          }, 1000);
          
          return () => clearInterval(interval);
        }
      }
    };

    checkPenaltyStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim() || !canSubmit || isSubmitting || isBlocked) return;
    
    setIsSubmitting(true);
    
    try {
      await onSubmit(newQuestion);
      setNewQuestion('');
      
      // Set base cooldown (30 seconds) for successful submissions
      localStorage.setItem('lastQuestionSubmit', Date.now().toString());
      localStorage.setItem('penaltyCooldown', '30');
      setCanSubmit(false);
      setTimeUntilCanSubmit(30);
      
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
    } catch (error) {
      // Error is handled in the hook, check if penalty was applied
      const penaltyData = localStorage.getItem('penalty_data');
      if (penaltyData) {
        const penalty = JSON.parse(penaltyData);
        if (penalty.isBlocked) {
          setIsBlocked(true);
          setCanSubmit(false);
        } else {
          // Check for updated cooldown
          const penaltyCooldown = localStorage.getItem('penaltyCooldown');
          if (penaltyCooldown) {
            setTimeUntilCanSubmit(parseInt(penaltyCooldown));
            setCanSubmit(false);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBlocked) {
    return (
      <div className={`backdrop-blur-sm border-t px-6 py-4 ${
        isDark 
          ? 'bg-gray-900/80 border-gray-700/20' 
          : 'bg-white/80 border-white/20'
      }`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            <p className="font-semibold">🚫 Account Blocked</p>
            <p className="text-sm mt-1">
              Your account has been blocked due to repeated policy violations. Please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            placeholder="Ask a question... (AI will check and correct spelling)"
            className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm ${
              isDark 
                ? 'bg-gray-800/70 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white/70 border-gray-200 text-gray-800'
            }`}
            maxLength={200}
            disabled={isSubmitting || !canSubmit}
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
            {isSubmitting ? 'Checking...' : canSubmit ? 'Send' : `Wait ${timeUntilCanSubmit}s`}
          </button>
        </form>
        
        <div className={`text-xs mt-2 text-center ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {!canSubmit && timeUntilCanSubmit > 0 && (
            <p>You can submit another question in {timeUntilCanSubmit} seconds</p>
          )}
          <p className="mt-1">
            🛡️ AI moderates content, corrects spelling, and applies progressive penalties for violations
          </p>
          <p className="text-xs mt-1">
            ⚠️ 3 violations = permanent block | Enhanced cooldowns for inappropriate content
          </p>
        </div>
      </div>
    </div>
  );
};
