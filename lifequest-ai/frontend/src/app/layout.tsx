import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LIFEQUEST AI — Executive Gamified Productivity Platform',
  description: 'Enterprise gamified productivity platform. Translate high-impact goals, deep work routines, and personal development into verified RPG quests and compound attribute progression.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  keywords: 'productivity, professional, gamification, habits, task management, AI Game Master',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`light ${jakarta.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
