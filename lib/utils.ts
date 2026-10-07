import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { describeError, logger } from "@/lib/logger";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format phone number for display
export function formatPhoneNumber(countryCode: string, phoneNumber: string): string {
  return `${countryCode} ${phoneNumber}`;
}

// Format timestamp for messages
export function formatMessageTime(timestamp: Date): string {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}h ago`;
  } else {
    return messageDate.toLocaleDateString();
  }
}

// Format timestamp for chatroom list
export function formatChatroomTime(timestamp: Date): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// Debounce function for search
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return result;
    }
  } catch (error) {
    logger.warn('clipboard.copy_failed', describeError(error));
    return false;
  }
}

// Validate phone number (basic validation)
export function isValidPhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\d{6,15}$/;
  return phoneRegex.test(phoneNumber);
}

// Validate OTP
export function isValidOTP(otp: string): boolean {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
}

// Generate unique ID
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - 3) + '...';
}

// Check if image file is valid
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  return validTypes.includes(file.type) && file.size <= maxSize;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get country flag emoji from country code
export function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Filter chatrooms by search query
export function filterChatrooms(chatrooms: any[], searchQuery: string) {
  const trimmedQuery = searchQuery?.trim() || '';
  if (!trimmedQuery) return chatrooms;

  const query = trimmedQuery.toLowerCase();
  return chatrooms.filter(chatroom =>
    chatroom.title.toLowerCase().includes(query) ||
    chatroom.lastMessage?.content.toLowerCase().includes(query)
  );
}

// Scroll to bottom of element
export function scrollToBottom(element: HTMLElement, smooth: boolean = true) {
  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

// Check if user is at bottom of scrollable element
export function isAtBottom(element: HTMLElement, threshold: number = 100): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
}
