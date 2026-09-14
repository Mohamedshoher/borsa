import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import ToastContainer from '@/components/Toast';

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'منصة إدارة محافظ الشركاء في البورصة | مركز الشاطبي',
  description: 'نظام مالي وإداري متكامل لإدارة محافظ الشركاء المستثمرين في البورصة وحساب الأرباح والخسائر وأتعاب الإدارة',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'محافظ الشاطبي',
  },
  applicationName: 'منصة الشاطبي للمحافظ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Tajawal:wght@300;400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] font-cairo">
        <AppProvider>
          {children}
          <ToastContainer />
        </AppProvider>
      </body>
    </html>
  );
}
