import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Assuming you might want basic global styles

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Logto OIDC Sample',
  description: 'Next.js sample using LTI Bridge as OIDC Provider for Logto',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
