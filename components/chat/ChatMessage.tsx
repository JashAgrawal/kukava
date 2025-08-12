'use client';

import { useState } from 'react';
import NextImage from 'next/image';
import { Copy, Check, User, Bot } from 'lucide-react';
import { Message } from '@/types';
import { formatMessageTime, copyToClipboard, cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

interface ChatMessageProps {
  message: Message;
  isLast?: boolean;
}

export function ChatMessage({ message, isLast = false }: ChatMessageProps) {
  const { showToast } = useUIStore();
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      showToast({
        type: 'success',
        message: 'Message copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast({
        type: 'error',
        message: 'Failed to copy message',
      });
    }
  };

  return (
    <div
      data-message-id={message.id}
      className={cn(
        "group flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors",
        isLast && "mb-4"
      )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
        )}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isUser ? 'You' : 'Gemini'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.timestamp)}
          </span>
        </div>

        {/* Message Body */}
        <div className="relative">
          {message.type === 'text' ? (
            <div className="prose prose-sm max-w-none">
              <p className="text-foreground whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          ) : message.type === 'image' ? (
            <div className="space-y-2">
              {message.content && (
                <p className="text-foreground whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              )}
              <div className="relative inline-block">
                {!imageLoaded && (
                  <div className="w-64 h-48 bg-muted rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Loading image...</span>
                  </div>
                )}
                <NextImage
                  src={message.imageBase64 || message.imageUrl || ''}
                  alt="Shared image"
                  width={384}
                  height={256}
                  className={cn(
                    "max-w-sm max-h-64 rounded-lg shadow-sm transition-opacity object-cover",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageLoaded(true);
                    showToast({
                      type: 'error',
                      message: 'Failed to load image',
                    });
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={cn(
              "absolute -right-2 -top-2 p-1.5 bg-card border border-border rounded-md shadow-sm",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
              copied && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
            )}
            title="Copy message"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
