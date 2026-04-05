import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseConfig = {
  url: string;
  apiKey: string;
  storage?: SupabaseClient["auth"]["storage"];
};

export const createSupabaseClient = ({ url, apiKey, storage }: SupabaseConfig) => {
  return createClient(url, apiKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
};

export type { SupabaseClient };
