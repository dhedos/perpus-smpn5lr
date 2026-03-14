
"use client"

import { useState } from "react"
import { MOCK_BOOKS, Book } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Sparkles, 
  ScanBarcode, 
  Download, 
  FileSpreadsheet,
  MoreVertical
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { generateBookDescription } from "@/ai/flows/generate-book-description-flow"
import { useToast } from "@/hooks/use-toast"

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>(MOCK_BOOKS)
  const [search, setSearch] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [newBook, setNewBook] = useState<Partial<Book>>({
    title: "",
    author: "",
    isbn: "",
    description: ""
  })
  const { toast } = useToast()

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleGenerateDescription = async () => {
    if (!newBook.title) {
      toast({ title: "Judul Kosong", description: "Harap isi judul buku terlebih dahulu.", variant: "destructive" })
      return
    }
    
    setIsGenerating(true)
    try {
      const result = await generateBookDescription({
        title: newBook.title,
        author: newBook.author,
        isbn: newBook.isbn
      })
      setNewBook(prev => ({ ...prev, description: result.description }))
      toast({ title: "Berhasil!", description: "Deskripsi buku telah dibuat oleh AI." })
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal membuat deskripsi. Coba lagi nanti.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Koleksi Buku</h1>
          <p className="text-muted-foreground text-sm">Kelola katalog buku, stok, dan lokasi rak.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Buku
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Tambah Koleksi Baru</DialogTitle>
                <DialogDescription>Gunakan AI untuk membantu mengisi deskripsi buku secara otomatis.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Buku</Label>
                  <Input 
                    id="title" 
                    placeholder="Contoh: Laskar Pelangi" 
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Pengarang</Label>
                  <Input 
                    id="author" 
                    placeholder="Andrea Hirata" 
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input 
                    id="isbn" 
                    placeholder="978-..." 
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input id="category" placeholder="Fiksi / Pelajaran" />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary gap-1 h-7"
                      onClick={handleGenerateDescription}
                      disabled={isGenerating}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isGenerating ? "Menghasilkan..." : "Gunakan AI"}
                    </Button>
                  </div>
                  <Textarea 
                    id="description" 
                    placeholder="Tulis deskripsi atau gunakan tombol AI di atas..." 
                    className="min-h-[120px]"
                    value={newBook.description}
                    onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Batal</Button>
                <Button>Simpan Koleksi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari berdasarkan judul, penulis, atau kode..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <ScanBarcode className="h-4 w-4" />
          Scan Barcode
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Kode</TableHead>
              <TableHead>Judul & Penulis</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.code}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{book.title}</span>
                    <span className="text-xs text-muted-foreground">{book.author}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{book.category}</Badge>
                </TableCell>
                <TableCell>Rak {book.rackLocation}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={book.availableStock <= 2 ? "text-destructive font-bold" : ""}>
                      {book.availableStock}
                    </span>
                    <span className="text-muted-foreground">/ {book.totalStock}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2">
                        <Edit className="h-4 w-4" /> Ubah
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <ScanBarcode className="h-4 w-4" /> Label Barcode
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
