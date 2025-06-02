
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { AdminDashboard } from '@/components/AdminDashboard';

const Index = () => {
  const { session } = useAuth();

  if (!session) {
    return <AuthForm />;
  }

  if (session.type === 'admin') {
    return <AdminDashboard />;
  }

  // For students, redirect to room selection or show available rooms
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to AskRoom.live</h1>
        <p className="text-gray-600 mb-6">
          You need a room link to join a session. Please get the link from your instructor.
        </p>
        <p className="text-sm text-gray-500">
          Room links look like: /room/[room-id]
        </p>
      </div>
    </div>
  );
};

export default Index;
