
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Question } from '@/types/questions';
import { toast } from '@/hooks/use-toast';
import { moderateContent } from '@/utils/geminiModeration';

export const useQuestions = (roomId?: string) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    fetchQuestions();
    
    // Set up real-time subscription
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
          if (payload.new.room_id === roomId) {
            fetchQuestions(); // Refetch to get student data
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
          console.log('Question updated:', payload.new);
          if (payload.new.room_id === roomId) {
            fetchQuestions(); // Refetch to get updated data
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const fetchQuestions = async () => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          students!inner(name, college_name)
        `)
        .eq('room_id', roomId)
        .eq('is_moderated', true)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const questionsWithStudents = data?.map(q => ({
        ...q,
        student: q.students
      })) || [];
      
      setQuestions(questionsWithStudents);
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

  const submitQuestion = async (text: string, studentId: string) => {
    if (!roomId) return;

    try {
      // Moderate content with Gemini AI
      const moderation = await moderateContent(text);
      
      if (!moderation.isAppropriate) {
        toast({
          title: "Question Rejected",
          description: moderation.reason || "Your question contains inappropriate content",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('questions')
        .insert([{
          text: text.trim(),
          room_id: roomId,
          student_id: studentId,
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

  // Filter questions from the last 5 minutes and sort by upvotes
  const recentQuestions = questions.filter(question => {
    const questionTime = new Date(question.created_at).getTime();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return questionTime > fiveMinutesAgo;
  }).sort((a, b) => b.upvotes - a.upvotes);

  return {
    questions: recentQuestions,
    isLoading,
    submitQuestion,
    upvoteQuestion
  };
};
