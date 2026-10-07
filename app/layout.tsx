import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemini Chat - AI Conversational Assistant",
  description: "A modern chat application powered by Gemini AI. Experience intelligent conversations with advanced features like image sharing, real-time messaging, and intuitive design.",
  keywords: ["AI", "Chat", "Gemini", "Conversation", "Assistant", "Messaging"],
  authors: [{ name: "Gemini Chat Team" }],
};

// Next.js 15 requires viewport to be its own export; declaring it inside
// `metadata` is ignored and warned about at build time.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The composer sits above the iOS home indicator, so the safe area matters.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
