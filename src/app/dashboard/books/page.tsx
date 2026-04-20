
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
  FileSpreadsheet,
  MoreVertical,
  Loader2,
  Camera,
  QrCode,
  Printer,
  Download
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
import { Card } from "@/components/ui/card"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { generateBookDescription } from "@/ai/flows/generate-book-description-flow"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { QRCodeSVG } from "qrcode.react"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function BooksPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<"search" | "isbn">("search")
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [selectedBookQr, setSelectedBookQr] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scannerInstanceRef = useRef<any>(null)

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    author: "",
    isbn: "",
    category: "",
    rackLocation: "",
    totalStock: 1,
    availableStock: 1,
    description: ""
  })

  const [editingBookId, setEditingBookId] = useState<string | null>(null)

  // Get books from Firestore
  const booksCollectionRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'books')
  }, [db])

  const { data: books, loading } = useCollection(booksCollectionRef)

  const filteredBooks = useMemo(() => {
    if (!books) return []
    return books.filter(b => 
      (b.title?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (b.author?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (b.code?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (b.isbn?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [books, search])

  // --- EXCEL IMPORT LOGIC ---
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !db || !booksCollectionRef) return

    const { read, utils } = await import("xlsx")

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json: any[] = utils.sheet_to_json(worksheet)

        if (json.length === 0) {
          toast({ title: "Gagal", description: "File Excel kosong.", variant: "destructive" })
          return
        }

        toast({ title: "Mengimpor...", description: `Sedang mengimpor ${json.length} buku.` })

        for (const row of json) {
          const bookData = {
            code: String(row.code || row.id || ""),
            title: String(row.title || row.Judul || ""),
            author: String(row.author || row.Pengarang || ""),
            isbn: String(row.isbn || row.ISBN || ""),
            category: String(row.category || row.Kategori || ""),
            rackLocation: String(row.rackLocation || row.Rak || ""),
            totalStock: Number(row.totalStock || row.Stok || 1),
            availableStock: Number(row.availableStock || row.Tersedia || 1),
            description: String(row.description || ""),
            createdAt: new Date().toISOString()
          }

          if (bookData.title && bookData.code) {
            addDoc(booksCollectionRef, bookData).catch(() => {})
          }
        }

        toast({ title: "Berhasil!", description: `${json.length} buku telah diproses.` })
      } catch (error) {
        toast({ title: "Gagal", description: "Gagal membaca file Excel.", variant: "destructive" })
      }
    }
    reader.readAsArrayBuffer(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // --- BARCODE SCANNER LOGIC ---
  const startScanner = async (target: "search" | "isbn" = "search") => {
    setScannerTarget(target)
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    const { Html5Qrcode } = await import("html5-qrcode")

    setTimeout(async () => {
      const container = document.getElementById("scanner-container")
      if (!container) return

      try {
        const scanner = new Html5Qrcode("scanner-container")
        scannerInstanceRef.current = scanner
        
        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (target === "search") {
              setSearch(decodedText)
            } else {
              setFormData(prev => ({ ...prev, isbn: decodedText }))
            }
            stopScanner()
            toast({ title: "Berhasil!", description: `Barcode terdeteksi: ${decodedText}` })
          },
          () => {}
        )
        setHasCameraPermission(true)
      } catch (err) {
        console.error("Scanner error:", err)
        setHasCameraPermission(false)
      }
    }, 300)
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
      } catch (e) {
        console.error("Error stopping scanner:", e)
      }
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
  }

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      toast({ title: "Judul Kosong", description: "Harap isi judul buku terlebih dahulu.", variant: "destructive" })
      return
    }
    
    setIsGenerating(true)
    try {
      const result = await generateBookDescription({
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn
      })
      setFormData(prev => ({ ...prev, description: result.description }))
      toast({ title: "Berhasil!", description: "Deskripsi buku telah dibuat oleh AI." })
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal membuat deskripsi. Coba lagi nanti.", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveBook = () => {
    if (!db || !booksCollectionRef) return
    if (!formData.title || !formData.code) {
      toast({ title: "Data Belum Lengkap", description: "Judul dan Kode Buku wajib diisi.", variant: "destructive" })
      return
    }

    setIsSaving(true)
    
    addDoc(booksCollectionRef, {
      ...formData,
      totalStock: Number(formData.totalStock),
      availableStock: Number(formData.availableStock),
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Berhasil!", description: "Buku baru telah ditambahkan ke koleksi." })
      setIsOpen(false)
      setFormData({
        code: "",
        title: "",
        author: "",
        isbn: "",
        category: "",
        rackLocation: "",
        totalStock: 1,
        availableStock: 1,
        description: ""
      })
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: booksCollectionRef.path,
        operation: 'create',
        requestResourceData: formData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsSaving(false)
    })
  }

  const handleUpdateBook = () => {
    if (!db || !editingBookId) return
    
    setIsSaving(true)
    const bookDocRef = doc(db, 'books', editingBookId)
    
    updateDoc(bookDocRef, {
      ...formData,
      totalStock: Number(formData.totalStock),
      availableStock: Number(formData.availableStock),
      updatedAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Berhasil!", description: "Data buku telah diperbarui." })
      setIsEditOpen(false)
      setEditingBookId(null)
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: bookDocRef.path,
        operation: 'update',
        requestResourceData: formData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsSaving(false)
    })
  }

  const handleDeleteBook = (bookId: string) => {
    if (!db) return
    const bookDocRef = doc(db, 'books', bookId)
    
    deleteDoc(bookDocRef).catch(async (error) => {
       const permissionError = new FirestorePermissionError({
        path: bookDocRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
  }

  const openEditDialog = (book: any) => {
    setEditingBookId(book.id)
    setFormData({
      code: book.code || "",
      title: book.title || "",
      author: book.author || "",
      isbn: book.isbn || "",
      category: book.category || "",
      rackLocation: book.rackLocation || "",
      totalStock: Number(book.totalStock || 1),
      availableStock: Number(book.availableStock || 1),
      description: book.description || ""
    })
    setIsEditOpen(true)
  }

  const openQrDialog = (book: any) => {
    setSelectedBookQr(book)
    setIsQrOpen(true)
  }

  const handlePrintQr = () => {
    const printContent = document.getElementById("printable-qr");
    if (!printContent) return;
    
    const windowPrint = window.open('', '', 'width=600,height=600');
    if (!windowPrint) return;
    
    windowPrint.document.write('<html><head><title>Print QR Buku</title>');
    windowPrint.document.write('<style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;} .title{margin-top:20px;font-weight:bold;text-align:center;}</style>');
    windowPrint.document.write('</head><body>');
    windowPrint.document.write(printContent.innerHTML);
    windowPrint.document.write('<div class="title">' + selectedBookQr.title + '<br>' + selectedBookQr.code + '</div>');
    windowPrint.document.write('</body></html>');
    windowPrint.document.close();
    windowPrint.focus();
    windowPrint.print();
    windowPrint.close();
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Koleksi Buku</h1>
          <p className="text-muted-foreground text-sm">Kelola katalog buku, stok, dan lokasi rak.</p>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
          />
          <Button variant="outline" className="gap-2" onClick={handleImportClick}>
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Buku
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Koleksi Baru</DialogTitle>
                <DialogDescription>Gunakan AI untuk membantu mengisi deskripsi buku secara otomatis.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Buku</Label>
                  <Input 
                    id="code" 
                    placeholder="B001" 
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Buku</Label>
                  <Input 
                    id="title" 
                    placeholder="Contoh: Laskar Pelangi" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Pengarang</Label>
                  <Input 
                    id="author" 
                    placeholder="Andrea Hirata" 
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="isbn" 
                      placeholder="978-..." 
                      className="flex-1"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    />
                    <Button variant="secondary" size="icon" onClick={() => startScanner("isbn")}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input 
                    id="category" 
                    placeholder="Fiksi / Pelajaran" 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rack">Lokasi Rak</Label>
                  <Input 
                    id="rack" 
                    placeholder="A-1" 
                    value={formData.rackLocation}
                    onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalStock">Total Stok</Label>
                  <Input 
                    id="totalStock" 
                    type="number" 
                    value={formData.totalStock}
                    onChange={(e) => setFormData({ ...formData, totalStock: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availableStock">Stok Tersedia</Label>
                  <Input 
                    id="availableStock" 
                    type="number" 
                    value={formData.availableStock}
                    onChange={(e) => setFormData({ ...formData, availableStock: Number(e.target.value) })}
                  />
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
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button onClick={handleSaveBook} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Koleksi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ubah Data Buku</DialogTitle>
                <DialogDescription>Perbarui informasi katalog buku yang sudah terdaftar.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Kode Buku</Label>
                  <Input 
                    id="edit-code" 
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Judul Buku</Label>
                  <Input 
                    id="edit-title" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-author">Pengarang</Label>
                  <Input 
                    id="edit-author" 
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-isbn">ISBN</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="edit-isbn" 
                      value={formData.isbn}
                      className="flex-1"
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    />
                    <Button variant="secondary" size="icon" onClick={() => startScanner("isbn")}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Kategori</Label>
                  <Input 
                    id="edit-category" 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-rack">Lokasi Rak</Label>
                  <Input 
                    id="edit-rack" 
                    value={formData.rackLocation}
                    onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-totalStock">Total Stok</Label>
                  <Input 
                    id="edit-totalStock" 
                    type="number" 
                    value={formData.totalStock}
                    onChange={(e) => setFormData({ ...formData, totalStock: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-availableStock">Stok Tersedia</Label>
                  <Input 
                    id="edit-availableStock" 
                    type="number" 
                    value={formData.availableStock}
                    onChange={(e) => setFormData({ ...formData, availableStock: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-description">Deskripsi</Label>
                  <Textarea 
                    id="edit-description" 
                    className="min-h-[120px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
                <Button onClick={handleUpdateBook} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Perbarui Data
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* QR Code Dialog */}
          <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>QR Code Buku</DialogTitle>
                <DialogDescription>Tempelkan QR Code ini pada fisik buku untuk kemudahan sirkulasi.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <div id="printable-qr" className="bg-white p-4 rounded-xl border-2 border-primary/20">
                  {selectedBookQr && (
                    <QRCodeSVG 
                      value={selectedBookQr.code} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-lg">{selectedBookQr?.title}</p>
                  <p className="font-mono text-primary font-bold">{selectedBookQr?.code}</p>
                </div>
              </div>
              <DialogFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsQrOpen(false)}>Tutup</Button>
                <Button onClick={handlePrintQr} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Cetak QR
                </Button>
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
        <Button variant="secondary" className="gap-2" onClick={() => startScanner("search")}>
          <ScanBarcode className="h-4 w-4" />
          Scan Barcode
        </Button>
      </div>

      {/* Barcode Scanner Dialog */}
      <Dialog open={isScannerOpen} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Barcode/QR Buku</DialogTitle>
            <DialogDescription>
              {scannerTarget === "search" 
                ? "Arahkan kamera ke barcode untuk mencari buku." 
                : "Arahkan kamera ke barcode untuk mengisi ISBN."}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-black flex items-center justify-center">
            <div id="scanner-container" className="h-full w-full"></div>
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white bg-black/80">
                <Alert variant="destructive">
                  <AlertTitle>Akses Kamera Dibutuhkan</AlertTitle>
                  <AlertDescription>Harap izinkan akses kamera untuk memindai barcode.</AlertDescription>
                </Alert>
              </div>
            )}
            {hasCameraPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={stopScanner} className="w-full">
              Tutup Scanner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Memuat data...</p>
                </TableCell>
              </TableRow>
            ) : filteredBooks.length === 0 ? (
               <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <p className="text-sm text-muted-foreground">Tidak ada buku ditemukan.</p>
                </TableCell>
              </TableRow>
            ) : filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.code}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{book.title}</span>
                    <span className="text-xs text-muted-foreground">{book.author}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{book.category || 'N/A'}</Badge>
                </TableCell>
                <TableCell>Rak {book.rackLocation || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={Number(book.availableStock) <= 2 ? "text-destructive font-bold" : ""}>
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
                      <DropdownMenuItem className="gap-2" onClick={() => openQrDialog(book)}>
                        <QrCode className="h-4 w-4" /> Lihat QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(book)}>
                        <Edit className="h-4 w-4" /> Ubah
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteBook(book.id)}>
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
