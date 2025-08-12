'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Chatroom } from '@/types';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { MessageFormData } from '@/lib/validations';
import { scrollToBottom, isAtBottom } from '@/lib/utils';

interface ChatInterfaceProps {
  chatroom: Chatroom;
}

export function ChatInterface({ chatroom }: ChatInterfaceProps) {
  const {
    messages,
    isMessagesLoading,
    isTyping,
    hasMoreMessages,
    sendMessage,
    loadMoreMessages,
  } = useChatStore();

  const { showToast } = useUIStore();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter messages for current chatroom
  const chatroomMessages = messages.filter(msg => msg.chatroomId === chatroom.id);

  // WhatsApp-like auto-scroll behavior
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Only auto-scroll if:
    // 1. We're not loading more messages
    // 2. User is at the bottom or this is a new message from current user
    // 3. Or if it's the typing indicator
    if (!isMessagesLoading) {
      const wasAtBottom = isAtBottom(container, 100);
      const isNewMessage = chatroomMessages.length > lastMessageCountRef.current;

      if (wasAtBottom || (isNewMessage && shouldAutoScroll) || isTyping) {
        setTimeout(() => {
          scrollToBottom(container, true);
        }, 50);
      }

      lastMessageCountRef.current = chatroomMessages.length;
    }
  }, [chatroomMessages.length, isTyping, isMessagesLoading, shouldAutoScroll]);

  // Force scroll to bottom when switching chats
  useEffect(() => {
    if (messagesContainerRef.current && chatroom) {
      lastMessageCountRef.current = 0;
      setShouldAutoScroll(true);
      setTimeout(() => {
        scrollToBottom(messagesContainerRef.current!, false);
      }, 100);
    }
  }, [chatroom]);

  // WhatsApp-like scroll behavior management
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Check if user is at bottom for auto-scroll behavior
      const atBottom = isAtBottom(container, 100);
      setShowScrollButton(!atBottom && chatroomMessages.length > 0);

      // Update auto-scroll preference based on user behavior
      if (!isMessagesLoading) {
        setShouldAutoScroll(atBottom);
      }

      // Debounced infinite scroll check
      scrollTimeoutRef.current = setTimeout(async () => {
        // More robust conditions for triggering infinite scroll
        const scrollTop = container.scrollTop;
        const scrollThreshold = 150; // Increased threshold for better UX
        const isNearTop = scrollTop <= scrollThreshold;
        const hasContent = chatroomMessages.length > 0;

        // Load more messages when near top with proper conditions
        if (isNearTop && hasMoreMessages && !isMessagesLoading && hasContent) {
          console.log('🔄 Triggering infinite scroll load...', {
            scrollTop,
            scrollThreshold,
            hasMoreMessages,
            isMessagesLoading,
            messageCount: chatroomMessages.length,
            timestamp: new Date().toISOString()
          });

          // WhatsApp-style: Remember scroll position for restoration
          const scrollHeightBefore = container.scrollHeight;
          const scrollTopBefore = container.scrollTop;

          try {
            await loadMoreMessages();

            // Restore scroll position to maintain view after new messages are added
            // Use multiple animation frames to ensure DOM has updated
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (container) {
                  const scrollHeightAfter = container.scrollHeight;
                  const heightDifference = scrollHeightAfter - scrollHeightBefore;

                  if (heightDifference > 0) {
                    // Maintain the user's view by adjusting scroll position
                    const newScrollTop = scrollTopBefore + heightDifference;
                    container.scrollTop = newScrollTop;

                    console.log('✅ Scroll position restored:', {
                      scrollHeightBefore,
                      scrollHeightAfter,
                      heightDifference,
                      scrollTopBefore,
                      newScrollTop: container.scrollTop,
                      timestamp: new Date().toISOString()
                    });
                  } else {
                    console.warn('⚠️ No height difference detected after loading messages', {
                      scrollHeightBefore,
                      scrollHeightAfter,
                      timestamp: new Date().toISOString()
                    });
                  }
                }
              });
            });

          } catch (error) {
            console.error('❌ Failed to load more messages:', {
              error,
              scrollTop,
              hasMoreMessages,
              isMessagesLoading,
              messageCount: chatroomMessages.length,
              timestamp: new Date().toISOString()
            });
            showToast({
              type: 'error',
              message: 'Failed to load more messages. Please try scrolling again.',
            });
          }
        } else {
          // Log why infinite scroll didn't trigger
          if (isNearTop && !hasMoreMessages) {
            console.log('📄 No more messages to load');
          } else if (isNearTop && isMessagesLoading) {
            console.log('⏳ Already loading messages, skipping...');
          } else if (isNearTop && !hasContent) {
            console.log('📭 No messages in current chatroom yet');
          }
        }
      }, 150); // Increased debounce for better performance
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [hasMoreMessages, isMessagesLoading, loadMoreMessages, showToast, chatroomMessages.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = async (data: MessageFormData) => {
    try {
      // Enable auto-scroll for new messages sent by user
      setShouldAutoScroll(true);
      await sendMessage(data);
    } catch (error) {
      throw error; // Let ChatInput handle the error display
    }
  };

  const handleScrollToBottom = () => {
    if (messagesContainerRef.current) {
      setShouldAutoScroll(true);
      scrollToBottom(messagesContainerRef.current, true);
    }
  };



  return (
    <div className="flex flex-col h-full bg-card">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        {/* Load More Indicator */}
        {isMessagesLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Loading more messages...</span>
          </div>
        )}

        {/* No More Messages Indicator */}
        {!hasMoreMessages && chatroomMessages.length > 0 && (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Beginning of conversation
            </span>
          </div>
        )}

        {/* Messages */}
        {chatroomMessages.length > 0 ? (
          <div className="space-y-0">
            {chatroomMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLast={index === chatroomMessages.length - 1}
              />
            ))}
          </div>
        ) : !isMessagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start the conversation
              </h3>
              <p className="text-muted-foreground mb-4">
                Send a message to begin chatting with Gemini AI. Ask questions,
                share ideas, or just have a conversation!
              </p>
            </div>
          </div>
        ) : null}

        {/* Typing Indicator */}
        {isTyping && <TypingIndicator />}

        {/* Messages End Marker */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={handleScrollToBottom}
            className="p-2 bg-card border border-border rounded-full shadow-lg hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isMessagesLoading || isTyping}
      />
    </div>
  );
}
