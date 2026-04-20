
"use client"

import { useState, useMemo, useRef } from "react"
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
  FileDown,
  AlertCircle,
  CheckCircle2,
  Eye,
  Info
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
import { cn } from "@/lib/utils"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function BooksPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<"search" | "isbn">("search")
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [selectedBookQr, setSelectedBookQr] = useState<any>(null)
  const [selectedBookDetail, setSelectedBookDetail] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scannerInstanceRef = useRef<any>(null)

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

  // Deteksi Duplikat
  const duplicateBookByCode = useMemo(() => {
    if (!formData.code || !books) return null
    return books.find(b => b.code?.toLowerCase() === formData.code.toLowerCase() && b.id !== editingBookId)
  }, [formData.code, books, editingBookId])

  const duplicateBookByIsbn = useMemo(() => {
    if (!formData.isbn || !books) return null
    return books.find(b => b.isbn === formData.isbn && b.id !== editingBookId)
  }, [formData.isbn, books, editingBookId])

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
        "Jenis": book.category,
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

  const handlePrintAllQrs = () => {
    if (filteredBooks.length === 0) {
      toast({ title: "Data Kosong", description: "Tidak ada buku untuk dicetak.", variant: "destructive" })
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR Koleksi - SMPN 5</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; }
            .sticker { border: 1px dashed #bbb; padding: 8px; text-align: center; width: 145px; height: 190px; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; page-break-inside: avoid; }
            .qr-placeholder { width: 110px; height: 110px; margin-bottom: 5px; }
            .title { font-size: 9px; font-weight: bold; font-family: sans-serif; height: 24px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; margin: 4px 0; }
            .code { font-size: 11px; font-weight: 900; color: #000; font-family: monospace; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${filteredBooks.map(book => `
            <div class="sticker">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${book.code}" class="qr-placeholder" />
              <div class="title">${book.title}</div>
              <div class="code">${book.code}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `)
    printWindow.document.close()
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

          toast({ title: "Mengimpor...", description: `Sedang memproses ${json.length} buku.` })

          for (const row of json) {
            const bookCode = String(row.code || row.Kode || "");
            const isDuplicate = books?.some(b => b.code?.toLowerCase() === bookCode.toLowerCase());
            if (isDuplicate) continue;

            addDoc(booksCollectionRef, {
              code: bookCode,
              title: String(row.title || row.Judul || ""),
              author: String(row.author || row.Pengarang || ""),
              publisher: String(row.publisher || row.Penerbit || ""),
              publicationYear: Number(row.publicationYear || row.Tahun || new Date().getFullYear()),
              isbn: String(row.isbn || row.ISBN || ""),
              category: String(row.category || row.Jenis || ""),
              rackLocation: String(row.rackLocation || row.Rak || ""),
              totalStock: Number(row.totalStock || row.Stok || 1),
              availableStock: Number(row.availableStock || row.Stok || 1),
              createdAt: new Date().toISOString()
            }).catch(() => {})
          }
          toast({ title: "Selesai", description: "Proses import selesai." })
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
    
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const scanner = new Html5Qrcode("scanner-container")
        scannerInstanceRef.current = scanner
        try {
          await scanner.start(
            { facingMode: "environment" },
            { 
              fps: 20, 
              qrbox: (vw, vh) => {
                const min = Math.min(vw, vh);
                return { width: min * 0.8, height: min * 0.5 };
              },
              formatsToSupport: [ 
                Html5QrcodeSupportedFormats.QR_CODE, 
                Html5QrcodeSupportedFormats.EAN_13, 
                Html5QrcodeSupportedFormats.CODE_128 
              ]
            },
            (text) => {
              if (target === "search") setSearch(text);
              else setFormData(prev => ({ ...prev, isbn: text }));
              stopScanner();
            },
            () => {}
          )
          setHasCameraPermission(true)
        } catch (err) { setHasCameraPermission(false) }
      }, 500)
    } catch (e) { toast({ title: "Gagal", description: "Kamera gagal dimuat.", variant: "destructive" }) }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try { if (scannerInstanceRef.current.isScanning) await scannerInstanceRef.current.stop() } catch (e) {}
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
  }

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      toast({ title: "Input Kosong", description: "Judul buku diperlukan untuk AI.", variant: "destructive" })
      return
    }
    setIsGenerating(true)
    try {
      const result = await generateBookDescription({ title: formData.title, author: formData.author, isbn: formData.isbn })
      setFormData(prev => ({ ...prev, description: result.description }))
    } catch (e) { toast({ title: "Gagal", description: "AI sedang sibuk.", variant: "destructive" }) }
    finally { setIsGenerating(false) }
  }

  const handleSaveBook = () => {
    if (!db || !booksCollectionRef || duplicateBookByCode) return
    setIsSaving(true)
    addDoc(booksCollectionRef, { ...formData, createdAt: new Date().toISOString() })
      .then(() => {
        toast({ title: "Berhasil!", description: "Buku ditambahkan." })
        setIsOpen(false)
        setFormData({ code: "", title: "", author: "", publisher: "", publicationYear: new Date().getFullYear(), isbn: "", category: "", rackLocation: "", totalStock: 1, availableStock: 1, description: "" })
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: booksCollectionRef.path, operation: 'create', requestResourceData: formData }));
      })
      .finally(() => setIsSaving(false))
  }

  const handleUpdateBook = () => {
    if (!db || !editingBookId || duplicateBookByCode) return
    setIsSaving(true)
    const ref = doc(db, 'books', editingBookId)
    updateDoc(ref, { ...formData, updatedAt: new Date().toISOString() })
      .then(() => {
        toast({ title: "Berhasil!", description: "Data diperbarui." })
        setIsEditOpen(false)
      })
      .catch(async (e) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'update', requestResourceData: formData }));
      })
      .finally(() => setIsSaving(false))
  }

  const downloadQrAsImage = () => {
    const svg = document.querySelector("#printable-qr svg")
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()
    img.onload = () => {
      canvas.width = 1000; canvas.height = 1000
      if (ctx) {
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, 1000, 1000)
        ctx.drawImage(img, 0, 0, 1000, 1000)
        const a = document.createElement("a")
        a.href = canvas.toDataURL("image/png")
        a.download = `QR_${selectedBookQr.code}.png`
        a.click()
      }
    }
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const content = document.getElementById('printable-qr')?.innerHTML
    win.document.write(`<html><body onload="window.print();window.close()"><div style="text-align:center">${content}<h2>${selectedBookQr.title}</h2><p>${selectedBookQr.code}</p></div></body></html>`)
    win.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Koleksi Buku</h1>
          <p className="text-muted-foreground text-sm">Kelola katalog dan stok buku.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
          <Button variant="outline" size="sm" onClick={handlePrintAllQrs} className="hidden md:flex"><Printer className="h-4 w-4 mr-2" />Cetak Semua QR</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="h-4 w-4 mr-2" />Ekspor</Button>
          <Button variant="outline" size="sm" onClick={handleImportClick}><FileSpreadsheet className="h-4 w-4 mr-2" />Impor</Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Tambah Buku</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Tambah Buku Baru</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className={cn(duplicateBookByCode && "text-destructive")}>Kode Buku</Label>
                  <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className={cn(duplicateBookByCode && "border-destructive")} />
                  {duplicateBookByCode && <p className="text-[10px] text-destructive">Kode ini sudah terdaftar!</p>}
                </div>
                <div className="space-y-2">
                  <Label>Judul</Label>
                  <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pengarang</Label>
                  <Input value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tahun Terbit</Label>
                  <Input type="number" value={formData.publicationYear} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label className={cn(duplicateBookByIsbn && "text-destructive")}>ISBN</Label>
                  <Input value={formData.isbn} onChange={e => setFormData({ ...formData, isbn: e.target.value })} className={cn(duplicateBookByIsbn && "border-destructive")} />
                </div>
                <div className="space-y-2">
                  <Label>Jenis Buku</Label>
                  <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Fiksi, Sains, dll" />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex justify-between items-center"><Label>Deskripsi</Label><Button variant="ghost" type="button" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}><Sparkles className="h-3 w-3 mr-1" />AI</Button></div>
                  <article className="prose prose-sm max-w-none">
                    <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px]" />
                  </article>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
                <Button onClick={handleSaveBook} disabled={isSaving || !!duplicateBookByCode}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari (bisa pakai hp/alat scaner)..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => startScanner("search")}><ScanBarcode className="h-4 w-4 mr-2" />Scan</Button>
      </div>

      <Card className="border-none shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No.</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Jenis Buku</TableHead>
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
                <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{book.code}</TableCell>
                <TableCell><div><p className="font-semibold">{book.title}</p><p className="text-[10px] text-muted-foreground">{book.author} ({book.publicationYear})</p></div></TableCell>
                <TableCell><Badge variant="outline">{book.category || 'Umum'}</Badge></TableCell>
                <TableCell className="text-xs">{book.availableStock}/{book.totalStock}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedBookDetail(book); setTimeout(() => setIsDetailOpen(true), 100); }}><Eye className="h-4 w-4 mr-2" />Lihat Detail</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedBookQr(book); setTimeout(() => setIsQrOpen(true), 100); }}><QrCode className="h-4 w-4 mr-2" />QR Code</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setEditingBookId(book.id); setFormData({ ...book }); setTimeout(() => setIsEditOpen(true), 100); }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteDoc(doc(db, 'books', book.id))}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-2xl p-0 border-none bg-black overflow-hidden sm:rounded-2xl h-[100dvh] sm:h-auto">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center text-white">
            <DialogTitle>Scan Barcode / QR Buku</DialogTitle>
            <Button variant="ghost" size="icon" onClick={stopScanner}><X className="h-6 w-6" /></Button>
          </div>
          <div id="scanner-container" className="w-full h-full bg-black"></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>QR Code Buku</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center p-6 space-y-4">
            <div id="printable-qr" className="bg-white p-4 rounded-xl border">
              {selectedBookQr && <QRCodeSVG value={selectedBookQr.code} size={250} level="H" includeMargin={true} />}
            </div>
            <div className="text-center font-bold"><p>{selectedBookQr?.title}</p><p className="text-primary">{selectedBookQr?.code}</p></div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={downloadQrAsImage}><Download className="h-4 w-4 mr-2" />Unduh</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Cetak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Ubah Data Buku</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className={cn(duplicateBookByCode && "text-destructive")}>Kode Buku</Label>
              <Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className={cn(duplicateBookByCode && "border-destructive")} />
            </div>
            <div className="space-y-2"><Label>Judul</Label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Pengarang</Label><Input value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tahun</Label><Input type="number" value={formData.publicationYear} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateBook} disabled={isSaving || !!duplicateBookByCode}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Detail Informasi Buku
            </DialogTitle>
          </DialogHeader>
          {selectedBookDetail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 py-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Judul Buku</Label>
                <p className="font-semibold text-lg leading-tight">{selectedBookDetail.title}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Kode Koleksi</Label>
                <p className="font-mono text-primary font-bold">{selectedBookDetail.code}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Pengarang</Label>
                <p>{selectedBookDetail.author || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Penerbit & Tahun</Label>
                <p>{selectedBookDetail.publisher || '-'} ({selectedBookDetail.publicationYear})</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">ISBN</Label>
                <p>{selectedBookDetail.isbn || '-'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Jenis Buku</Label>
                <div><Badge variant="secondary">{selectedBookDetail.category || 'Umum'}</Badge></div>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Lokasi Rak</Label>
                <p>{selectedBookDetail.rackLocation || 'Belum diatur'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Status Stok</Label>
                <p className="font-medium text-blue-600">{selectedBookDetail.availableStock} dari {selectedBookDetail.totalStock} tersedia</p>
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2 border-t pt-4">
                <Label className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Deskripsi / Ringkasan</Label>
                <div className="text-sm leading-relaxed bg-muted/30 p-4 rounded-xl italic whitespace-pre-wrap">
                  {selectedBookDetail.description || 'Tidak ada deskripsi yang tersedia untuk buku ini.'}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 border-t pt-4 mt-2 text-[10px] text-muted-foreground italic">
                <p>Data dibuat: {selectedBookDetail.createdAt ? new Date(selectedBookDetail.createdAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : '-'}</p>
                <p className="text-right">Terakhir update: {selectedBookDetail.updatedAt ? new Date(selectedBookDetail.updatedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Belum pernah'}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
