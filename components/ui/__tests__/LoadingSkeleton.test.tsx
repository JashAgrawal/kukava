import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import {
  ChatListSkeleton,
  ChatroomSkeleton,
  FullPageLoader,
  LoadingSpinner,
  MessageListSkeleton,
  MessageSkeleton,
  Skeleton,
} from '../LoadingSkeleton';

describe('Skeleton', () => {
  it('renders a pulsing placeholder', () => {
    const { container } = render(<Skeleton />);

    const element = container.firstElementChild as HTMLElement;
    expect(element).toHaveClass('animate-pulse');
    expect(element).toHaveClass('rounded-md');
    expect(element).toHaveClass('bg-muted');
  });

  it('merges a custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-16" />);

    expect(container.firstElementChild).toHaveClass('h-4', 'w-16');
  });
});

describe('MessageSkeleton', () => {
  it('renders six placeholder bars', () => {
    const { container } = render(<MessageSkeleton />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(6);
  });
});

describe('ChatroomSkeleton', () => {
  it('renders four placeholder bars', () => {
    const { container } = render(<ChatroomSkeleton />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });
});

describe('ChatListSkeleton', () => {
  it('renders five chatroom rows', () => {
    const { container } = render(<ChatListSkeleton />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5 * 4);
  });
});

describe('MessageListSkeleton', () => {
  it('renders eight message rows', () => {
    const { container } = render(<MessageListSkeleton />);

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(8 * 6);
  });
});

describe('LoadingSpinner', () => {
  it.each([
    ['sm', 'w-4'],
    ['md', 'w-6'],
    ['lg', 'w-8'],
  ] as const)('renders the %s size', (size, expectedClass) => {
    const { container } = render(<LoadingSpinner size={size} />);

    expect(container.firstElementChild).toHaveClass('animate-spin', expectedClass);
  });

  it('defaults to medium', () => {
    const { container } = render(<LoadingSpinner />);

    expect(container.firstElementChild).toHaveClass('w-6');
  });

  it('merges a custom className', () => {
    const { container } = render(<LoadingSpinner className="mx-auto" />);

    expect(container.firstElementChild).toHaveClass('mx-auto');
  });
});

describe('FullPageLoader', () => {
  it('announces that the app is loading', () => {
    render(<FullPageLoader />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fills the viewport', () => {
    const { container } = render(<FullPageLoader />);

    expect(container.firstElementChild).toHaveClass('min-h-screen');
  });
});