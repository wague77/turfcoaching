
'use client';

import Link from 'next/link';
import { MessageSquare, X, ArrowRight, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForumNotification } from '@/hooks/useForumNotification';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ForumNotificationBanner = () => {
  const { hasNewMessages, newMessageCount, latestMessage, typingUsers, markAsSeen } = useForumNotification();

  const typingUsersList = Array.from(typingUsers.values());
  const hasTypingUsers = typingUsersList.length > 0;

  // Show banner if there are new messages OR someone is typing
  if (!hasNewMessages && !hasTypingUsers) return null;

  const timeAgo = latestMessage ? formatDistanceToNow(new Date(latestMessage.timestamp), {
    addSuffix: true,
    locale: fr,
  }) : null;

  // Format typing users text
  const getTypingText = () => {
    if (typingUsersList.length === 0) return null;
    const names = typingUsersList.map(u => u.name).slice(0, 3);
    const extra = typingUsersList.length > 3 ? ` et ${typingUsersList.length - 3} autre${typingUsersList.length > 4 ? 's' : ''}` : '';
    const verb = typingUsersList.length === 1 ? 'écrit' : 'écrivent';
    return `${names.join(', ')}${extra} ${verb}...`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg border border-primary/20 overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/20 shrink-0">
            <MessageSquare className="w-5 h-5" />
            {/* Badge compteur de messages non lus */}
            {newMessageCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 text-xs font-bold flex items-center justify-center animate-pulse"
              >
                {newMessageCount > 99 ? '99+' : newMessageCount}
              </Badge>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {/* New messages notification */}
            {hasNewMessages && latestMessage && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">
                    {newMessageCount === 1 
                      ? 'Nouveau message au forum !' 
                      : `${newMessageCount} nouveaux messages !`}
                  </p>
                </div>
                <p className="text-xs opacity-80 mb-1">
                  <span className="font-medium">{latestMessage.authorName}</span> {timeAgo}
                </p>
                <p className="text-xs opacity-70 line-clamp-2">
                  {latestMessage.preview}
                </p>
              </>
            )}
            
            {/* Typing indicator */}
            {hasTypingUsers && (
              <div className={`flex items-center gap-2 ${hasNewMessages ? 'mt-2 pt-2 border-t border-primary-foreground/20' : ''}`}>
                <PenLine className="w-3 h-3 animate-pulse" />
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs opacity-80">{getTypingText()}</span>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-primary-foreground/20 -mt-1 -mr-1"
            onClick={markAsSeen}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <Link 
          href="/forum" 
          onClick={markAsSeen}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors text-sm font-medium"
        >
          Aller au forum
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

