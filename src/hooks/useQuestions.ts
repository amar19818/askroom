
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/questions';
import { toast } from '@/hooks/use-toast';

export const useQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
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
          event: 'UPDATE',
          schema: 'public',
          table: 'questions'
        },
        (payload) => {
          const updatedQuestion = payload.new as Question;
          if (updatedQuestion.is_moderated && updatedQuestion.moderation_status === 'approved') {
            console.log('Approved question:', updatedQuestion);
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
          // Handle upvote updates for approved questions
          if (updatedQuestion.is_moderated && updatedQuestion.moderation_status === 'approved') {
            setQuestions(prev => 
              prev.map(q => 
                q.id === updatedQuestion.id ? updatedQuestion : q
              )
            );
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
    try {
      // First, moderate the content
      const { data: moderationData, error: moderationError } = await supabase.functions
        .invoke('moderate-content', {
          body: { text: text.trim() }
        });

      if (moderationError) {
        throw new Error('Content moderation failed');
      }

      const isApproved = moderationData?.isApproved || false;
      
      if (!isApproved) {
        toast({
          title: "Question Blocked",
          description: "Your question contains inappropriate content and cannot be submitted.",
          variant: "destructive",
        });
        return;
      }

      // If approved, insert the question
      const { error } = await supabase
        .from('questions')
        .insert([{ 
          text: text.trim(),
          is_moderated: true,
          moderation_status: 'approved'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question submitted successfully!",
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
