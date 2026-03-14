
export interface Book {
  id: string;
  code: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  category: string;
  isbn: string;
  rackLocation: string;
  totalStock: number;
  availableStock: number;
  coverUrl: string;
  description: string;
}

export interface Member {
  id: string;
  memberId: string; // NIP or NIS
  name: string;
  type: 'Student' | 'Teacher';
  classOrSubject: string;
  phone: string;
  address: string;
  joinDate: string;
}

export const MOCK_BOOKS: Book[] = [
  {
    id: '1',
    code: 'B001',
    title: 'Dasar Pemrograman Web',
    author: 'Andi Pratama',
    publisher: 'Gramedia',
    year: 2022,
    category: 'Teknologi',
    isbn: '978-602-1234-56-7',
    rackLocation: 'A-1',
    totalStock: 5,
    availableStock: 3,
    coverUrl: 'https://picsum.photos/seed/book1/400/600',
    description: 'Buku panduan lengkap dasar-dasar pemrograman web menggunakan HTML, CSS, dan JavaScript.'
  },
  {
    id: '2',
    code: 'B002',
    title: 'Fisika Kuantum untuk Pemula',
    author: 'Dr. Budi Santoso',
    publisher: 'Erlangga',
    year: 2021,
    category: 'Sains',
    isbn: '978-602-5678-90-1',
    rackLocation: 'B-4',
    totalStock: 3,
    availableStock: 3,
    coverUrl: 'https://picsum.photos/seed/book2/400/600',
    description: 'Menjelaskan konsep fisika kuantum dengan bahasa yang mudah dipahami oleh siswa sekolah menengah.'
  },
  {
    id: '3',
    code: 'B003',
    title: 'Sejarah Nusantara',
    author: 'Siti Aminah',
    publisher: 'Balai Pustaka',
    year: 2020,
    category: 'Sejarah',
    isbn: '978-602-9999-11-2',
    rackLocation: 'C-2',
    totalStock: 10,
    availableStock: 8,
    coverUrl: 'https://picsum.photos/seed/book3/400/600',
    description: 'Mengulas perjalanan sejarah Indonesia dari masa prasejarah hingga era kemerdekaan.'
  }
];

export const MOCK_MEMBERS: Member[] = [
  {
    id: 'm1',
    memberId: 'NIS12345',
    name: 'Rian Hidayat',
    type: 'Student',
    classOrSubject: 'XI-IPA-1',
    phone: '081234567890',
    address: 'Jl. Melati No. 12',
    joinDate: '2023-01-15'
  },
  {
    id: 'm2',
    memberId: 'NIP98765',
    name: 'Ibu Ratna S.Pd',
    type: 'Teacher',
    classOrSubject: 'Matematika',
    phone: '081299998888',
    address: 'Jl. Mawar No. 45',
    joinDate: '2022-06-10'
  }
];
