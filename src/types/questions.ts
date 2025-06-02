
export interface Question {
  id: string;
  text: string;
  created_at: string;
  upvotes: number;
  room_id?: string;
  student_id?: string;
  is_moderated: boolean;
  moderation_status?: string;
  student?: {
    name: string;
    college_name: string;
  };
}
