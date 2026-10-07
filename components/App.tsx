'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { AppErrorBoundary } from './ErrorBoundary';
import { AuthPage } from './auth/AuthPage';
import { Dashboard } from './dashboard/Dashboard';
import { ToastContainer } from './ui/Toast';
import { FullPageLoader } from './ui/LoadingSkeleton';

export function App() {
  const { user, isLoading: authLoading } = useAuthStore();
  const { theme } = useUIStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize app and check authentication state
  useEffect(() => {
    const initializeApp = async () => {
      // Simulate app initialization delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsInitializing(false);
    };

    initializeApp();
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Add keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '/':
            e.preventDefault();
            // Focus search input if available
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
          case 'n':
            e.preventDefault();
            // Trigger new chat creation
            const newChatButton = document.querySelector('[title="New Chat"]') as HTMLButtonElement;
            if (newChatButton) {
              newChatButton.click();
            }
            break;
        }
      }

      // Escape key handling
      if (e.key === 'Escape') {
        // Close any open modals or dropdowns
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading screen during initialization
  if (isInitializing || authLoading) {
    return <FullPageLoader />;
  }

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Main App Content */}
        {user?.isAuthenticated ? (
          <Dashboard />
        ) : (
          <AuthPage />
        )}

        {/* Toast Notifications */}
        <ToastContainer />

        {/* Accessibility Announcements */}
        <div
          id="accessibility-announcements"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />
      </div>
    </AppErrorBoundary>
  );
}
