export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          name: string;
          prefecture: string;
          referee_grade: string;
          categories: string[];
          years_of_experience: number | null;
          avatar_type: string;
          avatar_key: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          name?: string;
          prefecture?: string;
          referee_grade?: string;
          categories?: string[];
          years_of_experience?: number | null;
          avatar_type?: string;
          avatar_key?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          name?: string;
          prefecture?: string;
          referee_grade?: string;
          categories?: string[];
          years_of_experience?: number | null;
          avatar_type?: string;
          avatar_key?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          user_id: string;
          date: string | null;
          competition: string;
          category: string;
          match_count: number;
          partner_referee: string;
          referee_position: string;
          judgment_rating: number;
          position_rating: number;
          communication_rating: number;
          good_points: string;
          improvements: string;
          next_goal: string;
          difficult_calls: string;
          free_notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date?: string | null;
          competition?: string;
          category?: string;
          match_count?: number;
          partner_referee?: string;
          referee_position?: string;
          judgment_rating?: number;
          position_rating?: number;
          communication_rating?: number;
          good_points?: string;
          improvements?: string;
          next_goal?: string;
          difficult_calls?: string;
          free_notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string | null;
          competition?: string;
          category?: string;
          match_count?: number;
          partner_referee?: string;
          referee_position?: string;
          judgment_rating?: number;
          position_rating?: number;
          communication_rating?: number;
          good_points?: string;
          improvements?: string;
          next_goal?: string;
          difficult_calls?: string;
          free_notes?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
