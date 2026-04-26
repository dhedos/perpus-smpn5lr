
import { MetadataRoute } from 'next'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Default values
  let logoUrl = 'https://picsum.photos/seed/librarylogo/512/512';
  let libraryName = 'LANTERA BACA';
  
  try {
    // Fetch settings directly from Firestore via REST API for manifest generation
    const res = await fetch('https://firestore.googleapis.com/v1/projects/studio-6126048245-d2203/databases/(default)/documents/settings/general', {
      next: { revalidate: 60 } // Cache for 1 minute
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
    console.error('Failed to fetch manifest settings', e);
  }

  return {
    name: `Perpustakaan ${libraryName}`,
    short_name: libraryName,
    description: `Sistem Informasi Perpustakaan ${libraryName} - Modern, AI, dan Sinkronisasi Cloud.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ECF0F7',
    theme_color: '#2E6ECE',
    icons: [
      {
        src: logoUrl,
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
