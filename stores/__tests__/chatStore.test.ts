import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chatroom, Message } from '@/types';

const MESSAGES_PER_PAGE = 20;

function makeChatroom(overrides: Partial<Chatroom> = {}): Chatroom {
  return {
    id: 'chatroom_1',
    title: 'Test chat',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    messageCount: 0,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg_1',
    content: 'hello',
    type: 'text',
    sender: 'user',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    chatroomId: 'chatroom_1',
    ...overrides,
  };
}

const EMPTY_STATE = {
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

/** The AI reply delay is capped at 5s, so this is always enough to resolve it. */
const MAX_AI_DELAY = 5000;

/**
 * Drains fake timers until `promise` settles.
 *
 * Needed because sendMessage schedules work in stages: the image FileReader
 * resolves on a microtask, and only after it does the AI timer get scheduled.
 * A single advanceTimersByTimeAsync call would run out of clock before that
 * second timer exists.
 */
async function settle<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  const tracked = promise.then(
    value => {
      settled = true;
      return value;
    },
    error => {
      settled = true;
      throw error;
    }
  );

  for (let i = 0; i < 10 && !settled; i++) {
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await Promise.resolve();
  }

  return tracked;
}

beforeEach(async () => {
  vi.useFakeTimers();
  const { useChatStore } = await import('@/stores/chatStore');
  useChatStore.setState({ ...EMPTY_STATE });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('chatStore initial state', () => {
  it('starts empty', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    const state = useChatStore.getState();
    expect(state.chatrooms).toEqual([]);
    expect(state.currentChatroom).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isMessagesLoading).toBe(false);
    expect(state.isTyping).toBe(false);
    expect(state.error).toBeNull();
    expect(state.searchQuery).toBe('');
    expect(state.hasMoreMessages).toBe(true);
    expect(state.currentPage).toBe(1);
  });
});

describe('chatStore initializeSampleData', () => {
  it('seeds ten sample chatrooms when the list is empty', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    useChatStore.getState().initializeSampleData();

    const { chatrooms } = useChatStore.getState();
    expect(chatrooms).toHaveLength(10);
    expect(chatrooms[0].title).toBe('AI and Machine Learning');
  });

  it('gives every sample chatroom a last message and a non-zero count', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    useChatStore.getState().initializeSampleData();

    for (const room of useChatStore.getState().chatrooms) {
      expect(room.lastMessage).toBeTruthy();
      expect(room.messageCount).toBeGreaterThan(0);
      expect(room.lastMessage!.chatroomId).toBe(room.id);
    }
  });

  it('does not overwrite existing chatrooms', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ chatrooms: [makeChatroom()] });

    useChatStore.getState().initializeSampleData();

    expect(useChatStore.getState().chatrooms).toHaveLength(1);
  });

  it('is idempotent', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    useChatStore.getState().initializeSampleData();
    useChatStore.getState().initializeSampleData();

    expect(useChatStore.getState().chatrooms).toHaveLength(10);
  });
});

describe('chatStore createChatroom', () => {
  it('prepends the new chatroom and clears loading', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ chatrooms: [makeChatroom({ id: 'existing' })] });

    const pending = useChatStore.getState().createChatroom({ title: 'New chat' });
    expect(useChatStore.getState().isLoading).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    await pending;

    const { chatrooms, isLoading } = useChatStore.getState();
    expect(chatrooms).toHaveLength(2);
    expect(chatrooms[0].title).toBe('New chat');
    expect(chatrooms[0].id).toMatch(/^chatroom_/);
    expect(chatrooms[0].messageCount).toBe(0);
    expect(chatrooms[0].lastMessage).toBeUndefined();
    expect(isLoading).toBe(false);
  });

  it('stamps createdAt and updatedAt identically', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const pending = useChatStore.getState().createChatroom({ title: 'Timestamps' });
    await vi.advanceTimersByTimeAsync(500);
    await pending;

    const room = useChatStore.getState().chatrooms[0];
    expect(room.createdAt.getTime()).toBe(room.updatedAt.getTime());
  });

  it('does not select the new chatroom automatically', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const pending = useChatStore.getState().createChatroom({ title: 'Unselected' });
    await vi.advanceTimersByTimeAsync(500);
    await pending;

    expect(useChatStore.getState().currentChatroom).toBeNull();
  });
});

describe('chatStore deleteChatroom', () => {
  it('removes the chatroom from the list', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      chatrooms: [makeChatroom({ id: 'a' }), makeChatroom({ id: 'b' })],
    });

    const pending = useChatStore.getState().deleteChatroom('a');
    await vi.advanceTimersByTimeAsync(300);
    await pending;

    expect(useChatStore.getState().chatrooms.map(r => r.id)).toEqual(['b']);
    expect(useChatStore.getState().isLoading).toBe(false);
  });

  it('clears the current selection when the active chatroom is deleted', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      chatrooms: [makeChatroom({ id: 'a' })],
      currentChatroom: makeChatroom({ id: 'a' }),
    });

    const pending = useChatStore.getState().deleteChatroom('a');
    await vi.advanceTimersByTimeAsync(300);
    await pending;

    expect(useChatStore.getState().currentChatroom).toBeNull();
  });

  it('keeps the current selection when a different chatroom is deleted', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      chatrooms: [makeChatroom({ id: 'a' }), makeChatroom({ id: 'b' })],
      currentChatroom: makeChatroom({ id: 'b' }),
    });

    const pending = useChatStore.getState().deleteChatroom('a');
    await vi.advanceTimersByTimeAsync(300);
    await pending;

    expect(useChatStore.getState().currentChatroom?.id).toBe('b');
  });

  it('drops the deleted chatroom messages', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      messages: [
        makeMessage({ id: 'm1', chatroomId: 'a' }),
        makeMessage({ id: 'm2', chatroomId: 'b' }),
      ],
    });

    const pending = useChatStore.getState().deleteChatroom('a');
    await vi.advanceTimersByTimeAsync(300);
    await pending;

    expect(useChatStore.getState().messages.map(m => m.id)).toEqual(['m2']);
  });

  it('tolerates deleting an unknown id', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ chatrooms: [makeChatroom({ id: 'a' })] });

    const pending = useChatStore.getState().deleteChatroom('missing');
    await vi.advanceTimersByTimeAsync(300);
    await pending;

    expect(useChatStore.getState().chatrooms).toHaveLength(1);
    expect(useChatStore.getState().error).toBeNull();
  });
});

describe('chatStore selectChatroom', () => {
  it('marks messages as loading when the chatroom has no cached messages', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const room = makeChatroom({ id: 'fresh' });

    useChatStore.getState().selectChatroom(room);
    expect(useChatStore.getState().currentChatroom?.id).toBe('fresh');
    expect(useChatStore.getState().isMessagesLoading).toBe(true);

    await vi.advanceTimersByTimeAsync(800);
  });

  it('does not reload when messages are already cached', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const room = makeChatroom({ id: 'cached' });
    useChatStore.setState({
      messages: [makeMessage({ chatroomId: 'cached' }), makeMessage({ chatroomId: 'cached' })],
    });

    useChatStore.getState().selectChatroom(room);

    expect(useChatStore.getState().isMessagesLoading).toBe(false);
    expect(useChatStore.getState().currentPage).toBe(2);
  });

  it('ignores cached messages belonging to other chatrooms', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const room = makeChatroom({ id: 'fresh' });
    useChatStore.setState({
      messages: [makeMessage({ chatroomId: 'other' }), makeMessage({ chatroomId: 'other' })],
    });

    useChatStore.getState().selectChatroom(room);

    expect(useChatStore.getState().isMessagesLoading).toBe(true);

    await vi.advanceTimersByTimeAsync(800);
  });
});

describe('chatStore loadMoreMessages', () => {
  it('does nothing without a selected chatroom', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    await useChatStore.getState().loadMoreMessages();

    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('does nothing once every page has been read', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      currentChatroom: makeChatroom(),
      hasMoreMessages: false,
      currentPage: 5,
    });

    await useChatStore.getState().loadMoreMessages();

    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('prepends a full page and advances the page counter', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room' }) });

    const pending = useChatStore.getState().loadMoreMessages();
    expect(useChatStore.getState().isMessagesLoading).toBe(true);

    await vi.advanceTimersByTimeAsync(800);
    await pending;

    const { messages, currentPage, hasMoreMessages, isMessagesLoading } = useChatStore.getState();
    expect(messages).toHaveLength(MESSAGES_PER_PAGE);
    expect(currentPage).toBe(2);
    expect(hasMoreMessages).toBe(true);
    expect(isMessagesLoading).toBe(false);
  });

  it('keeps older pages ahead of newer ones when prepending', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room' }) });

    const first = useChatStore.getState().loadMoreMessages();
    await vi.advanceTimersByTimeAsync(800);
    await first;
    const firstPage = useChatStore.getState().messages.map(m => m.id);

    const second = useChatStore.getState().loadMoreMessages();
    await vi.advanceTimersByTimeAsync(800);
    await second;

    const ids = useChatStore.getState().messages.map(m => m.id);
    expect(ids).toHaveLength(MESSAGES_PER_PAGE * 2);
    // The newer page is still at the tail, the older page moved to the head.
    expect(ids.slice(MESSAGES_PER_PAGE)).toEqual(firstPage);
  });

  it('tags every generated message with the chatroom id', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room_x' }) });

    const pending = useChatStore.getState().loadMoreMessages();
    await vi.advanceTimersByTimeAsync(800);
    await pending;

    for (const message of useChatStore.getState().messages) {
      expect(message.chatroomId).toBe('room_x');
    }
  });

  it('reports no more messages after the fifth page', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      currentChatroom: makeChatroom({ id: 'room' }),
      currentPage: 5,
    });

    const pending = useChatStore.getState().loadMoreMessages();
    await vi.advanceTimersByTimeAsync(800);
    await pending;

    expect(useChatStore.getState().hasMoreMessages).toBe(false);
    expect(useChatStore.getState().currentPage).toBe(6);
  });

  it('fills exactly five pages of history in total', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room' }) });

    for (let i = 0; i < 6; i++) {
      const pending = useChatStore.getState().loadMoreMessages();
      await vi.advanceTimersByTimeAsync(800);
      await pending;
    }

    expect(useChatStore.getState().messages).toHaveLength(MESSAGES_PER_PAGE * 5);
    expect(useChatStore.getState().hasMoreMessages).toBe(false);
  });

  it('alternates user and AI senders', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room' }) });

    const pending = useChatStore.getState().loadMoreMessages();
    await vi.advanceTimersByTimeAsync(800);
    await pending;

    const senders = useChatStore.getState().messages.map(m => m.sender);
    for (let i = 1; i < senders.length; i++) {
      expect(senders[i]).not.toBe(senders[i - 1]);
    }
  });
});

describe('chatStore sendMessage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('ignores sends without a selected chatroom', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    await useChatStore.getState().sendMessage({ content: 'hi' });

    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('appends the user message and an AI reply', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room' }) });

    const pending = useChatStore.getState().sendMessage({ content: 'Hello there' });
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await pending;

    const { messages } = useChatStore.getState();
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe('user');
    expect(messages[0].content).toBe('Hello there');
    expect(messages[0].type).toBe('text');
    expect(messages[1].sender).toBe('ai');
    expect(messages[1].content.length).toBeGreaterThan(0);
  });

  it('tags both messages with the active chatroom id', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom({ id: 'room_abc' }) });

    const pending = useChatStore.getState().sendMessage({ content: 'hi' });
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await pending;

    expect(useChatStore.getState().messages.map(m => m.chatroomId)).toEqual([
      'room_abc',
      'room_abc',
    ]);
  });

  it('shows the typing indicator while the AI composes a reply', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom() });

    const pending = useChatStore.getState().sendMessage({ content: 'hi' });
    expect(useChatStore.getState().isTyping).toBe(true);
    expect(useChatStore.getState().messages).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await pending;

    expect(useChatStore.getState().isTyping).toBe(false);
  });

  it('bumps the chatroom message count and last message for both turns', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      currentChatroom: makeChatroom({ id: 'room' }),
      chatrooms: [makeChatroom({ id: 'room', messageCount: 4 })],
    });

    const pending = useChatStore.getState().sendMessage({ content: 'hi' });
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await pending;

    const room = useChatStore.getState().chatrooms[0];
    expect(room.messageCount).toBe(6);
    expect(room.lastMessage!.sender).toBe('ai');
    expect(room.updatedAt.getTime()).toBeGreaterThan(room.createdAt.getTime());
  });

  it('leaves other chatrooms untouched', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      currentChatroom: makeChatroom({ id: 'room' }),
      chatrooms: [makeChatroom({ id: 'room', messageCount: 1 }), makeChatroom({ id: 'other', messageCount: 7 })],
    });

    const pending = useChatStore.getState().sendMessage({ content: 'hi' });
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await pending;

    expect(useChatStore.getState().chatrooms[1].messageCount).toBe(7);
  });

  it('marks an image message and encodes it as base64', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ currentChatroom: makeChatroom() });
    const image = new File(['binary-data'], 'photo.png', { type: 'image/png' });

    await settle(useChatStore.getState().sendMessage({ content: 'look', image }));

    const [userMessage] = useChatStore.getState().messages;
    expect(userMessage.type).toBe('image');
    expect(userMessage.imageBase64).toMatch(/^data:image\/png;base64,/);
  });

  it('classifies a greeting reply', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    // Math.random call order: response delay, response index, follow-up gate.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    useChatStore.setState({ currentChatroom: makeChatroom() });

    const assertion = expect(
      useChatStore.getState().sendMessage({ content: 'hey there' })
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await assertion;

    expect(useChatStore.getState().messages[1].content).toBe(
      "Hello! I'm Gemini, your AI assistant. How can I help you today?"
    );
  });

  it('classifies a question reply', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    useChatStore.setState({ currentChatroom: makeChatroom() });

    // Deliberately avoids the substrings "hi", "hey" and "hello", because the
    // greeting check is a naive substring match and would win first.
    const assertion = expect(
      useChatStore.getState().sendMessage({ content: 'how does indexing work?' })
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await assertion;

    expect(useChatStore.getState().messages[1].content).toBe(
      "That's a great question! Let me think about this..."
    );
  });

  it('prefers the greeting bucket over the question bucket', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    useChatStore.setState({ currentChatroom: makeChatroom() });

    // "this" contains the substring "hi", so this lands in the greeting bucket.
    const assertion = expect(
      useChatStore.getState().sendMessage({ content: 'what is this?' })
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await assertion;

    expect(useChatStore.getState().messages[1].content).toBe(
      "Hello! I'm Gemini, your AI assistant. How can I help you today?"
    );
  });

  it('classifies an image reply', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    useChatStore.setState({ currentChatroom: makeChatroom() });
    const image = new File(['x'], 'photo.png', { type: 'image/png' });

    await settle(useChatStore.getState().sendMessage({ content: '', image }));

    expect(useChatStore.getState().messages[1].content).toBe(
      "I can see the image you've shared! That's quite interesting."
    );
  });

  it('appends a follow-up question some of the time', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    // 0.2 clears the < 0.3 follow-up gate; the trailing 0.9 keeps the gate
    // from re-triggering inside the same reply.
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0);
    useChatStore.setState({ currentChatroom: makeChatroom() });

    const assertion = expect(
      useChatStore.getState().sendMessage({ content: 'tell me about rust' })
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await assertion;

    expect(useChatStore.getState().messages[1].content).toBe(
      "I understand your point. Here's my perspective:\n\n" +
        "Is there anything specific about this you'd like me to elaborate on?"
    );
  });

  it('omits the follow-up question when the gate is not cleared', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    useChatStore.setState({ currentChatroom: makeChatroom() });

    const assertion = expect(
      useChatStore.getState().sendMessage({ content: 'tell me about rust' })
    ).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(MAX_AI_DELAY);
    await assertion;

    expect(useChatStore.getState().messages[1].content).toBe(
      "I understand your point. Here's my perspective:"
    );
  });
});

describe('chatStore message helpers', () => {
  it('addMessage appends to the tail', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ messages: [makeMessage({ id: 'first' })] });

    useChatStore.getState().addMessage(makeMessage({ id: 'second' }));

    expect(useChatStore.getState().messages.map(m => m.id)).toEqual(['first', 'second']);
  });

  it('updateChatroomLastMessage increments the count and refreshes updatedAt', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const createdAt = new Date('2020-01-01T00:00:00Z');
    useChatStore.setState({
      chatrooms: [makeChatroom({ id: 'room', messageCount: 2, createdAt, updatedAt: createdAt })],
    });

    useChatStore.getState().updateChatroomLastMessage('room', makeMessage({ id: 'm9' }));

    const room = useChatStore.getState().chatrooms[0];
    expect(room.lastMessage!.id).toBe('m9');
    expect(room.messageCount).toBe(3);
    expect(room.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
  });

  it('updateChatroomLastMessage ignores unknown chatroom ids', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    const original = makeChatroom({ id: 'room', messageCount: 2 });
    useChatStore.setState({ chatrooms: [original] });

    useChatStore.getState().updateChatroomLastMessage('nope', makeMessage());

    expect(useChatStore.getState().chatrooms[0]).toEqual(original);
  });
});

describe('chatStore setters', () => {
  it('setSearchQuery stores the raw query', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    useChatStore.getState().setSearchQuery('  react ');

    expect(useChatStore.getState().searchQuery).toBe('  react ');
  });

  it.each([
    ['setLoading', 'isLoading'],
    ['setMessagesLoading', 'isMessagesLoading'],
    ['setTyping', 'isTyping'],
  ] as const)('%s drives %s', async (action, key) => {
    const { useChatStore } = await import('@/stores/chatStore');

    useChatStore.getState()[action](true);
    expect(useChatStore.getState()[key]).toBe(true);

    useChatStore.getState()[action](false);
    expect(useChatStore.getState()[key]).toBe(false);
  });

  it('setError stores and clears the error', async () => {
    const { useChatStore } = await import('@/stores/chatStore');

    useChatStore.getState().setError('boom');
    expect(useChatStore.getState().error).toBe('boom');

    useChatStore.getState().setError(null);
    expect(useChatStore.getState().error).toBeNull();
  });
});

describe('chatStore persistence', () => {
  it('persists chatrooms and messages under the chat-storage key', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({
      chatrooms: [makeChatroom({ id: 'room' })],
      messages: [makeMessage({ id: 'm1', chatroomId: 'room' })],
    });

    const persisted = JSON.parse(window.localStorage.getItem('chat-storage')!);
    expect(persisted.state.chatrooms).toHaveLength(1);
    expect(persisted.state.messages).toHaveLength(1);
  });

  it('does not persist transient flags', async () => {
    const { useChatStore } = await import('@/stores/chatStore');
    useChatStore.setState({ isTyping: true, searchQuery: 'react' });

    const persisted = JSON.parse(window.localStorage.getItem('chat-storage')!);
    expect(persisted.state.isTyping).toBeUndefined();
    expect(persisted.state.searchQuery).toBeUndefined();
  });
});