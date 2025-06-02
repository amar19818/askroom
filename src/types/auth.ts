
export interface Student {
  id: string;
  email: string;
  name: string;
  college_name: string;
  phone_number: string;
  created_at: string;
}

export interface Admin {
  id: string;
  username: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_paused: boolean;
  created_by?: string;
  created_at: string;
  expires_at?: string;
  share_link: string;
}

export interface AuthSession {
  user: Student | Admin;
  session_token: string;
  expires_at: string;
  type: 'student' | 'admin';
}
