import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lefu60-beer.xieyi968.chatgpt.site'),
  title: '人生一甲子 乐福正当时',
  description: '你导喊你回家吃饭啦',
  openGraph: {
    title: '人生一甲子 乐福正当时',
    description: '你导喊你回家吃饭啦',
    images: [
      {
        url: '/og-square.png',
        width: 1200,
        height: 1200,
        alt: '人生一甲子 乐福正当时',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '人生一甲子 乐福正当时',
    description: '你导喊你回家吃饭啦',
    images: ['/og-square.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#eef0ec',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
