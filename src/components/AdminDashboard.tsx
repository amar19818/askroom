
import React, { useState } from 'react';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Plus, Moon, Sun, LogOut } from 'lucide-react';

export const AdminDashboard = () => {
  const { rooms, isLoading, createRoom, toggleRoomPause, terminateRoom } = useRooms();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    description: '',
    expiresIn: 2 // hours
  });

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const shareLink = await createRoom(newRoom.name, newRoom.description, newRoom.expiresIn);
    if (shareLink) {
      setNewRoom({ name: '', description: '', expiresIn: 2 });
      setShowCreateForm(false);
    }
  };

  const copyShareLink = (shareLink: string) => {
    const fullLink = `${window.location.origin}/room/${shareLink}`;
    navigator.clipboard.writeText(fullLink);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
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
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Manage rooms and monitor activity
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button onClick={logout} variant="outline" size="sm">
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Create Room Section */}
        <div className="mb-8">
          {!showCreateForm ? (
            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
              <Plus size={16} />
              Create New Room
            </Button>
          ) : (
            <Card className={`p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <Input
                  placeholder="Room Name"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                  required
                />
                <Input
                  placeholder="Description (optional)"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({...newRoom, description: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="Expires in hours"
                  value={newRoom.expiresIn}
                  onChange={(e) => setNewRoom({...newRoom, expiresIn: parseInt(e.target.value)})}
                  min={1}
                  max={24}
                />
                <div className="flex gap-3">
                  <Button type="submit">Create Room</Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        {/* Rooms List */}
        <div className="space-y-4">
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Active Rooms ({rooms.length})
          </h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <Card className={`p-8 text-center ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
              <div className="text-6xl mb-4">🏠</div>
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                No rooms created yet
              </h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                Create your first room to get started!
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rooms.map((room) => (
                <Card key={room.id} className={`p-6 ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                          {room.name}
                        </h3>
                        <Badge variant={room.is_paused ? 'secondary' : 'default'}>
                          {room.is_paused ? 'Paused' : 'Active'}
                        </Badge>
                      </div>
                      {room.description && (
                        <p className={`mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                          {room.description}
                        </p>
                      )}
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <p>Created: {new Date(room.created_at).toLocaleString()}</p>
                        {room.expires_at && (
                          <p>Expires: {new Date(room.expires_at).toLocaleString()}</p>
                        )}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => copyShareLink(room.share_link)}
                        >
                          Copy share link
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleRoomPause(room.id, !room.is_paused)}
                      >
                        {room.is_paused ? <Play size={16} /> : <Pause size={16} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => terminateRoom(room.id)}
                      >
                        <Square size={16} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
