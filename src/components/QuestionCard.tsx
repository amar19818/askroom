
import React from 'react';
import { ArrowUp } from 'lucide-react';
import { Question } from '@/types/questions';
import { useTheme } from '@/contexts/ThemeContext';

interface QuestionCardProps {
  question: Question;
  onUpvote: (questionId: string, currentUpvotes: number) => void;
  hasUpvoted: boolean;
  index: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  onUpvote, 
  hasUpvoted, 
  index 
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`backdrop-blur-sm rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl animate-fade-in ${
        isDark 
          ? 'bg-gray-800/70 border-gray-700/20 text-white' 
          : 'bg-white/70 border-white/20 text-gray-800'
      }`}
      style={{
        animationDelay: `${index * 0.1}s`
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-lg leading-relaxed mb-3">
            {question.text}
          </p>
          
          {/* Student information */}
          {question.student && (
            <div className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-600'} mb-2`}>
              <span className="font-medium">{question.student.name}</span>
              <span className={`ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                from {question.student.college_name}
              </span>
            </div>
          )}
          
          <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {new Date(question.created_at).toLocaleTimeString()}
          </div>
        </div>
        
        <button
          onClick={() => onUpvote(question.id, question.upvotes)}
          disabled={hasUpvoted}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
            hasUpvoted
              ? isDark 
                ? 'bg-blue-900/50 text-blue-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-600 cursor-not-allowed'
              : isDark
                ? 'bg-gray-700/50 hover:bg-blue-900/50 hover:text-blue-400 text-gray-300 hover:scale-105'
                : 'bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-600 hover:scale-105'
          }`}
        >
          <ArrowUp size={18} />
          <span className="font-semibold">{question.upvotes}</span>
        </button>
      </div>
    </div>
  );
};
