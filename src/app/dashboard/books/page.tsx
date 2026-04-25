
"use client"

import { useState, useMemo, useRef, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
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
  Calendar as CalendarIcon,
  Filter,
  ChevronDown,
  Database,
  CloudUpload,
  CheckCircle2
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
  mainHeader: "LANTERA BACA",
  budgetSource: "BOSP",
  code: "",
  title: "",
  accountCode: "",
  publisher: "",
  publicationYear: "",
  acquisitionDate: "",
  isbn: "",
  category: "",
  rackLocation: "",
  totalStock: 1,
  availableStock: 1,
  description: ""
}

const STORAGE_KEY = 'perpus_local_queue_v3'

function BooksContent() {
  const db = useFirestore()
  const { isAdmin, user } = useUser()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
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
  
  const [localQueue, setLocalQueue] = useState<any[]>([])

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)
  
  const isLockedForUser = Boolean(settings?.isDataLocked === true && !isAdmin);

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        const focusGuards = document.querySelectorAll('[data-radix-focus-guard]');
        focusGuards.forEach(el => (el as HTMLElement).remove());
      }, 150);
    }
  }, []);

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
    forceUnlockUI();
  }, [forceUnlockUI])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setSearch(q)
  }, [searchParams])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localQueue))
    }
  }, [localQueue, isHydrated])

  const booksCollectionQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, 'books'), 
      orderBy('createdAt', 'desc'), 
      limit(displayLimit)
    )
  }, [db, !!user, displayLimit])

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

  const handleOpenAdd = () => {
    forceUnlockUI();
    setFormData({
      ...INITIAL_FORM_DATA,
      mainHeader: settings?.libraryName || "LANTERA BACA",
      publicationYear: isHydrated ? new Date().getFullYear().toString() : "",
      acquisitionDate: isHydrated ? new Date().toISOString().split('T')[0] : ""
    });
    setIsOpen(true);
  }

  const handleSaveToLocalQueue = () => {
    if (isLockedForUser) {
      toast({ title: "Gagal", description: "Fitur modifikasi sedang dibatasi Administrator.", variant: "destructive" })
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
    if (isLockedForUser) {
      toast({ title: "Sinkronisasi Terkunci", description: "Modifikasi sedang dibatasi Administrator.", variant: "destructive" })
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

  const handlePrintTable = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = filteredBooks.map((book, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${book.code}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${book.title}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${book.publisher || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${book.publicationYear || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${book.totalStock || 0}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head><title>Daftar Koleksi</title></head>
        <body onload="window.print(); window.close();">
          <h2>DAFTAR KOLEKSI BUKU PERPUSTAKAAN</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ccc; padding: 8px;">No</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Kode</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Judul</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Penerbit</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Thn</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Stok</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const handleUpdateBook = () => {
    if (!db || !editingBookId) return
    if (isLockedForUser) {
      toast({ title: "Gagal", description: "Modifikasi sedang dibatasi Administrator.", variant: "destructive" })
      return
    }

    const docRef = doc(db, 'books', editingBookId)
    const updatedData = { ...formData, updatedAt: new Date().toISOString() }

    setIsEditOpen(false)
    forceUnlockUI()

    updateDoc(docRef, updatedData);
    toast({ title: "Berhasil!", description: "Data buku telah diperbarui." })
  }

  const handleDeleteBook = () => {
    if (!db || !bookToDelete) return
    if (isLockedForUser) {
      toast({ title: "Gagal", description: "Fitur hapus sedang dibatasi Administrator.", variant: "destructive" })
      return
    }

    const docRef = doc(db, 'books', bookToDelete)
    
    setIsDeleteDialogOpen(false)
    forceUnlockUI()

    deleteDoc(docRef);
    toast({ title: "Terhapus", description: "Buku dihapus dari koleksi." })
  }

  const startScanner = async () => {
    forceUnlockUI();
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
          {isHydrated && localQueue.length > 0 && (
            <Button 
              variant="default" 
              size="sm" 
              className="bg-orange-600 hover:bg-orange-700 animate-pulse"
              onClick={() => { forceUnlockUI(); setIsQueueOpen(true); }}
            >
              <CloudUpload className="h-4 w-4 mr-2" /> Antrean ({localQueue.length})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrintTable}><Printer className="h-4 w-4 mr-2" /> Cetak</Button>
          <Button size="sm" onClick={handleOpenAdd}>
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
                    <DropdownMenuContent align="end" className="z-50">
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
                        setTimeout(() => {
                          setSelectedBookDetail(book); 
                          setIsDetailOpen(true);
                        }, 150);
                      }}><Eye className="h-4 w-4 mr-2" />Lihat Detail</DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
                        setTimeout(() => {
                          setSelectedBookQr(book); 
                          setIsQrOpen(true);
                        }, 150);
                      }}><QrCode className="h-4 w-4 mr-2" />Tampilkan QR</DropdownMenuItem>
                      <DropdownMenuItem onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
                        setTimeout(() => {
                          setEditingBookId(book.id); 
                          setFormData({
                            code: book.code || "",
                            title: book.title || "",
                            accountCode: book.accountCode || "",
                            publisher: book.publisher || "",
                            publicationYear: book.publicationYear?.toString() || "",
                            acquisitionDate: book.acquisitionDate || "",
                            isbn: book.isbn || "",
                            category: book.category || "",
                            rackLocation: book.rackLocation || "",
                            totalStock: Number(book.totalStock || 0),
                            availableStock: Number(book.availableStock || 0),
                            description: book.description || "",
                            mainHeader: book.mainHeader || settings?.libraryName || "LANTERA BACA",
                            budgetSource: book.budgetSource || "BOSP"
                          }); 
                          setIsEditOpen(true);
                        }, 150);
                      }}><Edit className="h-4 w-4 mr-2" />Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={(e) => { 
                        e.preventDefault();
                        forceUnlockUI();
                        setTimeout(() => {
                          setBookToDelete(book.id); 
                          setIsDeleteDialogOpen(true);
                        }, 150);
                      }}><Trash2 className="h-4 w-4 mr-2" />Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="text-center py-6 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <BooksContent />
    </Suspense>
  )
}
