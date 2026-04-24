
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Perpustakaan LANTERA BACA',
    short_name: 'LANTERA BACA',
    description: 'Sistem Informasi Perpustakaan LANTERA BACA - Modern, AI, dan Sinkronisasi Cloud.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ECF0F7',
    theme_color: '#2E6ECE',
    icons: [
      {
        src: 'https://picsum.photos/seed/librarylogo/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
