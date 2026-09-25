import { createBrowserClient } from "@supabase/ssr";

// Fallback values keep static prerendering (e.g. the login/signup pages) from
// crashing the production build if env vars haven't been configured yet.
// Real requests will fail loudly and obviously once the app actually runs
// without the real NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY set.
const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_ANON_KEY = "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY
  );
}
