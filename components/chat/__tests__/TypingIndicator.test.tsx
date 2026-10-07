import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('shows the assistant name', () => {
    render(<TypingIndicator />);

    expect(screen.getByText('Gemini')).toBeInTheDocument();
  });

  it('announces that a reply is being written', () => {
    render(<TypingIndicator />);

    expect(screen.getByText('is typing...')).toBeInTheDocument();
  });

  it('renders the three bouncing dots', () => {
    const { container } = render(<TypingIndicator />);

    expect(container.querySelectorAll('.animate-bounce')).toHaveLength(3);
  });

  it('staggers the dot animation delays', () => {
    const { container } = render(<TypingIndicator />);
    const delays = Array.from(container.querySelectorAll<HTMLElement>('.animate-bounce')).map(
      dot => dot.style.animationDelay
    );

    expect(delays).toEqual(['0ms', '150ms', '300ms']);
  });

  it('exposes the typing state to assistive technology', () => {
    render(<TypingIndicator />);

    expect(screen.getByText('is typing...')).toHaveAttribute('aria-live', 'polite');
  });
});