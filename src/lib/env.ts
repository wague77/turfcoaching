export function getEnvVar(key: string, nextKey: string): string {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[nextKey]) return process.env[nextKey] as string;
    if (process.env[key]) return process.env[key] as string;
  }
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      // @ts-ignore
      return (import.meta.env[nextKey] || import.meta.env[key] || '') as string;
    }
  } catch {}
  return '';
}

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
export const GEMINI_API_KEY = getEnvVar('GEMINI_API_KEY', 'NEXT_PUBLIC_GEMINI_API_KEY');
