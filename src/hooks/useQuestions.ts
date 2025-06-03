
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/questions';
import { toast } from '@/hooks/use-toast';

// Generate a user identifier based on browser fingerprint and IP simulation
const generateUserIdentifier = () => {
  const stored = localStorage.getItem('user_identifier');
  if (stored) return stored;
  
  const identifier = `${navigator.userAgent}_${navigator.language}_${screen.width}x${screen.height}_${Date.now()}`;
  const hash = btoa(identifier).slice(0, 16);
  localStorage.setItem('user_identifier', hash);
  return hash;
};

// Penalty system management
const getPenaltyData = () => {
  const data = localStorage.getItem('penalty_data');
  return data ? JSON.parse(data) : { violations: 0, lastViolation: null, isBlocked: false };
};

const setPenaltyData = (data: any) => {
  localStorage.setItem('penalty_data', JSON.stringify(data));
};

const calculatePenalty = (violations: number) => {
  if (violations === 0) return 30; // Base cooldown
  if (violations === 1) return 90; // +60 seconds
  if (violations === 2) return 150; // +60 seconds more
  return Infinity; // Blocked after 3 violations
};

export const useQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('id, text, created_at, upvotes, is_moderated, moderation_status')
          .eq('is_moderated', true)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setQuestions(data || []);
      } catch (error) {
        console.error('Error fetching questions:', error);
        toast({
          title: "Error",
          description: "Failed to load questions",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Set up real-time subscription for approved questions only
  useEffect(() => {
    const channel = supabase
      .channel('questions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions'
        },
        (payload) => {
          const newQuestion = payload.new as Question;
          if (newQuestion.is_moderated && newQuestion.moderation_status === 'approved') {
            console.log('New approved question:', newQuestion);
            setQuestions(prev => [newQuestion, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'questions'
        },
        (payload) => {
          const updatedQuestion = payload.new as Question;
          if (updatedQuestion.is_moderated && updatedQuestion.moderation_status === 'approved') {
            console.log('Question approved:', updatedQuestion);
            setQuestions(prev => {
              const existingIndex = prev.findIndex(q => q.id === updatedQuestion.id);
              if (existingIndex >= 0) {
                // Update existing question
                const newQuestions = [...prev];
                newQuestions[existingIndex] = updatedQuestion;
                return newQuestions;
              } else {
                // Add new approved question
                return [updatedQuestion, ...prev];
              }
            });
          } else if (updatedQuestion.moderation_status === 'rejected') {
            // Remove rejected questions from the list
            setQuestions(prev => prev.filter(q => q.id !== updatedQuestion.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter questions older than 5 minutes and sort by upvotes
  const recentQuestions = questions.filter(question => {
    const questionTime = new Date(question.created_at).getTime();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return questionTime > fiveMinutesAgo;
  }).sort((a, b) => b.upvotes - a.upvotes);

  const submitQuestion = async (text: string) => {
    const penaltyData = getPenaltyData();
    
    // Check if user is blocked
    if (penaltyData.isBlocked) {
      toast({
        title: "Account Blocked",
        description: "Your account has been blocked due to repeated violations. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    try {
      const userIdentifier = generateUserIdentifier();
      
      // First, moderate the content with enhanced features
      const { data: moderationData, error: moderationError } = await supabase.functions
        .invoke('moderate-content', {
          body: { 
            text: text.trim(),
            userIdentifier 
          }
        });

      if (moderationError) {
        throw new Error('Content moderation failed');
      }

      const { isApproved, correctedText, reason, severity } = moderationData;
      
      if (!isApproved) {
        // Increment violations and apply penalty
        const newViolations = penaltyData.violations + 1;
        const penaltyTime = calculatePenalty(newViolations);
        
        const newPenaltyData = {
          violations: newViolations,
          lastViolation: Date.now(),
          isBlocked: newViolations >= 3
        };
        
        setPenaltyData(newPenaltyData);
        
        // Update localStorage for extended cooldown
        if (penaltyTime < Infinity) {
          localStorage.setItem('lastQuestionSubmit', Date.now().toString());
          localStorage.setItem('penaltyCooldown', penaltyTime.toString());
        }

        toast({
          title: "Question Blocked",
          description: newPenaltyData.isBlocked 
            ? "Account blocked due to repeated violations."
            : `Inappropriate content detected. Cooldown increased to ${Math.floor(penaltyTime)}s. Violations: ${newViolations}/3. Reason: ${reason}`,
          variant: "destructive",
        });
        return;
      }

      // If approved, use corrected text and insert the question
      const finalText = correctedText || text.trim();
      
      const { error } = await supabase
        .from('questions')
        .insert([{ 
          text: finalText,
          is_moderated: true,
          moderation_status: 'approved'
        }]);

      if (error) throw error;

      // Show success message with correction info if text was corrected
      const successMessage = correctedText !== text.trim() 
        ? "Question submitted successfully! (Minor spelling corrections were applied)"
        : "Question submitted successfully!";

      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      toast({
        title: "Error",
        description: "Failed to submit question. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const upvoteQuestion = async (questionId: string, currentUpvotes: number) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ upvotes: currentUpvotes + 1 })
        .eq('id', questionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error upvoting question:', error);
      toast({
        title: "Error",
        description: "Failed to upvote question",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    questions: recentQuestions,
    isLoading,
    submitQuestion,
    upvoteQuestion
  };
};
