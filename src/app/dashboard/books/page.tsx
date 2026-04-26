
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
  Database,
  CloudUpload,
  CameraOff
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
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
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Firebase imports
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc,
  useUser
} from '@/firebase'
import { collection, addDoc, deleteDoc, doc, updateDoc, query, limit, orderBy, serverTimestamp } from 'firebase/firestore'

const INITIAL_FORM_DATA = {
  mainHeader: "LANTERA BACA",
  budgetSource: "",
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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
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

  const budgetSourcesList = useMemo(() => {
    const raw = settings?.budgetSources || "BOSP, DAK, Hibah";
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }, [settings?.budgetSources]);

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
      budgetSource: budgetSourcesList[0] || "BOSP",
      publicationYear: isHydrated ? new Date().getFullYear().toString() : "",
      acquisitionDate: isHydrated ? new Date().toISOString().split('T')[0] : ""
    });
    setIsOpen(true);
  }

  const handleAiGenerate = async () => {
    if (!formData.title) {
      toast({ title: "Judul Kosong", description: "Isi judul buku untuk membuat deskripsi AI.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateBookDescription({ title: formData.title, isbn: formData.isbn });
      setFormData(prev => ({ ...prev, description: result.description }));
      toast({ title: "AI Berhasil", description: "Deskripsi buku telah dibuat." });
    } catch (e) {
      toast({ title: "AI Gagal", description: "Terjadi kesalahan koneksi AI.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
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
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const scannerElement = document.getElementById("scanner-view")
        if (!scannerElement) return

        const scanner = new Html5Qrcode("scanner-view")
        scannerInstanceRef.current = scanner
        
        try {
          await scanner.start(
            { facingMode: "environment" },
            { 
              fps: 20, 
              qrbox: (vw, vh) => ({ width: Math.min(vw, vh) * 0.7, height: Math.min(vw, vh) * 0.7 }),
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] 
            },
            (text) => { 
              setSearch(text); 
              stopScanner(); 
            },
            () => {}
          )
          setHasCameraPermission(true)
        } catch (e: any) {
          console.error("Camera error:", e)
          setHasCameraPermission(false)
          toast({ title: "Akses Kamera Ditolak", description: "Mohon aktifkan izin kamera di pengaturan browser.", variant: "destructive" })
        }
      }, 50)
    } catch (e) { 
      setHasCameraPermission(false)
    }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
        const el = document.getElementById("scanner-view")
        if (el) {
          await scannerInstanceRef.current.clear()
        }
      } catch (e) {
        console.warn("Scanner cleanup warning:", e)
      }
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
    forceUnlockUI()
  }

  const handlePrintTable = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const sortedForPrint = [...filteredBooks].sort((a, b) => {
      const yearA = Number(a.publicationYear) || 0;
      const yearB = Number(b.publicationYear) || 0;
      return yearB - yearA;
    });

    const rowsHtml = sortedForPrint.map((book, index) => `
      <tr>
        <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: normal; font-size: 10.5pt;">${index + 1}</td>
        <td style="border: 1px solid #000; padding: 10px; font-family: monospace; font-weight: normal; font-size: 10.5pt;">${book.code}</td>
        <td style="border: 1px solid #000; padding: 10px; font-weight: normal; font-size: 10.5pt;">${book.title}</td>
        <td style="border: 1px solid #000; padding: 10px; font-weight: normal; font-size: 10.5pt;">${book.publisher || '-'}</td>
        <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: normal; font-size: 10.5pt;">${book.publicationYear || '-'}</td>
        <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: normal; font-size: 10.5pt;">${book.totalStock || 0}</td>
      </tr>
    `).join('')

    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: '2-digit' });
    const formattedTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const formattedDateTime = `${formattedDate}, ${formattedTime}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Koleksi Buku</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              font-size: 11pt; 
              margin: 0; 
              padding: 15mm; 
              color: #000; 
            }
            .top-meta { 
              font-size: 9px; 
              color: #000; 
              font-weight: 500; 
              position: absolute; 
              top: 5mm; 
              left: 15mm; 
            }
            .header { 
              text-align: center; 
              border-bottom: 2.5px solid #000; 
              padding-bottom: 12px; 
              margin-bottom: 25px; 
              margin-top: 10px;
            }
            .header .instansi { font-size: 11pt; font-weight: 600; line-height: 1.2; text-transform: uppercase; }
            .header .school-name { font-size: 11pt; font-weight: 900; text-transform: uppercase; margin-top: 2px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1.5px solid #000; }
            th { background: #f2f2f2; border: 1px solid #000; padding: 10px; text-align: center; font-weight: 900; font-size: 11pt; }
            td { border: 1px solid #000; padding: 10px; font-size: 10.5pt; color: #000; font-weight: normal; }
            
            .footer-sign { margin-top: 50px; float: right; text-align: center; width: 280px; font-size: 10.5pt; }
            .print-footer { 
              position: fixed; 
              bottom: 8mm; 
              left: 15mm; 
              right: 15mm; 
              font-size: 8pt; 
              text-align: center; 
              color: #333; 
              border-top: 1px solid #ccc; 
              padding-top: 2mm; 
            }
            h3 { font-size: 12pt; font-weight: 900; margin-bottom: 15px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="top-meta">Daftar Koleksi Buku - ${formattedDateTime}</div>
          <div class="header">
            <div class="instansi">${settings?.govtInstitution || 'PEMERINTAH KABUPATEN MANGGARAI'}</div>
            <div class="instansi">${settings?.eduDept || 'DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA'}</div>
            <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
          </div>
          <h3 style="text-align: center; text-transform: uppercase;">LAPORAN DAFTAR KOLEKSI BUKU PERPUSTAKAAN</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">No</th>
                <th style="width: 90px;">Kode Buku</th>
                <th>Judul Buku</th>
                <th style="width: 130px;">Penerbit</th>
                <th style="width: 60px;">Tahun</th>
                <th style="width: 55px;">Stok</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer-sign">
            ${settings?.reportCity || 'Mando'}, ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Kepala Sekolah,<br/><br/><br/><br/>
            <strong>${settings?.principalName || 'Lodovikus Jangkar, S.Pd.Gr'}</strong><br/>
            NIP. ${settings?.principalNip || '198507272011011020'}
          </div>
          <div class="print-footer">© 2026 Lantera Baca</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const handlePrintAllQr = () => {
    if (filteredBooks.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrCardsHtml = filteredBooks.map((book) => `
      <div style="width: 80mm; height: 35mm; border: 0.5pt solid #ccc; display: flex; align-items: center; page-break-inside: avoid; float: left; margin: 2mm; background: #fff; border-radius: 2mm; overflow: hidden; font-family: 'Inter', sans-serif;">
        <div style="width: 32mm; height: 32mm; display: flex; align-items: center; justify-content: center; padding-left: 2mm;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${book.code}" style="width: 28mm; height: 28mm;" />
        </div>
        <div style="flex: 1; padding: 2mm 3mm 2mm 1mm; display: flex; flex-direction: column; justify-content: center; min-width: 0;">
          <div style="font-size: 8.5pt; font-weight: 900; line-height: 1.1; margin-bottom: 1.5mm; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-transform: uppercase;">${book.title}</div>
          <div style="font-size: 11pt; font-family: monospace; font-weight: 900; color: #2E6ECE; margin-bottom: 1mm; letter-spacing: 0.5px;">${book.code}</div>
          <div style="font-size: 6pt; color: #555; font-weight: 700; margin-bottom: 0.5mm;">SUMBER: ${book.budgetSource || '-'}</div>
          <div style="font-size: 6pt; color: #555; font-weight: 700; margin-bottom: 1.5mm;">REK: ${book.accountCode || '-'}</div>
          <div style="font-size: 5pt; color: #999; text-transform: uppercase; font-weight: 800; border-top: 0.3pt solid #eee; pt: 1mm;">${settings?.libraryName || 'LANTERA BACA'}</div>
        </div>
      </div>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Label QR Inventaris Buku</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; background: #fff; padding-top: 5mm; }
            .school-name { font-size: 18px; font-weight: 900; text-transform: uppercase; }
            .print-container { overflow: hidden; padding: 5mm; }
            .print-footer { position: fixed; bottom: 5mm; left: 0; right: 0; text-align: center; font-size: 8px; color: #999; border-top: 1px solid #eee; padding-top: 2mm; background: #fff; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>${settings?.govtInstitution || 'PEMERINTAH KABUPATEN MANGGARAI'}</div>
            <div>${settings?.eduDept || 'DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA'}</div>
            <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
          </div>
          <h3 style="text-align: center; text-transform: uppercase; margin: 10px 0;">LABEL QR INVENTARIS BUKU</h3>
          <div class="print-container">
            ${qrCardsHtml}
          </div>
          <div class="print-footer">© 2026 Lantera Baca - SMPN 5 Langke Rembong</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const handlePrintSingleQr = (book: any) => {
    if (!book) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Label QR</title>
          <style>
            @page { size: 80mm 35mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 35mm; width: 80mm; }
            .sticker {
              width: 80mm;
              height: 35mm;
              display: flex;
              align-items: center;
              background: #fff;
              box-sizing: border-box;
              overflow: hidden;
            }
            .qr-side {
              width: 32mm;
              height: 32mm;
              display: flex;
              align-items: center;
              justify-content: center;
              padding-left: 2mm;
            }
            .qr-side img {
              width: 28mm;
              height: 28mm;
            }
            .info-side {
              flex: 1;
              padding: 2mm 3mm 2mm 1mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-width: 0;
            }
            .title {
              font-size: 8.5pt;
              font-weight: 900;
              line-height: 1.1;
              margin-bottom: 1.5mm;
              overflow: hidden;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              text-transform: uppercase;
            }
            .code {
              font-size: 11pt;
              font-family: monospace;
              font-weight: 900;
              color: #2E6ECE;
              margin-bottom: 1mm;
              letter-spacing: 0.5px;
            }
            .meta {
              font-size: 6pt;
              color: #555;
              font-weight: 700;
              margin-bottom: 0.5mm;
            }
            .footer {
              font-size: 5pt;
              color: #999;
              text-transform: uppercase;
              font-weight: 800;
              margin-top: 1mm;
              padding-top: 1mm;
              border-top: 0.3pt solid #eee;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="sticker">
            <div class="qr-side">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${book.code}" />
            </div>
            <div class="info-side">
              <div class="title">${book.title}</div>
              <div class="code">${book.code}</div>
              <div class="meta">SUMBER: ${book.budgetSource || '-'}</div>
              <div class="meta">REK: ${book.accountCode || '-'}</div>
              <div class="footer">${settings?.libraryName || 'LANTERA BACA'}</div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
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
          
          <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" /> Opsi Cetak
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintTable(); }}>
                 <Printer className="h-4 w-4 mr-2" /> Cetak Daftar Buku
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintAllQr(); }}>
                 <QrCode className="h-4 w-4 mr-2" /> Cetak Semua QR Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                 forceUnlockUI();
              }
            }}
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
          <Button variant="secondary" className="h-11 px-4" onClick={startScanner} title="Buka Kamera"><ScanBarcode className="h-4 w-4" /></Button>
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
                            budgetSource: book.budgetSource || budgetSourcesList[0] || "BOSP"
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

      {/* DIALOG TAMBAH BUKU */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary uppercase">Registrasi Buku Baru</DialogTitle>
            <DialogDescription>Lengkapi formulir di bawah untuk menambahkan buku ke dalam antrean pendaftaran.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Judul Buku *</Label>
                <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Judul Lengkap..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Kode Buku (Stiker) *</Label>
                  <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="bg-white border-slate-300 h-11 font-mono uppercase" placeholder="Cth: 001/P" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">ISBN (Barcode)</Label>
                  <Input value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="978-..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Sumber Anggaran</Label>
                  {isAdmin ? (
                    <Input 
                      value={formData.budgetSource} 
                      onChange={e => setFormData({...formData, budgetSource: e.target.value})} 
                      className="bg-white border-slate-300 h-11" 
                      placeholder="Ketik sumber..." 
                    />
                  ) : (
                    <Select value={formData.budgetSource} onValueChange={v => setFormData({...formData, budgetSource: v})}>
                      <SelectTrigger className="bg-white border-slate-300 h-11"><SelectValue placeholder="Pilih Sumber..." /></SelectTrigger>
                      <SelectContent>
                        {budgetSourcesList.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Kode Rekening</Label>
                  <Input value={formData.accountCode} onChange={e => setFormData({...formData, accountCode: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Cth: 5.1.02.01" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Tahun Terbit</Label>
                  <Input value={formData.publicationYear} onChange={e => setFormData({...formData, budgetSource: formData.budgetSource, publicationYear: e.target.value})} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Kategori</Label>
                  <Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Fiksi, Umum, dsb" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Jumlah Total</Label>
                  <Input type="number" value={formData.totalStock} onChange={e => {
                    const val = Number(e.target.value);
                    setFormData({...formData, totalStock: val, availableStock: val})
                  }} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Lokasi Rak</Label>
                  <Input value={formData.rackLocation} onChange={e => setFormData({...formData, rackLocation: e.target.value})} className="bg-white border-slate-300 h-11" placeholder="Cth: A-1" />
                </div>
              </div>
              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest">Deskripsi / Ringkasan</Label>
                  <Button variant="ghost" type="button" size="sm" className="h-6 text-[9px] gap-1 text-primary" onClick={handleAiGenerate} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-2 w-2 animate-spin" /> : <Sparkles className="h-2 w-2" />} Deskripsi AI
                  </Button>
                </div>
                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-white border-slate-300 min-h-[100px]" placeholder="Ringkasan cerita atau konten buku..." />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => { setIsOpen(false); forceUnlockUI(); }}>Batal</Button>
            <Button onClick={handleSaveToLocalQueue} disabled={isLockedForUser} className="px-8 shadow-lg shadow-primary/20">Simpan ke Antrean</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG UBAH BUKU */}
      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-primary uppercase">Ubah Data Koleksi</DialogTitle>
            <DialogDescription>Perbarui rincian informasi buku ini untuk sinkronisasi ke database pusat.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Judul Buku</Label><Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-white border-slate-300 h-11" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Kode Buku</Label><Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="bg-white border-slate-300 h-11 font-mono uppercase" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">ISBN</Label><Input value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} className="bg-white border-slate-300 h-11" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Stok Tersedia</Label>
                  <Input type="number" value={formData.availableStock} onChange={e => setFormData({...formData, availableStock: Number(e.target.value)})} className="bg-white border-slate-300 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Stok Total</Label>
                  <Input type="number" value={formData.totalStock} onChange={e => setFormData({...formData, totalStock: Number(e.target.value)})} className="bg-white border-slate-300 h-11" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Sumber</Label>
                  {isAdmin ? (
                    <Input 
                      value={formData.budgetSource} 
                      onChange={e => setFormData({...formData, budgetSource: e.target.value})} 
                      className="bg-white border-slate-300 h-11" 
                    />
                  ) : (
                    <Select value={formData.budgetSource} onValueChange={v => setFormData({...formData, budgetSource: v})}>
                      <SelectTrigger className="bg-white border-slate-300 h-11"><SelectValue placeholder="Pilih Sumber..." /></SelectTrigger>
                      <SelectContent>
                        {budgetSourcesList.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Rekening</Label><Input value={formData.accountCode} onChange={e => setFormData({...formData, accountCode: e.target.value})} className="bg-white border-slate-300 h-11" /></div>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Deskripsi</Label><Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-white border-slate-300 min-h-[100px]" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setIsEditOpen(false); forceUnlockUI(); }}>Batal</Button><Button onClick={handleUpdateBook}>Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG DETAIL BUKU */}
      <Dialog open={isDetailOpen} onOpenChange={(v) => { setIsDetailOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-2xl bg-white border-none rounded-3xl overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Buku</DialogTitle>
            <DialogDescription>Menampilkan informasi rinci dari buku yang dipilih.</DialogDescription>
          </DialogHeader>
          {selectedBookDetail && (
            <div className="flex flex-col">
              <div className="p-8 bg-primary text-primary-foreground">
                <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-none font-mono uppercase tracking-widest">{selectedBookDetail.code}</Badge>
                <h2 className="text-3xl font-black leading-tight mb-2">{selectedBookDetail.title}</h2>
                <div className="flex flex-wrap gap-4 opacity-80 text-sm font-semibold">
                  <span className="flex items-center gap-1.5"><Database className="h-3 w-3" /> {selectedBookDetail.category || "Umum"}</span>
                  <span className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> {selectedBookDetail.publicationYear}</span>
                  <span className="flex items-center gap-1.5"><MoreVertical className="h-3 w-3" /> Rak: {selectedBookDetail.rackLocation || "-"}</span>
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventaris</p>
                    <p className="text-sm font-bold mt-1">Sumber: {selectedBookDetail.budgetSource || '-'}</p>
                    <p className="text-[10px] font-mono mt-0.5 text-muted-foreground">Rek: {selectedBookDetail.accountCode || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ketersediaan</p>
                    <p className="text-2xl font-black text-primary mt-1">{selectedBookDetail.availableStock} / {selectedBookDetail.totalStock}</p>
                    <p className="text-[10px] font-bold text-muted-foreground">UNIT FISIK</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-primary">Deskripsi Buku</h4>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    {selectedBookDetail.description || "Belum ada ringkasan untuk buku ini."}
                  </p>
                </div>
                <Button className="w-full h-12 rounded-xl" variant="outline" onClick={() => { setIsDetailOpen(false); forceUnlockUI(); }}>Tutup Detail</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG QR CODE - LANDSCAPE DESIGN */}
      <Dialog open={isQrOpen} onOpenChange={(v) => { setIsQrOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-xl text-center p-0 border-none rounded-3xl overflow-hidden">
          <DialogHeader className="p-6 border-b bg-white">
            <DialogTitle className="text-center font-bold text-primary">Label QR Inventaris</DialogTitle>
            <DialogDescription className="text-center text-xs">Pratinjau stiker label buku format Landscape.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-slate-50 flex flex-col items-center">
            {selectedBookQr && (
              <div className="bg-white w-full max-w-[400px] aspect-[8/3.5] rounded-xl border-2 border-primary/20 shadow-xl flex items-center p-4">
                <div className="w-1/3 aspect-square flex items-center justify-center border-r pr-4">
                  <QRCodeSVG value={selectedBookQr.code} size={100} level="H" includeMargin />
                </div>
                <div className="flex-1 pl-6 text-left flex flex-col justify-center min-w-0">
                  <div className="font-black text-xs leading-tight uppercase truncate">{selectedBookQr.title}</div>
                  <div className="font-mono text-primary font-black text-lg mt-1">{selectedBookQr.code}</div>
                  <div className="text-[8px] font-bold text-muted-foreground mt-1">SUMBER: {selectedBookQr.budgetSource || '-'}</div>
                  <div className="text-[8px] font-bold text-muted-foreground">REK: {selectedBookQr.accountCode || '-'}</div>
                  <div className="mt-2 pt-1 border-t text-[7px] font-black text-slate-400 uppercase tracking-widest">
                    {settings?.libraryName || 'LANTERA BACA'}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 bg-white grid grid-cols-2 gap-3">
             <Button variant="outline" onClick={() => { setIsQrOpen(false); forceUnlockUI(); }}>Tutup</Button>
             <Button className="gap-2" onClick={() => handlePrintSingleQr(selectedBookQr)}><Printer className="h-4 w-4" /> Cetak Label</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG ANTREAN SINKRONISASI */}
      <Dialog open={isQueueOpen} onOpenChange={(v) => { setIsQueueOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white border-none rounded-2xl overflow-hidden">
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Database className="h-5 w-5" /> Antrean Sinkronisasi ({localQueue.length})
            </DialogTitle>
            <DialogDescription>Buku yang terdaftar di bawah ini tersimpan sementara di memori browser.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
            {localQueue.map(item => (
              <div key={item.tempId} className="p-3 border rounded-lg flex justify-between items-center bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{item.title}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{item.code}</p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => setLocalQueue(prev => prev.filter(b => b.tempId !== item.tempId))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setIsQueueOpen(false); forceUnlockUI(); }}>Nanti Saja</Button>
            <Button className="flex-1 bg-orange-600 hover:bg-orange-700 gap-2" onClick={handleSyncToDatabase} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />} Kirim Semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SCANNER DIALOG */}
      <Dialog open={isScannerOpen} onOpenChange={(v) => { if(!v) stopScanner(); }}>
        <DialogContent className="sm:max-w-xl p-0 h-[100dvh] sm:h-auto border-none bg-black overflow-hidden rounded-none sm:rounded-3xl">
           <DialogHeader>
             <DialogTitle className="sr-only">Pemindai Barcode</DialogTitle>
             <DialogDescription className="sr-only">Arahkan kamera ke QR Code atau Barcode buku.</DialogDescription>
           </DialogHeader>
           <div id="scanner-view" className="w-full h-full bg-black min-h-[400px] flex items-center justify-center relative">
             {hasCameraPermission === false && (
               <div className="p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
                 <Alert variant="destructive" className="bg-white/10 border-white/20 text-white">
                   <CameraOff className="h-4 w-4 text-white" />
                   <AlertTitle>Akses Kamera Ditolak</AlertTitle>
                   <AlertDescription className="text-xs opacity-80">
                     Izin kamera diblokir browser. Silakan aktifkan izin kamera di pengaturan browser Anda (ikon gembok di sebelah alamat web).
                   </AlertDescription>
                 </Alert>
               </div>
             )}
           </div>
           <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 z-50 rounded-full h-12 w-12" onClick={stopScanner}><X className="h-6 w-6" /></Button>
        </DialogContent>
      </Dialog>

      {/* ALERT DELETE */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(v) => { setIsDeleteDialogOpen(v); if(!v) forceUnlockUI(); }}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-primary uppercase">Hapus Koleksi?</AlertDialogTitle>
            <AlertDialogDescription>Data buku akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold" onClick={() => { setBookToDelete(null); forceUnlockUI(); }}>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold" onClick={handleDeleteBook}>Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
