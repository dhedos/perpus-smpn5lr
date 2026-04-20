
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Perpustakaan SMPN 5 LANGKE REMBONG',
    short_name: 'Pustaka Nusantara',
    description: 'Sistem Informasi Perpustakaan SMPN 5 Langke Rembong - Modern, AI, dan Sinkronisasi Cloud.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ECF0F7',
    theme_color: '#2E6ECE',
    icons: [
      {
        src: 'https://picsum.photos/seed/smpn5logo/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
