import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Student, Admin, AuthSession } from '@/types/auth';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  session: AuthSession | null;
  login: (email: string, password: string, type: 'student' | 'admin') => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

interface RegisterData {
  email: string;
  name: string;
  college_name: string;
  phone_number: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const sessionData = localStorage.getItem('auth_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (new Date(parsed.expires_at) > new Date()) {
          setSession(parsed);
        } else {
          localStorage.removeItem('auth_session');
        }
      } catch (error) {
        localStorage.removeItem('auth_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, type: 'student' | 'admin'): Promise<boolean> => {
    try {
      if (type === 'admin') {
        // Admin login with username
        const { data: admin, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', email)
          .single();

        if (error || !admin) {
          toast({
            title: "Login Failed",
            description: "Invalid admin credentials",
            variant: "destructive",
          });
          return false;
        }

        // For demo purposes, accept any password for admin
        // In production, you'd hash and verify the password
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const authSession: AuthSession = {
          user: admin,
          session_token: sessionToken,
          expires_at: expiresAt,
          type: 'admin'
        };

        setSession(authSession);
        localStorage.setItem('auth_session', JSON.stringify(authSession));
        return true;
      } else {
        // Student login
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('email', email)
          .single();

        if (error || !student) {
          toast({
            title: "Login Failed",
            description: "Invalid student credentials",
            variant: "destructive",
          });
          return false;
        }

        // For demo purposes, accept any password
        // In production, you'd hash and verify the password
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const authSession: AuthSession = {
          user: student,
          session_token: sessionToken,
          expires_at: expiresAt,
          type: 'student'
        };

        setSession(authSession);
        localStorage.setItem('auth_session', JSON.stringify(authSession));
        return true;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('students')
        .insert([{
          email: data.email,
          name: data.name,
          college_name: data.college_name,
          phone_number: data.phone_number,
          password_hash: 'hashed_password' // In production, hash the password
        }]);

      if (error) {
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Registration Successful",
        description: "You can now login with your credentials",
      });
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: "An error occurred during registration",
        variant: "destructive",
      });
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setSession(null);
    localStorage.removeItem('auth_session');
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  return (
    <AuthContext.Provider value={{ session, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
