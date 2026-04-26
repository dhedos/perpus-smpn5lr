
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider";

export async function generateMetadata(): Promise<Metadata> {
  let logoUrl = 'https://picsum.photos/seed/librarylogo/128/128';
  let libraryName = 'LANTERA BACA';
  let librarySubtitle = 'SMPN 5 LANGKE REMBONG';

  try {
    // Fetch settings directly from Firestore via REST API
    const res = await fetch('https://firestore.googleapis.com/v1/projects/studio-6126048245-d2203/databases/(default)/documents/settings/general', {
      next: { revalidate: 60 }
    });
    
    if (res.ok) {
      const data = await res.json();
      const fields = data.fields;
      if (fields) {
        logoUrl = fields.libraryLogoUrl?.stringValue || logoUrl;
        libraryName = fields.libraryName?.stringValue || libraryName;
        librarySubtitle = fields.librarySubtitle?.stringValue || librarySubtitle;
      }
    }
  } catch (e) {
    // Fallback to defaults
  }

  return {
    title: `${libraryName} - ${librarySubtitle}`,
    description: `Sistem Informasi Perpustakaan Modern ${libraryName} ${librarySubtitle}.`,
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
    },
  };
}

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
