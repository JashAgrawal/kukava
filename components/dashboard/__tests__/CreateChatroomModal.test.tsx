import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '@/test-utils/render';
import { CreateChatroomModal } from '../CreateChatroomModal';

function renderModal(props: Partial<React.ComponentProps<typeof CreateChatroomModal>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const result = renderWithStore(
    <CreateChatroomModal isOpen onClose={onClose} onSubmit={onSubmit} {...props} />
  );
  return { ...result, onClose, onSubmit };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('CreateChatroomModal visibility', () => {
  it('renders nothing when closed', () => {
    const { container } = renderModal({ isOpen: false });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the dialog when open', () => {
    renderModal();

    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter a title for your chat...')).toBeInTheDocument();
  });

  it('focuses the title input on open', () => {
    renderModal();

    expect(screen.getByPlaceholderText('Enter a title for your chat...')).toHaveFocus();
  });
});

describe('CreateChatroomModal validation', () => {
  it('disables submit while the title is empty', () => {
    renderModal();

    expect(screen.getByRole('button', { name: /create chat/i })).toBeDisabled();
  });

  it('disables submit for a whitespace-only title', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), '   ');

    expect(screen.getByRole('button', { name: /create chat/i })).toBeDisabled();
  });

  it('enables submit for a valid title', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'My chat');

    expect(screen.getByRole('button', { name: /create chat/i })).toBeEnabled();
  });

  it('disables submit for a title over 50 characters', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'a'.repeat(51));

    expect(screen.getByRole('button', { name: /create chat/i })).toBeDisabled();
  });

  it('accepts a title of exactly 50 characters', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'a'.repeat(50));

    expect(screen.getByRole('button', { name: /create chat/i })).toBeEnabled();
  });

  it('shows a required error only after blur', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByPlaceholderText('Enter a title for your chat...');

    await user.click(input);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Chat title is required')).toBeInTheDocument();
    });
  });

  it('shows a length error after blur', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByPlaceholderText('Enter a title for your chat...');

    await user.click(input);
    await user.keyboard('a'.repeat(51));
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Chat title must be at most 50 characters')).toBeInTheDocument();
    });
  });

  it('clears the error as the title is corrected', async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByPlaceholderText('Enter a title for your chat...');

    await user.click(input);
    await user.tab();
    await waitFor(() => expect(screen.getByText('Chat title is required')).toBeInTheDocument());

    await user.type(input, 'Fixed');

    await waitFor(() => {
      expect(screen.queryByText('Chat title is required')).not.toBeInTheDocument();
    });
  });

  it('marks the input as invalid when there is an error', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByPlaceholderText('Enter a title for your chat...'));
    await user.tab();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter a title for your chat...')).toHaveClass(
        'border-destructive'
      );
    });
  });
});

describe('CreateChatroomModal submission', () => {
  it('submits the trimmed title', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), '  Padded  ');
    await user.click(screen.getByRole('button', { name: /create chat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ title: 'Padded' }));
  });

  it('closes after a successful submit', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'Done');
    await user.click(screen.getByRole('button', { name: /create chat/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('stays open when the submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('server error'));
    const { onClose } = renderModal({ onSubmit });

    await user.type(screen.getByPlaceholderText('Enter a title for your chat...'), 'Done');
    await user.click(screen.getByRole('button', { name: /create chat/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('shows a creating label and disables the controls while submitting', () => {
    renderModal({ isLoading: true });

    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    expect(screen.getByPlaceholderText('Enter a title for your chat...')).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
  });
});

describe('CreateChatroomModal dismissal', () => {
  it('closes on Cancel', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('closes on a backdrop mousedown', () => {
    const { onClose, container } = renderModal();

    const backdrop = container.querySelector('.bg-black\\/50')!;
    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when mousedown lands inside the dialog', () => {
    const { onClose } = renderModal();

    screen.getByText('New Chat').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes via the header close button', async () => {
    const { onClose, container } = renderModal();

    const closeButton = container.querySelectorAll('header button, .p-6.border-b button')[0];
    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('resets the title when reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();

    const input = screen.getByPlaceholderText('Enter a title for your chat...');
    await user.type(input, 'Draft');
    rerender(<CreateChatroomModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<CreateChatroomModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter a title for your chat...')).toHaveValue('');
  });

  it('does not register a backdrop listener while closed', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    renderModal({ isOpen: false });

    expect(addSpy).not.toHaveBeenCalledWith('mousedown', expect.anything());
  });
});

describe('CreateChatroomModal accessibility', () => {
  it('labels the title input', () => {
    renderModal();

    expect(screen.getByLabelText('Chat Title')).toBe(
      screen.getByPlaceholderText('Enter a title for your chat...')
    );
  });

  it('shows the tip copy', () => {
    renderModal();

    expect(screen.getByText(/Give your chat a descriptive title/)).toBeInTheDocument();
  });
});