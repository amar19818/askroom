
export interface Question {
  id: string;
  text: string;
  created_at: string;
  upvotes: number;
  is_moderated: boolean;
  moderation_status: string;
}
