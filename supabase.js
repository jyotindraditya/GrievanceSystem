// ===== Supabase Configuration =====
// Update these values if you move to a different Supabase project.

const SUPABASE_URL = 'https://wtvxhkcbsfvucncxbyiy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_btoNtb6JwauoWj9pmp9xcw_dyyCvflS';

// Create the Supabase client (uses the global `supabase` from the CDN script)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
