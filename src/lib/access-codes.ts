// Access codes management using Supabase database with LocalStorage fallback for Master Admin
import { supabase } from "@/integrations/supabase/client";

export interface DeviceInfo {
  browser: string;
  os: string;
  platform: string;
  userAgent: string;
  connectedAt: string;
}

export interface AccessCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
  is_used: boolean;
  is_blocked: boolean;
  device_id?: string | null;
  device_id_2?: string | null;
  device_info?: DeviceInfo | null;
}

const LOCAL_CODES_KEY = "local_access_codes_v1";

const getLocalAccessCodes = (): AccessCode[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOCAL_CODES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalAccessCodes = (codes: AccessCode[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_CODES_KEY, JSON.stringify(codes));
  } catch (err) {
    console.error("Error saving local access codes:", err);
  }
};

// Generate a random access code
export const generateAccessCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get all access codes from database & local storage fallback
export const getAccessCodes = async (): Promise<AccessCode[]> => {
  let dbCodes: AccessCode[] = [];
  try {
    const { data, error } = await supabase
      .from("access_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      dbCodes = data.map(item => ({
        ...item,
        device_info: item.device_info as unknown as DeviceInfo | null
      }));
    }
  } catch (err) {
    console.error("Error fetching access codes from Supabase:", err);
  }

  const localCodes = getLocalAccessCodes();
  const codeMap = new Map<string, AccessCode>();

  for (const item of localCodes) {
    codeMap.set(item.code.toUpperCase().trim(), item);
  }
  for (const item of dbCodes) {
    codeMap.set(item.code.toUpperCase().trim(), item);
  }

  return Array.from(codeMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

// Add a new access code with expiration date
export const addAccessCode = async (expiresAt: Date): Promise<AccessCode | null> => {
  const newCode = {
    code: generateAccessCode(),
    expires_at: expiresAt.toISOString(),
    is_used: false,
  };

  try {
    const { data, error } = await supabase
      .from("access_codes")
      .insert(newCode)
      .select()
      .single();

    if (!error && data) {
      const codeObj: AccessCode = {
        ...data,
        device_info: data.device_info as unknown as DeviceInfo | null
      };
      const local = getLocalAccessCodes();
      saveLocalAccessCodes([codeObj, ...local.filter(c => c.code !== codeObj.code)]);
      return codeObj;
    }
  } catch (err) {
    console.warn("Supabase insert failed, using fallback code generation", err);
  }

  // Fallback for Master Admin or if Supabase insert/RLS fails
  const fallbackObj: AccessCode = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    code: newCode.code,
    created_at: new Date().toISOString(),
    expires_at: newCode.expires_at,
    is_used: false,
    is_blocked: false,
    device_id: null,
    device_id_2: null,
    device_info: null
  };

  const local = getLocalAccessCodes();
  saveLocalAccessCodes([fallbackObj, ...local]);
  return fallbackObj;
};

// Delete an access code (archives to history first if DB present)
export const deleteAccessCode = async (code: string): Promise<boolean> => {
  const codeFormatted = code.toUpperCase().trim();

  // Clean local storage
  const local = getLocalAccessCodes();
  saveLocalAccessCodes(local.filter(c => c.code.toUpperCase().trim() !== codeFormatted));

  try {
    const { data: codeData } = await supabase
      .from("access_codes")
      .select("*")
      .eq("code", codeFormatted)
      .maybeSingle();

    if (codeData) {
      await supabase
        .from("access_codes_history")
        .insert({
          original_code_id: codeData.id,
          code: codeData.code,
          created_at: codeData.created_at,
          expires_at: codeData.expires_at,
          was_used: codeData.is_used,
          was_blocked: codeData.is_blocked,
          device_id: codeData.device_id,
          device_info: codeData.device_info,
          deletion_reason: 'manual'
        });

      await supabase
        .from("access_codes")
        .delete()
        .eq("code", codeFormatted);
    }
  } catch (err) {
    console.warn("Error deleting code from Supabase:", err);
  }

  return true;
};

// Update expiration date of an access code
export const updateAccessCodeExpiration = async (code: string, newExpiresAt: Date): Promise<boolean> => {
  const codeFormatted = code.toUpperCase().trim();
  const isoDate = newExpiresAt.toISOString();

  const local = getLocalAccessCodes();
  saveLocalAccessCodes(
    local.map(c => (c.code.toUpperCase().trim() === codeFormatted ? { ...c, expires_at: isoDate } : c))
  );

  try {
    await supabase
      .from("access_codes")
      .update({ expires_at: isoDate })
      .eq("code", codeFormatted);
  } catch (err) {
    console.warn("Error updating access code expiration in Supabase:", err);
  }

  return true;
};

// Toggle block status of an access code
export const toggleAccessCodeBlock = async (code: string, isBlocked: boolean): Promise<boolean> => {
  const codeFormatted = code.toUpperCase().trim();

  const local = getLocalAccessCodes();
  saveLocalAccessCodes(
    local.map(c => (c.code.toUpperCase().trim() === codeFormatted ? { ...c, is_blocked: isBlocked } : c))
  );

  try {
    await supabase
      .from("access_codes")
      .update({ is_blocked: isBlocked })
      .eq("code", codeFormatted);
  } catch (err) {
    console.warn("Error toggling access code block in Supabase:", err);
  }

  return true;
};

// Check if a code is expired
export const isCodeExpired = (code: AccessCode): boolean => {
  return new Date() > new Date(code.expires_at);
};

// Generate or retrieve a unique device identifier
export const getDeviceId = (): string => {
  const DEVICE_ID_KEY = 'racing_device_id';
  if (typeof window === "undefined") return "server-device-id";

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

// Detect browser and OS from user agent
export const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === "undefined") {
    return { browser: "Server", os: "Server", platform: "Server", userAgent: "", connectedAt: new Date().toISOString() };
  }

  const userAgent = navigator.userAgent;
  
  let browser = "Inconnu";
  if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari")) {
    browser = "Safari";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browser = "Opera";
  }

  let os = "Inconnu";
  if (userAgent.includes("Windows NT 10")) {
    os = "Windows 10/11";
  } else if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS X")) {
    os = "macOS";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  }

  let platform = "Desktop";
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    platform = "Mobile";
  } else if (/iPad|Tablet/i.test(userAgent)) {
    platform = "Tablette";
  }

  return {
    browser,
    os,
    platform,
    userAgent,
    connectedAt: new Date().toISOString()
  };
};

// Validate an access code using secure RPC function with LocalStorage fallback
export const validateAccessCode = async (inputCode: string): Promise<{ 
  valid: boolean; 
  expiresAt?: string; 
  deviceMismatch?: boolean;
}> => {
  const codeFormatted = inputCode.toUpperCase().trim();
  const deviceId = getDeviceId();

  try {
    const { data, error } = await supabase
      .rpc('validate_access_code', { 
        input_code: codeFormatted,
        input_device_id: deviceId
      })
      .single();

    if (!error && data && data.valid) {
      const deviceInfo = getDeviceInfo();
      await supabase
        .from("access_codes")
        .update({ device_info: JSON.parse(JSON.stringify(deviceInfo)) })
        .eq("code", codeFormatted);

      return { 
        valid: data.valid, 
        expiresAt: data.expires_at,
        deviceMismatch: data.device_mismatch
      };
    }
  } catch (err) {
    console.warn("Supabase RPC validation error, fallback to local codes:", err);
  }

  // Fallback to local codes check
  const localCodes = getLocalAccessCodes();
  const found = localCodes.find(c => c.code.toUpperCase().trim() === codeFormatted);
  if (found) {
    if (found.is_blocked) {
      return { valid: false };
    }
    if (new Date() > new Date(found.expires_at)) {
      return { valid: false };
    }
    return { valid: true, expiresAt: found.expires_at };
  }

  return { valid: false };
};
