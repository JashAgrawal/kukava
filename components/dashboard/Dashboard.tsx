'use client';

import { useState, useEffect } from 'react';
import { Menu, Sun, Moon, LogOut, User } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { ChatroomList } from './ChatroomList';
import { CreateChatroomModal } from './CreateChatroomModal';
import { ChatInterface } from '../chat/ChatInterface';
import { CreateChatroomFormData } from '@/lib/validations';
import { cn } from '@/lib/utils';

export function Dashboard() {
  const {
    chatrooms,
    currentChatroom,
    searchQuery,
    isLoading,
    createChatroom,
    deleteChatroom,
    selectChatroom,
    setSearchQuery,
    initializeSampleData,
  } = useChatStore();

  const { user, logout } = useAuthStore();
  const { theme, sidebarOpen, toggleTheme, toggleSidebar, showToast } = useUIStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize sample data on mount
  useEffect(() => {
    initializeSampleData();
  }, [initializeSampleData]);

  // Immediate search function for better UX
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateChatroom = async (data: CreateChatroomFormData) => {
    try {
      await createChatroom(data);
      showToast({
        type: 'success',
        message: 'Chat created successfully!',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Failed to create chat',
      });
      throw error;
    }
  };

  const handleDeleteChatroom = async (chatroomId: string) => {
    try {
      await deleteChatroom(chatroomId);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      showToast({
        type: 'info',
        message: 'Logged out successfully',
      });
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "flex-shrink-0 transition-all duration-300 ease-in-out",
        sidebarOpen ? "w-80" : "w-0",
        isMobile && sidebarOpen && "absolute inset-y-0 left-0 z-40 w-80"
      )}>
        <div className="h-full overflow-hidden">
          <ChatroomList
            chatrooms={chatrooms}
            currentChatroomId={currentChatroom?.id}
            onSelectChatroom={selectChatroom}
            onDeleteChatroom={handleDeleteChatroom}
            onCreateChatroom={() => setIsCreateModalOpen(true)}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                aria-expanded={sidebarOpen}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>

              {currentChatroom ? (
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    {currentChatroom.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Chat with Gemini AI
                  </p>
                </div>
              ) : (
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    Gemini Chat
                  </h1>
                  <p className="max-md:hidden md:text-sm text-muted-foreground">
                    Select a chat to start messaging
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-2 px-2 md:px-3 py-1 md:py-2 bg-muted rounded-md">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs md:text-sm text-foreground whitespace-nowrap overflow-hidden overflow-ellipsis">
                  {user?.countryCode} {user?.phoneNumber}
                </span>
                <button
                  onClick={handleLogout}
                  aria-label="Log out"
                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {currentChatroom ? (
            <ChatInterface chatroom={currentChatroom} />
          ) : (
            <div className="flex items-center justify-center h-full bg-card">
              <div className="text-center max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Menu className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Welcome to Gemini Chat
                </h2>
                <p className="text-muted-foreground mb-6">
                  Select an existing chat from the sidebar or create a new one to start
                  your conversation with Gemini AI.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chatroom Modal */}
      <CreateChatroomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateChatroom}
        isLoading={isLoading}
      />
    </div>
  );
}
