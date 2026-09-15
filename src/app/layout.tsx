import type { Metadata } from 'next';
import { Inter, Anton } from 'next/font/google';
import Header from '@/components/Header';
import SideNav from '@/components/SideNav';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });

export const metadata: Metadata = {
  title: 'NFL DE BUTECO',
  description: 'Bolão de palpites da NFL entre amigos - toda semana, sem dinheiro, só honra.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${anton.variable} font-body bg-buteco-black text-buteco-white min-h-screen`}>
        <div className="relative z-10">
          <Header />
          <main className="max-w-5xl mx-auto">{children}</main>
          <SideNav />
        </div>
      </body>
    </html>
  );
}
