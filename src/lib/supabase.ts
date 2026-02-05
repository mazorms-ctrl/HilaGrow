import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database Types
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          color: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          color?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          color?: string | null;
          order?: number;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          description: string | null;
          owner_name: string | null;
          progress_mode: 'auto' | 'manual';
          progress_manual: number | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          description?: string | null;
          owner_name?: string | null;
          progress_mode?: 'auto' | 'manual';
          progress_manual?: number | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          description?: string | null;
          owner_name?: string | null;
          progress_mode?: 'auto' | 'manual';
          progress_manual?: number | null;
          order?: number;
          updated_at?: string;
        };
      };
      milestones: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          done: boolean;
          due_date: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          done?: boolean;
          due_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          done?: boolean;
          due_date?: string | null;
          order?: number;
          updated_at?: string;
        };
      };
    };
  };
}
