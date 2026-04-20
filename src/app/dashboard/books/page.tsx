"use client"

import { useState, useMemo, useRef, useEffect } from "react"
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
  MoreVertical,
  Loader2,
  QrCode,
  Printer,
  X,
  FileDown,
  Eye,
  Info,
  Calendar as CalendarIcon,
  Filter,
  ChevronDown
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { generateBookDescription } from "@/ai/flows/generate-book-description-flow"
import { useToast } from "@/hooks/use-toast"
import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase 
} from '@/firebase'
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, orderBy } from 'firebase/firestore'

export default function BooksPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [displayLimit, setDisplayLimit] = useState(50)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)
  const [selectedBookQr, setSelectedBookQr] = useState<any>(null)
  const [selectedBookDetail, setSelectedBookDetail] = useState<any>(null)
  
  const scannerInstanceRef = useRef<any>(null)

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    author: "",
    publisher: "",
    publicationYear: new Date().getFullYear(),
    acquisitionDate: new Date().toISOString().split('T')[0],
    isbn: "",
    category: "",
    rackLocation: "",
    totalStock: 1,
    availableStock: 1,
    description: ""
  })

  const [editingBookId, setEditingBookId] = useState<string | null>(null)

  const booksCollectionQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, 'books'), 
      orderBy('createdAt', 'desc'), 
      limit(displayLimit)
    )
  }, [db, displayLimit])

  const { data: books, loading } = useCollection(booksCollectionQuery)

  const categories = useMemo(() => {
    if (!books) return []
    const cats = books.map(b => b.category).filter(Boolean)
    return Array.from(new Set(cats))
  }, [books])

  const years = useMemo(() => {
    if (!books) return []
    const yrs = books.map(b => b.publicationYear?.toString()).filter(Boolean)
    return Array.from(new Set(yrs)).sort((a, b) => Number(b) - Number(a))
  }, [books])

  const filteredBooks = useMemo(() => {
    if (!books) return []
    return books.filter(b => {
      const matchesSearch = 
        (b.title?.toLowerCase() || "").includes(search.toLowerCase()) || 
        (b.author?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (b.code?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (b.isbn?.toLowerCase() || "").includes(search.toLowerCase());
      
      const matchesCategory = filterCategory === "all" || b.category === filterCategory;
      const matchesYear = filterYear === "all" || b.publicationYear?.toString() === filterYear;
      
      return matchesSearch && matchesCategory && matchesYear;
    })
  }, [books, search, filterCategory, filterYear])

  const handleExportExcel = async () => {
    try {
      if (filteredBooks.length === 0) {
        toast({ title: "Data Kosong", description: "Tidak ada data untuk diekspor." })
        return
      }

      const { utils, writeFile } = await import("xlsx")
      const dataToExport = filteredBooks.map((book, index) => ({
        "No": index + 1,
        "Kode": book.code,
        "Judul": book.title,
        "Pengarang": book.author,
        "Thn Terbit": book.publicationYear,
        "Tgl Penerimaan": book.acquisitionDate,
        "Jenis": book.category,
        "Stok": book.totalStock
      }))
      
      const worksheet = utils.json_to_sheet(dataToExport)
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, worksheet, "Koleksi Buku")
      
      const dateStr = new Date().toISOString().split('T')[0]
      writeFile(workbook, `Koleksi_Buku_SMPN5_${dateStr}.xlsx`)
      
      toast({ 
        title: "Berhasil Ekspor", 
        description: "File Excel berhasil dibuat." 
      })
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal mengekspor data.", variant: "destructive" })
    }
  }

  const handlePrintAllQrs = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Label QR - SMPN 5</title>
          <style>
            @page { size: A4; margin: 5mm; }
            body { margin: 0; display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start; font-family: sans-serif; background: #fff; }
            .sticker { border: 0.5px solid #eee; padding: 6px; text-align: center; width: 120px; height: 150px; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid; }
            .qr-img { width: 85px; height: 85px; margin-bottom: 4px; }
            .title { font-size: 7px; font-weight: bold; margin: 1px 0; height: 18px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .code { font-size: 9px; font-weight: bold; color: #2E6ECE; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          \${filteredBooks.map(book => `
            <div class="sticker">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${book.code}" class="qr-img" />
              <div class="title">\${book.title}</div>
              <div class="code">\${book.code}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleGenerateDescription = async () => {
    if (!formData.title) return
    setIsGenerating(true)
    try {
      const result = await generateBookDescription({ title: formData.title, author: formData.author, isbn: formData.isbn })
      setFormData(prev => ({ ...prev, description: result.description }))
    } catch (e) { toast({ title: "AI Sibuk", variant: "destructive" }) }
    finally { setIsGenerating(false) }
  }

  const handleSaveBook = () => {
    if (!db) return
    setIsSaving(true)
    addDoc(collection(db, 'books'), { 
      ...formData, 
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    })
      .then(() => {
        setIsOpen(false)
        toast({ title: "Berhasil!", description: "Buku telah terdaftar." })
        setFormData({ code: "", title: "", author: "", publisher: "", publicationYear: new Date().getFullYear(), acquisitionDate: new Date().toISOString().split('T')[0], isbn: "", category: "", rackLocation: "", totalStock: 1, availableStock: 1, description: "" })
      })
      .catch(() => toast({ title: "Gagal", variant: "destructive" }))
      .finally(() => setIsSaving(false))
  }

  const handleUpdateBook = () => {
    if (!db || !editingBookId) return
    setIsSaving(true)
    updateDoc(doc(db, 'books', editingBookId), { 
      ...formData, 
      updatedAt: new Date().toISOString() 
    })
      .then(() => {
        setIsEditOpen(false)
        toast({ title: "Berhasil!", description: "Data diperbarui." })
      })
      .catch(() => toast({ title: "Gagal", variant: "destructive" }))
      .finally(() => setIsSaving(false))
  }

  const handleDeleteBook = () => {
    if (!db || !bookToDelete) return
    deleteDoc(doc(db, 'books', bookToDelete))
      .then(() => {
        setIsDeleteDialogOpen(false)
        setBookToDelete(null)
        toast({ title: "Terhapus", description: "Buku telah dihapus dari koleksi." })
      })
      .catch(() => toast({ title: "Gagal menghapus", variant: "destructive" }))
  }

  const startScanner = async () => {
    setIsScannerOpen(true)
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const scanner = new Html5Qrcode("scanner-view")
        scannerInstanceRef.current = scanner
        await scanner.start(
          { facingMode: "environment" },
          { fps: 20, qrbox: { width: 280, height: 160 }, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13] },
          (text) => { setSearch(text); stopScanner(); },
          () => {}
        )
      }, 500)
    } catch (e) { toast({ title: "Kamera Error", variant: "destructive" }) }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      if (scannerInstanceRef.current.isScanning) {
        await scannerInstanceRef.current.stop()
      }
      try {
        await scannerInstanceRef.current.clear()
      } catch (e) {}
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Koleksi Buku</h1>
          <p className="text-muted-foreground text-sm">Manajemen katalog dan inventaris perpustakaan.</p>
        </div>
        <div className="flex wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintAllQrs} className="hidden md:flex"><Printer className="h-4 w-4 mr-2" />Cetak Semua QR</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="h-4 w-4 mr-2" />Excel</Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Tambah Buku</Button></DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-50">
              <DialogHeader><DialogTitle>Tambah Buku Baru</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Kode Buku</Label>
                  <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Judul Buku</Label>
                  <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Pengarang</Label>
                  <Input value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Tahun Terbit</Label>
                  <Input type="number" value={formData.publicationYear} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">ISBN</Label>
                  <Input value={formData.isbn} onChange={e => setFormData({ ...formData, isbn: e.target.value })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Jenis / Kategori</Label>
                  <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Fiksi, Sains, dll" className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Jumlah Stok</Label>
                  <Input type="number" value={formData.totalStock} onChange={e => setFormData({ ...formData, totalStock: Number(e.target.value), availableStock: Number(e.target.value) })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Lokasi Rak</Label>
                  <Input value={formData.rackLocation} onChange={e => setFormData({ ...formData, rackLocation: e.target.value })} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex justify-between items-center"><Label className="font-semibold">Deskripsi / Ringkasan</Label><Button variant="ghost" type="button" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}><Sparkles className="h-3 w-3 mr-1" />AI Deskripsi</Button></div>
                  <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px] bg-white border-slate-300" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button onClick={handleSaveBook} disabled={isSaving} className="px-8">Simpan Data</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-card p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari Judul, Kode, Pengarang..." 
            className="pl-10 bg-white border-slate-300 h-11" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-white border-slate-300 h-11 flex-1">
              <div className="flex items-center gap-2"><Filter className="h-3 w-3 text-primary" /><SelectValue placeholder="Kategori" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="bg-white border-slate-300 h-11 flex-1">
              <div className="flex items-center gap-2"><CalendarIcon className="h-3 w-3 text-primary" /><SelectValue placeholder="Tahun" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tahun</SelectItem>
              {years.map(yr => <SelectItem key={yr} value={yr}>{yr}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="secondary" className="h-11 px-4" onClick={startScanner}><ScanBarcode className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-center">No.</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Judul & Pengarang</TableHead>
              <TableHead>Thn Terbit</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredBooks.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Tidak ada buku ditemukan.</TableCell></TableRow>
            ) : filteredBooks.map((book, index) => (
              <TableRow key={book.id}>
                <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs font-bold text-primary">{book.code}</TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-semibold leading-none">{book.title}</p>
                    <p className="text-[10px] text-muted-foreground">{book.author}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{book.publicationYear}</TableCell>
                <TableCell className="text-xs font-medium">{book.availableStock}/{book.totalStock}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedBookDetail(book); setIsDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" />Lihat Detail</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedBookQr(book); setIsQrOpen(true); }}><QrCode className="h-4 w-4 mr-2" />Tampilkan QR</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingBookId(book.id); setFormData({ ...book }); setIsEditOpen(true); }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => { setBookToDelete(book.id); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {books && books.length >= displayLimit && (
          <div className="p-4 text-center border-t bg-slate-50">
            <Button variant="ghost" size="sm" onClick={() => setDisplayLimit(prev => prev + 50)} className="text-primary font-bold">
              <ChevronDown className="h-4 w-4 mr-2" /> Muat Lebih Banyak
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-2xl p-0 border-none bg-black h-[100dvh] sm:h-auto overflow-hidden">
          <DialogHeader className="sr-only"><DialogTitle>Pemindai QR Code Buku</DialogTitle></DialogHeader>
          <div id="scanner-view" className="w-full h-full bg-black"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-primary"><Info className="h-5 w-5" />Informasi Detail Buku</DialogTitle></DialogHeader>
          {selectedBookDetail && (
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Judul Buku</Label><p className="font-bold text-lg leading-tight">{selectedBookDetail.title}</p></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Kode Koleksi</Label><p className="font-mono text-primary font-bold">{selectedBookDetail.code}</p></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Pengarang</Label><p>{selectedBookDetail.author}</p></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Tgl. Penerimaan</Label><div className="flex items-center gap-2"><CalendarIcon className="h-3 w-3 text-muted-foreground" /><p>{selectedBookDetail.acquisitionDate ? new Date(selectedBookDetail.acquisitionDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</p></div></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Jenis & Lokasi Rak</Label><p><Badge variant="secondary" className="mr-2">{selectedBookDetail.category}</Badge> {selectedBookDetail.rackLocation || 'Rak belum diatur'}</p></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Status Ketersediaan</Label><p className="font-semibold text-blue-600">{selectedBookDetail.availableStock} dari {selectedBookDetail.totalStock} tersedia</p></div>
              <div className="col-span-2 space-y-1 pt-2 border-t">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Deskripsi / Ringkasan AI</Label>
                <div className="text-sm bg-muted/30 p-4 rounded-lg italic leading-relaxed">{selectedBookDetail.description || 'Tidak ada deskripsi.'}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setIsDetailOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle>QR Code Buku</DialogTitle></DialogHeader>
          <div className="bg-white p-6 rounded-xl border flex justify-center">
            {selectedBookQr && <QRCodeSVG value={selectedBookQr.code} size={240} includeMargin />}
          </div>
          <div className="font-bold"><p>{selectedBookQr?.title}</p><p className="text-primary">{selectedBookQr?.code}</p></div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Cetak</Button>
            <Button onClick={() => setIsQrOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-slate-50">
          <DialogHeader><DialogTitle>Ubah Data Buku</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label className="font-semibold">Kode Buku</Label><Input value={formData.code} disabled className="bg-muted border-slate-300" /></div>
            <div className="space-y-2"><Label className="font-semibold">Judul Buku</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold">Pengarang</Label><Input value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold">Tahun Terbit</Label><Input type="number" value={formData.publicationYear} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold">Jumlah Stok</Label><Input type="number" value={formData.totalStock} onChange={e => setFormData({ ...formData, totalStock: Number(e.target.value) })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold">Stok Tersedia</Label><Input type="number" value={formData.availableStock} onChange={e => setFormData({ ...formData, availableStock: Number(e.target.value) })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold">Tgl. Penerimaan</Label><Input type="date" value={formData.acquisitionDate} onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold">Jenis / Kategori</Label><Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="col-span-2 space-y-2"><Label className="font-semibold">Deskripsi</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px] bg-white border-slate-300" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateBook} disabled={isSaving} className="px-8">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Buku?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini permanen. Pastikan buku sudah tidak ada di inventaris.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus Permanen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}