
// Access codes management using Supabase database
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

// Generate a random access code
export const generateAccessCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Get all access codes from database
export const getAccessCodes = async (): Promise<AccessCode[]> => {
  const { data, error } = await supabase
    .from("access_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching access codes:", error);
    return [];
  }

  // Cast device_info from Json to DeviceInfo
  return (data || []).map(item => ({
    ...item,
    device_info: item.device_info as unknown as DeviceInfo | null
  }));
};

// Add a new access code with expiration date
export const addAccessCode = async (expiresAt: Date): Promise<AccessCode | null> => {
  const newCode = {
    code: generateAccessCode(),
    expires_at: expiresAt.toISOString(),
    is_used: false,
  };

  const { data, error } = await supabase
    .from("access_codes")
    .insert(newCode)
    .select()
    .single();

  if (error) {
    console.error("Error adding access code:", error);
    return null;
  }

  return {
    ...data,
    device_info: data.device_info as unknown as DeviceInfo | null
  };
};

// Delete an access code (archives to history first)
export const deleteAccessCode = async (code: string): Promise<boolean> => {
  // First, get the code details to archive them
  const { data: codeData, error: fetchError } = await supabase
    .from("access_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (fetchError || !codeData) {
    console.error("Error fetching access code for archiving:", fetchError);
    return false;
  }

  // Archive to history table
  const { error: archiveError } = await supabase
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

  if (archiveError) {
    console.error("Error archiving access code:", archiveError);
    // Continue with deletion even if archiving fails
  }

  // Now delete the code
  const { error } = await supabase
    .from("access_codes")
    .delete()
    .eq("code", code);

  if (error) {
    console.error("Error deleting access code:", error);
    return false;
  }

  return true;
};

// Update expiration date of an access code
export const updateAccessCodeExpiration = async (code: string, newExpiresAt: Date): Promise<boolean> => {
  const { error } = await supabase
    .from("access_codes")
    .update({ expires_at: newExpiresAt.toISOString() })
    .eq("code", code);

  if (error) {
    console.error("Error updating access code expiration:", error);
    return false;
  }

  return true;
};

// Toggle block status of an access code
export const toggleAccessCodeBlock = async (code: string, isBlocked: boolean): Promise<boolean> => {
  const { error } = await supabase
    .from("access_codes")
    .update({ is_blocked: isBlocked })
    .eq("code", code);

  if (error) {
    console.error("Error toggling access code block:", error);
    return false;
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
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate a unique device ID using crypto API
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

// Detect browser and OS from user agent
export const getDeviceInfo = (): DeviceInfo => {
  const userAgent = navigator.userAgent;
  
  // Detect browser
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

  // Detect OS
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

  // Detect platform type
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

// Validate an access code using secure RPC function (prevents code enumeration)
// Now includes device binding - each code can only be used on one device
export const validateAccessCode = async (inputCode: string): Promise<{ 
  valid: boolean; 
  expiresAt?: string; 
  deviceMismatch?: boolean;
}> => {
  const deviceId = getDeviceId();
  
  const { data, error } = await supabase
    .rpc('validate_access_code', { 
      input_code: inputCode,
      input_device_id: deviceId
    })
    .single();

  if (error || !data) {
    return { valid: false };
  }

  // Always update device info on successful validation (updates on every visit)
  if (data.valid) {
    const deviceInfo = getDeviceInfo();
    await supabase
      .from("access_codes")
      .update({ device_info: JSON.parse(JSON.stringify(deviceInfo)) })
      .eq("code", inputCode.toUpperCase().trim());
  }

  return { 
    valid: data.valid, 
    expiresAt: data.valid ? data.expires_at : undefined,
    deviceMismatch: data.device_mismatch
  };
};


