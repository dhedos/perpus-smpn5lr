
"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Loader2, 
  ScanBarcode,
  X,
  GraduationCap,
  History,
  ArrowRightLeft,
  ChevronRight,
  Clock,
  Printer,
  CheckCircle,
  AlertTriangle,
  Minus,
  Plus,
  User,
  BookOpen,
  CameraOff,
  Users
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc,
  useUser
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, query, orderBy } from 'firebase/firestore'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from "date-fns"

export default function TeacherLoansPage() {
  const db = useFirestore()
  const { user, isAdmin } = useUser()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("borrow")
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [returnSearch, setReturnSearch] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [scanMode, setScanMode] = useState<"smart" | "return">("smart")
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [borrowQuantity, setBorrowQuantity] = useState(1)
  const [borrowType, setBorrowType] = useState<"Pribadi" | "Kolektif">("Pribadi")

  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)
  const [showBookSuggestions, setShowBookSuggestions] = useState(false)

  // State Pengembalian Detil
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
  const [pendingReturnTrans, setPendingReturnTrans] = useState<any>(null)
  const [returnNormalQty, setReturnNormalQty] = useState(0)
  const [returnDamagedQty, setReturnDamagedQty] = useState(0)
  const [returnLostQty, setReturnLostQty] = useState(0)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)
  
  const isLockedForUser = Boolean(settings?.isDataLocked && !isAdmin);

  const membersRef = useMemoFirebase(() => (db && user) ? collection(db, 'members') : null, [db, !!user])
  const booksRef = useMemoFirebase(() => (db && user) ? collection(db, 'books') : null, [db, !!user])
  const allTransRef = useMemoFirebase(() => (db && user) ? collection(db, 'transactions') : null, [db, !!user])

  const { data: allMembersData } = useCollection(membersRef)
  const { data: allBooksData } = useCollection(booksRef)
  const { data: allTransactions } = useCollection(allTransRef)

  // FILTER KHUSUS GURU & PEGAWAI
  const staffMembers = useMemo(() => {
    if (!allMembersData) return [];
    return allMembersData.filter(m => m.type === 'Teacher' || m.type === 'Staff');
  }, [allMembersData]);

  const books = useMemo(() => {
    if (!allBooksData) return [];
    return [...allBooksData].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [allBooksData]);

  // Transaksi aktif
  const activeTransactions = useMemo(() => {
    if (!allTransactions || !allBooksData || !allMembersData) return []
    return allTransactions
      .filter(t => 
        t.status === 'active' && 
        (t.memberType === 'Teacher' || t.memberType === 'Staff') &&
        allBooksData.some(b => b.id === t.bookId) &&
        allMembersData.some(m => m.memberId === t.memberId)
      )
      .sort((a, b) => {
        const dateA = a.borrowDate ? new Date(a.borrowDate).getTime() : 0;
        const dateB = b.borrowDate ? new Date(b.borrowDate).getTime() : 0;
        return dateB - dateA;
      })
  }, [allTransactions, allBooksData, allMembersData])

  // RIWAYAT GURU & PEGAWAI BULAN INI
  const historyTransactions = useMemo(() => {
    if (!allTransactions || !allBooksData || !allMembersData) return []
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    return allTransactions
      .filter(t => {
        const dateToUse = t.returnDate ? parseISO(t.returnDate) : (t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date());
        return (
          t.status === 'returned' && 
          (t.memberType === 'Teacher' || t.memberType === 'Staff') &&
          isWithinInterval(dateToUse, { start, end }) &&
          allBooksData.some(b => b.id === t.bookId) &&
          allMembersData.some(m => m.memberId === t.memberId)
        )
      })
      .sort((a, b) => {
        const dateA = a.returnDate ? new Date(a.returnDate).getTime() : 0;
        const dateB = b.returnDate ? new Date(b.returnDate).getTime() : 0;
        return dateB - dateA;
      })
  }, [allTransactions, allBooksData, allMembersData])

  const memberSuggestions = useMemo(() => {
    if (!memberSearch || memberSearch.length < 1 || !staffMembers) return []
    return staffMembers.filter(m => 
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
      m.memberId?.toLowerCase().startsWith(memberSearch.toLowerCase())
    ).slice(0, 5)
  }, [memberSearch, staffMembers])

  const bookSuggestions = useMemo(() => {
    if (!bookSearch || bookSearch.length < 1 || !books) return []
    return books.filter(b => 
      b.title?.toLowerCase().includes(bookSearch.toLowerCase()) || 
      b.code?.toLowerCase().startsWith(bookSearch.toLowerCase()) ||
      b.isbn?.startsWith(bookSearch)
    ).slice(0, 5)
  }, [bookSearch, books])

  const filteredActive = useMemo(() => {
    if (!activeTransactions) return []
    if (!returnSearch) return activeTransactions
    const s = returnSearch.toLowerCase()
    return activeTransactions.filter(t => 
      t.memberName?.toLowerCase().includes(s) || 
      t.bookTitle?.toLowerCase().includes(s) ||
      t.memberId?.toLowerCase().includes(s)
    )
  }, [activeTransactions, returnSearch])

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, []);

  const handleLookup = (text: string): boolean => {
    if (!text) return false
    const member = staffMembers?.find(t => t.memberId?.toLowerCase() === text.toLowerCase())
    const book = books?.find(b => b.code?.toLowerCase() === text.toLowerCase() || b.isbn === text)

    if (scanMode === "smart") {
      if (member) {
        setSelectedMember(member)
        setMemberSearch("")
        setShowMemberSuggestions(false)
        toast({ title: member.type === 'Teacher' ? "Guru Terpilih" : "Pegawai Terpilih" })
        return true
      } else if (book) {
        setSelectedBook(book)
        setBookSearch("")
        setShowBookSuggestions(false)
        setBorrowQuantity(1)
        toast({ title: "Buku Terpilih" })
        return true
      }
    } else {
      const trans = activeTransactions?.find(t => t.memberId?.toLowerCase() === text.toLowerCase() || t.bookTitle?.toLowerCase().includes(text.toLowerCase()))
      if (trans) {
        setTimeout(() => prepareReturn(trans), 10)
        return true
      }
    }
    return false
  }

  const startScanner = async (mode: "smart" | "return") => {
    setScanMode(mode)
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    setTimeout(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
        const el = document.getElementById("teacher-smart-scanner")
        if (!el) return

        const sc = new Html5Qrcode("teacher-smart-scanner")
        scannerInstanceRef.current = sc
        try {
          await sc.start(
            { facingMode: "environment" }, 
            { 
              fps: 15, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128]
            }, 
            (text) => {
              if (handleLookup(text)) {
                stopScanner()
              }
            }, () => {})
          setHasCameraPermission(true)
        } catch (e: any) {
          console.error("Camera access error:", e)
          setHasCameraPermission(false)
          if (!e?.toString()?.includes("already being used")) {
             toast({ title: "Akses Kamera Bermasalah", description: "Mohon aktifkan izin kamera di pengaturan browser.", variant: "destructive" })
          }
        }
      } catch (e) { 
        setIsScannerOpen(false)
      }
    }, 300)
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
        await scannerInstanceRef.current.clear()
      } catch (e) {
        console.warn("Teacher scanner cleanup warning:", e)
      }
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
    forceUnlockUI()
  }

  const handleProcessLoan = () => {
    if (!db || !selectedMember || !selectedBook) return
    if (isLockedForUser) {
      toast({ title: "Fitur Terkunci", description: "Admin mengunci fitur pengubahan data.", variant: "destructive" })
      return
    }

    if (borrowQuantity > (selectedBook.availableStock || 0)) {
      toast({ 
        title: "Stok Tidak Cukup", 
        description: `Stok tersedia hanya ${selectedBook.availableStock} unit.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true)

    const newLoan = {
      memberId: selectedMember.memberId,
      memberName: selectedMember.name,
      memberType: selectedMember.type, 
      classOrSubject: selectedMember.classOrSubject || "-",
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      quantity: borrowQuantity,
      borrowType: borrowType,
      type: 'teacher_handbook',
      status: 'active',
      borrowDate: new Date().toISOString(),
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, 'transactions'), newLoan).then(() => {
      const avail = Number(selectedBook.availableStock ?? 1)
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Math.max(0, avail - borrowQuantity) })
      toast({ title: "Peminjaman Dicatat", description: `${selectedBook.title} telah diserahkan ke ${selectedMember.name}.` })
      setSelectedBook(null)
      setSelectedMember(null)
      setBorrowQuantity(1)
    }).finally(() => setIsProcessing(false))
  }

  const prepareReturn = (trans: any) => {
    setPendingReturnTrans(trans);
    setReturnNormalQty(Number(trans.quantity || 1));
    setReturnDamagedQty(0);
    setReturnLostQty(0);
    setIsReturnConfirmOpen(true);
  }

  const handleDamagedQtyChange = (val: number) => {
    if (!pendingReturnTrans) return
    const total = Number(pendingReturnTrans.quantity || 1)
    const newDamaged = Math.min(Math.max(0, val), total - returnLostQty)
    setReturnDamagedQty(newDamaged)
    setReturnNormalQty(total - newDamaged - returnLostQty)
  }

  const handleLostQtyChange = (val: number) => {
    if (!pendingReturnTrans) return
    const total = Number(pendingReturnTrans.quantity || 1)
    const newLost = Math.min(Math.max(0, val), total - returnDamagedQty)
    setReturnLostQty(newLost)
    setReturnNormalQty(total - returnDamagedQty - newLost)
  }

  const handleConfirmReturn = () => {
    if (!db || !pendingReturnTrans) return
    
    setIsProcessing(true)
    
    const transRef = doc(db, 'transactions', pendingReturnTrans.id)
    const updateData = { 
      status: 'returned', 
      returnDate: new Date().toISOString(),
      rincianKondisi: {
        normal: returnNormalQty,
        damaged: returnDamagedQty,
        lost: returnLostQty
      }
    }

    setIsReturnConfirmOpen(false)
    forceUnlockUI()

    updateDoc(transRef, updateData).then(async () => {
      const bRef = doc(db, 'books', pendingReturnTrans.bookId)
      const bDoc = await getDoc(bRef)
      if (bDoc.exists()) {
        const currentTotal = Number(bDoc.data().totalStock || 0)
        const currentAvail = Number(bDoc.data().availableStock || 0)
        
        const backToShelf = returnNormalQty + returnDamagedQty;
        const permanentLoss = returnLostQty;

        updateDoc(bRef, { 
          totalStock: Math.max(0, currentTotal - permanentLoss),
          availableStock: currentAvail + backToShelf
        })
      }
      toast({ title: "Berhasil!", description: "Pengembalian buku telah dicatat." })
    }).finally(() => setIsProcessing(false))
  }

  const handlePrintBukti = () => {
    const targetData = activeTab === "borrow" ? (historyTransactions || []) : filteredActive;
    if (targetData.length === 0) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = targetData.map((t, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.memberName} (${t.memberType === 'Teacher' ? 'Guru' : 'Pegawai'})</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle} (${t.quantity || 1} Unit)</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.borrowDate ? new Date(t.borrowDate).toLocaleDateString('id-ID') : '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.returnDate ? new Date(t.returnDate).toLocaleDateString('id-ID') : 'DIPEGANG'}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Riwayat Buku Guru & Pegawai - ${format(new Date(), 'MMMM yyyy')}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 11pt; margin: 0; padding: 15mm; }
            .print-footer { position: fixed; bottom: 8mm; left: 15mm; right: 15mm; font-size: 8pt; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2 style="text-align: center;">RIWAYAT BUKU PEGANGAN GURU & PEGAWAI (BULAN BERJALAN)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ccc; padding: 10px;">No</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Nama Member</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Judul Buku</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Tgl Pinjam</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Tgl Kembali</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="print-footer">© 2026 Lantera Baca - Sistem Informasi Perpustakaan Modern</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> Buku Pegangan Guru & Pinjaman Pegawai
          </h1>
          <p className="text-sm text-muted-foreground">Peminjaman khusus untuk kebutuhan mengajar dan operasional sekolah.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handlePrintBukti}>
             <Printer className="h-4 w-4 mr-2" /> Cetak
           </Button>
           <Badge variant="secondary" className="h-9 px-3 bg-blue-100 text-blue-700 border-none font-bold">
            TA {settings?.academicYear || "2024/2025"}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); forceUnlockUI(); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50">
          <TabsTrigger value="borrow" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Penyerahan</TabsTrigger>
          <TabsTrigger value="return" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pengembalian</TabsTrigger>
        </TabsList>

        <TabsContent value="borrow" className="mt-8 space-y-6">
          <Card className="bg-primary/5 border-primary/20 overflow-hidden">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <Button size="lg" className="h-16 px-12 gap-3 shadow-xl hover:shadow-2xl transition-all" onClick={() => startScanner("smart")}>
                <ScanBarcode className="h-6 w-6" /> Smart Scan
              </Button>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Scan Kartu Guru/Pegawai atau Kode Buku</div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* Pilihan Jenis & Jumlah */}
              <Card className="border-none shadow-sm">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary uppercase tracking-wider font-bold">
                    Jenis & Jumlah
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Jenis Peminjaman</Label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                      <Button 
                        variant={borrowType === "Pribadi" ? "default" : "ghost"} 
                        className="flex-1 h-9 text-xs font-bold"
                        onClick={() => setBorrowType("Pribadi")}
                      >
                        <User className="h-3 w-3 mr-2" /> Pribadi
                      </Button>
                      <Button 
                        variant={borrowType === "Kolektif" ? "default" : "ghost"} 
                        className="flex-1 h-9 text-xs font-bold"
                        onClick={() => setBorrowType("Kolektif")}
                      >
                        <Users className="h-3 w-3 mr-2" /> Kolektif
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Jumlah Buku</Label>
                    <div className="flex items-center justify-between p-2 border rounded-xl bg-white">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-lg"
                        onClick={() => setBorrowQuantity(q => Math.max(1, q - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black">{borrowQuantity}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Unit</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-10 w-10 rounded-lg"
                        onClick={() => setBorrowQuantity(q => q + 1)}
                        disabled={selectedBook && borrowQuantity >= (selectedBook.availableStock || 0)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Identitas Penyerahan</CardTitle>
                  <CardDescription>Gunakan Smart Scan di atas atau pilih secara manual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pilih Guru/Pegawai</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Nama atau NIP..." 
                        className="pl-10 bg-white"
                        value={memberSearch}
                        onChange={e => { setMemberSearch(e.target.value); setShowMemberSuggestions(true); }}
                        onFocus={() => setShowMemberSuggestions(true)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup(memberSearch)}
                      />
                      {showMemberSuggestions && memberSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                          {memberSuggestions.map(m => (
                            <div key={m.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0" onClick={() => { setSelectedMember(m); setMemberSearch(""); setShowMemberSuggestions(false); }}>
                              <div className="flex items-center justify-between">
                                <div className="font-bold">{m.name}</div>
                                <Badge variant="outline" className="text-[8px] h-4 px-1">{m.type === 'Teacher' ? 'Guru' : 'Staf'}</Badge>
                              </div>
                              <div className="text-[10px] text-muted-foreground">{m.memberId}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedMember && (
                      <div className="p-3 bg-white rounded-lg border flex justify-between items-center animate-in slide-in-from-left-2">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-primary">{selectedMember.name}</div>
                          <div className="text-[10px] text-muted-foreground">{selectedMember.type === 'Teacher' ? 'Guru' : 'Pegawai'}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMember(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pilih Buku Pegangan</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Judul atau Kode Buku..." 
                        className="pl-10 bg-white"
                        value={bookSearch}
                        onChange={e => { setBookSearch(e.target.value); setShowBookSuggestions(true); }}
                        onFocus={() => setShowBookSuggestions(true)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup(bookSearch)}
                      />
                      {showBookSuggestions && bookSuggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                          {bookSuggestions.map(b => (
                            <div key={b.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0" onClick={() => { setSelectedBook(b); setBookSearch(""); setShowBookSuggestions(false); }}>
                              <div className="font-bold">{b.title}</div>
                              <div className="text-[10px] text-muted-foreground">{b.code} ({b.availableStock} Tersedia)</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedBook && (
                      <div className="p-3 bg-white rounded-lg border flex justify-between items-center animate-in slide-in-from-right-2">
                        <div className="text-xs font-bold text-secondary-foreground">{selectedBook.title}</div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedBook(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>

                  <Button 
                    className="w-full h-12 font-black shadow-lg" 
                    disabled={!selectedMember || !selectedBook || isProcessing || isLockedForUser}
                    onClick={handleProcessLoan}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : "SERAHKAN BUKU"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden h-full">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Riwayat Bulan Ini
                </CardTitle>
                <CardDescription className="text-[10px]">Daftar riwayat buku guru & pegawai untuk bulan {format(new Date(), 'MMMM yyyy')}.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">No.</TableHead>
                      <TableHead>Nama Member</TableHead>
                      <TableHead>Buku</TableHead>
                      <TableHead>Pinjam</TableHead>
                      <TableHead>Kembali</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyTransactions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">Belum ada riwayat di bulan ini.</TableCell></TableRow>
                    ) : historyTransactions.slice(0, 50).map((t, index) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-center text-xs">{index + 1}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-bold">{t.memberName}</div>
                          <div className="text-[10px] text-muted-foreground">{t.memberType === 'Teacher' ? 'Guru' : 'Pegawai'}</div>
                        </TableCell>
                        <TableCell className="text-xs">{t.bookTitle} ({t.quantity || 1} Unit)</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yy') : '-'}</TableCell>
                        <TableCell className="text-xs font-semibold">{t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yy') : '-'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-none text-[8px] font-bold">KEMBALI</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="return" className="mt-8 space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-none shadow-sm bg-accent/30 flex flex-col items-center justify-center p-8 gap-4">
              <Button variant="secondary" className="h-20 w-full gap-3 shadow-md font-bold" onClick={() => startScanner("return")}><ScanBarcode className="h-8 w-8" /> Scan Buku Member</Button>
              <div className="w-full space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pencarian Manual</Label>
                <Input placeholder="Cari Nama/NIP Guru/Staf..." className="h-12 bg-white" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup(returnSearch)} />
              </div>
            </Card>

            <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Buku Member Aktif</CardTitle>
                <CardDescription>Daftar buku yang saat ini masih dipegang oleh guru atau pegawai.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">No.</TableHead>
                        <TableHead>Peminjam & Buku</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActive.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Tidak ada buku aktif.</TableCell></TableRow>
                      ) : filteredActive.map((t, index) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-bold text-sm leading-tight">{t.bookTitle} ({t.quantity || 1} Unit)</div>
                              <div className="text-xs font-semibold">
                                {t.memberName} <span className="text-muted-foreground font-normal">/ {t.memberId}</span>
                                <Badge variant="outline" className="ml-2 text-[7px] h-3 px-1">{t.memberType === 'Teacher' ? 'Guru' : 'Staf'}</Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => prepareReturn(t)} disabled={isLockedForUser}>
                              Kembali
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isReturnConfirmOpen} onOpenChange={(v) => { setIsReturnConfirmOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle className="h-5 w-5" /> Konfirmasi Member
            </DialogTitle>
            <DialogDescription>Verifikasi kondisi fisik buku saat pengembalian dilakukan.</DialogDescription>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Buku & Member</div>
                  <div className="text-sm font-black">{pendingReturnTrans.bookTitle}</div>
                  <div className="text-xs font-bold text-primary mt-1">{pendingReturnTrans.memberName} / {pendingReturnTrans.memberId}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kondisi Pengembalian</div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-green-50/50">
                    <Label className="font-bold text-sm">Kembali Baik</Label>
                    <div className="w-16 h-8 flex items-center justify-center font-bold bg-white rounded border">
                      {returnNormalQty}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-orange-50/50">
                    <Label className="font-bold text-sm">Rusak</Label>
                    <Input 
                      type="number" 
                      className="w-16 h-8 text-center font-bold" 
                      value={returnDamagedQty} 
                      onChange={(e) => handleDamagedQtyChange(Number(e.target.value))} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-red-50/50">
                    <Label className="font-bold text-sm">Hilang</Label>
                    <Input 
                      type="number" 
                      className="w-16 h-8 text-center font-bold" 
                      value={returnLostQty} 
                      onChange={(e) => handleLostQtyChange(Number(e.target.value))} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsReturnConfirmOpen(false); forceUnlockUI(); }} disabled={isProcessing} className="flex-1">Batal</Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="flex-1 shadow-lg shadow-primary/20">
              {isProcessing ? <Loader2 className="animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={o => { if(!o) stopScanner(); }}>
        <DialogContent className="p-0 border-none bg-black max-w-xl h-[100dvh] sm:h-[450px] overflow-hidden rounded-none sm:rounded-3xl">
          <DialogHeader className="sr-only">
             <DialogTitle>Pemindai Cerdas Member</DialogTitle>
             <DialogDescription>Arahkan kamera ke kode buku atau kartu identitas guru/staf.</DialogDescription>
          </DialogHeader>
          <div id="teacher-smart-scanner" className="w-full h-full bg-black flex items-center justify-center relative min-h-[300px]">
            {hasCameraPermission === false && (
              <div className="p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
                <Alert variant="destructive" className="bg-white/10 border-white/20 text-white">
                  <CameraOff className="h-4 w-4 text-white" />
                  <AlertTitle>Akses Kamera Ditolak</AlertTitle>
                  <AlertDescription className="text-xs opacity-80">
                    Izin kamera diblokir browser. Silakan aktifkan izin kamera di pengaturan browser Anda.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 z-50 rounded-full h-12 w-12" onClick={stopScanner}><X className="h-6 w-6" /></Button>
        </DialogContent>
      </Dialog>
      <div className="text-center py-6 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}
