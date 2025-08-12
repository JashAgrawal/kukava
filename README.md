# Gemini Chat - AI Conversational Assistant

A modern, responsive chat application built with Next.js 15 that simulates conversations with Gemini AI. Features include OTP-based authentication, real-time messaging simulation, image sharing, and a polished user experience.

## 🌐 Live Demo

**[View Live Application](https://your-app-url.vercel.app)** *(Replace with your actual deployment URL)*

> **Note**: The app uses simulated data and doesn't require a backend. All features work client-side with realistic delays and interactions.

## 🌟 Features

### Authentication
- **OTP-based Login/Signup** - Secure phone number verification
- **Country Code Selection** - Fetches real country data from REST Countries API
- **Form Validation** - React Hook Form + Zod for robust validation
- **Simulated OTP** - Realistic OTP generation and verification flow

### Chat Experience
- **Multiple Chatrooms** - Create, manage, and delete chat conversations
- **AI Message Simulation** - Intelligent responses with realistic delays and throttling
- **Image Upload** - Share images with base64 conversion and preview
- **Typing Indicators** - "Gemini is typing..." with animated dots
- **Message Features** - Copy to clipboard, timestamps, message history

### Advanced UX
- **Infinite Scroll** - Reverse pagination for message history
- **Search Functionality** - Debounced search across chatrooms
- **Dark Mode** - Toggle between light and dark themes
- **Toast Notifications** - Success, error, and info messages
- **Loading Skeletons** - Smooth loading states
- **Mobile Responsive** - Optimized for all device sizes
- **Keyboard Accessibility** - Full keyboard navigation support

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand with persistence
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
kukava/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles and animations
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── auth/             # Authentication components
│   │   ├── AuthPage.tsx
│   │   ├── CountrySelector.tsx
│   │   ├── LoginForm.tsx
│   │   └── OTPForm.tsx
│   ├── chat/             # Chat interface components
│   │   ├── ChatInput.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ChatMessage.tsx
│   │   └── TypingIndicator.tsx
│   ├── dashboard/        # Dashboard components
│   │   ├── ChatroomList.tsx
│   │   ├── CreateChatroomModal.tsx
│   │   └── Dashboard.tsx
│   ├── ui/               # Reusable UI components
│   │   ├── LoadingSkeleton.tsx
│   │   └── Toast.tsx
│   └── App.tsx           # Main app component
├── stores/               # Zustand stores
│   ├── authStore.ts      # Authentication state
│   ├── chatStore.ts      # Chat and messaging state
│   └── uiStore.ts        # UI state (theme, toasts)
├── types/                # TypeScript type definitions
│   └── index.ts
├── lib/                  # Utility functions
│   ├── countryService.ts # Country data fetching
│   ├── utils.ts          # General utilities
│   └── validations.ts    # Zod schemas
└── hooks/                # Custom React hooks (future)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kukava
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📱 Usage Guide

### Getting Started
1. **Phone Verification**: Enter your phone number with country code
2. **OTP Verification**: Enter the 6-digit code (check console for simulated OTP)
3. **Create Chat**: Click "New Chat" to start a conversation
4. **Send Messages**: Type messages or upload images to chat with Gemini

### Key Features
- **Search**: Use Ctrl/Cmd + / to focus search
- **New Chat**: Use Ctrl/Cmd + N to create new chat
- **Theme Toggle**: Click sun/moon icon to switch themes
- **Copy Messages**: Hover over messages to copy content
- **Image Upload**: Click image icon in chat input

## 🔧 Implementation Details

### Authentication Flow
The authentication system uses a realistic OTP-based flow:

- **Country Selection**: Fetches real country data from REST Countries API (`lib/countryService.ts`)
- **Phone Validation**: Uses Zod schema with regex patterns for 6-15 digit validation
- **OTP Generation**: Simulated 6-digit codes with console logging for testing
- **Form Validation**: React Hook Form + Zod with real-time validation feedback
- **Persistent State**: Zustand with localStorage persistence for login sessions

```typescript
// Example from lib/validations.ts
export const loginSchema = z.object({
  countryCode: z.string().regex(/^\+\d{1,4}$/, 'Invalid country code format'),
  phoneNumber: z.string().min(6).max(15).regex(/^\d+$/, 'Only digits allowed')
});
```

### AI Response Simulation & Throttling
Advanced throttling mechanism ensures realistic conversation flow:

- **Minimum Delay**: 1.5 seconds between responses to prevent spam
- **Complexity-Based Timing**: Longer messages = longer AI "thinking" time
- **Context Awareness**: Different response patterns for greetings, questions, images
- **Typing Indicators**: Visual feedback during AI processing with minimum 3-second display

```typescript
// From stores/chatStore.ts - Throttling Implementation
const MIN_RESPONSE_DELAY = 1500; // 1.5 seconds minimum
const MAX_RESPONSE_DELAY = 5000; // 5 seconds maximum
const TYPING_DELAY = 3000; // Minimum typing indicator time

const simulateAIResponse = async (userMessage: Message): Promise<Message> => {
  const now = Date.now();
  const timeSinceLastResponse = now - lastResponseTime;
  const baseDelay = Math.max(MIN_RESPONSE_DELAY - timeSinceLastResponse, 0);

  // Add complexity-based delay (up to 2.5 seconds for long messages)
  const complexityDelay = Math.min(userMessage.content.length * 25, 2500);
  const randomDelay = Math.random() * 1500;

  const totalDelay = Math.max(
    baseDelay + complexityDelay + randomDelay,
    TYPING_DELAY
  );

  setTimeout(() => {
    lastResponseTime = Date.now();
    // Generate and return AI response
  }, Math.min(totalDelay, MAX_RESPONSE_DELAY));
};
```

### Infinite Scroll & Pagination
WhatsApp-style reverse infinite scroll with smart position management:

- **Reverse Pagination**: Load older messages when scrolling to top (not bottom)
- **Scroll Position Preservation**: Maintains user's view when loading new content
- **Debounced Loading**: 150ms debounce prevents excessive API calls
- **Smart Thresholds**: 150px from top triggers load with proper conditions

```typescript
// From components/chat/ChatInterface.tsx - Infinite Scroll Logic
const handleScroll = () => {
  scrollTimeoutRef.current = setTimeout(async () => {
    const scrollTop = container.scrollTop;
    const scrollThreshold = 150;
    const isNearTop = scrollTop <= scrollThreshold;

    if (isNearTop && hasMoreMessages && !isMessagesLoading && hasContent) {
      // Remember scroll position for restoration
      const scrollHeightBefore = container.scrollHeight;
      const scrollTopBefore = container.scrollTop;

      await loadMoreMessages();

      // Restore scroll position after new content loads
      requestAnimationFrame(() => {
        const heightDifference = container.scrollHeight - scrollHeightBefore;
        if (heightDifference > 0) {
          container.scrollTop = scrollTopBefore + heightDifference;
        }
      });
    }
  }, 150); // Debounced for performance
};
```

### Form Validation System
Comprehensive validation using React Hook Form + Zod with real-time feedback:

- **Multi-layer Validation**: Client-side Zod schemas + custom validation functions
- **Real-time Feedback**: `mode: 'onChange'` for immediate validation
- **Security Patterns**: XSS prevention, file type validation, size limits
- **User Experience**: Progressive validation (validate on blur, then on change)

```typescript
// From lib/validations.ts - Advanced Message Validation
export const messageSchema = z.object({
  content: z.string()
    .max(1000, 'Message must be at most 1000 characters')
    .refine((val) => {
      // XSS prevention patterns
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];
      return !suspiciousPatterns.some(pattern => pattern.test(val || ''));
    }, 'Message contains invalid content'),

  image: z.instanceof(File).optional()
    .refine((file) => {
      if (!file) return true;
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      return validTypes.includes(file.type);
    }, 'Only JPEG, PNG, GIF, and WebP images allowed')
    .refine((file) => {
      if (!file) return true;
      return file.size <= 5 * 1024 * 1024; // 5MB limit
    }, 'Image size must be less than 5MB')
});

// Usage in components with React Hook Form
const { register, handleSubmit, formState: { errors } } = useForm<MessageFormData>({
  resolver: zodResolver(messageSchema),
  mode: 'onChange', // Real-time validation
});
```

### Responsive Design & Accessibility
- **Mobile-first**: Optimized for touch interfaces with WhatsApp-like scrolling
- **Breakpoint System**: Tailored layouts for different screen sizes using Tailwind CSS
- **Touch Gestures**: Swipe-friendly navigation and smooth scrolling
- **Keyboard Navigation**: Full keyboard accessibility with shortcuts (Ctrl+/, Ctrl+N)
- **ARIA Compliance**: Proper ARIA labels, live regions, and semantic HTML
- **Screen Reader Support**: Accessibility announcements for dynamic content

## 🎨 Customization

### Themes
The app supports light and dark modes with custom color schemes defined in `globals.css`. Colors are defined using OKLCH color space for better perceptual uniformity.

### Animations
Custom animations are defined for:
- Page transitions
- Toast notifications
- Loading states
- Hover effects

### Configuration
Key configuration options in:
- `stores/chatStore.ts` - Message pagination (20 per page), AI response patterns, throttling delays
- `lib/countryService.ts` - Country data fetching, popular countries list
- `lib/validations.ts` - Form validation rules, file size limits, security patterns
- `app/globals.css` - Theme colors using OKLCH color space, custom animations
- `components.json` - Tailwind CSS configuration, component aliases

## 🚀 Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Other Platforms
The app is a standard Next.js application and can be deployed to:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

### Environment Variables
No environment variables required for basic functionality. All features work with simulated data.

### Deployment Configuration
The project includes a `vercel.json` file with:
- Security headers (XSS protection, content type options)
- SPA routing configuration
- CORS headers for future API integration

## 📸 Screenshots

### Desktop Interface
![Desktop Chat Interface](https://via.placeholder.com/800x500/1f2937/ffffff?text=Desktop+Chat+Interface)
*Main chat interface with sidebar, message history, and typing indicator*

### Mobile Responsive Design
![Mobile Interface](https://via.placeholder.com/400x700/1f2937/ffffff?text=Mobile+Chat+Interface)
*Mobile-optimized layout with touch-friendly navigation*

### Authentication Flow
![OTP Authentication](https://via.placeholder.com/600x400/1f2937/ffffff?text=OTP+Authentication+Flow)
*Country selection and OTP verification process*

### Dark Mode
![Dark Mode Interface](https://via.placeholder.com/800x500/0f172a/ffffff?text=Dark+Mode+Interface)
*Dark theme with OKLCH color space for better contrast*

> **Note**: Replace placeholder images with actual screenshots of your deployed application

## 🧪 Testing

### Manual Testing Checklist
- [ ] Phone number validation with different country codes
- [ ] OTP verification flow (check console for simulated OTP)
- [ ] Chat creation and deletion with toast notifications
- [ ] Message sending (text and images with validation)
- [ ] Infinite scroll loading (scroll to top to load older messages)
- [ ] Search functionality with debounced input
- [ ] Theme switching (light/dark mode persistence)
- [ ] Mobile responsiveness across different screen sizes
- [ ] Keyboard navigation and shortcuts (Ctrl+/, Ctrl+N)
- [ ] Toast notifications for all user actions
- [ ] Image upload with file type and size validation
- [ ] Copy-to-clipboard functionality on message hover
- [ ] Typing indicators and AI response delays

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Performance Features
- **Lazy Loading**: Components and images load on demand
- **Debounced Search**: 300ms delay prevents excessive filtering
- **Optimized Scrolling**: Passive event listeners and RAF for smooth performance
- **Memory Management**: Proper cleanup of timeouts and event listeners

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the existing code style
4. Test your changes thoroughly using the manual testing checklist
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request with a detailed description

### Development Guidelines
- Follow TypeScript best practices and maintain type safety
- Use Tailwind CSS for styling (avoid custom CSS when possible)
- Implement proper error handling and loading states
- Add appropriate ARIA labels for accessibility
- Test on both desktop and mobile devices
- Ensure all forms have proper validation

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework with App Router
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Zustand](https://github.com/pmndrs/zustand) - Lightweight state management
- [React Hook Form](https://react-hook-form.com/) - Performant forms with easy validation
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [REST Countries](https://restcountries.com/) - Free country data API
- [Lucide](https://lucide.dev/) - Beautiful & consistent icon library
- [React Hot Toast](https://react-hot-toast.com/) - Smoking hot notifications

---

**Built with ❤️ for the Gemini Frontend Clone Assignment**

*This project demonstrates modern React/Next.js development practices, including advanced state management, form validation, responsive design, and accessibility features.*
