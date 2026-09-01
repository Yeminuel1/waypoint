import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars aren't set (e.g. running locally before setup), this stays
// null and the app falls back to localStorage so it still works standalone.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
