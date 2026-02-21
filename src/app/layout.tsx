import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import DemoBanner from '@/components/DemoBanner';

export const metadata: Metadata = {
  title: 'CryptoExchange - Demo Trading Platform',
  description: 'A demo cryptocurrency exchange for educational purposes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Navbar />
        <div style={{ paddingTop: '56px' }}>
          <DemoBanner />
          {children}
        </div>
      </body>
    </html>
  );
}
