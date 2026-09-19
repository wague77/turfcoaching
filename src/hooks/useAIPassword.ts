
import { useState, useEffect } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

const AI_SESSION_TOKEN_KEY = 'ai_session_token';
const AI_PASSWORD_EXPIRY_KEY = 'ai_password_expiry';
const DEVICE_ID_KEY = 'device_id';

// Generate or get device ID
function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Get device info
function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    browser: getBrowserName()
  };
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  if (ua.includes('Opera')) return 'Opera';
  return 'Unknown';
}

export function useAIPassword() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    const storedToken = sessionStorage.getItem(AI_SESSION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(AI_PASSWORD_EXPIRY_KEY);
    
    if (storedToken && expiry) {
      const expiryDate = new Date(expiry);
      if (expiryDate > new Date()) {
        setIsAuthenticated(true);
      } else {
        // Session expired, clear storage
        sessionStorage.removeItem(AI_SESSION_TOKEN_KEY);
        sessionStorage.removeItem(AI_PASSWORD_EXPIRY_KEY);
        setIsAuthenticated(false);
      }
    }
    setIsLoading(false);
  };

  const validatePassword = async (password: string): Promise<{ valid: boolean; blocked?: boolean; error?: string }> => {
    try {
      const deviceId = getDeviceId();
      const deviceInfo = getDeviceInfo();

      // Use env variables safely
      const supabaseUrl = SUPABASE_URL;
      const supabaseAnonKey = SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/validate-ai-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({ password, deviceId, deviceInfo })
      });

      const data = await response.json();

      // Check for blocked status (403)
      if (response.status === 403 || data?.blocked) {
        setIsBlocked(true);
        return { valid: false, blocked: true, error: data?.error || 'Votre accès IA a été bloqué.' };
      }

      // Check for other errors
      if (!response.ok) {
        return { valid: false, error: data?.error || 'Erreur de validation' };
      }

      if (data?.valid) {
        // Store session token (not the password!) in session storage
        // The token is a secure random string, not the actual password
        if (data.sessionToken) {
          sessionStorage.setItem(AI_SESSION_TOKEN_KEY, data.sessionToken);
        }
        // Use server-provided expiry or default to 24 hours
        const expiryDate = data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        sessionStorage.setItem(AI_PASSWORD_EXPIRY_KEY, expiryDate);
        setIsAuthenticated(true);
        setIsBlocked(false);
        return { valid: true };
      }

      return { valid: false, error: data?.error || 'Mot de passe incorrect' };
    } catch (error) {
      console.error('Error validating AI password:', error);
      return { valid: false, error: 'Erreur de connexion' };
    }
  };

  const getSessionToken = (): string | null => {
    return sessionStorage.getItem(AI_SESSION_TOKEN_KEY);
  };

  const getDeviceIdValue = (): string => {
    return getDeviceId();
  };

  const logout = () => {
    sessionStorage.removeItem(AI_SESSION_TOKEN_KEY);
    sessionStorage.removeItem(AI_PASSWORD_EXPIRY_KEY);
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    isBlocked,
    validatePassword,
    getSessionToken,
    getDeviceId: getDeviceIdValue,
    logout
  };
}

