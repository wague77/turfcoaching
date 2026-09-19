
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  link_url: string | null;
  link_text: string | null;
  target_audience: "all" | "authenticated" | "unauthenticated";
  reappear_after_minutes: number | null;
}

interface UseNotificationsOptions {
  isAuthenticated?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { isAuthenticated = false } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    setNotifications(data as Notification[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNotification = (id: string) => {
    // Store dismissed notifications with timestamp in localStorage
    const dismissedData: Record<string, number> = JSON.parse(
      localStorage.getItem("dismissed_notifications_timed") || "{}"
    );
    dismissedData[id] = Date.now();
    localStorage.setItem("dismissed_notifications_timed", JSON.stringify(dismissedData));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getVisibleNotifications = () => {
    const dismissedData: Record<string, number> = JSON.parse(
      localStorage.getItem("dismissed_notifications_timed") || "{}"
    );
    const now = Date.now();

    return notifications.filter((n) => {
      // Check if notification was dismissed and if reappear time has passed
      if (dismissedData[n.id]) {
        const dismissedAt = dismissedData[n.id];
        const reappearMinutes = n.reappear_after_minutes;
        
        // If no reappear time set (null), notification stays dismissed permanently
        if (reappearMinutes === null) {
          return false;
        }
        
        // Check if enough time has passed for reappearance
        const reappearDurationMs = reappearMinutes * 60 * 1000;
        if (now - dismissedAt < reappearDurationMs) {
          return false;
        }
        
        // Time has passed, remove from dismissed list
        delete dismissedData[n.id];
        localStorage.setItem("dismissed_notifications_timed", JSON.stringify(dismissedData));
      }
      
      // Filter by target audience
      if (n.target_audience === "authenticated" && !isAuthenticated) return false;
      if (n.target_audience === "unauthenticated" && isAuthenticated) return false;
      
      return true;
    });
  };

  // Periodically check for notifications that should reappear
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) => [...prev]); // Trigger re-render to check dismissals
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    notifications: getVisibleNotifications(),
    isLoading,
    dismissNotification,
    refetch: fetchNotifications,
  };
};

