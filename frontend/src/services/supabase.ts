import { createClient } from "@supabase/supabase-js";

// Retrieve settings from Vite environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabaseActive = !!(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseActive
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
