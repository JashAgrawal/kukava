// User types
export interface User {
  id: string;
  phoneNumber: string;
  countryCode: string;
  isAuthenticated: boolean;
  createdAt: Date;
}

// Country types for phone number selection
export interface Country {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  cca3: string;
  idd: {
    root: string;
    suffixes: string[];
  };
  flag: string;
}

// Message types
export interface Message {
  id: string;
  content: string;
  type: 'text' | 'image';
  sender: 'user' | 'ai';
  timestamp: Date;
  chatroomId: string;
  imageUrl?: string;
  imageBase64?: string;
}

// Chatroom types
export interface Chatroom {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage?: Message;
}

// Authentication types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  otpSent: boolean;
  otpVerified: boolean;
}

// Chat types
export interface ChatState {
  chatrooms: Chatroom[];
  currentChatroom: Chatroom | null;
  messages: Message[];
  isLoading: boolean; // For chatroom operations (create, delete, select)
  isMessagesLoading: boolean; // For message operations (load more, send)
  isTyping: boolean;
  error: string | null;
  searchQuery: string;
  hasMoreMessages: boolean;
  currentPage: number;
}

// UI types
export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toasts: Toast[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// Form types
export interface LoginFormData {
  countryCode: string;
  phoneNumber: string;
}

export interface OTPFormData {
  otp: string;
}

export interface CreateChatroomFormData {
  title: string;
}

export interface MessageFormData {
  content: string;
  image?: File;
}

// API Response types
export interface CountryApiResponse {
  name: {
    common: string;
    official: string;
  };
  cca2: string;
  cca3: string;
  idd: {
    root: string;
    suffixes: string[];
  };
  flag: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// Local Storage types
export interface LocalStorageData {
  user: User | null;
  chatrooms: Chatroom[];
  messages: Record<string, Message[]>; // chatroomId -> messages
  theme: 'light' | 'dark';
}

// Component Props types
export interface ChatMessageProps {
  message: Message;
  onCopy: (content: string) => void;
}

export interface ChatInputProps {
  onSendMessage: (data: MessageFormData) => void;
  disabled?: boolean;
}

export interface ChatroomListProps {
  chatrooms: Chatroom[];
  currentChatroomId?: string;
  onSelectChatroom: (chatroom: Chatroom) => void;
  onDeleteChatroom: (chatroomId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

// Hook return types
export interface UseAuthReturn extends AuthState {
  login: (data: LoginFormData) => Promise<void>;
  verifyOTP: (data: OTPFormData) => Promise<void>;
  logout: () => void;
  resendOTP: () => Promise<void>;
}

export interface UseChatReturn extends ChatState {
  createChatroom: (data: CreateChatroomFormData) => Promise<void>;
  deleteChatroom: (chatroomId: string) => Promise<void>;
  selectChatroom: (chatroom: Chatroom) => void;
  sendMessage: (data: MessageFormData) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export interface UseUIReturn extends UIState {
  toggleTheme: () => void;
  toggleSidebar: () => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
