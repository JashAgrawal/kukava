import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { useUIStore } from '@/stores/uiStore';
import { ChatroomList } from '../ChatroomList';
import type { Chatroom } from '@/types';

function makeChatroom(overrides: Partial<Chatroom> = {}): Chatroom {
  return {
    id: 'chatroom_1',
    title: 'React Patterns',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date(),
    messageCount: 3,
    ...overrides,
  };
}

function renderList(props: Partial<React.ComponentProps<typeof ChatroomList>> = {}) {
  const handlers = {
    onSelectChatroom: vi.fn(),
    onDeleteChatroom: vi.fn().mockResolvedValue(undefined),
    onCreateChatroom: vi.fn(),
    onSearchChange: vi.fn(),
    searchQuery: '',
    ...props,
  };
  const result = renderWithStore(
    <ChatroomList chatrooms={[]} {...handlers} />
  );
  return { ...result, ...handlers };
}

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ toasts: [] });
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('ChatroomList rendering', () => {
  it('shows the header and search box', () => {
    renderList();

    expect(screen.getByText('Chats')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search chats...')).toBeInTheDocument();
  });

  it('lists every chatroom', () => {
    renderList({
      chatrooms: [makeChatroom({ id: 'a', title: 'Alpha' }), makeChatroom({ id: 'b', title: 'Beta' })],
    });

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows the message count badge', () => {
    renderList({ chatrooms: [makeChatroom({ messageCount: 12 })] });

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('omits the badge for an empty chatroom', () => {
    renderList({ chatrooms: [makeChatroom({ messageCount: 0 })] });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows a placeholder for a chatroom with no messages', () => {
    renderList({ chatrooms: [makeChatroom({ lastMessage: undefined })] });

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('prefers an image label over message text', () => {
    renderList({
      chatrooms: [
        makeChatroom({
          lastMessage: {
            id: 'm',
            content: 'ignored text',
            type: 'image',
            sender: 'user',
            timestamp: new Date(),
            chatroomId: 'chatroom_1',
          },
        }),
      ],
    });

    expect(screen.getByText('📷 Image')).toBeInTheDocument();
    expect(screen.queryByText('ignored text')).not.toBeInTheDocument();
  });

  it('prefixes AI messages with the assistant name', () => {
    renderList({
      chatrooms: [
        makeChatroom({
          lastMessage: {
            id: 'm',
            content: 'Here is an answer',
            type: 'text',
            sender: 'ai',
            timestamp: new Date(),
            chatroomId: 'chatroom_1',
          },
        }),
      ],
    });

    expect(screen.getByText('Gemini:')).toBeInTheDocument();
  });

  it('truncates a long preview', () => {
    renderList({
      chatrooms: [
        makeChatroom({
          lastMessage: {
            id: 'm',
            content: 'x'.repeat(80),
            type: 'text',
            sender: 'user',
            timestamp: new Date(),
            chatroomId: 'chatroom_1',
          },
        }),
      ],
    });

    expect(screen.getByText(`${'x'.repeat(47)}...`)).toBeInTheDocument();
  });

  it('shows skeletons while loading', () => {
    const { container } = renderList({ chatrooms: [makeChatroom()], isLoading: true });

    expect(screen.queryByText('React Patterns')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows the empty state with no chatrooms', () => {
    renderList({ chatrooms: [] });

    expect(screen.getByText('No chats yet')).toBeInTheDocument();
    expect(screen.getByText('Start a new conversation with Gemini')).toBeInTheDocument();
  });
});

describe('ChatroomList search', () => {
  const chatrooms = [
    makeChatroom({ id: 'a', title: 'React Patterns' }),
    makeChatroom({
      id: 'b',
      title: 'Rust Ownership',
      lastMessage: {
        id: 'm',
        content: 'Borrow checker deep dive',
        type: 'text',
        sender: 'user',
        timestamp: new Date(),
        chatroomId: 'b',
      },
    }),
  ];

  it('reports typed queries', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    // The input is controlled by searchQuery, so drive it with real state the
    // way Dashboard does instead of leaving it pinned to a fixed prop.
    function Harness() {
      const [query, setQuery] = useState('');
      return (
        <ChatroomList
          chatrooms={chatrooms}
          searchQuery={query}
          onSearchChange={next => {
            onSearchChange(next);
            setQuery(next);
          }}
          onSelectChatroom={vi.fn()}
          onDeleteChatroom={vi.fn()}
          onCreateChatroom={vi.fn()}
        />
      );
    }

    renderWithStore(<Harness />);

    await user.type(screen.getByPlaceholderText('Search chats...'), 're');

    expect(onSearchChange).toHaveBeenNthCalledWith(1, 'r');
    expect(onSearchChange).toHaveBeenNthCalledWith(2, 're');
    expect(screen.getByPlaceholderText('Search chats...')).toHaveValue('re');
    expect(screen.getByText('React Patterns')).toBeInTheDocument();
    expect(screen.queryByText('Rust Ownership')).not.toBeInTheDocument();
  });

  it('filters by title', () => {
    renderList({ chatrooms, searchQuery: 'react' });

    expect(screen.getByText('React Patterns')).toBeInTheDocument();
    expect(screen.queryByText('Rust Ownership')).not.toBeInTheDocument();
  });

  it('filters by last message content', () => {
    renderList({ chatrooms, searchQuery: 'borrow checker' });

    expect(screen.getByText('Rust Ownership')).toBeInTheDocument();
    expect(screen.queryByText('React Patterns')).not.toBeInTheDocument();
  });

  it('matches case insensitively', () => {
    renderList({ chatrooms, searchQuery: 'RUST' });

    expect(screen.getByText('Rust Ownership')).toBeInTheDocument();
  });

  it('ignores a whitespace-only query', () => {
    renderList({ chatrooms, searchQuery: '   ' });

    expect(screen.getByText('React Patterns')).toBeInTheDocument();
    expect(screen.getByText('Rust Ownership')).toBeInTheDocument();
  });

  it('shows the no-results state with a clear action', async () => {
    const user = userEvent.setup();
    const { onSearchChange } = renderList({ chatrooms, searchQuery: 'kubernetes' });

    expect(screen.getByText('No chats found')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear search/i }));

    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});

describe('ChatroomList actions', () => {
  it('selects a chatroom when its row is clicked', async () => {
    const user = userEvent.setup();
    const chatroom = makeChatroom({ title: 'Clickable' });
    const { onSelectChatroom } = renderList({ chatrooms: [chatroom] });

    await user.click(screen.getByText('Clickable'));

    expect(onSelectChatroom).toHaveBeenCalledWith(chatroom);
  });

  it('opens the create chat dialog', async () => {
    const user = userEvent.setup();
    const { onCreateChatroom } = renderList({ chatrooms: [makeChatroom()] });

    await user.click(screen.getByTitle('New Chat'));

    expect(onCreateChatroom).toHaveBeenCalled();
  });

  it('starts a chat from the empty state', async () => {
    const user = userEvent.setup();
    const { onCreateChatroom } = renderList({ chatrooms: [] });

    const emptyState = screen.getByText('No chats yet').closest('div')!;
    await user.click(within(emptyState).getByRole('button'));

    expect(onCreateChatroom).toHaveBeenCalled();
  });

  it('marks the active chatroom', () => {
    const { container } = renderList({
      chatrooms: [makeChatroom({ id: 'a' })],
      currentChatroomId: 'a',
    });

    expect(container.querySelector('.bg-primary\\/10')).toBeInTheDocument();
  });
});

describe('ChatroomList deletion', () => {
  it('asks for confirmation before deleting', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onDeleteChatroom } = renderList({ chatrooms: [makeChatroom({ title: 'Doomed' })] });

    await user.click(screen.getAllByRole('button')[1]);
    await user.click(screen.getByText('Delete'));

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete "Doomed"?');
    expect(onDeleteChatroom).not.toHaveBeenCalled();
  });

  it('deletes when confirmed and reports success', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onDeleteChatroom, showToast } = renderList({ chatrooms: [makeChatroom()] });

    await user.click(screen.getAllByRole('button')[1]);
    await user.click(screen.getByText('Delete'));

    await waitFor(() => expect(onDeleteChatroom).toHaveBeenCalledWith('chatroom_1'));
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Chatroom deleted successfully',
      });
    });
  });

  it('reports a deletion failure', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDeleteChatroom = vi.fn().mockRejectedValue(new Error('nope'));
    const { showToast } = renderList({ chatrooms: [makeChatroom()], onDeleteChatroom });

    await user.click(screen.getAllByRole('button')[1]);
    await user.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to delete chatroom',
      });
    });
  });

  it('does not select the chatroom when its menu button is pressed', async () => {
    const user = userEvent.setup();
    const { onSelectChatroom } = renderList({ chatrooms: [makeChatroom()] });

    await user.click(screen.getAllByRole('button')[1]);

    expect(onSelectChatroom).not.toHaveBeenCalled();
  });

  it('does not select the chatroom when delete is pressed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onSelectChatroom } = renderList({ chatrooms: [makeChatroom()] });

    await user.click(screen.getAllByRole('button')[1]);
    await user.click(screen.getByText('Delete'));

    expect(onSelectChatroom).not.toHaveBeenCalled();
  });

  it('opens the menu for the pressed chatroom only', async () => {
    const user = userEvent.setup();
    renderList({
      chatrooms: [makeChatroom({ id: 'a', title: 'Alpha' }), makeChatroom({ id: 'b', title: 'Beta' })],
    });

    const [firstRow] = screen
      .getAllByText(/Alpha|Beta/)
      .map(node => node.closest<HTMLElement>('div.relative')!);
    await user.click(within(firstRow).getByRole('button'));

    expect(screen.getAllByText('Delete')).toHaveLength(1);
  });
});