
import React, { useRef } from 'react';
import { Moon, Sun, Shield } from 'lucide-react';
import { useQuestions } from '@/hooks/useQuestions';
import { useTheme } from '@/contexts/ThemeContext';
import { QuestionCard } from '@/components/QuestionCard';
import { QuestionInput } from '@/components/QuestionInput';

const Index = () => {
  const { questions, isLoading, submitQuestion, upvoteQuestion } = useQuestions();
  const { isDark, toggleTheme } = useTheme();
  const questionsContainerRef = useRef<HTMLDivElement>(null);

  const handleUpvote = async (questionId: string, currentUpvotes: number) => {
    const upvotedQuestions = JSON.parse(localStorage.getItem('upvotedQuestions') || '[]');
    
    if (upvotedQuestions.includes(questionId)) return;
    
    try {
      await upvoteQuestion(questionId, currentUpvotes);
      upvotedQuestions.push(questionId);
      localStorage.setItem('upvotedQuestions', JSON.stringify(upvotedQuestions));
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const hasUpvoted = (questionId: string) => {
    const upvotedQuestions = JSON.parse(localStorage.getItem('upvotedQuestions') || '[]');
    return upvotedQuestions.includes(questionId);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900' 
        : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    }`}>
      {/* Header */}
      <header className={`backdrop-blur-sm border-b px-6 py-4 ${
        isDark 
          ? 'bg-gray-900/80 border-gray-700/20' 
          : 'bg-white/80 border-white/20'
      }`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AskRoom.live
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Ask questions anonymously in real-time
              </p>
              <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                <Shield size={12} />
                <span>AI Moderated</span>
              </div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Questions Container */}
      <main className="flex-1 overflow-hidden px-6 py-8">
        <div 
          ref={questionsContainerRef}
          className="max-w-4xl mx-auto h-full overflow-y-auto space-y-4 pb-32"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                  Loading questions...
                </p>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  No questions yet
                </h3>
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Be the first to ask a question!
                </p>
                <div className="mt-4 text-sm text-green-600 flex items-center justify-center gap-2">
                  <Shield size={16} />
                  <span>All questions are automatically moderated for appropriate content</span>
                </div>
              </div>
            </div>
          ) : (
            questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                onUpvote={handleUpvote}
                hasUpvoted={hasUpvoted(question.id)}
                index={index}
              />
            ))
          )}
        </div>
      </main>

      {/* Question Input - Fixed at bottom */}
      <QuestionInput onSubmit={submitQuestion} />
    </div>
  );
};

export default Index;
