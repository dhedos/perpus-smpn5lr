import { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Default values
  let logoUrl = 'https://picsum.photos/seed/librarylogo/512/512';
  let libraryName = 'LANTERA BACA';
  
  try {
    // Fetch settings directly from Firestore via REST API for manifest generation
    const res = await fetch('https://firestore.googleapis.com/v1/projects/studio-6126048245-d2203/databases/(default)/documents/settings/general', {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5000) // Timeout 5 detik agar build tidak stuck
    });
    
    if (res.ok) {
      const data = await res.json();
      const fields = data.fields;
      if (fields) {
        if (fields.libraryLogoUrl?.stringValue) {
          logoUrl = fields.libraryLogoUrl.stringValue;
        }
        if (fields.libraryName?.stringValue) {
          libraryName = fields.libraryName.stringValue;
        }
      }
    }
  } catch (e) {
    console.warn('Fallback to default manifest settings during build/fetch failure');
  }

  return {
    name: `Perpustakaan ${libraryName}`,
    short_name: libraryName,
    description: `Sistem Informasi Perpustakaan ${libraryName} - Modern, AI, dan Sinkronisasi Cloud.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
    ],
  }
}
