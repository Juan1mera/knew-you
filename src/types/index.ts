export type SessionStatus = 'waiting' | 'phase1' | 'phase2' | 'finished';

export interface Participant {
  id: string; // Auto-generated ID for the participant
  name: string;
  isHost: boolean;
  joinedAt: number;
}

export interface Session {
  id: string; // Document ID
  shortCode: string;
  host_id: string; // The ID of the participant who is the host
  test_id: string | null; // Nullable if no test is selected initially
  status: SessionStatus;
  participants: Participant[];
  createdAt: number;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'free_response';
  text: string;
  options?: string[]; // Used for multiple choice
}

export interface Test {
  id: string;
  title: string;
  questions: Question[];
}

export interface Answer {
  id?: string;
  session_id: string;
  user_id: string; // ID of the person answering
  target_user_id: string; // ID of the person being answered about
  question_id: string;
  answer_value: string;
}

export interface MatchResult {
  question_id: string;
  target_user_id: string;
  target_name: string;
  guessed_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

export interface PlayerScore {
  user_id: string;
  name: string;
  score: number;
  matches: MatchResult[];
}
