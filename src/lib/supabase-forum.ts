import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

/**
 * Creates a Supabase client with the x-device-id header for forum operations.
 * This is required because RLS policies for UPDATE/DELETE on forum tables
 * verify device_id ownership using the x-device-id header.
 */
export function createForumClient(deviceId: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-device-id': deviceId,
      },
    },
  });
}
