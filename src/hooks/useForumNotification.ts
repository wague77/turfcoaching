
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  name: string;
  timestamp: number;
}

interface ForumNotification {
  hasNewMessages: boolean;
  newMessageCount: number;
  latestMessage: {
    authorName: string;
    preview: string;
    timestamp: string;
  } | null;
  typingUsers: Map<string, TypingUser>;
}

export const useForumNotification = () => {
  const [notification, setNotification] = useState<ForumNotification>({
    hasNewMessages: false,
    newMessageCount: 0,
    latestMessage: null,
    typingUsers: new Map(),
  });

  // Get device ID
  const getDeviceId = useCallback(() => {
    return localStorage.getItem('forum_device_id') || '';
  }, []);

  // Get last seen timestamp
  const getLastSeenTimestamp = useCallback(() => {
    return localStorage.getItem('forum_last_seen') || new Date(0).toISOString();
  }, []);

  // Mark messages as seen
  const markAsSeen = useCallback(() => {
    localStorage.setItem('forum_last_seen', new Date().toISOString());
    setNotification(prev => ({
      ...prev,
      hasNewMessages: false,
      newMessageCount: 0,
      latestMessage: null,
    }));
  }, []);

  // Check for new messages on mount
  useEffect(() => {
    const deviceId = getDeviceId();

    const checkNewMessages = async () => {
      const lastSeen = getLastSeenTimestamp();

      const { data, error } = await supabase
        .from('forum_messages')
        .select('id, author_name, message, created_at, device_id')
        .gt('created_at', lastSeen)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking forum messages:', error);
        return;
      }

      if (data && data.length > 0) {
        // Filter out messages from current device
        const otherMessages = data.filter(m => m.device_id !== deviceId);
        
        if (otherMessages.length > 0) {
          const latest = otherMessages[0];
          setNotification(prev => ({
            ...prev,
            hasNewMessages: true,
            newMessageCount: otherMessages.length,
            latestMessage: {
              authorName: latest.author_name,
              preview: latest.message.slice(0, 60) + (latest.message.length > 60 ? '...' : ''),
              timestamp: latest.created_at,
            },
          }));
        }
      }
    };

    checkNewMessages();

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('forum-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_messages'
        },
        (payload) => {
          const newMsg = payload.new as any;
          
          // Only notify if it's not from current device
          if (newMsg.device_id !== deviceId) {
            setNotification(prev => ({
              ...prev,
              hasNewMessages: true,
              newMessageCount: prev.newMessageCount + 1,
              latestMessage: {
                authorName: newMsg.author_name,
                preview: newMsg.message.slice(0, 60) + (newMsg.message.length > 60 ? '...' : ''),
                timestamp: newMsg.created_at,
              },
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to typing events
    const typingChannel = supabase.channel('forum_typing_notifications');
    
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { device_id, author_name, is_typing } = payload.payload;
        
        // Ignore own typing events
        if (device_id === deviceId) return;
        
        setNotification(prev => {
          const updated = new Map(prev.typingUsers);
          if (is_typing) {
            updated.set(device_id, { name: author_name, timestamp: Date.now() });
          } else {
            updated.delete(device_id);
          }
          return { ...prev, typingUsers: updated };
        });
      })
      .subscribe();

    // Cleanup stale typing indicators every second
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setNotification(prev => {
        const updated = new Map(prev.typingUsers);
        let changed = false;
        for (const [id, data] of updated.entries()) {
          if (now - data.timestamp > 3000) {
            updated.delete(id);
            changed = true;
          }
        }
        return changed ? { ...prev, typingUsers: updated } : prev;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
      clearInterval(cleanupInterval);
    };
  }, [getDeviceId, getLastSeenTimestamp]);

  return {
    ...notification,
    markAsSeen,
  };
};

