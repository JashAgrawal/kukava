'use client';

import { useState } from 'react';
import { Search, Plus, Trash2, MessageCircle, MoreVertical } from 'lucide-react';
import { Chatroom } from '@/types';
import { formatChatroomTime, truncateText, cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { logger } from '@/lib/logger';

interface ChatroomListProps {
  chatrooms: Chatroom[];
  currentChatroomId?: string;
  onSelectChatroom: (chatroom: Chatroom) => void;
  onDeleteChatroom: (chatroomId: string) => void;
  onCreateChatroom: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
}

export function ChatroomList({
  chatrooms,
  currentChatroomId,
  onSelectChatroom,
  onDeleteChatroom,
  onCreateChatroom,
  searchQuery,
  onSearchChange,
  isLoading = false,
}: ChatroomListProps) {
  const { showToast } = useUIStore();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleDeleteChatroom = async (chatroomId: string, chatroomTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${chatroomTitle}"?`)) {
      try {
        await onDeleteChatroom(chatroomId);
        showToast({
          type: 'success',
          message: 'Chatroom deleted successfully',
        });
      } catch (error) {
        showToast({
          type: 'error',
          message: 'Failed to delete chatroom',
        });
      }
    }
    setActiveDropdown(null);
  };

  const toggleDropdown = (chatroomId: string) => {
    setActiveDropdown(activeDropdown === chatroomId ? null : chatroomId);
  };

  // Filter chatrooms based on search query
  const effectiveSearchQuery = searchQuery.trim();
  const filteredChatrooms = effectiveSearchQuery
    ? chatrooms.filter(chatroom => {
        const titleMatch = chatroom.title.toLowerCase().includes(effectiveSearchQuery.toLowerCase());
        const messageMatch = chatroom.lastMessage?.content.toLowerCase().includes(effectiveSearchQuery.toLowerCase()) || false;
        return titleMatch || messageMatch;
      })
    : chatrooms;

  logger.debug('chatroom_list.filtered', {
    searchQuery: effectiveSearchQuery,
    totalChatrooms: chatrooms.length,
    filteredCount: filteredChatrooms.length,
  });

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground">Chats</h1>
          <button
            onClick={onCreateChatroom}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
          />
        </div>
      </div>

      {/* Chatroom List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            {/* Loading skeletons */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 mb-2">
                <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </div>
                <div className="h-3 bg-muted rounded animate-pulse w-12" />
              </div>
            ))}
          </div>
        ) : filteredChatrooms.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredChatrooms.map((chatroom) => (
              <div
                key={chatroom.id}
                className={cn(
                  "relative flex items-center p-3 hover:bg-accent/50 cursor-pointer transition-colors",
                  currentChatroomId === chatroom.id && "bg-primary/10 border-r-2 border-primary"
                )}
                onClick={() => onSelectChatroom(chatroom)}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {chatroom.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">
                        {formatChatroomTime(chatroom.updatedAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDropdown(chatroom.id);
                        }}
                        className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {chatroom.lastMessage ? (
                    <p className="text-sm text-muted-foreground truncate">
                      {chatroom.lastMessage.sender === 'ai' && (
                        <span className="text-primary font-medium">Gemini: </span>
                      )}
                      {chatroom.lastMessage.type === 'image'
                        ? '📷 Image'
                        : truncateText(chatroom.lastMessage.content, 50)
                      }
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No messages yet</p>
                  )}
                </div>

                {/* Message count badge */}
                {chatroom.messageCount > 0 && (
                  <div className="flex-shrink-0 ml-2">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                      {chatroom.messageCount}
                    </span>
                  </div>
                )}

                {/* Dropdown Menu */}
                {activeDropdown === chatroom.id && (
                  <div className="absolute right-2 top-12 z-10 w-32 bg-popover border border-border rounded-md shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChatroom(chatroom.id, chatroom.title);
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            {effectiveSearchQuery ? (
              <>
                <Search className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No chats found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms
                </p>
                <button
                  onClick={() => onSearchChange('')}
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No chats yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a new conversation with Gemini
                </p>
                <button
                  onClick={onCreateChatroom}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
