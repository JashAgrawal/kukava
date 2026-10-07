import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { ChatInput } from '../ChatInput';
import { renderWithStore } from '@/test-utils/render';

describe('ChatInput rendering', () => {
  const onSendMessage = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the placeholder and both buttons', () => {
    renderChatInput();

    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByTitle('Attach image (or drag & drop)')).toBeInTheDocument();
    expect(screen.getByTitle('Enter a message to send')).toBeInTheDocument();
  });

  it('renders a custom placeholder', () => {
    renderChatInput({ placeholder: 'Say something' });

    expect(screen.getByPlaceholderText('Say something')).toBeInTheDocument();
  });

  it('starts with the send button disabled', () => {
    renderChatInput();

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('describes the textarea by the character counter', () => {
    renderChatInput();

    expect(screen.getByPlaceholderText('Type your message...')).toHaveAttribute(
      'aria-describedby',
      'char-count'
    );
  });

  it('disables the textarea when disabled', () => {
    renderChatInput({ disabled: true });

    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
  });

  it('disables the attach button when disabled', () => {
    renderChatInput({ disabled: true });

    expect(screen.getByTitle('Attach image (or drag & drop)')).toBeDisabled();
  });
});

describe('ChatInput character counter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('counts from zero', () => {
    renderChatInput();

    expect(screen.getByText('0/1000')).toBeInTheDocument();
  });

  it('counts typed characters', async () => {
    const user = userEvent.setup();
    renderChatInput();

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Hello');

    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('reflects a custom maxLength', () => {
    renderChatInput({ maxLength: 40 });

    expect(screen.getByText('0/40')).toBeInTheDocument();
  });

  it('refuses input past the maxLength', async () => {
    const user = userEvent.setup();
    renderChatInput({ maxLength: 5 });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'abcdefghij');

    expect(textarea).toHaveValue('abcde');
  });
});

describe('ChatInput send button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('enables once text is entered', async () => {
    const user = userEvent.setup();
    renderChatInput();

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Hello');

    expect(sendButton).toBeEnabled();
  });

  it('stays disabled for whitespace-only input', async () => {
    const user = userEvent.setup();
    renderChatInput();

    await user.type(screen.getByPlaceholderText('Type your message...'), '    ');

    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('stays disabled when disabled even with text', async () => {
    const user = userEvent.setup();
    renderChatInput({ disabled: true });

    // The textarea itself is disabled, so nothing can be typed.
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled();
  });

  it('changes its title once the message is submittable', async () => {
    const user = userEvent.setup();
    renderChatInput();

    expect(screen.getByTitle('Enter a message to send')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Hi');

    expect(screen.getByTitle('Send message (Enter)')).toBeInTheDocument();
  });
});

describe('ChatInput sending', () => {
  let onSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSendMessage = vi.fn().mockResolvedValue(undefined);
  });

  it('does not send an empty message', async () => {
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('sends the trimmed message on click', async () => {
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, '  Hello world  ');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith({
        content: 'Hello world',
        image: undefined,
      });
    });
  });

  it('sends the message on Enter', async () => {
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Hello world');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith({
        content: 'Hello world',
        image: undefined,
      });
    });
  });

  it('inserts a newline on Shift+Enter instead of sending', async () => {
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');

    expect(textarea).toHaveValue('Line 1\nLine 2');
    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('clears the textarea after a successful send', async () => {
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Hello');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('confirms with a success toast', async () => {
    const user = userEvent.setup();
    const { showToast } = renderChatInput({ onSendMessage });

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Hello');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'success',
        message: 'Message sent successfully',
        duration: 2000,
      });
    });
  });

  it('restores the draft when sending fails', async () => {
    const user = userEvent.setup();
    onSendMessage.mockRejectedValueOnce(new Error('offline'));
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Draft message');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(textarea).toHaveValue('Draft message'));
  });

  it('reports the failure with an error toast', async () => {
    const user = userEvent.setup();
    onSendMessage.mockRejectedValueOnce(new Error('offline'));
    const { showToast } = renderChatInput({ onSendMessage });

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Draft');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'offline',
      });
    });
  });

  it('falls back to a generic message for a non-Error rejection', async () => {
    const user = userEvent.setup();
    onSendMessage.mockRejectedValueOnce('string rejection');
    const { showToast } = renderChatInput({ onSendMessage });

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Draft');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to send message',
      });
    });
  });

  it('shows a spinner while the message is in flight', async () => {
    const user = userEvent.setup();
    let release: (() => void) | undefined;
    onSendMessage.mockReturnValue(
      new Promise<void>(resolve => {
        release = resolve;
      })
    );
    renderChatInput({ onSendMessage });

    await user.type(screen.getByPlaceholderText('Type your message...'), 'Slow');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
    });

    release!();
  });

  it('rejects content that fails validation', async () => {
    const user = userEvent.setup();
    const { showToast } = renderChatInput({ onSendMessage });

    await user.type(screen.getByPlaceholderText('Type your message...'), '<script>x</script>');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Message contains invalid content',
      });
    });
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});

describe('ChatInput image handling', () => {
  let onSendMessage: ReturnType<typeof vi.fn>;

  const buildImage = (name = 'test.png', type = 'image/png', size = 2048) => {
    const file = new File(['x'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  beforeEach(() => {
    onSendMessage = vi.fn().mockResolvedValue(undefined);
  });

  it('shows a preview and filename for an accepted image', async () => {
    const { user, fileInput } = renderChatInput({ onSendMessage });

    await user.upload(fileInput, buildImage());

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
    expect(screen.getByText(/test\.png/)).toBeInTheDocument();
  });

  it('enables sending for an image-only message', async () => {
    const { user, fileInput } = renderChatInput({ onSendMessage });

    await user.upload(fileInput, buildImage());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
    });
  });

  it('rejects a disallowed mime type with a toast', async () => {
    const { fileInput, showToast } = renderChatInput({ onSendMessage });

    // The input's `accept` attribute makes userEvent skip this file, so the
    // change is dispatched directly to prove the component validates too.
    attachFiles(fileInput, buildImage('notes.txt', 'text/plain'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Only JPEG, PNG, GIF, and WebP images are allowed',
      });
    });
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
  });

  it('rejects a file over 5MB with a toast', async () => {
    const { user, fileInput, showToast } = renderChatInput({ onSendMessage });

    await user.upload(fileInput, buildImage('big.png', 'image/png', 6 * 1024 * 1024));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Image size must be less than 5MB',
      });
    });
  });

  it('removes the image with the remove button', async () => {
    const { user, fileInput } = renderChatInput({ onSendMessage });

    await user.upload(fileInput, buildImage());
    await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());

    await user.click(screen.getByTitle('Remove image'));

    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
  });

  it('removes the image on Escape', async () => {
    const { user, fileInput } = renderChatInput({ onSendMessage });

    await user.upload(fileInput, buildImage());
    await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Type your message...'), 'text{Escape}');

    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
  });

  it('sends the image alongside the text', async () => {
    const { user, fileInput } = renderChatInput({ onSendMessage });
    const image = buildImage();

    await user.upload(fileInput, image);
    await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText('Type your message...'), 'caption');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith({
        content: 'caption',
        image,
      });
    });
  });

  it('clears the image after sending', async () => {
    const { user, fileInput } = renderChatInput({ onSendMessage });

    await user.upload(fileInput, buildImage());
    await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.click(textarea);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
  });

  it('accepts an image dropped onto the container', async () => {
    const { fireDrop, showToast } = renderChatInput({ onSendMessage });

    fireDrop(buildImage());

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
    expect(showToast).not.toHaveBeenCalled();
  });

  it('rejects a dropped non-image file', async () => {
    const { fireDrop, showToast } = renderChatInput({ onSendMessage });

    fireDrop(buildImage('notes.txt', 'text/plain'));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        type: 'error',
        message: 'Please drop an image file',
      });
    });
  });

  it('shows the drag overlay while dragging over the container', async () => {
    const { container } = renderChatInput({ onSendMessage });

    fireEvent.dragEnter(container, { dataTransfer: makeDataTransfer() });

    await waitFor(() => {
      expect(screen.getByText('Drop image here')).toBeInTheDocument();
    });
  });

  it('hides the drag overlay once the pointer leaves the container', async () => {
    const { container } = renderChatInput({ onSendMessage });
    // handleDragLeave only clears the overlay when the pointer is outside the
    // container bounds, and jsdom reports a zero-sized rect by default.
    container.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 100, bottom: 100 }) as DOMRect;

    fireEvent.dragEnter(container, { dataTransfer: makeDataTransfer() });
    await waitFor(() => expect(screen.getByText('Drop image here')).toBeInTheDocument());

    fireEvent.dragLeave(container, {
      dataTransfer: makeDataTransfer(),
      clientX: 500,
      clientY: 500,
    });

    await waitFor(() => {
      expect(screen.queryByText('Drop image here')).not.toBeInTheDocument();
    });
  });

  it('keeps the drag overlay when the pointer stays inside the container', async () => {
    const { container } = renderChatInput({ onSendMessage });
    container.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 100, bottom: 100 }) as DOMRect;

    fireEvent.dragEnter(container, { dataTransfer: makeDataTransfer() });
    await waitFor(() => expect(screen.getByText('Drop image here')).toBeInTheDocument());

    fireEvent.dragLeave(container, {
      dataTransfer: makeDataTransfer(),
      clientX: 50,
      clientY: 50,
    });

    expect(screen.getByText('Drop image here')).toBeInTheDocument();
  });

  it('ignores drops while the input is disabled', async () => {
    const { fireDrop, showToast } = renderChatInput({ onSendMessage, disabled: true });

    fireDrop(buildImage());

    await waitFor(() => {
      expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('ChatInput IME composition', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not send on Enter while composing', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'ni');
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter' });
    fireEvent.compositionEnd(textarea);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it('sends on Enter after composition ends', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderChatInput({ onSendMessage });

    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, '你好');
    fireEvent.compositionStart(textarea);
    fireEvent.compositionEnd(textarea);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith({
        content: '你好',
        image: undefined,
      });
    });
  });
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function renderChatInput(props: Partial<ComponentProps<typeof ChatInput>> = {}) {
  const result = renderWithStore(
    <ChatInput onSendMessage={vi.fn().mockResolvedValue(undefined)} {...props} />
  );
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  const container = fileInput.closest('form')!.parentElement!;

  return {
    ...result,
    user: userEvent.setup(),
    fileInput,
    container,
    fireDrop: (file: File) =>
      fireEvent.drop(container, { dataTransfer: makeDataTransfer(file) }),
  };
}

function makeDataTransfer(file?: File) {
  return {
    files: file ? [file] : [],
    items: [],
    types: ['Files'],
  };
}

/** Bypasses the input's `accept` filtering to exercise the change handler. */
function attachFiles(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}