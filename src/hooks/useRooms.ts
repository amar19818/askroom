
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Room } from '@/types/auth';
import { toast } from '@/hooks/use-toast';

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load rooms",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async (name: string, description?: string, expiresIn?: number) => {
    try {
      const shareLink = crypto.randomUUID();
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString() : null;

      const { error } = await supabase
        .from('rooms')
        .insert([{
          name,
          description,
          share_link: shareLink,
          expires_at: expiresAt
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room created successfully!",
      });
      
      return shareLink;
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
      return null;
    }
  };

  const toggleRoomPause = async (roomId: string, isPaused: boolean) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_paused: isPaused })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Room ${isPaused ? 'paused' : 'resumed'} successfully!`,
      });
    } catch (error) {
      console.error('Error updating room:', error);
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    }
  };

  const terminateRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Room terminated successfully!",
      });
    } catch (error) {
      console.error('Error terminating room:', error);
      toast({
        title: "Error",
        description: "Failed to terminate room",
        variant: "destructive",
      });
    }
  };

  return {
    rooms,
    isLoading,
    createRoom,
    toggleRoomPause,
    terminateRoom
  };
};
