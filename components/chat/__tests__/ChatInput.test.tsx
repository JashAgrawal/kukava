import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';
import { validateMessageFormData, validateImageFile } from '@/lib/validations';

// Mock the UI store
jest.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({
    showToast: jest.fn(),
  }),
}));

describe('ChatInput', () => {
  const mockOnSendMessage = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByTitle('Attach image (or drag & drop)')).toBeInTheDocument();
    expect(screen.getByTitle('Enter a message to send')).toBeInTheDocument();
  });

  it('enables send button when text is entered', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    expect(sendButton).toBeDisabled();
    
    await user.type(textarea, 'Hello world');
    
    expect(sendButton).toBeEnabled();
  });

  it('shows character count', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    
    await user.type(textarea, 'Hello');
    
    expect(screen.getByText('5/1000')).toBeInTheDocument();
  });

  it('prevents sending empty messages', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    expect(sendButton).toBeDisabled();
    
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('sends message on Enter key press', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    
    await user.type(textarea, 'Hello world');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith({
        content: 'Hello world',
        image: undefined,
      });
    });
  });

  it('adds new line on Shift+Enter', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    
    await user.type(textarea, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'Line 2');
    
    expect(textarea).toHaveValue('Line 1\nLine 2');
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('validates message length', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} maxLength={10} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    
    await user.type(textarea, 'This is a very long message');
    
    expect(screen.getByText(/28\/10/)).toBeInTheDocument();
    expect(textarea).toHaveClass('border-yellow-300');
  });

  it('handles image file selection', async () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByRole('button', { name: /attach image/i });
    
    // Mock file input
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(hiddenInput, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);
    
    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });
});

describe('Message Validation', () => {
  it('validates message content correctly', () => {
    const validMessage = { content: 'Hello world', image: undefined };
    const result = validateMessageFormData(validMessage);
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects messages that are too long', () => {
    const longMessage = { content: 'a'.repeat(1001), image: undefined };
    const result = validateMessageFormData(longMessage);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.content).toBe('Message must be at most 1000 characters');
  });

  it('rejects messages with suspicious content', () => {
    const suspiciousMessage = { content: '<script>alert("xss")</script>', image: undefined };
    const result = validateMessageFormData(suspiciousMessage);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.content).toBe('Message contains invalid content');
  });

  it('requires either content or image', () => {
    const emptyMessage = { content: '', image: undefined };
    const result = validateMessageFormData(emptyMessage);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.general).toBe('Please provide either a message or an image');
  });
});

describe('Image Validation', () => {
  it('validates correct image files', () => {
    const validImage = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(validImage);
    
    expect(result.isValid).toBe(true);
  });

  it('rejects files that are too large', () => {
    const largeImage = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(largeImage);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Image size must be less than 5MB');
  });

  it('rejects invalid file types', () => {
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const result = validateImageFile(invalidFile);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Only JPEG, PNG, GIF, and WebP images are allowed');
  });

  it('rejects files that are too small', () => {
    const tinyImage = new File(['x'], 'tiny.jpg', { type: 'image/jpeg' });
    const result = validateImageFile(tinyImage);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Image file appears to be corrupted or too small');
  });
});
