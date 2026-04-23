
"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
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
  Eye,
  Info,
  Calendar as CalendarIcon,
  Filter,
  ChevronDown,
  Database,
  CloudUpload,
  Clock,
  Lock
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
  useUser,
  errorEmitter 
} from '@/firebase'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, orderBy, serverTimestamp } from 'firebase/firestore'

const INITIAL_FORM_DATA = {
  mainHeader: "PUSTAKA NUSANTARA",
  budgetSource: "BOSP",
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
  description: ""
}

const STORAGE_KEY = 'perpus_local_queue_v3'

export default function BooksPage() {
  const db = useFirestore()
  const { isAdmin } = useUser()
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
  const [isHydrated, setIsHydrated] = useState(false)
  
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)
  const [selectedBookQr, setSelectedBookQr] = useState<any>(null)
  const [selectedBookDetail, setSelectedBookDetail] = useState<any>(null)
  
  const scannerInstanceRef = useRef<any>(null)

  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  
  // Local Queue State
  const [localQueue, setLocalQueue] = useState<any[]>([])

  // Load Settings for Kop Surat & Lock Status
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)
  
  // logic: locked if settings locked AND user NOT admin
  const isLocked = Boolean(settings?.isDataLocked && !isAdmin);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            setLocalQueue(parsed)
          }
        } catch (e) {
          console.error("Failed to load local queue:", e)
        }
      }
      setIsHydrated(true)
    }
  }, [])

  // 2. Persistent Save to LocalStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localQueue))
    }
  }, [localQueue, isHydrated])

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

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto'
      document.body.style.overflow = 'auto'
    }
  }, [])

  useEffect(() => {
    const isAnyModalOpen = isOpen || isEditOpen || isDetailOpen || isScannerOpen || isQrOpen || isDeleteDialogOpen || isQueueOpen
    if (!isAnyModalOpen) {
      const t = setTimeout(forceUnlockUI, 200)
      return () => clearTimeout(t)
    }
  }, [isOpen, isEditOpen, isDetailOpen, isScannerOpen, isQrOpen, isDeleteDialogOpen, isQueueOpen, forceUnlockUI])

  const handleSaveToLocalQueue = () => {
    if (isLocked) {
      toast({ title: "Akses Terkunci", description: "Admin mengunci fitur pengubahan data.", variant: "destructive" })
      return
    }

    if (!formData.title || !formData.code) {
      toast({ title: "Gagal", description: "Judul dan Kode Buku wajib diisi.", variant: "destructive" })
      return
    }

    const newLocalBook = {
      ...formData,
      tempId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setLocalQueue(prev => [newLocalBook, ...prev])
    setIsOpen(false)
    setFormData(INITIAL_FORM_DATA)
    forceUnlockUI()

    toast({ 
      title: "Tersimpan Lokal", 
      description: "Buku masuk antrean. Jangan lupa kirim ke database pusat.",
    })
  }

  const handleSyncToDatabase = async () => {
    if (!db || localQueue.length === 0) return
    if (isLocked) {
      toast({ title: "Akses Terkunci", description: "Admin mengunci fitur sinkronisasi bagi petugas.", variant: "destructive" })
      return
    }

    setIsSyncing(true)

    try {
      const booksRef = collection(db, 'books')
      let successCount = 0

      for (const book of localQueue) {
        const { tempId, ...dataToSave } = book
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
        description: `${successCount} buku telah disimpan ke Cloud.` 
      })
    } catch (error: any) {
      toast({ title: "Gagal Sinkronisasi", description: "Terjadi kesalahan koneksi.", variant: "destructive" })
    } finally {
      setIsSyncing(false)
      setIsQueueOpen(false)
      forceUnlockUI()
    }
  }

  const removeFromQueue = (tempId: string) => {
    setLocalQueue(prev => prev.filter(b => b.tempId !== tempId))
  }

  const handlePrintTable = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = filteredBooks.map((book, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-family: monospace;">${book.code}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">
          <div style="font-weight: bold;">${book.title}</div>
          <div style="font-size: 10px; color: #666;">Sumber: ${book.budgetSource || '-'} | Rek: ${book.accountCode || '-'}</div>
        </td>
        <td style="border: 1px solid #ccc; padding: 8px;">${book.publisher || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${book.publicationYear || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${book.category || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${book.totalStock || 0}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${book.rackLocation || '-'}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 12px; margin: 0; padding: 15mm; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 10px; }
            .school-name { font-size: 18px; font-weight: 900; }
            .dept-name { font-size: 14px; font-weight: 700; }
            .address { font-size: 10px; font-style: italic; }
            .title { text-align: center; font-size: 16px; font-weight: 800; margin: 20px 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f0f0f0; border: 1px solid #ccc; padding: 10px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            .footer-table { width: 100%; border: none; margin-top: 40px; }
            .footer-table td { border: none; text-align: center; width: 33%; }
            .print-footer { position: fixed; bottom: 5mm; left: 15mm; right: 15mm; font-size: 8px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="dept-name">${settings?.govtInstitution || 'PEMERINTAH KABUPATEN MANGGARAI'}</div>
            <div class="dept-name">${settings?.eduDept || 'DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA'}</div>
            <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
            <div class="address">Alamat: ${settings?.schoolAddress || 'Mando, Kelurahan Compang Carep'}</div>
          </div>
          <div class="title">DAFTAR KOLEKSI BUKU PERPUSTAKAAN</div>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Kode</th>
                <th>Judul & Sumber</th>
                <th>Penerbit</th>
                <th>Thn</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Lokasi</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer-table">
            <div style="float: right; text-align: center; width: 250px;">
              ${settings?.reportCity || 'Mando'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
              Mengetahui,<br/>
              Kepala Sekolah,<br/><br/><br/><br/>
              <strong>${settings?.principalName || 'Lodovikus Jangkar, S.Pd.Gr'}</strong><br/>
              NIP. ${settings?.principalNip || '198507272011011020'}
            </div>
          </div>
          <div class="print-footer">Pustaka Nusantara - SMPN 5 LANGKE REMBONG | Laporan Daftar Koleksi</div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handlePrintAllQrs = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const stickersHtml = filteredBooks.map(book => `
      <div class="label-card">
        <div class="info-section">
          <div class="header-text">${book.mainHeader || 'PUSTAKA NUSANTARA'}</div>
          <div class="source-text">${book.budgetSource || 'BOSP'}</div>
          <div class="book-title">${book.title}</div>
          <div class="book-details">
            <div>Rek: ${book.accountCode || '-'} | ${book.publisher || '-'}</div>
            <div>${book.category || '-'} | ${book.publicationYear}</div>
            <div>ISBN: ${book.isbn || '-'}</div>
          </div>
          <div class="rack-text">RAK: ${book.rackLocation || '-'}</div>
        </div>
        <div class="qr-section">
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${book.code}" />
          </div>
          <div class="book-code-text">${book.code}</div>
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { size: A4; margin: 0; } 
            body { margin: 0; padding: 5mm; background: #fff; font-family: 'Inter', sans-serif; }
            .page-container { display: flex; flex-wrap: wrap; gap: 5mm; justify-content: flex-start; }
            
            .label-card { 
              width: 80mm; 
              height: 30mm; 
              border: 0.5pt solid #000; 
              padding: 2mm; 
              box-sizing: border-box; 
              display: flex;
              align-items: center;
              justify-content: space-between;
              page-break-inside: avoid;
              background: #fff;
              overflow: hidden;
            }

            .info-section {
              flex: 1;
              text-align: left;
              display: flex;
              flex-direction: column;
              justify-content: center;
              overflow: hidden;
            }

            .header-text {
              font-size: 8pt;
              font-weight: 800;
              color: #2E6ECE;
              text-transform: uppercase;
              line-height: 1;
            }

            .source-text {
              font-size: 7pt;
              font-weight: 600;
              color: #444;
              margin-bottom: 0.5mm;
              line-height: 1;
            }

            .book-title {
              font-size: 8.5pt;
              font-weight: 900;
              line-height: 1.1;
              margin-bottom: 0.8mm;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              color: #000;
            }

            .book-details {
              font-size: 6pt;
              color: #444;
              line-height: 1.2;
            }

            .rack-text {
              font-size: 7pt;
              font-weight: 800;
              color: #000;
              text-transform: uppercase;
              margin-top: 1mm;
              border-top: 0.2pt solid #ddd;
              padding-top: 0.5mm;
            }

            .qr-section {
              width: 25mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin-left: 2mm;
            }

            .qr-container {
              width: 20mm;
              height: 20mm;
            }
            .qr-container img {
              width: 100%;
              height: 100%;
            }

            .book-code-text {
              font-size: 9pt;
              font-weight: 900;
              color: #2E6ECE;
              font-family: monospace;
              line-height: 1;
              margin-top: 1mm;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="page-container">${stickersHtml}</div>
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
    if (!db || !editingBookId) return
    if (isLocked) {
      toast({ title: "Akses Terkunci", description: "Admin mengunci fitur pengubahan data.", variant: "destructive" })
      return
    }

    const docRef = doc(db, 'books', editingBookId)
    const updatedData = { ...formData, updatedAt: new Date().toISOString() }

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
  }

  const handleDeleteBook = () => {
    if (!db || !bookToDelete) return
    if (isLocked) {
      toast({ title: "Akses Terkunci", description: "Admin mengunci fitur hapus data.", variant: "destructive" })
      return
    }

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
          {isLocked && (
            <Badge variant="outline" className="h-9 px-3 bg-orange-50 text-orange-700 border-orange-200 font-bold gap-2">
              <Lock className="h-3 w-3" /> Fitur Modifikasi Dikunci Admin
            </Badge>
          )}
          {isHydrated && localQueue.length > 0 && (
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
          <Button variant="outline" size="sm" onClick={handlePrintTable}><Printer className="h-4 w-4 mr-2" />Cetak Daftar</Button>
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
              <TableHead>Judul & Info</TableHead>
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
                    <div className="text-[10px] text-muted-foreground">
                       Sumber: {book.budgetSource || '-'} | Rek: {book.accountCode || '-'}
                    </div>
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
                  <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        setTimeout(() => {
                          setSelectedBookDetail(book); 
                          setIsDetailOpen(true);
                        }, 100);
                      }}><Eye className="h-4 w-4 mr-2" />Lihat Detail</DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        setTimeout(() => {
                          setSelectedBookQr(book); 
                          setIsQrOpen(true);
                        }, 100);
                      }}><QrCode className="h-4 w-4 mr-2" />Tampilkan QR</DropdownMenuItem>
                      
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
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
                            mainHeader: book.mainHeader || "PUSTAKA NUSANTARA",
                            budgetSource: book.budgetSource || "BOSP"
                          }); 
                          setIsEditOpen(true);
                        }, 100);
                      }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>

                      <DropdownMenuItem className="text-destructive" onSelect={(e) => { 
                        e.preventDefault();
                        setTimeout(() => {
                          setBookToDelete(book.id); 
                          setIsDeleteDialogOpen(true);
                        }, 100);
                      }}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* DIALOG TAMBAH */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 pb-4 border-b bg-white shrink-0">
            <DialogTitle className="text-xl font-bold text-primary">Tambah Buku Baru</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="space-y-4 pb-4 border-b">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-primary tracking-widest">Header Utama (Stiker)</Label>
                  <Input 
                    value={formData.mainHeader ?? ""} 
                    onChange={e => setFormData({ ...formData, mainHeader: e.target.value })} 
                    className="bg-slate-50 h-12 text-base" 
                    placeholder="Cth: NAMA SEKOLAH / PERPUSTAKAAN" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Sumber Buku / Anggaran</Label>
                  <Input 
                    value={formData.budgetSource ?? ""} 
                    onChange={e => setFormData({ ...formData, budgetSource: e.target.value })} 
                    className="bg-slate-50 h-12 text-base" 
                    placeholder="Cth: BOSP, Hibah" 
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Kode Buku (Unik)</Label>
                  <Input 
                    value={formData.code ?? ""} 
                    onChange={e => setFormData({ ...formData, code: e.target.value })} 
                    className="h-11" 
                    placeholder="Cth: 001" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Judul Buku</Label>
                  <Input 
                    value={formData.title ?? ""} 
                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                    className="h-11" 
                    placeholder="Cth: Matematika Kelas VII" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Kode Rekening</Label>
                  <Input 
                    value={formData.accountCode ?? ""} 
                    onChange={e => setFormData({ ...formData, accountCode: e.target.value })} 
                    className="h-11" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Penerbit</Label>
                  <Input 
                    value={formData.publisher ?? ""} 
                    onChange={e => setFormData({ ...formData, publisher: e.target.value })} 
                    className="h-11" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Tahun Terbit</Label>
                  <Input 
                    type="number" 
                    value={formData.publicationYear ?? ""} 
                    onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} 
                    className="h-11" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">ISBN</Label>
                  <Input 
                    value={formData.isbn ?? ""} 
                    onChange={e => setFormData({ ...formData, isbn: e.target.value })} 
                    className="h-11" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Jenis / Kategori</Label>
                  <Input 
                    value={formData.category ?? ""} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                    placeholder="Cth: Matematika, Fiksi" 
                    className="h-11" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Jumlah Stok Total</Label>
                  <Input 
                    type="number" 
                    value={formData.totalStock ?? 0} 
                    onChange={e => setFormData({ ...formData, totalStock: Number(e.target.value), availableStock: Number(e.target.value) })} 
                    className="h-11" 
                    disabled={isLocked}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Lokasi Rak</Label>
                  <Input 
                    value={formData.rackLocation ?? ""} 
                    onChange={e => setFormData({ ...formData, rackLocation: e.target.value })} 
                    className="h-11" 
                    placeholder="Cth: A1" 
                    disabled={isLocked}
                  />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2 pb-4">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Deskripsi / Ringkasan AI</Label>
                    <button type="button" onClick={handleGenerateDescription} disabled={isGenerating || isLocked} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:opacity-80 transition-opacity">
                      <Sparkles className="h-3 w-3" /> AI Deskripsi
                    </button>
                  </div>
                  <Textarea 
                    value={formData.description ?? ""} 
                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                    className="min-h-[100px] bg-white border-slate-300" 
                    disabled={isLocked}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button onClick={handleSaveToLocalQueue} disabled={isLocked} className="px-8 shadow-lg shadow-primary/20">
              Simpan di Localhost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG UBAH */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 pb-4 border-b bg-white shrink-0">
            <DialogTitle className="text-xl font-bold text-primary">Ubah Data Buku</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="space-y-4 pb-4 border-b">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-primary tracking-widest">Header Utama</Label>
                  <Input 
                    value={formData.mainHeader ?? ""} 
                    onChange={e => setFormData({ ...formData, mainHeader: e.target.value })} 
                    className="bg-slate-50 h-12" 
                    disabled={isLocked}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Sumber Buku / Anggaran</Label>
                  <Input 
                    value={formData.budgetSource ?? ""} 
                    onChange={e => setFormData({ ...formData, budgetSource: e.target.value })} 
                    className="bg-slate-50 h-12" 
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Kode Buku</Label><Input value={formData.code ?? ""} disabled className="bg-muted h-11" /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Judul Buku</Label><Input value={formData.title ?? ""} onChange={e => setFormData({ ...formData, title: e.target.value })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Kode Rekening</Label><Input value={formData.accountCode ?? ""} onChange={e => setFormData({ ...formData, accountCode: e.target.value })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Penerbit</Label><Input value={formData.publisher ?? ""} onChange={e => setFormData({ ...formData, publisher: e.target.value })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Tahun Terbit</Label><Input type="number" value={formData.publicationYear ?? ""} onChange={e => setFormData({ ...formData, publicationYear: Number(e.target.value) })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">ISBN</Label><Input value={formData.isbn ?? ""} onChange={e => setFormData({ ...formData, isbn: e.target.value })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Jenis / Kategori</Label><Input value={formData.category ?? ""} onChange={e => setFormData({ ...formData, category: e.target.value })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Lokasi Rak</Label><Input value={formData.rackLocation ?? ""} onChange={e => setFormData({ ...formData, rackLocation: e.target.value })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Jumlah Stok Total</Label><Input type="number" value={formData.totalStock ?? 0} onChange={e => setFormData({ ...formData, totalStock: Number(e.target.value) })} className="h-11" disabled={isLocked} /></div>
                <div className="space-y-2"><Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Stok Tersedia</Label><Input type="number" value={formData.availableStock ?? 0} onChange={e => setFormData({ ...formData, availableStock: Number(e.target.value) })} className="h-11" disabled={isLocked} /></div>
                <div className="col-span-1 sm:col-span-2 space-y-2 pb-4">
                  <Label className="font-semibold text-[10px] uppercase text-muted-foreground tracking-widest">Deskripsi</Label>
                  <Textarea value={formData.description ?? ""} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[100px] bg-white border-slate-300" disabled={isLocked} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleUpdateBook} disabled={isLocked} className="px-8 shadow-lg shadow-primary/20">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL BUKU */}
      <Dialog open={isDetailOpen} onOpenChange={v => { setIsDetailOpen(v); forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Rincian Informasi Buku</DialogTitle></DialogHeader>
          {selectedBookDetail && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Judul Buku</Label>
                  <div className="font-bold text-lg text-primary">{selectedBookDetail.title}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Kode Buku</Label>
                  <div className="font-mono font-black">{selectedBookDetail.code}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Penerbit</Label>
                  <div>{selectedBookDetail.publisher || '-'} ({selectedBookDetail.publicationYear})</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Kategori</Label>
                  <div><Badge variant="secondary">{selectedBookDetail.category || 'Umum'}</Badge></div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Lokasi Rak</Label>
                  <div className="font-bold">{selectedBookDetail.rackLocation || 'Belum diatur'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase font-bold">Status Stok</Label>
                  <div className="font-bold text-green-600">{selectedBookDetail.availableStock} / {selectedBookDetail.totalStock} Unit</div>
                </div>
              </div>
              <div className="space-y-2 border-t pt-4">
                <Label className="text-xs text-muted-foreground uppercase font-bold">Sinopsis / Deskripsi</Label>
                <p className="text-sm leading-relaxed text-slate-600 italic">
                  {selectedBookDetail.description || 'Tidak ada deskripsi tersedia.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR MODAL */}
      <Dialog open={isQrOpen} onOpenChange={v => { setIsQrOpen(v); forceUnlockUI(); }}>
        <DialogContent className="max-w-md text-center p-8">
          <DialogHeader><DialogTitle>QR Label Buku</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="p-4 bg-white border-2 border-primary/10 rounded-2xl shadow-xl">
              {selectedBookQr && <QRCodeSVG value={selectedBookQr.code} size={200} level="H" includeMargin />}
            </div>
            <div>
              <div className="text-xl font-black text-primary uppercase">{selectedBookQr?.title}</div>
              <div className="text-sm font-mono font-bold text-muted-foreground">{selectedBookQr?.code}</div>
            </div>
            <Button variant="outline" className="w-full h-12" onClick={() => {
              const win = window.open('', '_blank');
              if(!win) return;
              win.document.write(`
                <html>
                  <body style="display:flex; justifyContent:center; alignItems:center; height:100vh; margin:0;" onload="window.print(); window.close();">
                    <div style="textAlign:center; border:1px solid #000; padding:20px; fontFamily:sans-serif;">
                      <div style="fontWeight:bold; fontSize:10px;">${selectedBookQr?.mainHeader || 'PUSTAKA NUSANTARA'}</div>
                      <div style="fontSize:16px; fontWeight:900; margin:10px 0;">${selectedBookQr?.title}</div>
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedBookQr?.code}" />
                      <div style="fontFamily:monospace; fontWeight:bold; marginTop:10px;">${selectedBookQr?.code}</div>
                    </div>
                  </body>
                </html>
              `);
              win.document.close();
            }}><Printer className="mr-2 h-4 w-4" /> Cetak Label QR</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ANTREAN LOKAL */}
      <Dialog open={isQueueOpen} onOpenChange={v => { setIsQueueOpen(v); forceUnlockUI(); }}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-600" />
              Antrean Data Lokal ({localQueue.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {localQueue.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic">Antrean kosong.</div>
            ) : (
              <div className="space-y-3">
                {localQueue.map(item => (
                  <div key={item.tempId} className="p-3 border rounded-lg flex justify-between items-center bg-orange-50/50">
                    <div>
                      <div className="font-bold text-sm">{item.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{item.code} | {item.budgetSource}</div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromQueue(item.tempId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <div className="flex w-full gap-2">
               <Button variant="outline" className="flex-1" onClick={() => setIsQueueOpen(false)}>Tutup</Button>
               <Button className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={localQueue.length === 0 || isSyncing || isLocked} onClick={handleSyncToDatabase}>
                 {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CloudUpload className="h-4 w-4 mr-2" />}
                 Kirim ke Cloud
               </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCANNER MODAL */}
      <Dialog open={isScannerOpen} onOpenChange={v => !v && stopScanner()}>
        <DialogContent className="p-0 border-none bg-black max-w-xl h-[450px] overflow-hidden">
          <div id="scanner-view" className="w-full h-full bg-black"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>

      {/* HAPUS KONFIRMASI */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={v => { setIsDeleteDialogOpen(v); forceUnlockUI(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Buku dari Koleksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen. Buku akan dihapus dari katalog digital dan riwayat sirkulasi mungkin terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setBookToDelete(null); forceUnlockUI(); }}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBook} 
              disabled={isLocked}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
