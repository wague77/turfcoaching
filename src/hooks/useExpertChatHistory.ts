
import { useState, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'expert-chat-history';
const MAX_CONVERSATIONS = 20;

export function useExpertChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Conversation[];
        setConversations(parsed);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever conversations change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  }, [conversations, isLoaded]);

  const generateTitle = (messages: Message[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content.replace(/\[Contexte.*?\]/gs, '').trim();
      return content.slice(0, 50) + (content.length > 50 ? '...' : '');
    }
    return 'Nouvelle conversation';
  };

  const createConversation = useCallback((): string => {
    const id = `conv-${Date.now()}`;
    const newConversation: Conversation = {
      id,
      title: 'Nouvelle conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setConversations(prev => {
      const updated = [newConversation, ...prev];
      // Limit to MAX_CONVERSATIONS
      return updated.slice(0, MAX_CONVERSATIONS);
    });
    setActiveConversationId(id);
    return id;
  }, []);

  const updateConversation = useCallback((id: string, messages: Message[]) => {
    setConversations(prev => 
      prev.map(conv => {
        if (conv.id === id) {
          return {
            ...conv,
            messages,
            title: messages.length > 0 ? generateTitle(messages) : conv.title,
            updatedAt: Date.now(),
          };
        }
        return conv;
      })
    );
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  const getActiveConversation = useCallback((): Conversation | null => {
    if (!activeConversationId) return null;
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [activeConversationId, conversations]);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  return {
    conversations,
    activeConversationId,
    isLoaded,
    createConversation,
    updateConversation,
    deleteConversation,
    clearAllConversations,
    getActiveConversation,
    selectConversation,
  };
}

