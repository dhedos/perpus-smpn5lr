import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from "@/firebase/client-provider";

const FIREBASE_PROJECT_ID = "studio-6126048245-d2203";
const SETTINGS_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/settings/general`;

async function getBranding() {
  try {
    const res = await fetch(SETTINGS_URL, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(5000)
    });
    
    if (res.ok) {
      const data = await res.json();
      const fields = data.fields;
      if (fields) {
        return {
          logoUrl: fields.libraryLogoUrl?.stringValue || '',
          libraryName: fields.libraryName?.stringValue || 'LANTERA BACA',
          librarySubtitle: fields.librarySubtitle?.stringValue || 'SMPN 5 LANGKE REMBONG'
        };
      }
    }
  } catch (e) {
    console.warn('Branding fetch failed, using defaults');
  }
  return {
    logoUrl: '',
    libraryName: 'LANTERA BACA',
    librarySubtitle: 'SMPN 5 LANGKE REMBONG'
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `${branding.libraryName} - ${branding.librarySubtitle}`,
    description: `Sistem Informasi Perpustakaan Modern ${branding.libraryName} ${branding.librarySubtitle}.`,
    icons: {
      icon: branding.logoUrl ? [
        { url: branding.logoUrl, sizes: '32x32' },
        { url: branding.logoUrl, sizes: '192x192' },
        { url: branding.logoUrl, sizes: '512x512' }
      ] : [],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();

  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#2E6ECE" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__BRANDING__ = ${JSON.stringify(branding)};`,
          }}
        />
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
