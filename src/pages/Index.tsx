
import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  created_at: string;
  upvotes: number;
}

const Index = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const [timeUntilCanSubmit, setTimeUntilCanSubmit] = useState(0);
  const questionsContainerRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration - in real app this would come from Supabase
  useEffect(() => {
    const mockQuestions: Question[] = [
      {
        id: '1',
        text: 'How do I start with Open Source contributions?',
        created_at: new Date(Date.now() - 60000).toISOString(),
        upvotes: 4
      },
      {
        id: '2',
        text: 'Can you share resources for Machine Learning?',
        created_at: new Date(Date.now() - 120000).toISOString(),
        upvotes: 1
      },
      {
        id: '3',
        text: 'What\'s the roadmap for Web Development in 2024?',
        created_at: new Date(Date.now() - 180000).toISOString(),
        upvotes: 2
      }
    ];
    
    setQuestions(mockQuestions);
  }, []);

  // Check if user can submit based on localStorage
  useEffect(() => {
    const lastSubmitTime = localStorage.getItem('lastQuestionSubmit');
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
  }, []);

  // Filter questions older than 5 minutes
  const recentQuestions = questions.filter(question => {
    const questionTime = new Date(question.created_at).getTime();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return questionTime > fiveMinutesAgo;
  }).sort((a, b) => b.upvotes - a.upvotes);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newQuestion.trim() || !canSubmit || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newQuestionObj: Question = {
      id: Date.now().toString(),
      text: newQuestion.trim(),
      created_at: new Date().toISOString(),
      upvotes: 0
    };
    
    setQuestions(prev => [newQuestionObj, ...prev]);
    setNewQuestion('');
    setIsSubmitting(false);
    
    // Set cooldown
    localStorage.setItem('lastQuestionSubmit', Date.now().toString());
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
  };

  const handleUpvote = (questionId: string) => {
    const upvotedQuestions = JSON.parse(localStorage.getItem('upvotedQuestions') || '[]');
    
    if (upvotedQuestions.includes(questionId)) return;
    
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, upvotes: q.upvotes + 1 }
        : q
    ));
    
    upvotedQuestions.push(questionId);
    localStorage.setItem('upvotedQuestions', JSON.stringify(upvotedQuestions));
  };

  const hasUpvoted = (questionId: string) => {
    const upvotedQuestions = JSON.parse(localStorage.getItem('upvotedQuestions') || '[]');
    return upvotedQuestions.includes(questionId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AskRoom.live
          </h1>
          <p className="text-gray-600 mt-1">Ask questions anonymously in real-time</p>
        </div>
      </header>

      {/* Questions Container */}
      <main className="flex-1 overflow-hidden px-6 py-8">
        <div 
          ref={questionsContainerRef}
          className="max-w-4xl mx-auto h-full overflow-y-auto space-y-4 pb-32"
        >
          {recentQuestions.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No questions yet</h3>
                <p className="text-gray-500">Be the first to ask a question!</p>
              </div>
            </div>
          ) : (
            recentQuestions.map((question, index) => (
              <div
                key={question.id}
                className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 animate-fade-in hover:shadow-xl transition-all duration-300"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-gray-800 text-lg flex-1 leading-relaxed">
                    {question.text}
                  </p>
                  <button
                    onClick={() => handleUpvote(question.id)}
                    disabled={hasUpvoted(question.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                      hasUpvoted(question.id)
                        ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-600 hover:scale-105'
                    }`}
                  >
                    <ArrowUp size={18} />
                    <span className="font-semibold">{question.upvotes}</span>
                  </button>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {new Date(question.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Question Input - Fixed at bottom */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-white/20 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmitQuestion} className="flex gap-3">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/70 backdrop-blur-sm"
              maxLength={200}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newQuestion.trim() || !canSubmit || isSubmitting}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                !newQuestion.trim() || !canSubmit || isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg'
              }`}
            >
              {isSubmitting ? 'Sending...' : canSubmit ? 'Send' : `Wait ${timeUntilCanSubmit}s`}
            </button>
          </form>
          
          {!canSubmit && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              You can submit another question in {timeUntilCanSubmit} seconds
            </p>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Index;
