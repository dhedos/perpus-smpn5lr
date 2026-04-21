
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
  ChevronDown,
  RefreshCw,
  Database,
  CloudUpload,
  Clock
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc,
  errorEmitter 
} from '@/firebase'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, orderBy, getDocs, where, serverTimestamp } from 'firebase/firestore'

const INITIAL_FORM_DATA = {
  code: "",
  title: "",
  accountCode: "",
  publisher: "",
  publicationYear: new Date().getFullYear(),
  acquisitionDate: new Date().toISOString().split('T')[0],
  isbn: "",
  category: "",
  rackLocation: "",
  totalStock: 1,
  availableStock: 1,
  description: "",
  stickerHeader: "SMPN 5 LANGKE REMBONG"
}

export default function BooksPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterYear, setFilterYear] = useState("all")
  const [displayLimit, setDisplayLimit] = useState(50)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQueueOpen, setIsQueueOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)
  const [selectedBookQr, setSelectedBookQr] = useState<any>(null)
  const [selectedBookDetail, setSelectedBookDetail] = useState<any>(null)
  
  const scannerInstanceRef = useRef<any>(null)

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  
  // Local Queue State with robust initialization from LocalStorage
  const [localQueue, setLocalQueue] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('perpus_local_queue')
      try {
        return saved ? JSON.parse(saved) : []
      } catch (e) {
        return []
      }
    }
    return []
  })

  // Load Settings for Kop Surat
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  // Save Queue to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('perpus_local_queue', JSON.stringify(localQueue))
  }, [localQueue])

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
        (b.accountCode?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (b.code?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (b.isbn?.toLowerCase() || "").includes(search.toLowerCase());
      
      const matchesCategory = filterCategory === "all" || b.category === filterCategory;
      const matchesYear = filterYear === "all" || b.publicationYear?.toString() === filterYear;
      
      return matchesSearch && matchesCategory && matchesYear;
    })
  }, [books, search, filterCategory, filterYear])

  const forceUnlockUI = () => {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto'
      }, 100)
    }
  }

  const handleSaveToLocalQueue = () => {
    if (!formData.title || !formData.code) {
      toast({ title: "Gagal", description: "Judul dan Kode Buku wajib diisi.", variant: "destructive" })
      return
    }

    const newLocalBook = {
      ...formData,
      tempId: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Immediately update local state which will be synced to localStorage by useEffect
    setLocalQueue(prev => [newLocalBook, ...prev])
    setIsOpen(false)
    setFormData(INITIAL_FORM_DATA)
    forceUnlockUI()

    toast({ 
      title: "Tersimpan di Lokal", 
      description: "Buku masuk antrean. Klik 'Kirim ke Database' untuk menyimpan permanen.",
    })
  }

  const handleSyncToDatabase = async () => {
    if (!db || localQueue.length === 0) return
    setIsSyncing(true)

    try {
      const booksRef = collection(db, 'books')
      let successCount = 0

      for (const book of localQueue) {
        const { tempId, ...dataToSave } = book
        // Add Firestore metadata
        const firestoreData = {
          ...dataToSave,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        await addDoc(booksRef, firestoreData)
        successCount++
      }

      setLocalQueue([])
      toast({ 
        title: "Sinkronisasi Berhasil", 
        description: `${successCount} buku telah dikirim ke database pusat.` 
      })
    } catch (error: any) {
      toast({ 
        title: "Sinkronisasi Gagal", 
        description: error.message || "Pastikan Anda terhubung ke internet.", 
        variant: "destructive" 
      })
    } finally {
      setIsSyncing(false)
      setIsQueueOpen(false)
    }
  }

  const removeFromQueue = (tempId: string) => {
    setLocalQueue(prev => prev.filter(b => b.tempId !== tempId))
  }

  const handleExportExcel = async () => {
    try {
      if (filteredBooks.length === 0) {
        toast({ title: "Data Kosong", description: "Tidak ada data untuk diekspor." })
        return
      }

      const { utils, writeFile } = await import("xlsx")
      
      const header = [
        [settings?.govtInstitution || "PEMERINTAH KABUPATEN MANGGARAI"],
        [settings?.eduDept || "DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA"],
        [settings?.schoolName || "SMP NEGERI 5 LANGKE REMBONG"],
        [`Alamat: ${settings?.schoolAddress || "Mando, Kelurahan Compang Carep, Kecamatan Langke Rembong"}`],
        [""],
        ["DAFTAR KOLEKSI BUKU PERPUSTAKAAN"],
        [`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`],
        [""],
        ["No", "Kode", "Judul", "Kode Rekening", "Penerbit", "ISBN", "Thn Terbit", "Jenis", "Stok", "Lokasi"]
      ];

      const dataRows = filteredBooks.map((book, index) => [
        index + 1,
        book.code,
        book.title,
        book.accountCode,
        book.publisher,
        book.isbn,
        book.publicationYear,
        book.category,
        book.totalStock,
        book.rackLocation
      ]);

      const footer = [
        [""],
        [""],
        ["", "", "", "", "", "", "", "", `${settings?.reportCity || "Mando"}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`],
        ["", "", "", "", "", "", "", "", "Mengetahui,"],
        ["", "", "", "", "", "", "", "", "Kepala Sekolah,"],
        [""],
        [""],
        [""],
        ["", "", "", "", "", "", "", "", settings?.principalName || "Lodovikus Jangkar, S.Pd.Gr"],
        ["", "", "", "", "", "", "", "", `NIP. ${settings?.principalNip || "198507272011011020"}`]
      ];

      const finalAOA = [...header, ...dataRows, ...footer];
      
      const worksheet = utils.aoa_to_sheet(finalAOA)
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, worksheet, "Koleksi Buku")
      
      const dateStr = new Date().toISOString().split('T')[0]
      writeFile(workbook, `Daftar_Koleksi_Buku_SMPN5_${dateStr}.xlsx`)
      
      toast({ title: "Berhasil Ekspor", description: "File Excel berhasil dibuat dengan Kop Surat." })
    } catch (error) {
      toast({ title: "Gagal", description: "Gagal mengekspor data.", variant: "destructive" })
    }
  }

  const handlePrintAllQrs = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const stickersHtml = filteredBooks.map(book => `
      <div style="border: 1px solid #000; padding: 6px; text-align: center; width: 140px; display: inline-block; vertical-align: top; page-break-inside: avoid; margin: 4px; font-family: 'Inter', sans-serif; border-radius: 2px; background: #fff;">
        <div style="font-size: 7px; font-weight: 900; color: #2E6ECE; margin-bottom: 3px; text-transform: uppercase; line-height: 1;">${book.stickerHeader || 'SMPN 5 LANGKE REMBONG'}</div>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${book.code}" style="width: 100px; height: 100px; margin: 2px 0;" />
        <div style="font-size: 9px; font-weight: 800; margin-bottom: 2px; color: #000; line-height: 1.1;">${book.title}</div>
        <div style="font-size: 7px; color: #333; margin-bottom: 1px; line-height: 1.2;">Rek: ${book.accountCode || '-'} | ${book.publisher || '-'}</div>
        <div style="font-size: 7px; color: #666; line-height: 1.2;">${book.category || '-'} | ${book.publicationYear}</div>
        <div style="font-size: 7px; color: #666; margin-bottom: 4px; line-height: 1.2;">ISBN: ${book.isbn || '-'}</div>
        <div style="border-top: 0.5px solid #eee; margin: 2px 0; padding-top: 4px;">
           <div style="font-size: 14px; font-weight: 900; color: #2E6ECE; font-family: monospace; line-height: 1;">${book.code}</div>
           <div style="font-size: 8px; font-weight: 900; color: #000; margin-top: 2px; text-transform: uppercase;">RAK: ${book.rackLocation || '-'}</div>
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Label QR - SMPN 5</title>
          <style>
            @page { size: A4; margin: 5mm; } 
            body { margin: 0; padding: 0; background: #fff; }
            .container { display: block; font-size: 0; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">${stickersHtml}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleGenerateDescription = async () => {
    if (!formData.title) return
    setIsGenerating(true)
    try {
      const result = await generateBookDescription({ title: formData.title, isbn: formData.isbn })
      setFormData(prev => ({ ...prev, description: result.description || "" }))
    } catch (e) { toast({ title: "AI Sibuk", variant: "destructive" }) }
    finally { setIsGenerating(false) }
  }

  const handleUpdateBook = () => {
    if (!db || !editingBookId || !books) return
    const originalBook = books.find(b => b.id === editingBookId)
    if (!originalBook) { setIsEditOpen(false); forceUnlockUI(); return; }

    const updatedData = {
      ...formData,
      updatedAt: new Date().toISOString()
    }

    const docRef = doc(db, 'books', editingBookId)
    setIsEditOpen(false)
    forceUnlockUI()

    updateDoc(docRef, updatedData)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: updatedData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    
    toast({ title: "Berhasil!", description: "Data buku telah diperbarui." })
    setTimeout(() => { setEditingBookId(null); setFormData(INITIAL_FORM_DATA); }, 200)
  }

  const handleDeleteBook = () => {
    if (!db || !bookToDelete) return
    const docRef = doc(db, 'books', bookToDelete)
    setIsDeleteDialogOpen(false)
    forceUnlockUI()

    deleteDoc(docRef)
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    toast({ title: "Terhapus", description: "Buku dihapus dari koleksi." })
    setTimeout(() => { setBookToDelete(null) }, 200)
  }

  const handleSyncAvailability = (book: any) => {
    if (!db) return
    const transQuery = query(
      collection(db, 'transactions'),
      where('bookId', '==', book.id),
      where('status', '==', 'active')
    )
    
    getDocs(transQuery).then((snapshot) => {
      let activeCount = 0;
      snapshot.forEach(doc => {
        activeCount += Number(doc.data().quantity || 1);
      });
      const newAvail = Math.max(0, Number(book.totalStock || 0) - activeCount)
      
      const docRef = doc(db, 'books', book.id)
      updateDoc(docRef, { availableStock: newAvail })
      
      toast({ 
        title: "Stok Disinkronkan", 
        description: `Buku "${book.title}" sekarang memiliki ${newAvail} unit tersedia.` 
      })
    })
  }

  const startScanner = async () => {
    setIsScannerOpen(true)
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const scannerElement = document.getElementById("scanner-view")
        if (!scannerElement) return;
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
      try {
        if (scannerInstanceRef.current.isScanning) await scannerInstanceRef.current.stop()
        await scannerInstanceRef.current.clear()
      } catch (e) {}
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
    forceUnlockUI()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Koleksi Buku</h1>
          <p className="text-muted-foreground text-sm">Manajemen katalog dan inventaris perpustakaan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {localQueue.length > 0 && (
            <Button 
              variant="default" 
              size="sm" 
              className="bg-orange-600 hover:bg-orange-700 animate-pulse"
              onClick={() => setIsQueueOpen(true)}
            >
              <CloudUpload className="h-4 w-4 mr-2" /> Antrean ({localQueue.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrintAllQrs} className="hidden md:flex"><Printer className="h-4 w-4 mr-2" />Cetak Semua QR</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><FileDown className="h-4 w-4 mr-2" />Excel</Button>
          <Button 
            size="sm" 
            onClick={() => {
              setFormData(INITIAL_FORM_DATA);
              setIsOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />Tambah Buku
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-card p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari Judul, Kode, Rekening..." 
            className="pl-10 bg-white border-slate-300 h-11" 
            value={search ?? ""} 
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
              <TableHead>Judul & Rekening</TableHead>
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
                    <div className="font-semibold leading-none">{book.title}</div>
                    <div className="text-[10px] text-muted-foreground">Rek: {book.accountCode}</div>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{book.publicationYear}</TableCell>
                <TableCell>
                   <div className="flex items-center gap-1">
                    <Badge variant={book.availableStock === 0 ? "destructive" : "secondary"} className="h-5 px-1.5 text-[10px] border-none">
                      {book.availableStock}/{book.totalStock}
                    </Badge>
                   </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setSelectedBookDetail(book); 
                          setIsDetailOpen(true);
                        }, 10);
                      }}><Eye className="h-4 w-4 mr-2" />Lihat Detail</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setSelectedBookQr(book); 
                          setIsQrOpen(true);
                        }, 10);
                      }}><QrCode className="h-4 w-4 mr-2" />Tampilkan QR</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleSyncAvailability(book)}><RefreshCw className="h-4 w-4 mr-2" />Sinkronkan Stok</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { 
                        setTimeout(() => {
                          setEditingBookId(book.id); 
                          setFormData({
                            code: book.code || "",
                            title: book.title || "",
                            accountCode: book.accountCode || "",
                            publisher: book.publisher || "",
                            publicationYear: Number(book.publicationYear || new Date().getFullYear()),
                            acquisitionDate: book.acquisitionDate || new Date().toISOString().split('T')[0],
                            isbn: book.isbn || "",
                            category: book.category || "",
                            rackLocation: book.rackLocation || "",
                            totalStock: Number(book.totalStock || 0),
                            availableStock: Number(book.availableStock || 0),
                            description: book.description || "",
                            stickerHeader: book.stickerHeader || "SMPN 5 LANGKE REMBONG"
                          }); 
                          setIsEditOpen(true);
                        }, 10);
                      }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => { 
                        setTimeout(() => {
                          setBookToDelete(book.id); 
                          setIsDeleteDialogOpen(true);
                        }, 10);
                      }}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
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

      {/* DIALOG ANTREAN LOKAL */}
      <Dialog open={isQueueOpen} onOpenChange={setIsQueueOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Antrean Buku (Simpan di Localhost)
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800 leading-relaxed">
                Buku-buku di bawah ini saat ini hanya tersimpan di komputer Anda (localhost). 
                Klik <strong>Kirim ke Database</strong> untuk menyimpan secara permanen ke server cloud.
              </p>
            </div>
            
            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Judul Buku</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localQueue.map((item) => (
                    <TableRow key={item.tempId}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="text-xs font-bold">{item.title}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeFromQueue(item.tempId)} className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsQueueOpen(false)}>Tutup</Button>
            <Button 
              className="bg-primary shadow-lg shadow-primary/20 gap-2" 
              onClick={handleSyncToDatabase}
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Kirim ke Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG TAMBAH */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl bg-slate-50">
          <DialogHeader>
            <DialogTitle>Tambah Buku Baru</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Judul Header Stiker (Misal: Nama Sekolah)</Label>
              <Input value={formData.stickerHeader ?? ""} onChange={e => setFormData({ ...formData, stickerHeader: e.target.value })} className="bg-white border-slate-300 h-11" placeholder="SMPN 5 LANGKE REMBONG" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Kode Buku (Unik)</Label>
              <Input value={formData.code ?? ""} onChange={e => setFormData({ ...formData, code: e.target.value })} className="bg-white border-slate-300 h-11" placeholder="Cth: 001" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Judul Buku (Nama Spesifik)</Label>
              <Input value={formData.title ?? ""} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-white border-slate-300 h-11" placeholder="Cth: Matematika Kelas VII" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Kode Rekening</Label>
              <Input value={formData.accountCode ?? ""} onChange={e => setFormData({ ...formData, accountCode: e.target.value })} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Penerbit</Label>
              <Input value={formData.publisher ?? ""} onChange={e => setFormData({ ...formData, publisher: e.target.value })} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Tahun Terbit</Label>
              <Input type="number" value={formData.publicationYear ?? ""} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">ISBN</Label>
              <Input value={formData.isbn ?? ""} onChange={e => setFormData({ ...formData, isbn: e.target.value })} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Jenis / Kategori (Klasifikasi)</Label>
              <Input value={formData.category ?? ""} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="Cth: Matematika, Fiksi, Sains" className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Jumlah Stok Total</Label>
              <Input type="number" value={formData.totalStock ?? 0} onChange={e => setFormData({ ...formData, totalStock: Number(e.target.value), availableStock: Number(e.target.value) })} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Lokasi Rak</Label>
              <Input value={formData.rackLocation ?? ""} onChange={e => setFormData({ ...formData, rackLocation: e.target.value })} className="bg-white border-slate-300 h-11" placeholder="Cth: A1, B4" />
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex justify-between items-center">
                <Label className="font-semibold text-xs uppercase text-muted-foreground">Deskripsi / Ringkasan AI</Label>
                <Button variant="ghost" type="button" size="sm" onClick={handleGenerateDescription} disabled={isGenerating} className="h-6 text-[10px] font-bold">
                  <Sparkles className="h-3 w-3 mr-1" />AI Deskripsi
                </Button>
              </div>
              <Textarea value={formData.description ?? ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px] bg-white border-slate-300" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button onClick={handleSaveToLocalQueue} className="px-8 shadow-lg shadow-primary/20">
              Simpan di Localhost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG UBAH */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl bg-slate-50">
          <DialogHeader>
            <DialogTitle>Ubah Data Buku</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label className="font-semibold text-xs uppercase text-muted-foreground">Judul Header Stiker</Label>
              <Input value={formData.stickerHeader ?? ""} onChange={e => setFormData({ ...formData, stickerHeader: e.target.value })} className="bg-white border-slate-300 h-11" />
            </div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Kode Buku</Label><Input value={formData.code ?? ""} disabled className="bg-muted border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Judul Buku (Nama Spesifik)</Label><Input value={formData.title ?? ""} onChange={e => setFormData({ ...formData, title: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Kode Rekening</Label><Input value={formData.accountCode ?? ""} onChange={e => setFormData({ ...formData, accountCode: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Penerbit</Label><Input value={formData.publisher ?? ""} onChange={e => setFormData({ ...formData, publisher: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Tahun Terbit</Label><Input type="number" value={formData.publicationYear ?? ""} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">ISBN</Label><Input value={formData.isbn ?? ""} onChange={e => setFormData({ ...formData, isbn: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Jumlah Stok Total</Label><Input type="number" value={formData.totalStock ?? 0} onChange={e => setFormData({ ...formData, totalStock: Number(e.target.value) })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Tgl. Penerimaan</Label><Input type="date" value={formData.acquisitionDate ?? ""} onChange={e => setFormData({ ...formData, acquisitionDate: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Jenis / Kategori (Klasifikasi)</Label><Input value={formData.category ?? ""} onChange={e => setFormData({ ...formData, category: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Lokasi Rak</Label><Input value={formData.rackLocation ?? ""} onChange={e => setFormData({ ...formData, rackLocation: e.target.value })} className="bg-white border-slate-300 h-11" /></div>
            <div className="col-span-2 space-y-2"><Label className="font-semibold text-xs uppercase text-muted-foreground">Deskripsi</Label><Textarea value={formData.description ?? ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px] bg-white border-slate-300" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateBook} className="px-8 shadow-lg shadow-primary/20">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SCANNER */}
      <Dialog open={isScannerOpen} onOpenChange={(v) => { if(!v) stopScanner(); }}>
        <DialogContent className="sm:max-w-2xl p-0 border-none bg-black h-[100dvh] sm:h-auto overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Pemindai QR Code Buku</DialogTitle>
          </DialogHeader>
          <div id="scanner-view" className="w-full h-full bg-black min-h-[300px]"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>

      {/* DIALOG DETAIL */}
      <Dialog open={isDetailOpen} onOpenChange={(v) => { setIsDetailOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary"><Info className="h-5 w-5" />Informasi Detail Buku</DialogTitle>
          </DialogHeader>
          {selectedBookDetail && (
            <div className="grid grid-cols-2 gap-6 py-4 text-sm">
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Judul Buku</Label><div className="font-bold text-lg leading-tight">{selectedBookDetail.title ?? ""}</div></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Kode Koleksi</Label><div className="font-mono text-primary font-bold">{selectedBookDetail.code ?? ""}</div></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Rekening & Penerbit</Label><div>Rek: {selectedBookDetail.accountCode ?? "-"} | {selectedBookDetail.publisher ?? "-"}</div></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">ISBN</Label><div>{selectedBookDetail.isbn || "-"}</div></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Jenis & Lokasi Rak</Label><div className="flex items-center gap-2"><Badge variant="secondary" className="border-none">{selectedBookDetail.category ?? ""}</Badge> <span>{selectedBookDetail.rackLocation || 'Rak belum diatur'}</span></div></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Status Ketersediaan</Label><div className="font-semibold text-blue-600">{selectedBookDetail.availableStock ?? 0} dari {selectedBookDetail.totalStock ?? 0} tersedia</div></div>
              <div className="col-span-2 space-y-1 pt-2 border-t">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Deskripsi / Ringkasan AI</Label>
                <div className="text-sm bg-muted/30 p-4 rounded-lg italic leading-relaxed">{selectedBookDetail.description || 'Tidak ada deskripsi.'}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setIsDetailOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG QR */}
      <Dialog open={isQrOpen} onOpenChange={(v) => { setIsQrOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Stiker QR Koleksi</DialogTitle>
          </DialogHeader>
          {selectedBookQr && (
            <div className="bg-white p-[8px] rounded-sm border-[1px] border-black inline-block text-center shadow-sm w-[150px] mx-auto font-sans leading-tight">
                <div className="text-[7px] font-black text-primary uppercase tracking-tighter mb-[3px] leading-none">{selectedBookQr.stickerHeader || 'SMPN 5 LANGKE REMBONG'}</div>
                <div className="flex justify-center my-[2px]">
                  <QRCodeSVG value={selectedBookQr.code} size={110} level="M" includeMargin={false} />
                </div>
                <div className="text-center w-full mt-[2px]">
                  <div className="font-extrabold text-[9px] leading-[1.1] mb-[2px]">{selectedBookQr.title}</div>
                  <div className="text-[7px] text-slate-700 mb-[1px]">Rek: {selectedBookQr.accountCode || "-"} | {selectedBookQr.publisher || "-"}</div>
                  <div className="text-[7px] text-slate-500">{selectedBookQr.category || '-'} | {selectedBookQr.publicationYear}</div>
                  <div className="text-[7px] text-slate-500">ISBN: {selectedBookQr.isbn || "-"}</div>
                  <div className="pt-[4px] border-t border-slate-100 mt-[4px]">
                    <div className="text-[14px] font-black text-primary font-mono leading-none">{selectedBookQr.code}</div>
                    <div className="text-[8px] font-black text-black uppercase mt-[2px] leading-none">
                      RAK: {selectedBookQr.rackLocation || '-'}
                    </div>
                  </div>
                </div>
            </div>
          )}
          <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Cetak</Button>
            <Button size="sm" onClick={() => setIsQrOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG HAPUS */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(v) => { setIsDeleteDialogOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Buku?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini permanen. Pastikan buku sudah tidak ada di inventaris fisik.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setBookToDelete(null); forceUnlockUI(); }}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus Permanen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
