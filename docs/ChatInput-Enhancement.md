# Enhanced ChatInput Component

## Overview

The ChatInput component has been completely rewritten with enhanced validation, better user experience, and comprehensive error handling for both text messages and image uploads.

## Key Features

### 🔒 Enhanced Validation
- **Text Content**: XSS protection, length validation, content sanitization
- **Image Files**: Type validation, size limits, file integrity checks
- **Real-time Feedback**: Live character count and validation status
- **Comprehensive Error Messages**: Clear, actionable error descriptions

### 🎯 Improved User Experience
- **Drag & Drop**: Native drag and drop support for image files
- **Keyboard Shortcuts**: 
  - `Enter` to send message
  - `Shift + Enter` for new line
  - `Esc` to remove attached image
- **Visual Feedback**: Loading states, hover effects, focus indicators
- **Auto-resize**: Textarea automatically adjusts height based on content

### 🛡️ Security Features
- **XSS Protection**: Blocks potentially harmful script content
- **File Type Validation**: Only allows safe image formats
- **Content Sanitization**: Removes dangerous patterns from user input
- **File Extension Checking**: Prevents executable file uploads

## API Reference

### Props

```typescript
interface ChatInputProps {
  onSendMessage: (data: MessageFormData) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}
```

#### `onSendMessage`
- **Type**: `(data: MessageFormData) => Promise<void>`
- **Required**: Yes
- **Description**: Callback function called when a message is sent

#### `disabled`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Disables the input when true

#### `placeholder`
- **Type**: `string`
- **Default**: `"Type your message..."`
- **Description**: Placeholder text for the textarea

#### `maxLength`
- **Type**: `number`
- **Default**: `1000`
- **Description**: Maximum number of characters allowed

### MessageFormData

```typescript
interface MessageFormData {
  content: string;
  image?: File;
}
```

## Validation Rules

### Text Content
- **Maximum Length**: 1000 characters (configurable)
- **XSS Protection**: Blocks script tags and javascript: URLs
- **Content Sanitization**: Removes potentially harmful patterns
- **Required**: Either content or image must be provided

### Image Files
- **Allowed Types**: JPEG, PNG, GIF, WebP
- **Maximum Size**: 5MB
- **Minimum Size**: 100 bytes (prevents corrupted files)
- **File Extension**: Must match MIME type
- **Security**: Blocks executable file extensions

## Usage Examples

### Basic Usage

```tsx
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageFormData } from '@/lib/validations';

function ChatInterface() {
  const handleSendMessage = async (data: MessageFormData) => {
    try {
      await sendMessageToAPI(data);
    } catch (error) {
      throw error; // Let ChatInput handle error display
    }
  };

  return (
    <ChatInput onSendMessage={handleSendMessage} />
  );
}
```

### Custom Configuration

```tsx
<ChatInput
  onSendMessage={handleSendMessage}
  disabled={isLoading}
  placeholder="Enter your message here..."
  maxLength={500}
/>
```

### With Error Handling

```tsx
const handleSendMessage = async (data: MessageFormData) => {
  try {
    // Validate data before sending
    const validation = validateMessageFormData(data);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    await sendMessageToAPI(data);
  } catch (error) {
    console.error('Send failed:', error);
    throw error; // Re-throw for ChatInput to display
  }
};
```

## Validation Functions

### `validateMessageFormData(data)`
Validates complete message form data including both content and image.

```typescript
const result = validateMessageFormData({
  content: "Hello world",
  image: imageFile
});

if (!result.isValid) {
  console.log(result.errors);
}
```

### `validateImageFile(file)`
Validates image file properties.

```typescript
const result = validateImageFile(imageFile);
if (!result.isValid) {
  console.log(result.error);
}
```

### `validateMessageContent(content)`
Validates text content for security and length.

```typescript
const result = validateMessageContent("Hello world");
if (!result.isValid) {
  console.log(result.error);
}
```

## Styling

The component uses Tailwind CSS classes and supports customization through the `cn` utility function. Key styling features:

- **Responsive Design**: Adapts to different screen sizes
- **Focus States**: Clear focus indicators for accessibility
- **Error States**: Visual feedback for validation errors
- **Loading States**: Disabled appearance during submission
- **Drag States**: Visual feedback during drag operations

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Focus Management**: Logical tab order and focus restoration
- **Error Announcements**: Validation errors are announced to screen readers

## Testing

The component includes comprehensive tests covering:

- **User Interactions**: Typing, clicking, keyboard shortcuts
- **Validation**: All validation rules and edge cases
- **File Handling**: Image upload and drag & drop
- **Error States**: Error handling and display
- **Accessibility**: Keyboard navigation and screen reader support

Run tests with:
```bash
npm test ChatInput.test.tsx
```

## Migration Guide

### From Previous Version

1. **Props Changes**: 
   - Added optional `placeholder` and `maxLength` props
   - `onSendMessage` now expects a Promise return type

2. **Enhanced Validation**:
   - More strict image validation
   - XSS protection for text content
   - Better error messages

3. **New Features**:
   - Drag & drop support
   - Character count display
   - Enhanced keyboard shortcuts

### Breaking Changes

- `onSendMessage` must now return a Promise
- Validation errors are now handled internally
- Image validation is more strict

## Performance Considerations

- **Debounced Validation**: Real-time validation is optimized
- **Memory Management**: Image previews are properly cleaned up
- **Event Listeners**: Drag & drop listeners are efficiently managed
- **Re-renders**: Optimized with useCallback and useMemo hooks

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **File API**: Required for image upload functionality
- **Drag & Drop API**: Required for drag & drop functionality
