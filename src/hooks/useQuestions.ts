
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

  // Set up real-time subscription
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
          console.log('New question:', payload.new);
          setQuestions(prev => [payload.new as Question, ...prev]);
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
          console.log('Question updated:', payload.new);
          setQuestions(prev => 
            prev.map(q => 
              q.id === payload.new.id ? payload.new as Question : q
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter questions older than 5 minutes
  const recentQuestions = questions.filter(question => {
    const questionTime = new Date(question.created_at).getTime();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return questionTime > fiveMinutesAgo;
  }).sort((a, b) => b.upvotes - a.upvotes);

  const submitQuestion = async (text: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .insert([{ text: text.trim() }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question submitted successfully!",
      });
    } catch (error) {
      console.error('Error submitting question:', error);
      toast({
        title: "Error",
        description: "Failed to submit question",
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
