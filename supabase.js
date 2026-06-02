// ===== Supabase Configuration =====
// Update these values if you move to a different Supabase project.

const SUPABASE_URL = 'https://wtvxhkcbsfvucncxbyiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dnhoa2Nic2Z2dWNuY3hieWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODk5NTksImV4cCI6MjA5NTk2NTk1OX0.OGVa-D_4cueY2Bh7G9xXJOioK0JU1kK2cilvD83oa8A';

// Create the Supabase client (uses the global `supabase` from the CDN script)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
