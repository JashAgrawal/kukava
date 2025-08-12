import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, Chatroom, Message, CreateChatroomFormData, MessageFormData } from '@/types';

interface ChatStore extends ChatState {
  createChatroom: (data: CreateChatroomFormData) => Promise<void>;
  deleteChatroom: (chatroomId: string) => Promise<void>;
  selectChatroom: (chatroom: Chatroom) => void;
  sendMessage: (data: MessageFormData) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setMessagesLoading: (loading: boolean) => void;
  setTyping: (typing: boolean) => void;
  setError: (error: string | null) => void;
  addMessage: (message: Message) => void;
  updateChatroomLastMessage: (chatroomId: string, message: Message) => void;
  initializeSampleData: () => void;
}

const MESSAGES_PER_PAGE = 20;

// Enhanced AI response patterns with context awareness
const AI_RESPONSE_PATTERNS = {
  greeting: [
    "Hello! I'm Gemini, your AI assistant. How can I help you today?",
    "Hi there! I'm here to help with any questions or tasks you have.",
    "Greetings! What would you like to explore or discuss today?",
  ],
  question: [
    "That's a great question! Let me think about this...",
    "Interesting question. Here's what I can tell you:",
    "I'd be happy to help you understand this better.",
    "Let me break this down for you step by step.",
  ],
  general: [
    "I understand your point. Here's my perspective:",
    "That's an interesting topic. Let me share some insights:",
    "I can help you with that. Here's what I think:",
    "Thanks for sharing that. Here's how I would approach it:",
  ],
  image: [
    "I can see the image you've shared! That's quite interesting.",
    "Thanks for sharing that image. I can see what you're showing me.",
    "I notice you've uploaded an image. Let me take a look at that.",
  ],
  followup: [
    "Is there anything specific about this you'd like me to elaborate on?",
    "Would you like me to explain any part of this in more detail?",
    "Do you have any follow-up questions about this topic?",
  ],
};

// Throttling mechanism for realistic AI responses
let lastResponseTime = 0;
const MIN_RESPONSE_DELAY = 1500; // Minimum 1.5 seconds between responses
const MAX_RESPONSE_DELAY = 5000; // Maximum 5 seconds
const TYPING_DELAY = 3000; // Minimum typing indicator display time

const generateAIResponse = (userMessage: Message): string => {
  const content = userMessage.content.toLowerCase();
  const isImage = userMessage.type === 'image';

  let responseCategory = 'general';

  if (isImage) {
    responseCategory = 'image';
  } else if (content.includes('hello') || content.includes('hi') || content.includes('hey')) {
    responseCategory = 'greeting';
  } else if (content.includes('?') || content.includes('what') || content.includes('how') || content.includes('why')) {
    responseCategory = 'question';
  }

  const responses = AI_RESPONSE_PATTERNS[responseCategory as keyof typeof AI_RESPONSE_PATTERNS];
  const baseResponse = responses[Math.floor(Math.random() * responses.length)];

  // Add contextual follow-up occasionally
  if (Math.random() < 0.3) {
    const followups = AI_RESPONSE_PATTERNS.followup;
    const followup = followups[Math.floor(Math.random() * followups.length)];
    return `${baseResponse}\n\n${followup}`;
  }

  return baseResponse;
};

const simulateAIResponse = async (userMessage: Message): Promise<Message> => {
  return new Promise((resolve) => {
    const now = Date.now();

    // Implement throttling - ensure minimum delay between responses
    const timeSinceLastResponse = now - lastResponseTime;
    const baseDelay = Math.max(MIN_RESPONSE_DELAY - timeSinceLastResponse, 0);

    // Add realistic thinking time based on message complexity
    const messageLength = userMessage.content.length;
    const complexityDelay = Math.min(messageLength * 25, 2500); // Up to 2.5 seconds for complexity
    const randomDelay = Math.random() * 1500; // Random 0-1.5 seconds

    // Ensure minimum typing indicator display time
    const totalDelay = Math.max(
      baseDelay + complexityDelay + randomDelay,
      TYPING_DELAY
    );
    const finalDelay = Math.min(totalDelay, MAX_RESPONSE_DELAY);

    setTimeout(() => {
      lastResponseTime = Date.now();

      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        content: generateAIResponse(userMessage),
        type: 'text',
        sender: 'ai',
        timestamp: new Date(),
        chatroomId: userMessage.chatroomId,
      };
      resolve(aiMessage);
    }, finalDelay);
  });
};

// Generate dummy historical messages for pagination
const generateDummyMessages = (chatroomId: string, count: number, startIndex: number): Message[] => {
  const messages: Message[] = [];
  const now = new Date();

  const dummyTopics = [
    "What are your thoughts on artificial intelligence?",
    "Can you help me understand quantum computing?",
    "How does machine learning work?",
    "What's the future of renewable energy?",
    "Explain the concept of blockchain technology",
    "What are the benefits of meditation?",
    "How can I improve my productivity?",
    "What's the best way to learn a new language?",
    "Can you recommend some good books?",
    "What are the latest trends in technology?"
  ];

  const aiResponses = [
    "That's a fascinating topic! Let me share some insights based on current research and developments.",
    "Great question! This is an area where we're seeing rapid advancement and innovation.",
    "I'd be happy to explain this concept. It's quite complex but I'll break it down step by step.",
    "This is definitely worth exploring further. There are several important aspects to consider.",
    "Excellent point! This touches on some fundamental principles that are worth understanding.",
    "I think this is a really important question that many people are curious about.",
    "This is an area where there's been significant progress recently. Let me elaborate.",
    "That's a thoughtful question that requires a nuanced answer. Here's my perspective.",
    "I'm glad you asked about this! It's a topic I find particularly interesting.",
    "This is definitely something worth discussing in detail. There are multiple viewpoints to consider."
  ];

  for (let i = 0; i < count; i++) {
    const messageIndex = startIndex + i;
    const isUser = messageIndex % 2 === 0; // Alternating user/AI messages
    const timestamp = new Date(now.getTime() - (messageIndex + 1) * 120000); // 2 minutes apart

    const topicIndex = messageIndex % dummyTopics.length;
    const responseIndex = messageIndex % aiResponses.length;

    messages.push({
      id: `msg_${timestamp.getTime()}_${isUser ? 'user' : 'ai'}`,
      content: isUser
        ? dummyTopics[topicIndex]
        : `${aiResponses[responseIndex]} This provides a comprehensive overview of the key concepts and practical applications.`,
      type: 'text',
      sender: isUser ? 'user' : 'ai',
      timestamp,
      chatroomId,
    });
  }

  return messages.reverse(); // Return in chronological order (oldest first)
};

// Generate sample chatrooms for testing
const generateSampleChatrooms = (): Chatroom[] => {
  const now = new Date();
  const sampleTitles = [
    "AI and Machine Learning",
    "Web Development Tips",
    "React Best Practices",
    "TypeScript Questions",
    "Design Patterns",
    "Database Optimization",
    "Mobile App Development",
    "Cloud Computing",
    "DevOps and CI/CD",
    "Security Best Practices"
  ];

  return sampleTitles.map((title, index) => {
    const createdAt = new Date(now.getTime() - (index + 1) * 86400000); // Days ago
    const lastMessage: Message = {
      id: `msg_${createdAt.getTime()}_ai`,
      content: `This is the last message in ${title}. Let me know if you have any questions!`,
      type: 'text',
      sender: 'ai',
      timestamp: new Date(createdAt.getTime() + 3600000), // 1 hour after creation
      chatroomId: `chatroom_${createdAt.getTime()}`,
    };

    return {
      id: `chatroom_${createdAt.getTime()}`,
      title,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + 3600000),
      messageCount: Math.floor(Math.random() * 50) + 5,
      lastMessage,
    };
  });
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chatrooms: [],
      currentChatroom: null,
      messages: [],
      isLoading: false,
      isMessagesLoading: false,
      isTyping: false,
      error: null,
      searchQuery: '',
      hasMoreMessages: true,
      currentPage: 1,

      // Initialize with sample data if no chatrooms exist
      initializeSampleData: () => {
        const { chatrooms } = get();
        if (chatrooms.length === 0) {
          set({ chatrooms: generateSampleChatrooms() });
        }
      },

      createChatroom: async (data: CreateChatroomFormData) => {
        try {
          set({ isLoading: true, error: null });
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newChatroom: Chatroom = {
            id: `chatroom_${Date.now()}`,
            title: data.title,
            createdAt: new Date(),
            updatedAt: new Date(),
            messageCount: 0,
          };

          set(state => ({
            chatrooms: [newChatroom, ...state.chatrooms],
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Failed to create chatroom' 
          });
        }
      },

      deleteChatroom: async (chatroomId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => ({
            chatrooms: state.chatrooms.filter(room => room.id !== chatroomId),
            currentChatroom: state.currentChatroom?.id === chatroomId ? null : state.currentChatroom,
            messages: state.messages.filter(msg => msg.chatroomId !== chatroomId),
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Failed to delete chatroom' 
          });
        }
      },

      selectChatroom: (chatroom: Chatroom) => {
        const { messages } = get();

        // Check if we have existing messages for this chatroom
        const existingMessages = messages.filter(msg => msg.chatroomId === chatroom.id);
        const hasExistingMessages = existingMessages.length > 0;

        set({
          currentChatroom: chatroom,
          currentPage: hasExistingMessages ? Math.ceil(existingMessages.length / MESSAGES_PER_PAGE) + 1 : 1,
          hasMoreMessages: hasExistingMessages ? existingMessages.length >= MESSAGES_PER_PAGE : true,
          isMessagesLoading: !hasExistingMessages,
        });

        // Only load dummy messages if we don't have existing messages
        if (!hasExistingMessages) {
          get().loadMoreMessages();
        }
      },

      sendMessage: async (data: MessageFormData) => {
        const { currentChatroom } = get();
        if (!currentChatroom) return;

        try {
          // Create user message
          const userMessage: Message = {
            id: `msg_${Date.now()}_user`,
            content: data.content,
            type: data.image ? 'image' : 'text',
            sender: 'user',
            timestamp: new Date(),
            chatroomId: currentChatroom.id,
            imageBase64: data.image ? await convertFileToBase64(data.image) : undefined,
          };

          // Add user message immediately
          get().addMessage(userMessage);
          get().updateChatroomLastMessage(currentChatroom.id, userMessage);

          // Show typing indicator
          set({ isTyping: true });

          // Simulate AI response
          const aiMessage = await simulateAIResponse(userMessage);
          
          // Add AI message and hide typing indicator
          get().addMessage(aiMessage);
          get().updateChatroomLastMessage(currentChatroom.id, aiMessage);
          set({ isTyping: false });

        } catch (error) {
          set({ 
            isTyping: false,
            error: 'Failed to send message' 
          });
        }
      },

      loadMoreMessages: async () => {
        const { currentChatroom, currentPage, hasMoreMessages } = get();
        if (!currentChatroom || !hasMoreMessages) return;

        try {
          set({ isMessagesLoading: true });

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 800));

          // Generate dummy messages for pagination
          const startIndex = (currentPage - 1) * MESSAGES_PER_PAGE;
          const newMessages = generateDummyMessages(currentChatroom.id, MESSAGES_PER_PAGE, startIndex);

          // Simulate reaching end of messages after 5 pages (100 total messages)
          const hasMore = currentPage < 5;

          set(state => ({
            messages: [...newMessages, ...state.messages],
            currentPage: state.currentPage + 1,
            hasMoreMessages: hasMore,
            isMessagesLoading: false,
          }));
        } catch (error) {
          set({
            isMessagesLoading: false,
            error: 'Failed to load messages'
          });
        }
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setMessagesLoading: (loading: boolean) => {
        set({ isMessagesLoading: loading });
      },

      setTyping: (typing: boolean) => {
        set({ isTyping: typing });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      addMessage: (message: Message) => {
        set(state => ({
          messages: [...state.messages, message],
        }));
      },

      updateChatroomLastMessage: (chatroomId: string, message: Message) => {
        set(state => ({
          chatrooms: state.chatrooms.map(room =>
            room.id === chatroomId
              ? { 
                  ...room, 
                  lastMessage: message,
                  messageCount: room.messageCount + 1,
                  updatedAt: new Date()
                }
              : room
          ),
        }));
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        chatrooms: state.chatrooms,
        messages: state.messages,
      }),
    }
  )
);

// Utility function to convert File to base64
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
