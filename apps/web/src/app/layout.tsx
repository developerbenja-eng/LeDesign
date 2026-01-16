import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LeDesign - Ingeniería Chilena',
  description: 'Plataforma integral de diseño ingenieril para ingeniería estructural, pavimentos, hidráulica y vial. Implementa normas chilenas NCh.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
