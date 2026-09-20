function decodeFallbackKey(): string {
  try {
    const b64 = "QVEuQWI4Uk42THdDQm5BUExUMlU0emQxSDdiWG0xaFdRd2xWRUNTd2F0MWZZWk9FQmg1YlE=";
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(b64);
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(b64, "base64").toString("utf-8");
    }
  } catch {}
  return "";
}

export function getGeminiApiKey(): string {
  // Static process.env accesses required for Next.js bundler inlining
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  }

  // Check localStorage for custom AI password set in Admin Dashboard
  if (typeof window !== 'undefined') {
    try {
      const customKey = localStorage.getItem('custom_ai_password_v1');
      if (customKey && customKey.trim()) {
        return customKey.trim();
      }
    } catch {}
  }

  return decodeFallbackKey();
}

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

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') || 'https://placeholder.supabase.co';
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || 'placeholder-anon-key';
export const GEMINI_API_KEY = getGeminiApiKey();



