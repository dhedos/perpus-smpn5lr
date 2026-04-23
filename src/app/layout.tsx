
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider";

export const metadata: Metadata = {
  title: 'Pustaka Nusantara - SMPN 5 LANGKE REMBONG',
  description: 'Sistem Informasi Perpustakaan Modern SMPN 5 Langke Rembong.',
  icons: {
    // Anda bisa mengganti URL di bawah ini dengan URL logo sekolah Anda
    icon: 'https://picsum.photos/seed/librarylogo/128/128',
    shortcut: 'https://picsum.photos/seed/librarylogo/128/128',
    apple: 'https://picsum.photos/seed/librarylogo/128/128',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#2E6ECE" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
