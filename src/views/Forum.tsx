
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createForumClient } from '@/lib/supabase-forum';
import { Header } from '@/components/racing/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare, Users, ArrowLeft, Trash2, Reply, X, ChevronDown, ChevronUp, Smile, Volume2, VolumeX, AtSign, Pencil, Check, Circle, Video, Image, Loader2, Mic, Square, Pause, Play, ArrowDown } from 'lucide-react';
import { compressImage, formatFileSize } from '@/lib/image-compression';
import { useVoiceRecorder, formatRecordingTime } from '@/hooks/useVoiceRecorder';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useUploadRateLimit } from '@/hooks/useUploadRateLimit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ForumMessage includes optional device_id for ownership tracking
// Public view doesn't include device_id, but realtime events and own messages do
interface ForumMessage {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  video_url: string | null;
  image_url: string | null;
  audio_url: string | null;
  device_id?: string; // Optional - only present for own messages or realtime events
}

// ForumReaction includes optional device_id for ownership tracking
interface ForumReaction {
  id: string;
  message_id: string;
  emoji: string;
  created_at: string;
  device_id?: string; // Optional - only present for own reactions or realtime events
}

interface ThreadedMessage extends ForumMessage {
  replies: ForumMessage[];
}

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

const AVAILABLE_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎯', '🏇'];

// Create notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // First tone
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6
    
    oscillator.type = 'sine';
    
    // Fade in and out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Audio notification not available');
  }
};

export default function Forum() {
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [reactions, setReactions] = useState<ForumReaction[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ForumMessage | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('forum_sound_enabled');
    return saved !== 'false'; // Default to true
  });
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionCursorPosition, setMentionCursorPosition] = useState<number>(0);
  const [editingMessage, setEditingMessage] = useState<ForumMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; compressed: number } | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timestamp: number }>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const deviceIdRef = useRef<string>('');
  const authorNameRef = useRef<string>('');
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);
  const { isAdmin } = useAdminAuth();
  
  // Voice recorder hook
  const voiceRecorder = useVoiceRecorder();

  // Upload rate limiting hook
  const uploadRateLimit = useUploadRateLimit(deviceId);

  // Get unique author names from messages for mention suggestions
  const uniqueAuthors = Array.from(new Set(messages.map(m => m.author_name)))
    .filter(name => name.toLowerCase() !== authorName.toLowerCase());

  // Get or create device ID
  useEffect(() => {
    let storedDeviceId = localStorage.getItem('forum_device_id');
    if (!storedDeviceId) {
      storedDeviceId = crypto.randomUUID();
      localStorage.setItem('forum_device_id', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
    deviceIdRef.current = storedDeviceId;

    // Load saved author name
    const savedName = localStorage.getItem('forum_author_name');
    if (savedName) {
      setAuthorName(savedName);
      authorNameRef.current = savedName;
    }

    // Mark forum as seen when visiting
    localStorage.setItem('forum_last_seen', new Date().toISOString());
  }, []);

  // Update authorNameRef when authorName changes
  useEffect(() => {
    authorNameRef.current = authorName;
  }, [authorName]);

  // Setup presence channel for online users tracking
  useEffect(() => {
    if (!deviceId) return;

    const presenceChannel = supabase.channel('forum_presence', {
      config: {
        presence: {
          key: deviceId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const userCount = Object.keys(state).length;
        setOnlineUsers(userCount);
      })
      .on('presence', { event: 'join' }, () => {
        const state = presenceChannel.presenceState();
        const userCount = Object.keys(state).length;
        setOnlineUsers(userCount);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = presenceChannel.presenceState();
        const userCount = Object.keys(state).length;
        setOnlineUsers(userCount);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            device_id: deviceId,
            online_at: new Date().toISOString(),
            author_name: authorName || 'Anonyme',
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [deviceId, authorName]);

  // Setup typing indicator channel
  useEffect(() => {
    if (!deviceId) return;

    const typingChannel = supabase.channel('forum_typing');
    typingChannelRef.current = typingChannel;

    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { device_id, author_name, is_typing } = payload.payload;
        
        // Ignore own typing events
        if (device_id === deviceId) return;
        
        setTypingUsers(prev => {
          const updated = new Map(prev);
          if (is_typing) {
            updated.set(device_id, { name: author_name, timestamp: Date.now() });
          } else {
            updated.delete(device_id);
          }
          return updated;
        });
      })
      .subscribe();

    // Cleanup stale typing indicators every 3 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = new Map(prev);
        for (const [id, data] of updated.entries()) {
          if (now - data.timestamp > 3000) {
            updated.delete(id);
          }
        }
        return updated.size !== prev.size ? updated : prev;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(typingChannel);
      typingChannelRef.current = null;
      clearInterval(cleanupInterval);
    };
  }, [deviceId]);

  // Broadcast typing status
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!typingChannelRef.current || !deviceId) return;
    
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        device_id: deviceId,
        author_name: authorName || 'Anonyme',
        is_typing: isTyping,
      },
    });
  }, [deviceId, authorName]);

  // Toggle sound preference
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('forum_sound_enabled', String(newValue));
    toast.success(newValue ? 'Notifications sonores activées' : 'Notifications sonores désactivées');
  };

  // Create forum client with device-id header for modifications
  const forumClient = useMemo(() => {
    if (!deviceId) return null;
    return createForumClient(deviceId);
  }, [deviceId]);

  // Fetch messages and reactions
  useEffect(() => {
    if (!deviceId) return;

    const fetchData = async () => {
      const [messagesResult, reactionsResult] = await Promise.all([
        // Fetch all messages from public view (no RLS restrictions)
        supabase
          .from('forum_messages_public')
          .select('*')
          .order('created_at', { ascending: true }),
        // Fetch all reactions from public view (no RLS restrictions)
        supabase
          .from('forum_reactions_public')
          .select('*')
      ]);

      if (messagesResult.error) {
        console.error('Error fetching messages:', messagesResult.error);
      } else {
        setMessages(messagesResult.data || []);
      }

      if (reactionsResult.error) {
        console.error('Error fetching reactions:', reactionsResult.error);
      } else {
        setReactions(reactionsResult.data || []);
      }
    };

    fetchData();

    // Subscribe to realtime updates for messages
    // When a change happens, we refetch from the public view to ensure all users see the data
    const messagesChannel = supabase
      .channel('forum-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_messages'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new message from public view to get consistent data
            const { data: newMsgData } = await supabase
              .from('forum_messages_public')
              .select('*')
              .eq('id', payload.new.id)
              .single();
            
            if (newMsgData) {
              setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMsgData.id)) return prev;
                return [...prev, newMsgData as ForumMessage];
              });
              
              // Check if user was mentioned in the message
              const currentAuthorName = authorNameRef.current;
              const wasMentioned = currentAuthorName && 
                newMsgData.message?.toLowerCase().includes(`@${currentAuthorName.toLowerCase()}`);
              
              // Play notification sound if message is from someone else and sound is enabled
              // Compare author_name since we don't have device_id in public view
              const storedSoundEnabled = localStorage.getItem('forum_sound_enabled') !== 'false';
              const currentDeviceAuthor = localStorage.getItem('forum_author_name');
              const isOwnMessage = newMsgData.author_name === currentDeviceAuthor;
              
              if (!isOwnMessage) {
                // Increment unread count if not at bottom
                if (!isAtBottomRef.current) {
                  setUnreadCount(prev => prev + 1);
                }
                
                if (storedSoundEnabled) {
                  playNotificationSound();
                  
                  // Show toast if user was mentioned
                  if (wasMentioned) {
                    toast.info(`${newMsgData.author_name} vous a mentionné !`, {
                      description: newMsgData.message?.slice(0, 50) + ((newMsgData.message?.length || 0) > 50 ? '...' : ''),
                    });
                  }
                }
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            // Fetch updated message from public view
            const { data: updatedMsgData } = await supabase
              .from('forum_messages_public')
              .select('*')
              .eq('id', payload.new.id)
              .single();
            
            if (updatedMsgData) {
              setMessages(prev => prev.map(m => 
                m.id === updatedMsgData.id ? updatedMsgData as ForumMessage : m
              ));
            }
          }
        }
      )
      .subscribe();

    // Subscribe to realtime updates for reactions
    // When a change happens, we refetch from the public view to ensure all users see the data
    const reactionsChannel = supabase
      .channel('forum-reactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_reactions'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new reaction from public view
            const { data: newReactionData } = await supabase
              .from('forum_reactions_public')
              .select('*')
              .eq('id', payload.new.id)
              .single();
            
            if (newReactionData) {
              setReactions(prev => {
                // Avoid duplicates
                if (prev.some(r => r.id === newReactionData.id)) return prev;
                return [...prev, newReactionData as ForumReaction];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setReactions(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [deviceId]);

  // Handle scroll events to track if user is at bottom
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100; // pixels from bottom to consider "at bottom"
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;
    
    // Reset unread count when scrolling to bottom
    if (atBottom) {
      setUnreadCount(0);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (scrollRef.current && isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // Scroll to bottom function for the indicator button
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setUnreadCount(0);
    }
  }, []);

  // Group messages into threads
  const threadedMessages: ThreadedMessage[] = messages
    .filter(m => !m.parent_id)
    .map(parent => ({
      ...parent,
      replies: messages.filter(m => m.parent_id === parent.id)
    }));

  // Filter mention suggestions based on query
  const filteredMentionSuggestions = mentionQuery
    ? uniqueAuthors.filter(name => 
        name.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 5)
    : uniqueAuthors.slice(0, 5);

  // Handle message input change with mention detection and typing indicator
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setNewMessage(value);
    setMentionCursorPosition(cursorPos);

    // Broadcast typing status
    if (value.length > 0) {
      broadcastTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        broadcastTyping(false);
      }, 2000);
    } else {
      broadcastTyping(false);
    }

    // Check if we're typing a mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
      setMentionQuery('');
    }
  };

  // Insert mention into message
  const insertMention = (username: string) => {
    const textBeforeCursor = newMessage.slice(0, mentionCursorPosition);
    const textAfterCursor = newMessage.slice(mentionCursorPosition);
    
    // Find the @ position before cursor
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.slice(0, mentionMatch.index);
      const newText = `${beforeMention}@${username} ${textAfterCursor}`;
      setNewMessage(newText);
    }
    
    setShowMentionSuggestions(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  // Render message text with highlighted mentions
  const renderMessageWithMentions = (text: string, isOwnMessage: boolean) => {
    const mentionRegex = /@(\w+)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      // Check if this mention is for the current user
      const mentionedName = match[1];
      const isMentioningMe = authorName && mentionedName.toLowerCase() === authorName.toLowerCase();
      
      // Add the mention as a highlighted span
      parts.push(
        <span
          key={match.index}
          className={`font-semibold ${
            isMentioningMe
              ? 'bg-yellow-500/30 text-yellow-300 px-1 rounded'
              : isOwnMessage
                ? 'text-primary-foreground'
                : 'text-primary'
          }`}
        >
          @{mentionedName}
        </span>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  // Get reactions for a specific message
  const getMessageReactions = (messageId: string): ReactionCount[] => {
    const messageReactions = reactions.filter(r => r.message_id === messageId);
    const emojiCounts = new Map<string, { count: number; hasReacted: boolean }>();
    
    messageReactions.forEach(r => {
      const existing = emojiCounts.get(r.emoji) || { count: 0, hasReacted: false };
      existing.count++;
      if (r.device_id === deviceId) {
        existing.hasReacted = true;
      }
      emojiCounts.set(r.emoji, existing);
    });

    return Array.from(emojiCounts.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      hasReacted: data.hasReacted
    }));
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!forumClient) return;
    
    const existingReaction = reactions.find(
      r => r.message_id === messageId && r.device_id === deviceId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction - use forum client with device-id header
      const { error } = await forumClient
        .from('forum_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (error) {
        console.error('Error removing reaction:', error);
        toast.error('Erreur lors de la suppression de la réaction');
      }
    } else {
      // Add reaction - get current user if available (optional)
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('forum_reactions')
        .insert({
          message_id: messageId,
          device_id: deviceId,
          emoji,
          user_id: user?.id || null
        });

      if (error) {
        console.error('Error adding reaction:', error);
        toast.error('Erreur lors de l\'ajout de la réaction');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }

    if (!authorName.trim()) {
      toast.error('Veuillez entrer votre pseudo');
      return;
    }

    if (authorName.length > 30) {
      toast.error('Le pseudo ne peut pas dépasser 30 caractères');
      return;
    }

    if (newMessage.length > 1000) {
      toast.error('Le message ne peut pas dépasser 1000 caractères');
      return;
    }

    setIsLoading(true);

    // Save author name for next time
    localStorage.setItem('forum_author_name', authorName);

    // Get current user if available (optional for forum access)
    const { data: { user } } = await supabase.auth.getUser();

    let videoUrl: string | null = null;
    let imageUrl: string | null = null;
    let audioUrl: string | null = null;

    // Upload video if selected
    if (selectedVideo) {
      setIsUploadingVideo(true);
      try {
        videoUrl = await uploadVideo(selectedVideo);
      } catch (error) {
        setIsLoading(false);
        setIsUploadingVideo(false);
        toast.error('Erreur lors de l\'upload de la vidéo');
        return;
      }
      setIsUploadingVideo(false);
    }

    // Upload image if selected
    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        imageUrl = await uploadImage(selectedImage);
      } catch (error) {
        setIsLoading(false);
        setIsUploadingImage(false);
        toast.error('Erreur lors de l\'upload de l\'image');
        return;
      }
      setIsUploadingImage(false);
    }

    // Upload audio if recorded
    if (voiceRecorder.audioBlob) {
      setIsUploadingAudio(true);
      try {
        audioUrl = await uploadAudio(voiceRecorder.audioBlob);
      } catch (error) {
        setIsLoading(false);
        setIsUploadingAudio(false);
        toast.error('Erreur lors de l\'upload de l\'audio');
        return;
      }
      setIsUploadingAudio(false);
    }

    const { error } = await supabase
      .from('forum_messages')
      .insert({
        author_name: authorName.trim(),
        device_id: deviceId,
        message: newMessage.trim(),
        parent_id: replyingTo?.id || null,
        user_id: user?.id || null,
        video_url: videoUrl,
        image_url: imageUrl,
        audio_url: audioUrl
      });

    setIsLoading(false);

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
      return;
    }

    // Stop typing indicator
    broadcastTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setNewMessage('');
    setReplyingTo(null);
    removeSelectedVideo();
    removeSelectedImage();
    voiceRecorder.clearRecording();
    toast.success(replyingTo ? 'Réponse envoyée !' : 'Message envoyé !');
    
    // Expand thread if replying
    if (replyingTo) {
      setExpandedThreads(prev => new Set([...prev, replyingTo.id]));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!forumClient) return;
    
    // Use forum client with device-id header for RLS policy
    const { error } = await forumClient
      .from('forum_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Message supprimé');
  };

  const handleEditMessage = (message: ForumMessage) => {
    setEditingMessage(message);
    setEditText(message.message);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editText.trim()) {
      toast.error('Le message ne peut pas être vide');
      return;
    }

    if (editText.length > 1000) {
      toast.error('Le message ne peut pas dépasser 1000 caractères');
      return;
    }

    if (!forumClient) return;

    // Use forum client with device-id header for RLS policy
    const { error } = await forumClient
      .from('forum_messages')
      .update({ message: editText.trim() })
      .eq('id', editingMessage.id);

    if (error) {
      console.error('Error updating message:', error);
      toast.error('Erreur lors de la modification');
      return;
    }

    // Update local state
    setMessages(prev => prev.map(m => 
      m.id === editingMessage.id ? { ...m, message: editText.trim() } : m
    ));

    setEditingMessage(null);
    setEditText('');
    toast.success('Message modifié !');
  };

  const handleReply = (message: ForumMessage) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  // Handle video selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check upload rate limit
    const limitCheck = uploadRateLimit.checkUploadLimit('forum-videos');
    if (!limitCheck.allowed) {
      toast.error(limitCheck.message);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format vidéo non supporté. Utilisez MP4, WebM, OGG ou MOV.');
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('La vidéo ne doit pas dépasser 100 Mo.');
      return;
    }

    setSelectedVideo(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  // Remove selected video
  const removeSelectedVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedVideo(null);
    setVideoPreviewUrl(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  // Upload video to storage
  const uploadVideo = async (file: File): Promise<string | null> => {
    // Record the upload for rate limiting
    uploadRateLimit.recordUpload('forum-videos');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${deviceId}-${Date.now()}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('forum-videos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading video:', uploadError);
      throw new Error('Erreur lors de l\'upload de la vidéo');
    }

    const { data: publicUrlData } = supabase.storage
      .from('forum-videos')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  // Handle image selection with automatic compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check upload rate limit
    const limitCheck = uploadRateLimit.checkUploadLimit('forum-images');
    if (!limitCheck.allowed) {
      toast.error(limitCheck.message);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format image non supporté. Utilisez JPG, PNG, GIF ou WebP.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 10 Mo.');
      return;
    }

    // Compress image automatically
    setIsCompressingImage(true);
    try {
      const originalSize = file.size;
      const compressedFile = await compressImage(file, 1920, 1080, 0.8);
      const compressedSize = compressedFile.size;
      
      setSelectedImage(compressedFile);
      setImagePreviewUrl(URL.createObjectURL(compressedFile));
      
      // Show compression info if size was reduced
      if (compressedSize < originalSize) {
        setCompressionInfo({ original: originalSize, compressed: compressedSize });
        const reduction = Math.round((1 - compressedSize / originalSize) * 100);
        toast.success(`Image compressée : ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (-${reduction}%)`);
      } else {
        setCompressionInfo(null);
      }
    } catch (error) {
      console.error('Error compressing image:', error);
      // Fallback to original file if compression fails
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setCompressionInfo(null);
    }
    setIsCompressingImage(false);
  };

  // Remove selected image
  const removeSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setCompressionInfo(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Upload image to storage
  const uploadImage = async (file: File): Promise<string | null> => {
    // Record the upload for rate limiting
    uploadRateLimit.recordUpload('forum-images');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${deviceId}-${Date.now()}.${fileExt}`;
    const filePath = `images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('forum-images')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error('Erreur lors de l\'upload de l\'image');
    }

    const { data: publicUrlData } = supabase.storage
      .from('forum-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  // Upload audio to storage
  const uploadAudio = async (blob: Blob): Promise<string | null> => {
    // Check upload rate limit before uploading
    const limitCheck = uploadRateLimit.checkUploadLimit('forum-audio');
    if (!limitCheck.allowed) {
      toast.error(limitCheck.message);
      return null;
    }
    
    // Record the upload for rate limiting
    uploadRateLimit.recordUpload('forum-audio');
    
    const fileName = `${deviceId}-${Date.now()}.webm`;
    const filePath = `audio/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('forum-audio')
      .upload(filePath, blob, {
        contentType: 'audio/webm'
      });

    if (uploadError) {
      console.error('Error uploading audio:', uploadError);
      throw new Error('Erreur lors de l\'upload de l\'audio');
    }

    const { data: publicUrlData } = supabase.storage
      .from('forum-audio')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const toggleThread = (messageId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderMessage = (msg: ForumMessage, isReply: boolean = false) => {
    const isOwnMessage = msg.device_id === deviceId;
    const messageReactions = getMessageReactions(msg.id);
    
    return (
      <div
        key={msg.id}
        className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''} ${isReply ? 'ml-8 mt-2' : ''}`}
      >
        <Avatar className={`w-${isReply ? '8' : '10'} h-${isReply ? '8' : '10'} ${getAvatarColor(msg.author_name)} flex-shrink-0`}>
          <AvatarFallback className={`text-white ${isReply ? 'text-xs' : 'text-sm'}`}>
            {getInitials(msg.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'text-right' : ''}`}>
          <div className={`inline-block rounded-lg p-3 ${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : isReply 
                ? 'bg-muted/70 border border-border'
                : 'bg-muted'
          }`}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-semibold text-sm ${
                isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
              }`}>
                {msg.author_name}
              </span>
              <div className="flex items-center gap-1">
                {/* Emoji reaction picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={`opacity-50 hover:opacity-100 transition-opacity ${
                        isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
                      }`}
                      title="Réagir"
                    >
                      <Smile className="w-3 h-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="top">
                    <div className="flex gap-1">
                      {AVAILABLE_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-muted"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                
                {!isReply && (
                  <button
                    onClick={() => handleReply(msg)}
                    className={`opacity-50 hover:opacity-100 transition-opacity ${
                      isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                    title="Répondre"
                  >
                    <Reply className="w-3 h-3" />
                  </button>
                )}
                {isOwnMessage && !editingMessage && (
                  <button
                    onClick={() => handleEditMessage(msg)}
                    className={`opacity-50 hover:opacity-100 transition-opacity ${
                      isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                    title="Modifier"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {(isOwnMessage || isAdmin) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className={`opacity-50 hover:opacity-100 transition-opacity ${
                        isOwnMessage ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {!isReply && messages.filter(m => m.parent_id === msg.id).length > 0
                            ? 'Ce message a des réponses. Toutes les réponses seront également supprimées.'
                            : 'Cette action est irréversible.'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            
            {/* Edit mode or display message */}
            {editingMessage?.id === msg.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[60px] text-sm bg-background text-foreground"
                  maxLength={1000}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="gap-1"
                    disabled={!editText.trim()}
                  >
                    <Check className="w-3 h-3" />
                    Sauvegarder
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="gap-1"
                  >
                    <X className="w-3 h-3" />
                    Annuler
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {editText.length}/1000
                  </span>
                </div>
              </div>
            ) : (
              <>
                <p className={`text-sm whitespace-pre-wrap break-words ${
                  isOwnMessage ? 'text-primary-foreground/90' : 'text-foreground/90'
                }`}>
                  {renderMessageWithMentions(msg.message, isOwnMessage)}
                </p>
                {/* Display image if present */}
                {msg.image_url && (
                  <div className="mt-2">
                    <img
                      src={msg.image_url}
                      alt="Image du message"
                      className="rounded-lg max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(msg.image_url!, '_blank')}
                    />
                  </div>
                )}
                {/* Display video if present */}
                {msg.video_url && (
                  <div className="mt-2">
                    <video
                      src={msg.video_url}
                      controls
                      className="rounded-lg max-w-full max-h-64 bg-black"
                      preload="metadata"
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                )}
                {/* Display audio if present */}
                {msg.audio_url && (
                  <div className="mt-2">
                    <audio
                      src={msg.audio_url}
                      controls
                      className="w-full max-w-xs h-10"
                    >
                      Votre navigateur ne supporte pas la lecture audio.
                    </audio>
                  </div>
                )}
              </>
            )}
            
            {/* Display reactions */}
            {messageReactions.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                {messageReactions.map(({ emoji, count, hasReacted }) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                      hasReacted
                        ? 'bg-primary/20 border border-primary/50'
                        : 'bg-background/50 border border-border hover:border-primary/30'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className={hasReacted ? 'text-primary font-medium' : 'text-muted-foreground'}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(msg.created_at), { 
              addSuffix: true,
              locale: fr 
            })}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Forum d'échange</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSound}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' 
                  : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/50'
              }`}
              title={soundEnabled ? 'Désactiver les sons' : 'Activer les sons'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="text-sm hidden sm:inline">
                {soundEnabled ? 'Son activé' : 'Son désactivé'}
              </span>
            </button>
            <Badge variant="outline" className="flex items-center gap-2 px-3 py-1.5">
              <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
              <span className="text-sm font-medium">{onlineUsers} en ligne</span>
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">{messages.length} messages</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Messages Panel */}
          <Card className="lg:col-span-3 flex flex-col h-[600px]">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Discussions</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              {/* New messages indicator */}
              {unreadCount > 0 && !isAtBottom && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all animate-fade-in hover:scale-105"
                >
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount} nouveau{unreadCount > 1 ? 'x' : ''} message{unreadCount > 1 ? 's' : ''}
                  </span>
                </button>
              )}
              <ScrollArea className="h-full p-4" ref={scrollRef} onScrollCapture={handleScroll}>
                {threadedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
                    <p>Aucun message pour le moment</p>
                    <p className="text-sm">Soyez le premier à poster !</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {threadedMessages.map((thread) => (
                      <div key={thread.id} className="space-y-2">
                        {renderMessage(thread)}
                        
                        {/* Thread replies */}
                        {thread.replies.length > 0 && (
                          <div className="ml-8">
                            <button
                              onClick={() => toggleThread(thread.id)}
                              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mb-2"
                            >
                              {expandedThreads.has(thread.id) ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Masquer {thread.replies.length} réponse{thread.replies.length > 1 ? 's' : ''}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Voir {thread.replies.length} réponse{thread.replies.length > 1 ? 's' : ''}
                                </>
                              )}
                            </button>
                            
                            {expandedThreads.has(thread.id) && (
                              <div className="space-y-2 border-l-2 border-primary/20 pl-4">
                                {thread.replies.map(reply => renderMessage(reply, true))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>
                      {Array.from(typingUsers.values())
                        .map(u => u.name)
                        .slice(0, 3)
                        .join(', ')}
                      {typingUsers.size > 3 && ` et ${typingUsers.size - 3} autre${typingUsers.size > 4 ? 's' : ''}`}
                      {typingUsers.size === 1 ? ' écrit...' : ' écrivent...'}
                    </span>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Input Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">
                {replyingTo ? 'Répondre' : 'Nouveau message'}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Reply indicator */}
              {replyingTo && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Reply className="w-3 h-3" />
                      Réponse à <span className="font-medium text-foreground">{replyingTo.author_name}</span>
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {replyingTo.message}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Votre pseudo
                  </label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Entrez votre pseudo..."
                    maxLength={30}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {authorName.length}/30 caractères
                  </p>
                </div>
                <div className="relative">
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    {replyingTo ? 'Votre réponse' : 'Message'}
                    <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                      <AtSign className="w-3 h-3" /> pour mentionner
                    </span>
                  </label>
                  <Textarea
                    ref={inputRef}
                    value={newMessage}
                    onChange={handleMessageChange}
                    onBlur={() => setTimeout(() => setShowMentionSuggestions(false), 200)}
                    placeholder={replyingTo 
                      ? `Répondre à ${replyingTo.author_name}...`
                      : "Partagez vos analyses, pronostics... Tapez @ pour mentionner"
                    }
                    rows={6}
                    maxLength={1000}
                    required
                  />
                  
                  {/* Mention suggestions dropdown */}
                  {showMentionSuggestions && filteredMentionSuggestions.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                      <div className="p-1">
                        <p className="text-xs text-muted-foreground px-2 py-1">Mentionner un utilisateur</p>
                        {filteredMentionSuggestions.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => insertMention(name)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded flex items-center gap-2"
                          >
                            <AtSign className="w-3 h-3 text-primary" />
                            <span>{name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {newMessage.length}/1000 caractères
                  </p>
                </div>

                {/* Image upload section */}
                <div>
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  
                  {imagePreviewUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <img
                        src={imagePreviewUrl}
                        alt="Aperçu de l'image"
                        className="w-full max-h-40 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs">
                        {selectedImage?.name}
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Image className="w-4 h-4" />
                      Ajouter une image
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, GIF ou WebP (max 10 Mo)
                  </p>
                </div>

                {/* Video upload section */}
                <div>
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleVideoSelect}
                    className="hidden"
                    id="video-upload"
                  />
                  
                  {videoPreviewUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-border">
                      <video
                        src={videoPreviewUrl}
                        className="w-full max-h-40 object-cover bg-black"
                        muted
                        preload="metadata"
                      />
                      <button
                        type="button"
                        onClick={removeSelectedVideo}
                        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs">
                        {selectedVideo?.name}
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <Video className="w-4 h-4" />
                      Ajouter une vidéo
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    MP4, WebM, OGG ou MOV (max 100 Mo)
                  </p>
                </div>

                {/* Audio recording section */}
                <div>
                  {voiceRecorder.audioUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-border p-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <audio
                          src={voiceRecorder.audioUrl}
                          controls
                          className="flex-1 h-10"
                        />
                        <button
                          type="button"
                          onClick={voiceRecorder.clearRecording}
                          className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : voiceRecorder.isRecording ? (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                          <span className="text-sm font-medium">
                            {formatRecordingTime(voiceRecorder.recordingTime)}
                          </span>
                          {voiceRecorder.isPaused && (
                            <span className="text-xs text-muted-foreground">(En pause)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {voiceRecorder.isPaused ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={voiceRecorder.resumeRecording}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={voiceRecorder.pauseRecording}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={voiceRecorder.stopRecording}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={voiceRecorder.clearRecording}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={voiceRecorder.startRecording}
                    >
                      <Mic className="w-4 h-4" />
                      Enregistrer un message vocal
                    </Button>
                  )}
                  {voiceRecorder.error && (
                    <p className="text-xs text-destructive mt-1">{voiceRecorder.error}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Enregistrez jusqu'à 5 minutes de message audio
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={isLoading || isUploadingVideo || isUploadingImage || isUploadingAudio || !authorName.trim() || !newMessage.trim()}
                >
                  {isUploadingVideo || isUploadingImage || isUploadingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      {replyingTo ? <Reply className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      {isLoading ? 'Envoi...' : replyingTo ? 'Répondre' : 'Envoyer'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

