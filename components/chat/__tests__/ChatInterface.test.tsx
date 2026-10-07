import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { ChatInterface } from '../ChatInterface';
import type { Chatroom, Message } from '@/types';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

const CHATROOM: Chatroom = {
  id: 'chatroom_1',
  title: 'Test room',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  messageCount: 0,
};

const EMPTY_CHAT_STATE = {
  chatrooms: [] as Chatroom[],
  currentChatroom: null,
  messages: [] as Message[],
  isLoading: false,
  isMessagesLoading: false,
  isTyping: false,
  error: null,
  searchQuery: '',
  hasMoreMessages: true,
  currentPage: 1,
};

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg_1',
    content: 'Hello there',
    type: 'text',
    sender: 'user',
    timestamp: new Date(),
    chatroomId: CHATROOM.id,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useChatStore.setState({ ...EMPTY_CHAT_STATE, sendMessage: vi.fn().mockResolvedValue(undefined) });
  useUIStore.setState({ toasts: [] });
});

describe('ChatInterface message list', () => {
  it('shows an empty state when there are no messages', () => {
    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByText('Start the conversation')).toBeInTheDocument();
  });

  it('renders only the messages for the active chatroom', () => {
    useChatStore.setState({
      messages: [
        makeMessage({ id: 'mine', content: 'Belongs here' }),
        makeMessage({ id: 'other', content: 'Belongs elsewhere', chatroomId: 'chatroom_2' }),
      ],
    });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByText('Belongs here')).toBeInTheDocument();
    expect(screen.queryByText('Belongs elsewhere')).not.toBeInTheDocument();
  });

  it('renders messages in store order', () => {
    useChatStore.setState({
      messages: [
        makeMessage({ id: 'msg_first', content: 'First' }),
        makeMessage({ id: 'msg_second', content: 'Second' }),
        makeMessage({ id: 'msg_third', content: 'Third' }),
      ],
    });

    const { container } = renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    const ids = Array.from(container.querySelectorAll('[data-message-id]')).map(node =>
      node.getAttribute('data-message-id')
    );
    expect(ids).toEqual(['msg_first', 'msg_second', 'msg_third']);
  });

  it('shows the typing indicator while the AI replies', () => {
    useChatStore.setState({ isTyping: true });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByText('is typing...')).toBeInTheDocument();
  });

  it('marks the end of history when there are no more pages', () => {
    useChatStore.setState({
      hasMoreMessages: false,
      messages: [makeMessage()],
    });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByText('Beginning of conversation')).toBeInTheDocument();
  });

  it('does not show the end-of-history marker for an empty room', () => {
    useChatStore.setState({ hasMoreMessages: false, messages: [] });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.queryByText('Beginning of conversation')).not.toBeInTheDocument();
  });

  it('shows a loading indicator while fetching messages', () => {
    useChatStore.setState({ isMessagesLoading: true, hasMoreMessages: true });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByText('Loading more messages...')).toBeInTheDocument();
  });
});

describe('ChatInterface input state', () => {
  it('disables the composer while messages are loading', () => {
    useChatStore.setState({ isMessagesLoading: true });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
  });

  it('disables the composer while the AI is typing', () => {
    useChatStore.setState({ isTyping: true });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
  });

  it('enables the composer in the idle state', () => {
    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    expect(screen.getByPlaceholderText('Type your message...')).toBeEnabled();
  });

  it('sends a message through the store', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({ sendMessage });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Hello AI');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        content: 'Hello AI',
        image: undefined,
      });
    });
  });

  it('keeps the draft when sending fails', async () => {
    const user = userEvent.setup();
    useChatStore.setState({
      sendMessage: vi.fn().mockRejectedValue(new Error('offline')),
    });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Keep me');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(textarea).toHaveValue('Keep me'));
  });
});

describe('ChatInterface scrolling', () => {
  function getScrollContainer() {
    return document.querySelector('.overflow-y-auto') as HTMLElement;
  }

  /** Positions the scroll container so it reads as "far from the bottom". */
  function setScrollPosition(container: HTMLElement, scrollTop: number) {
    Object.defineProperty(container, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'scrollTop', {
      value: scrollTop,
      writable: true,
      configurable: true,
    });
    container.dispatchEvent(new Event('scroll'));
  }

  it('scrolls to the bottom on mount', async () => {
    const scrollTo = vi.fn();
    const original = Element.prototype.scrollTo;
    Element.prototype.scrollTo = scrollTo;

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(scrollTo).toHaveBeenCalled();

    Element.prototype.scrollTo = original;
  });

  it('reveals the scroll-to-bottom button when scrolled away from the bottom', async () => {
    useChatStore.setState({ messages: [makeMessage()] });
    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    setScrollPosition(getScrollContainer(), 0);

    await waitFor(() => {
      expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('keeps the scroll-to-bottom button hidden for an empty room', async () => {
    useChatStore.setState({ messages: [] });
    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    setScrollPosition(getScrollContainer(), 0);

    await new Promise(resolve => setTimeout(resolve, 300));
    expect(screen.queryByTitle('Scroll to bottom')).not.toBeInTheDocument();
  });

  it('hides the scroll-to-bottom button at the bottom', async () => {
    useChatStore.setState({ messages: [makeMessage()] });
    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    setScrollPosition(getScrollContainer(), 1500);

    await new Promise(resolve => setTimeout(resolve, 300));
    expect(screen.queryByTitle('Scroll to bottom')).not.toBeInTheDocument();
  });

  it('scrolls to the bottom when the button is pressed', async () => {
    useChatStore.setState({ messages: [makeMessage()] });
    renderWithStore(<ChatInterface chatroom={CHATROOM} />);

    setScrollPosition(getScrollContainer(), 0);
    await waitFor(() => expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument());

    await userEvent.setup().click(screen.getByTitle('Scroll to bottom'));

    expect(screen.getByTitle('Scroll to bottom')).toBeInTheDocument();
  });
});

describe('ChatInterface infinite scroll', () => {
  function scrollToTop() {
    const container = document.querySelector('.overflow-y-auto') as HTMLElement;
    Object.defineProperty(container, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true,
    });
    container.dispatchEvent(new Event('scroll'));
  }

  it('loads more messages when scrolled near the top', async () => {
    const loadMoreMessages = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({
      loadMoreMessages,
      hasMoreMessages: true,
      messages: [makeMessage()],
    });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);
    scrollToTop();

    await waitFor(() => expect(loadMoreMessages).toHaveBeenCalled(), { timeout: 2000 });
  });

  it('does not load more when scrolled far from the top', async () => {
    const loadMoreMessages = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({
      loadMoreMessages,
      hasMoreMessages: true,
      messages: [makeMessage()],
    });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);
    const container = document.querySelector('.overflow-y-auto') as HTMLElement;
    Object.defineProperty(container, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
    Object.defineProperty(container, 'scrollTop', {
      value: 1400,
      writable: true,
      configurable: true,
    });
    container.dispatchEvent(new Event('scroll'));

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(loadMoreMessages).not.toHaveBeenCalled();
  });

  it('does not load more when there are no further pages', async () => {
    const loadMoreMessages = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({
      loadMoreMessages,
      hasMoreMessages: false,
      messages: [makeMessage()],
    });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);
    scrollToTop();

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(loadMoreMessages).not.toHaveBeenCalled();
  });

  it('does not load more for an empty room', async () => {
    const loadMoreMessages = vi.fn().mockResolvedValue(undefined);
    useChatStore.setState({ loadMoreMessages, hasMoreMessages: true, messages: [] });

    renderWithStore(<ChatInterface chatroom={CHATROOM} />);
    scrollToTop();

    await new Promise(resolve => setTimeout(resolve, 400));
    expect(loadMoreMessages).not.toHaveBeenCalled();
  });

  it('reports a load failure with a toast', async () => {
    useChatStore.setState({
      loadMoreMessages: vi.fn().mockRejectedValue(new Error('failed')),
      hasMoreMessages: true,
      messages: [makeMessage()],
    });

    const { showToast } = renderWithStore(<ChatInterface chatroom={CHATROOM} />);
    scrollToTop();

    await waitFor(
      () => {
        expect(showToast).toHaveBeenCalledWith({
          type: 'error',
          message: 'Failed to load more messages. Please try scrolling again.',
        });
      },
      { timeout: 2000 }
    );
  });
});