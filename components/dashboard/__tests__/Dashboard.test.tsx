import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { Dashboard } from '../Dashboard';
import type { Chatroom, User } from '@/types';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

const CHATROOM: Chatroom = {
  id: 'chatroom_1',
  title: 'Existing room',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date(),
  messageCount: 2,
};

const USER: User = {
  id: 'user_1',
  phoneNumber: '5551234567',
  countryCode: '+1',
  isAuthenticated: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const EMPTY_CHAT_STATE = {
  chatrooms: [] as Chatroom[],
  currentChatroom: null,
  messages: [],
  isLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  error: null,
  searchQuery: '',
  hasMoreMessages: true,
  currentPage: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  useChatStore.setState({
    ...EMPTY_CHAT_STATE,
    createChatroom: vi.fn().mockResolvedValue(undefined),
    deleteChatroom: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    initializeSampleData: vi.fn(),
  });
  useAuthStore.setState({ user: USER, logout: vi.fn() });
  useUIStore.setState({ theme: 'light', sidebarOpen: true, toasts: [] });
});

describe('Dashboard layout', () => {
  it('shows the default header when no chat is selected', () => {
    renderWithStore(<Dashboard />);

    expect(screen.getByText('Gemini Chat')).toBeInTheDocument();
    expect(screen.getByText('Select a chat to start messaging')).toBeInTheDocument();
  });

  it('shows the selected chatroom in the header', () => {
    useChatStore.setState({ currentChatroom: CHATROOM, chatrooms: [CHATROOM] });

    renderWithStore(<Dashboard />);

    expect(screen.getAllByText('Existing room').length).toBeGreaterThan(0);
    expect(screen.getByText('Chat with Gemini AI')).toBeInTheDocument();
  });

  it('shows the signed-in phone number', () => {
    renderWithStore(<Dashboard />);

    expect(screen.getByText('+1 5551234567')).toBeInTheDocument();
  });

  it('renders the chat interface for the active chatroom', () => {
    useChatStore.setState({ currentChatroom: CHATROOM, chatrooms: [CHATROOM] });

    renderWithStore(<Dashboard />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('offers to start a chat when none is selected', () => {
    renderWithStore(<Dashboard />);

    expect(screen.getByRole('button', { name: /start new chat/i })).toBeInTheDocument();
  });

  it('seeds sample data on mount', () => {
    const initializeSampleData = vi.fn();
    useChatStore.setState({ initializeSampleData });

    renderWithStore(<Dashboard />);

    expect(initializeSampleData).toHaveBeenCalled();
  });
});

describe('Dashboard theme', () => {
  it('toggles the theme from the header button', async () => {
    const user = userEvent.setup();
    renderWithStore(<Dashboard />);

    expect(useUIStore.getState().theme).toBe('light');
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();

    await user.click(screen.getByTitle('Switch to dark mode'));

    await waitFor(() => expect(useUIStore.getState().theme).toBe('dark'));
  });

  it('switches back to light mode', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ theme: 'dark' });
    renderWithStore(<Dashboard />);

    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument();

    await user.click(screen.getByTitle('Switch to light mode'));

    await waitFor(() => expect(useUIStore.getState().theme).toBe('light'));
  });
});

describe('Dashboard sidebar', () => {
  it('collapses the sidebar from the menu button', async () => {
    const user = userEvent.setup();
    renderWithStore(<Dashboard />);

    const sidebar = document.querySelector('.w-80') as HTMLElement;
    expect(sidebar).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close sidebar' }));

    await waitFor(() => {
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  it('keeps the sidebar mounted when collapsed', async () => {
    const user = userEvent.setup();
    renderWithStore(<Dashboard />);

    await user.click(screen.getByRole('button', { name: 'Close sidebar' }));

    await waitFor(() => {
      expect(document.querySelector('.w-0')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Open sidebar' })).toBeInTheDocument();
  });
});

describe('Dashboard chatroom creation', () => {
  it('opens the create modal from the dashboard', async () => {
    const user = userEvent.setup();
    renderWithStore(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /start new chat/i }));

    expect(screen.getByText('Chat Title')).toBeInTheDocument();
  });

  it('opens the create modal from the sidebar button', async () => {
    const user = userEvent.setup();
    renderWithStore(<Dashboard />);

    await user.click(screen.getByTitle('New Chat'));

    expect(screen.getByPlaceholderText('Enter a title for your chat...')).toBeInTheDocument();
  });

  it('creates a chatroom and confirms with a toast', async () => {
    const user = userEvent.setup();
    const createChatroom = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({ createChatroom });
    const { showToast } = renderWithStore(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /start new chat/i }));
    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'Fresh chat');
    await user.click(screen.getByRole('button', { name: /^create chat$/i }));

    await waitFor(() => {
      expect(createChatroom).toHaveBeenCalledWith({ title: 'Fresh chat' });
    });
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Chat created successfully!',
      });
    });
  });

  it('reports a creation failure', async () => {
    const user = userEvent.setup();
    useChatStore.setState({
      createChatroom: vi.fn().mockRejectedValue(new Error('server down')),
    });
    const { showToast } = renderWithStore(<Dashboard />);

    await user.click(screen.getByRole('button', { name: /start new chat/i }));
    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'Doomed');
    await user.click(screen.getByRole('button', { name: /^create chat$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to create chat',
      });
    });
  });
});

describe('Dashboard chatroom selection', () => {
  it('selects a chatroom from the sidebar', async () => {
    const user = userEvent.setup();
    const selectChatroom = vi.fn();
    useChatStore.setState({ chatrooms: [CHATROOM], selectChatroom });

    renderWithStore(<Dashboard />);

    await user.click(screen.getAllByText('Existing room')[0]);

    expect(selectChatroom).toHaveBeenCalledWith(CHATROOM);
  });
});

describe('Dashboard logout', () => {
  it('logs out after confirmation', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    useAuthStore.setState({ logout });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { showToast } = renderWithStore(<Dashboard />);

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to log out?');
    expect(logout).toHaveBeenCalled();
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'info',
        message: 'Logged out successfully',
      });
    });
  });

  it('stays signed in when the confirmation is declined', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    useAuthStore.setState({ logout });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithStore(<Dashboard />);
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(logout).not.toHaveBeenCalled();
  });
});

describe('Dashboard search', () => {
  it('updates the store search query', async () => {
    const user = userEvent.setup();
    // Keep the real action so the controlled input accumulates its value.
    useChatStore.setState({ setSearchQuery: useChatStore.getState().setSearchQuery });

    renderWithStore(<Dashboard />);

    await user.type(screen.getByPlaceholderText('Search chats...'), 'rust');

    expect(useChatStore.getState().searchQuery).toBe('rust');
    expect(screen.getByPlaceholderText('Search chats...')).toHaveValue('rust');
  });
});