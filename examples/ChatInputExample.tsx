import React, { useState } from 'react';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageFormData } from '@/lib/validations';

/**
 * Example usage of the enhanced ChatInput component
 * 
 * Features demonstrated:
 * - Text message validation
 * - Image upload with validation
 * - Drag and drop functionality
 * - Character count display
 * - Error handling
 * - Custom placeholder and max length
 */
export function ChatInputExample() {
  const [messages, setMessages] = useState<Array<{ content: string; image?: File; timestamp: Date }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (data: MessageFormData) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add message to list
      setMessages(prev => [...prev, {
        content: data.content,
        image: data.image,
        timestamp: new Date(),
      }]);
      
      console.log('Message sent:', {
        content: data.content,
        hasImage: !!data.image,
        imageSize: data.image ? data.image.size : 0,
        imageName: data.image ? data.image.name : null,
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error; // Re-throw to let ChatInput handle the error display
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Enhanced ChatInput Example</h1>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Features:</h2>
        <ul className="space-y-1 text-sm text-gray-700">
          <li>• Text validation with character count (max 1000 characters)</li>
          <li>• Image upload with drag & drop support</li>
          <li>• File type validation (JPEG, PNG, GIF, WebP)</li>
          <li>• File size validation (max 5MB)</li>
          <li>• XSS protection and content sanitization</li>
          <li>• Keyboard shortcuts (Enter to send, Shift+Enter for new line, Esc to remove image)</li>
          <li>• Real-time validation feedback</li>
          <li>• Loading states and error handling</li>
        </ul>
      </div>

      {/* Messages Display */}
      {messages.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Sent Messages:</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-3">
                {message.content && (
                  <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                )}
                {message.image && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      📎 {message.image.name} ({(message.image.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Basic Usage */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h3 className="font-semibold">Basic Usage</h3>
        </div>
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
        />
      </div>

      {/* Custom Configuration */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b">
          <h3 className="font-semibold">Custom Configuration</h3>
        </div>
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder="Enter your custom message here..."
          maxLength={500}
        />
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to Use:</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>1. Type a message in the text area (up to 1000 characters)</p>
          <p>2. Or click the image icon to attach an image file</p>
          <p>3. Or drag and drop an image file directly onto the input area</p>
          <p>4. Press Enter to send, or Shift+Enter for a new line</p>
          <p>5. Press Esc to remove an attached image</p>
        </div>
      </div>

      {/* Validation Examples */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">Try These Validation Tests:</h3>
        <div className="text-sm text-yellow-800 space-y-1">
          <p>• Try sending an empty message (should be blocked)</p>
          <p>• Type more than 1000 characters (visual feedback)</p>
          <p>• Try uploading a non-image file (should be rejected)</p>
          <p>• Try uploading a file larger than 5MB (should be rejected)</p>
          <p>• Try entering script tags like &lt;script&gt;alert('test')&lt;/script&gt; (should be blocked)</p>
        </div>
      </div>

      {/* Code Example */}
      <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <h3 className="font-semibold mb-2">Code Example:</h3>
        <pre className="text-sm">
{`import { ChatInput } from '@/components/chat/ChatInput';
import { MessageFormData } from '@/lib/validations';

const handleSendMessage = async (data: MessageFormData) => {
  try {
    // Your message sending logic here
    await sendMessageToAPI(data);
  } catch (error) {
    throw error; // Let ChatInput handle error display
  }
};

<ChatInput
  onSendMessage={handleSendMessage}
  disabled={isLoading}
  placeholder="Type your message..."
  maxLength={1000}
/>`}
        </pre>
      </div>
    </div>
  );
}
