
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
  X,
  Download,
  FileDown
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    author: "",
    publisher: "",
    publicationYear: new Date().getFullYear(),
    isbn: "",
    category: "",
    rackLocation: "",
    totalStock: 1,
    availableStock: 1,
    description: ""
  })

  const [editingBookId, setEditingBookId] = useState<string | null>(null)

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

  const handleExportExcel = async () => {
    try {
      const { utils, writeFile } = await import("xlsx")
      const dataToExport = filteredBooks.map(book => ({
        "Kode": book.code,
        "Judul": book.title,
        "Pengarang": book.author,
        "Penerbit": book.publisher,
        "Tahun": book.publicationYear,
        "ISBN": book.isbn,
        "Kategori": book.category,
        "Rak": book.rackLocation,
        "Total Stok": book.totalStock,
        "Tersedia": book.availableStock
      }))
      
      const worksheet = utils.json_to_sheet(dataToExport)
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, worksheet, "Koleksi Buku")
      writeFile(workbook, "Koleksi_Buku_SMPN5.xlsx")
      toast({ title: "Berhasil", description: "Daftar buku telah diunduh." })
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal mengekspor data.", variant: "destructive" })
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !db || !booksCollectionRef) return

    try {
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
              code: String(row.code || row.id || row.Kode || ""),
              title: String(row.title || row.Judul || ""),
              author: String(row.author || row.Pengarang || ""),
              publisher: String(row.publisher || row.Penerbit || ""),
              publicationYear: Number(row.publicationYear || row.Tahun || new Date().getFullYear()),
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
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal memuat pustaka Excel.", variant: "destructive" })
    }
    
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const startScanner = async (target: "search" | "isbn" = "search") => {
    setScannerTarget(target)
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.stop() } catch (e) {}
    }

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const container = document.getElementById("scanner-container")
        if (!container) return

        try {
          const scanner = new Html5Qrcode("scanner-container")
          scannerInstanceRef.current = scanner
          
          await scanner.start(
            { facingMode: "environment" },
            { 
              fps: 20, 
              qrbox: (viewWidth, viewHeight) => {
                const minSide = Math.min(viewWidth, viewHeight);
                return { width: minSide * 0.8, height: minSide * 0.5 };
              },
              aspectRatio: 1.0,
              formatsToSupport: [ 
                Html5QrcodeSupportedFormats.QR_CODE, 
                Html5QrcodeSupportedFormats.EAN_13, 
                Html5QrcodeSupportedFormats.EAN_8, 
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.ITF
              ]
            },
            (decodedText) => {
              if (target === "search") {
                setSearch(decodedText)
              } else {
                setFormData(prev => ({ ...prev, isbn: decodedText }))
              }
              stopScanner()
              toast({ title: "Terdeteksi!", description: decodedText })
            },
            () => {}
          )
          setHasCameraPermission(true)
        } catch (err) {
          console.error("Scanner error:", err)
          setHasCameraPermission(false)
        }
      }, 500)
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal memuat kamera.", variant: "destructive" })
    }
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
      publicationYear: Number(formData.publicationYear),
      totalStock: Number(formData.totalStock),
      availableStock: Number(formData.availableStock),
      createdAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Berhasil!", description: "Buku baru telah ditambahkan." })
      setIsOpen(false)
      setFormData({
        code: "", title: "", author: "", publisher: "", publicationYear: new Date().getFullYear(),
        isbn: "", category: "", rackLocation: "", totalStock: 1, availableStock: 1, description: ""
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
      publicationYear: Number(formData.publicationYear),
      totalStock: Number(formData.totalStock),
      availableStock: Number(formData.availableStock),
      updatedAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "Berhasil!", description: "Data buku diperbarui." })
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
      code: book.code || "", title: book.title || "", author: book.author || "",
      publisher: book.publisher || "", publicationYear: Number(book.publicationYear || new Date().getFullYear()),
      isbn: book.isbn || "", category: book.category || "", rackLocation: book.rackLocation || "",
      totalStock: Number(book.totalStock || 1), availableStock: Number(book.availableStock || 1),
      description: book.description || ""
    })
    setTimeout(() => setIsEditOpen(true), 100)
  }

  const downloadQrAsImage = () => {
    const svg = document.getElementById("printable-qr")?.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    
    img.onload = () => {
      canvas.width = 1000
      canvas.height = 1000
      if (ctx) {
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, 1000, 1000)
        const pngUrl = canvas.toDataURL("image/png")
        const downloadLink = document.createElement("a")
        downloadLink.href = pngUrl
        downloadLink.download = `QR_BUKU_${selectedBookQr?.code || 'BOOK'}.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
      }
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrElement = document.getElementById('printable-qr')
    if (!qrElement) return

    const svgData = qrElement.innerHTML
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR Code - ${selectedBookQr?.title}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              font-family: sans-serif;
            }
            .container { text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 10px; }
            h2 { margin-top: 20px; color: #333; }
            p { font-family: monospace; font-weight: bold; font-size: 1.2em; color: #2E6ECE; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">
            ${svgData}
            <h2>${selectedBookQr?.title}</h2>
            <p>${selectedBookQr?.code}</p>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Koleksi Buku</h1>
          <p className="text-muted-foreground text-sm">Kelola katalog buku, stok, dan lokasi rak.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls, .csv" className="hidden" />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Ekspor Excel</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleImportClick}>
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Buku
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Koleksi Baru</DialogTitle>
                <DialogDescription>Isi detail buku atau gunakan AI untuk deskripsi.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Kode Buku</Label>
                  <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Judul Buku</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Pengarang</Label>
                  <Input id="author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publisher">Penerbit</Label>
                  <Input id="publisher" value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Tahun Terbit</Label>
                  <Input id="year" type="number" value={formData.publicationYear} onChange={(e) => setFormData({ ...formData, publicationYear: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN / Barcode</Label>
                  <div className="flex gap-2">
                    <Input id="isbn" value={formData.isbn} className="flex-1" onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} />
                    <Button variant="secondary" size="icon" onClick={() => startScanner("isbn")}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input id="category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rack">Lokasi Rak</Label>
                  <Input id="rack" value={formData.rackLocation} onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalStock">Total Stok</Label>
                  <Input id="totalStock" type="number" value={formData.totalStock} onChange={(e) => setFormData({ ...formData, totalStock: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availableStock">Stok Tersedia</Label>
                  <Input id="availableStock" type="number" value={formData.availableStock} onChange={(e) => setFormData({ ...formData, availableStock: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Deskripsi</Label>
                    <Button type="button" variant="ghost" size="sm" className="text-primary gap-1 h-7" onClick={handleGenerateDescription} disabled={isGenerating}>
                      <Sparkles className="h-3.5 w-3.5" />
                      {isGenerating ? "Proses..." : "Gunakan AI"}
                    </Button>
                  </div>
                  <Textarea id="description" className="min-h-[120px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button onClick={handleSaveBook} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Koleksi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            ref={searchInputRef}
            placeholder="Cari buku (bisa pakai HP/alat scanner)..." 
            className="pl-10" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <Button variant="secondary" className="gap-2 w-full sm:w-auto" onClick={() => startScanner("search")}>
          <ScanBarcode className="h-4 w-4" />
          Scan
        </Button>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-3xl sm:h-[80vh] w-screen h-[100dvh] p-0 border-none bg-black overflow-hidden sm:rounded-2xl">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
            <div className="text-white">
              <DialogTitle className="text-lg font-bold">Pemindai Kamera</DialogTitle>
              <DialogDescription className="text-xs text-white/70">Arahkan ke barcode atau QR buku</DialogDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={stopScanner}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <div id="scanner-container" className="h-full w-full [&>video]:object-cover"></div>
            
            {hasCameraPermission === false && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center text-white bg-black">
                <Alert variant="destructive" className="bg-destructive text-white border-none max-w-sm">
                  <AlertTitle>Akses Kamera Gagal</AlertTitle>
                  <AlertDescription>Harap aktifkan izin kamera di pengaturan browser agar bisa memindai.</AlertDescription>
                  <Button variant="outline" className="mt-4 w-full" onClick={stopScanner}>Tutup</Button>
                </Alert>
              </div>
            )}
            
            {hasCameraPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-white text-sm">Menyiapkan kamera...</p>
                </div>
              </div>
            )}

            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-[80vw] max-w-[400px] h-[30vh] max-h-[250px] border-2 border-primary/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                {/* Scanner corners */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                
                {/* Laser line effect */}
                <div className="absolute left-4 right-4 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(46,110,206,1)] animate-pulse top-1/2"></div>
              </div>
              
              <div className="mt-8 text-center px-6">
                <p className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                  Posisikan kode di dalam kotak
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR Code Buku</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div id="printable-qr" className="bg-white p-4 rounded-xl border-2 border-primary/20">
              {selectedBookQr && <QRCodeSVG value={selectedBookQr.code} size={250} level="H" includeMargin={true} />}
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{selectedBookQr?.title}</p>
              <p className="font-mono text-primary font-bold">{selectedBookQr?.code}</p>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => setIsQrOpen(false)}>Tutup</Button>
            <Button variant="secondary" onClick={downloadQrAsImage} className="gap-2">
              <Download className="h-4 w-4" /> Unduh
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ubah Data Buku</DialogTitle>
            <DialogDescription>Perbarui informasi katalog buku.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Kode Buku</Label>
              <Input id="edit-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Judul Buku</Label>
              <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-author">Pengarang</Label>
              <Input id="edit-author" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-publisher">Penerbit</Label>
              <Input id="edit-publisher" value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-year">Tahun Terbit</Label>
              <Input id="edit-year" type="number" value={formData.publicationYear} onChange={(e) => setFormData({ ...formData, publicationYear: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-isbn">ISBN / Barcode</Label>
              <div className="flex gap-2">
                <Input id="edit-isbn" value={formData.isbn} className="flex-1" onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} />
                <Button variant="secondary" size="icon" onClick={() => startScanner("isbn")}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori</Label>
              <Input id="edit-category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-rack">Lokasi Rak</Label>
              <Input id="edit-rack" value={formData.rackLocation} onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-totalStock">Total Stok</Label>
              <Input id="edit-totalStock" type="number" value={formData.totalStock} onChange={(e) => setFormData({ ...formData, totalStock: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-availableStock">Stok Tersedia</Label>
              <Input id="edit-availableStock" type="number" value={formData.availableStock} onChange={(e) => setFormData({ ...formData, availableStock: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Textarea id="edit-description" className="min-h-[120px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateBook} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Perbarui Buku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-none shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Judul & Tahun</TableHead>
              <TableHead className="hidden md:table-cell">Kategori</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : filteredBooks.length === 0 ? (
               <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Tidak ada buku.</TableCell></TableRow>
            ) : filteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-mono text-xs">{book.code}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold line-clamp-1">{book.title}</span>
                    <span className="text-[10px] text-muted-foreground">{book.author} {book.publicationYear ? `(${book.publicationYear})` : ''}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline">{book.category || 'N/A'}</Badge></TableCell>
                <TableCell className="text-xs">{book.availableStock}/{book.totalStock}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedBookQr(book); setTimeout(() => setIsQrOpen(true), 100); }}><QrCode className="h-4 w-4 mr-2" /> QR Code</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(book)}><Edit className="h-4 w-4 mr-2" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteBook(book.id)}><Trash2 className="h-4 w-4 mr-2" /> Hapus</DropdownMenuItem>
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
