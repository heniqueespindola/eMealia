import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets:  ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title:       'eMealia — Da tua despensa à mesa',
  description: 'Descobre receitas com o que tens em casa. Sem desperdício, sem stress.',
  keywords:    ['receitas', 'despensa', 'planeamento refeições', 'Portugal', 'Espanha'],
  openGraph: {
    title:       'eMealia',
    description: 'Da tua despensa à mesa — sem desperdício, sem stress.',
    locale:      'pt_PT',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-bgLight text-black antialiased">{children}</body>
    </html>
  );
}
