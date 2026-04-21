// This file was automatically migrated from Supabase.
import { createClient } from '@insforge/sdk';
import type { Database } from './types';

// We'll read these from the standard InsForge env vars (but keeping Vite prefixes if you configured them that way)
// The correct standard for InsForge in Vite is VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY
const INSFORGE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_INSFORGE_URL;
const INSFORGE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_INSFORGE_ANON_KEY;

// Import the client globally across the app
export const supabase = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY
});