import { Inter, JetBrains_Mono } from 'next/font/google';

import type { Metadata } from 'next';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { ThemeProvider } from '@/components/theme-provider';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'ActFlow - Next.js Actions, Standardized',
  description:
    '통합된 패턴으로 Next.js Server Actions, RSC, React 18/19 hooks를 표준화하는 오픈소스 라이브러리',
  keywords: ['Next.js', 'Server Actions', 'React', 'TypeScript', 'Open Source'],
  authors: [{ name: 'ActFlow Team' }],
  openGraph: {
    title: 'ActFlow - Next.js Actions, Standardized',
    description: '통합된 패턴으로 Next.js Server Actions을 표준화',
    type: 'website',
    url: 'https://actflow.dev',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ActFlow - Next.js Actions, Standardized',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ActFlow - Next.js Actions, Standardized',
    description: '통합된 패턴으로 Next.js Server Actions을 표준화',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="relative w-full min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
