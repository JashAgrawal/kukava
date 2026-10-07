import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithStore } from '@/test-utils/render';
import { useUIStore } from '@/stores/uiStore';
import { ChatMessage } from '../ChatMessage';
import type { Message } from '@/types';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...props} />;
  },
}));

const writeText = vi.fn();

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg_1',
    content: 'Hello from the assistant',
    type: 'text',
    sender: 'ai',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    chatroomId: 'chatroom_1',
    ...overrides,
  };
}

function mockClipboard(secure = true) {
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

beforeEach(() => {
  useUIStore.setState({ toasts: [] });
  writeText.mockReset().mockResolvedValue(undefined);
});

describe('ChatMessage rendering', () => {
  it('labels an AI message as Gemini', () => {
    renderWithStore(<ChatMessage message={buildMessage()} />);

    expect(screen.getByText('Gemini')).toBeInTheDocument();
  });

  it('labels a user message as You', () => {
    renderWithStore(<ChatMessage message={buildMessage({ sender: 'user' })} />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('renders the message content', () => {
    renderWithStore(<ChatMessage message={buildMessage({ content: 'Specific text' })} />);

    expect(screen.getByText('Specific text')).toBeInTheDocument();
  });

  it('preserves newlines in the content', () => {
    renderWithStore(<ChatMessage message={buildMessage({ content: 'line one\nline two' })} />);

    expect(screen.getByText(/line one/)).toHaveClass('whitespace-pre-wrap');
  });

  it('exposes the message id for test and anchor targeting', () => {
    const { container } = renderWithStore(<ChatMessage message={buildMessage({ id: 'msg_42' })} />);

    expect(container.querySelector('[data-message-id="msg_42"]')).toBeInTheDocument();
  });

  it('shows a relative timestamp', () => {
    renderWithStore(<ChatMessage message={buildMessage()} />);

    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('renders nothing but the shell for an unknown message type', () => {
    const { container } = renderWithStore(
      <ChatMessage message={buildMessage({ type: 'video' as Message['type'] })} />
    );

    expect(container.querySelector('p')).toBeNull();
  });
});

describe('ChatMessage images', () => {
  const imageMessage = {
    ...buildMessage({ type: 'image' as const, content: 'here it is' }),
    imageBase64: 'data:image/png;base64,AAA',
  };

  it('renders the image with a base64 source', () => {
    renderWithStore(<ChatMessage message={imageMessage} />);

    expect(screen.getByAltText('Shared image')).toHaveAttribute('src', imageMessage.imageBase64);
  });

  it('falls back to imageUrl when no base64 payload is present', () => {
    renderWithStore(
      <ChatMessage
        message={buildMessage({ type: 'image' as const, imageUrl: 'https://cdn.test/a.png' })}
      />
    );

    expect(screen.getByAltText('Shared image')).toHaveAttribute('src', 'https://cdn.test/a.png');
  });

  it('shows a loading placeholder until the image loads', () => {
    renderWithStore(<ChatMessage message={imageMessage} />);

    expect(screen.getByText('Loading image...')).toBeInTheDocument();
    expect(screen.getByAltText('Shared image')).toHaveClass('opacity-0');
  });

  it('reveals the image once it loads', () => {
    renderWithStore(<ChatMessage message={imageMessage} />);

    fireEvent.load(screen.getByAltText('Shared image'));

    expect(screen.getByAltText('Shared image')).toHaveClass('opacity-100');
    expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
  });

  it('reports a failed image load', async () => {
    const { showToast } = renderWithStore(<ChatMessage message={imageMessage} />);

    fireEvent.error(screen.getByAltText('Shared image'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to load image',
      });
    });
  });

  it('omits the caption for an image with no text', () => {
    const { container } = renderWithStore(
      <ChatMessage message={buildMessage({ type: 'image' as const, content: '' })} />
    );

    expect(container.querySelector('p')).toBeNull();
  });
});

describe('ChatMessage copy', () => {
  // These use fireEvent rather than userEvent on purpose: userEvent.setup()
  // installs its own navigator.clipboard implementation, which would replace the
  // stub above and hide whether the component actually delegated to it.

  it('copies the message content on click', async () => {
    mockClipboard();
    renderWithStore(<ChatMessage message={buildMessage({ content: 'copy me' })} />);

    fireEvent.click(screen.getByTitle('Copy message'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('copy me');
    });
  });

  it('confirms with a success toast', async () => {
    mockClipboard();
    const { showToast } = renderWithStore(<ChatMessage message={buildMessage()} />);

    fireEvent.click(screen.getByTitle('Copy message'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Message copied to clipboard',
        duration: 2000,
      });
    });
  });

  it('reports a clipboard failure with an error toast', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'));
    mockClipboard();
    const { showToast } = renderWithStore(<ChatMessage message={buildMessage()} />);

    fireEvent.click(screen.getByTitle('Copy message'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to copy message',
      });
    });
  });

  it('marks the button as copied after a successful copy', async () => {
    mockClipboard();
    const { container } = renderWithStore(<ChatMessage message={buildMessage()} />);

    fireEvent.click(screen.getByTitle('Copy message'));

    await waitFor(() => {
      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });
  });

  it('works in a non-secure context via the execCommand fallback', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    vi.stubGlobal('navigator', { clipboard: undefined });
    document.execCommand = vi.fn().mockReturnValue(true);
    const { showToast } = renderWithStore(<ChatMessage message={buildMessage()} />);

    fireEvent.click(screen.getByTitle('Copy message'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Message copied to clipboard',
        duration: 2000,
      });
    });
    vi.unstubAllGlobals();
  });
});