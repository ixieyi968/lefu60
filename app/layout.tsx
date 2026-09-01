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
  title: '乐福老师 60 岁生日会',
  description:
    '六十岁不退休，长聘续费成功。查看张老师生日会活动信息并提交 RSVP。',
  openGraph: {
    title: '乐福老师 60 岁生日会',
    description:
      '六十岁不退休，长聘续费成功。你导喊你回家吃饭啦。',
    images: ['/invitation-cover.webp'],
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
