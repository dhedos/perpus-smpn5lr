
"use client"

import { useState, useMemo, useRef, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Loader2, 
  CheckCircle,
  ScanBarcode,
  X,
  User,
  ArrowRightLeft,
  Coins,
  CalendarDays,
  ChevronRight,
  Printer,
  History,
  BookOpen,
  CameraOff,
  Minus,
  Plus,
  Users,
  Clock
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc,
  useUser
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore'
import { differenceInDays, differenceInHours, parseISO, format, addDays, startOfDay, isWithinInterval, startOfMonth, endOfMonth } from "date-fns"

function TransactionsContent() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState("borrow")
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [returnSearch, setReturnSearch] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [borrowQuantity, setBorrowQuantity] = useState(1)
  const [borrowType, setBorrowType] = useState<"Pribadi" | "Kolektif">("Kolektif")

  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)
  const [showBookSuggestions, setShowBookSuggestions] = useState(false)

  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
  const [pendingReturnTrans, setPendingReturnTrans] = useState<any>(null)
  
  const [returnNormalQty, setReturnNormalQty] = useState(0)
  const [returnDamagedQty, setReturnDamagedQty] = useState(0)
  const [returnLostQty, setReturnLostQty] = useState(0)
  
  const [calculatedFine, setCalculatedFine] = useState(0)
  const [lateDays, setLateDays] = useState(0)

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab')
    const q = searchParams.get('q')
    if (tab === 'return') setActiveTab('return')
    if (q) setReturnSearch(q)
    forceUnlockUI()
  }, [searchParams, forceUnlockUI])

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const membersRef = useMemoFirebase(() => (db && user) ? collection(db, 'members') : null, [db, !!user])
  const booksRef = useMemoFirebase(() => (db && user) ? collection(db, 'books') : null, [db, !!user])
  const allTransRef = useMemoFirebase(() => (db && user) ? collection(db, 'transactions') : null, [db, !!user])

  const { data: allMembersData } = useCollection(membersRef)
  const { data: allBooksData } = useCollection(booksRef)
  const { data: allTransactions } = useCollection(allTransRef)

  const loanDays = useMemo(() => settings?.loanPeriod ? Number(settings.loanPeriod) : 7, [settings]);
  const collHours = useMemo(() => settings?.collectiveLoanHours ? Number(settings.collectiveLoanHours) : 2, [settings]);

  const members = useMemo(() => {
    if (!allMembersData) return [];
    return allMembersData.filter(m => m.type === 'Student');
  }, [allMembersData]);

  const books = useMemo(() => {
    if (!allBooksData) return [];
    return [...allBooksData].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [allBooksData]);

  const activeTrans = useMemo(() => {
    if (!allTransactions || !allBooksData || !allMembersData) return [];
    return allTransactions.filter(t => 
      t.status === 'active' && 
      (t.memberType === 'Student' || t.type === 'borrow') &&
      allBooksData.some(b => b.id === t.bookId) &&
      allMembersData.some(m => m.memberId === t.memberId)
    );
  }, [allTransactions, allBooksData, allMembersData]);

  const historyTrans = useMemo(() => {
    if (!allTransactions || !allBooksData || !allMembersData) return [];
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    return allTransactions
      .filter(t => {
        const createDate = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : new Date();
        const returnDate = t.returnDate ? parseISO(t.returnDate) : null;
        
        const isStudent = (t.memberType === 'Student' || t.type === 'borrow' || t.type === 'return') && t.type !== 'teacher_handbook';
        const matchesDate = isWithinInterval(createDate, { start, end }) || (returnDate && isWithinInterval(returnDate, { start, end }));

        return isStudent && matchesDate && allBooksData.some(b => b.id === t.bookId) && allMembersData.some(m => m.memberId === t.memberId);
      })
      .sort((a, b) => {
        const timeA = a.returnDate ? new Date(a.returnDate).getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.returnDate ? new Date(b.returnDate).getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
  }, [allTransactions, allBooksData, allMembersData]);

  const memberSuggestions = useMemo(() => {
    if (!memberSearch || memberSearch.length < 1 || !members) return [];
    return members.filter(m => 
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
      m.memberId?.toLowerCase().startsWith(memberSearch.toLowerCase())
    ).slice(0, 5);
  }, [memberSearch, members]);

  const bookSuggestions = useMemo(() => {
    if (!bookSearch || bookSearch.length < 1 || !books) return [];
    return books.filter(b => 
      b.title?.toLowerCase().includes(bookSearch.toLowerCase()) || 
      b.code?.toLowerCase().startsWith(bookSearch.toLowerCase()) ||
      b.isbn?.startsWith(bookSearch)
    ).slice(0, 5);
  }, [bookSearch, books]);

  const filteredActiveTrans = useMemo(() => {
    if (!activeTrans) return []
    const sorted = [...activeTrans].sort((a, b) => {
      const dateA = a.borrowDate ? new Date(a.borrowDate).getTime() : 0;
      const dateB = b.borrowDate ? new Date(b.borrowDate).getTime() : 0;
      return dateB - dateA;
    });

    if (!returnSearch) return sorted
    const s = returnSearch.toLowerCase()
    return sorted.filter(t => 
      t.memberName?.toLowerCase().includes(s) || 
      t.bookTitle?.toLowerCase().includes(s) ||
      t.memberId?.toLowerCase().includes(s)
    )
  }, [activeTrans, returnSearch])

  const handleLookup = (text: string): boolean => {
    if (!text) return false
    const member = members?.find(m => m.memberId?.toLowerCase() === text.toLowerCase())
    const book = books?.find(b => b.code?.toLowerCase() === text.toLowerCase() || b.isbn === text)

    if (activeTab === "borrow") {
      if (member) { 
        setSelectedMember(member); 
        setMemberSearch(""); 
        setShowMemberSuggestions(false); 
        toast({ title: "Siswa Terpilih" }) 
        return true
      }
      else if (book) { 
        setSelectedBook(book); 
        setBookSearch(""); 
        setShowBookSuggestions(false); 
        setBorrowQuantity(1); 
        toast({ title: "Buku Terpilih" }) 
        return true
      }
    } else {
      const trans = activeTrans?.find(t => t.memberId?.toLowerCase() === text.toLowerCase() || t.bookTitle?.toLowerCase().includes(text.toLowerCase()))
      if (trans) { 
        setTimeout(() => prepareReturn(trans), 10);
        return true
      }
    }
    return false
  }

  const prepareReturn = (trans: any) => {
    const now = new Date();
    const borrowDate = parseISO(trans.borrowDate);
    
    if (trans.borrowType === 'Kolektif') {
      const diffHours = differenceInHours(now, borrowDate);
      const isLate = diffHours > collHours;
      setLateDays(isLate ? Math.ceil((diffHours - collHours) / 24) : 0);
    } else {
      const dynamicDueDate = startOfDay(addDays(borrowDate, loanDays));
      const diffDays = differenceInDays(startOfDay(now), dynamicDueDate);
      setLateDays(diffDays > 0 ? diffDays : 0);
    }
    
    setPendingReturnTrans(trans);
    
    const totalQty = Number(trans.quantity || 1);
    setReturnNormalQty(totalQty);
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

  useEffect(() => {
    if (!pendingReturnTrans || !settings) return;
    
    let fine = 0;
    const finePerDay = Number(settings.fineAmount || 500);
    const lostFineBase = Number(settings.lostBookFine || 50000);
    const damagedFineBase = Number(settings.damagedBookFine || 10000);

    if (lateDays > 0 && pendingReturnTrans.borrowType !== 'Kolektif') {
      fine += lateDays * finePerDay * (returnNormalQty + returnDamagedQty);
    }

    fine += returnDamagedQty * damagedFineBase;
    fine += returnLostQty * lostFineBase;
    setCalculatedFine(fine);
  }, [pendingReturnTrans, lateDays, settings, returnNormalQty, returnDamagedQty, returnLostQty]);

  const handleConfirmReturn = () => {
    if (!db || !pendingReturnTrans) return
    
    setIsProcessing(true)
    
    const transRef = doc(db, 'transactions', pendingReturnTrans.id)
    const updateData = { 
      status: 'returned', 
      returnDate: new Date().toISOString(), 
      type: 'return',
      rincianKondisi: {
        normal: returnNormalQty,
        damaged: returnDamagedQty,
        lost: returnLostQty
      },
      fineAmount: calculatedFine,
      isFinePaid: calculatedFine > 0 
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
      toast({ title: "Berhasil!", description: "Pengembalian buku siswa telah dicatat." })
      setReturnSearch("");
    }).finally(() => setIsProcessing(false))
  }

  const handlePrintReport = () => {
    const targetData = historyTrans || [];
    if (targetData.length === 0) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = targetData.map((t, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.memberName}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle} ${t.borrowType === 'Kolektif' ? '(KOLEKTIF)' : ''}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yyyy') : '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yyyy') : 'PINJAM'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${(t.fineAmount || 0).toLocaleString()}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Sirkulasi Siswa - ${format(new Date(), 'MMMM yyyy')}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 11pt; margin: 0; padding: 15mm; }
            .print-footer { position: fixed; bottom: 8mm; left: 15mm; right: 15mm; font-size: 8pt; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2 style="text-align: center;">RIWAYAT SIRKULASI SISWA (BULAN BERJALAN)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ccc; padding: 8px;">No</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Nama Siswa</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Judul Buku</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Tgl Pinjam</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Tgl Kembali</th>
                <th style="border: 1px solid #ccc; padding: 8px;">Denda (Rp)</th>
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

  const startScanner = async () => {
    setIsScannerOpen(true); 
    setHasCameraPermission(null)
    
    setTimeout(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
        const el = document.getElementById("smart-scanner")
        if (!el) return

        const scanner = new Html5Qrcode("smart-scanner")
        scannerInstanceRef.current = scanner
        try {
          await scanner.start(
            { facingMode: "environment" }, 
            { 
              fps: 15, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128]
            }, 
            (text) => {
              if (handleLookup(text)) {
                stopScanner();
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
        console.warn("Smart scanner cleanup warning:", e)
      }
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
    forceUnlockUI()
  }

  const handleProcessBorrow = () => {
    if (!db || !selectedMember || !selectedBook) return
    if (borrowQuantity > (selectedBook.availableStock || 0)) {
      toast({ title: "Stok Tidak Cukup", description: `Stok tersedia hanya ${selectedBook.availableStock} unit.`, variant: "destructive" });
      return;
    }

    const today = new Date();
    const finalDueDate = addDays(today, loanDays);
    setIsProcessing(true)

    const newBorrow = {
      memberId: selectedMember.memberId, 
      memberName: selectedMember.name, 
      memberType: "Student",
      classOrSubject: selectedMember.classOrSubject || "-",
      bookId: selectedBook.id, 
      bookTitle: selectedBook.title, 
      quantity: borrowQuantity,
      borrowType: borrowType,
      type: 'borrow', 
      status: 'active', 
      borrowDate: today.toISOString(), 
      dueDate: finalDueDate.toISOString(), 
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, 'transactions'), newBorrow).then(() => {
      const avail = Number(selectedBook.availableStock ?? 1);
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Math.max(0, avail - borrowQuantity) })
      toast({ title: "Peminjaman Berhasil", description: `Siswa: ${selectedMember.name}` }); 
      setSelectedBook(null); 
      setSelectedMember(null);
      setBorrowQuantity(1);
    }).finally(() => setIsProcessing(false))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> Sirkulasi Siswa</h1>
          <p className="text-sm text-muted-foreground">Fokus peminjaman dan pengembalian buku untuk siswa.</p>
        </div>
        <div className="text-right flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handlePrintReport} className="rounded-xl border-slate-300 dark:border-white/20">
             <Printer className="h-4 w-4 mr-2" /> Cetak
           </Button>
           <div className="flex flex-col gap-1">
             <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black gap-2 py-1 px-3 text-[9px]">
              <CalendarDays className="h-3 w-3" /> Pribadi: {loanDays} Hari
            </Badge>
            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-black gap-2 py-1 px-3 text-[9px]">
              <Clock className="h-3 w-3" /> Kolektif: {collHours} Jam
            </Badge>
           </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); forceUnlockUI(); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/80 backdrop-blur-sm rounded-2xl">
          <TabsTrigger value="borrow" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl">Peminjaman</TabsTrigger>
          <TabsTrigger value="return" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl">Pengembalian</TabsTrigger>
        </TabsList>
        
        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20 overflow-hidden rounded-[2rem]">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <Button size="lg" className="h-16 px-12 gap-3 shadow-xl hover:shadow-2xl transition-all rounded-2xl" onClick={startScanner}><ScanBarcode className="h-6 w-6" /> Smart Scan</Button>
                <div className="text-xs text-muted-foreground font-black uppercase tracking-[0.2em]">Scan Kartu Siswa atau Buku</div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-transparent p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/20 space-y-6">
                   <div className="space-y-3">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Jenis Peminjaman</Label>
                      <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
                        <Button 
                          variant={borrowType === "Kolektif" ? "default" : "ghost"} 
                          className="flex-1 h-10 text-xs font-bold rounded-xl"
                          onClick={() => setBorrowType("Kolektif")}
                        >
                          <Users className="h-3 w-3 mr-2" /> Kolektif
                        </Button>
                        <Button 
                          variant={borrowType === "Pribadi" ? "default" : "ghost"} 
                          className="flex-1 h-10 text-xs font-bold rounded-xl"
                          onClick={() => setBorrowType("Pribadi")}
                        >
                          <User className="h-3 w-3 mr-2" /> Pribadi
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Jumlah Unit</Label>
                      <div className="flex items-center justify-between p-2 border rounded-[1.5rem] bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-12 w-12 rounded-xl border-none bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                          onClick={() => setBorrowQuantity(q => Math.max(1, q - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-col items-center flex-1">
                          <Input 
                            type="number"
                            className="w-full text-center text-3xl font-black h-10 border-none bg-transparent focus-visible:ring-0"
                            value={borrowQuantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val >= 1) setBorrowQuantity(val);
                            }}
                          />
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter -mt-1">Buku</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-12 w-12 rounded-xl border-none bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white"
                          onClick={() => setBorrowQuantity(q => q + 1)}
                          disabled={selectedBook && borrowQuantity >= (selectedBook.availableStock || 0)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </div>

                <div className="bg-transparent p-4 rounded-[2rem] border border-slate-200 dark:border-white/20 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Cari Siswa / NIS..." 
                        className="pl-11 h-12 bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 rounded-full text-foreground font-medium" 
                        value={memberSearch} 
                        onChange={e => {
                          setMemberSearch(e.target.value);
                          setShowMemberSuggestions(true);
                        }}
                        onFocus={() => setShowMemberSuggestions(true)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup(memberSearch)}
                      />
                      {showMemberSuggestions && memberSuggestions.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-2 bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[250px] overflow-y-auto">
                          {memberSuggestions.map(m => (
                            <div 
                              key={m.id} 
                              className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b last:border-0"
                              onClick={() => {
                                setSelectedMember(m);
                                setMemberSearch("");
                                setShowMemberSuggestions(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-sm">{m.name}</span>
                                <span className="text-[10px] font-mono text-primary">{m.memberId}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedMember && (
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex flex-col gap-2 animate-in slide-in-from-left-2">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-black text-primary text-lg leading-tight">{selectedMember.name}</div>
                            <div className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest">{selectedMember.memberId}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedMember(null)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Judul atau Kode Buku..." 
                        className="pl-11 h-12 bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 rounded-full text-foreground font-medium" 
                        value={bookSearch} 
                        onChange={e => {
                          setBookSearch(e.target.value);
                          setShowBookSuggestions(true);
                        }}
                        onFocus={() => setShowBookSuggestions(true)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup(bookSearch)}
                      />
                      {showBookSuggestions && bookSuggestions.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-2 bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[250px] overflow-y-auto">
                          {bookSuggestions.map(b => (
                            <div 
                              key={b.id} 
                              className="p-3 hover:bg-secondary/5 cursor-pointer flex items-center justify-between border-b last:border-0"
                              onClick={() => {
                                setSelectedBook(b);
                                setBookSearch("");
                                setShowBookSuggestions(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-sm truncate max-w-[200px]">{b.title}</span>
                                <span className="text-[10px] font-mono text-secondary-foreground">{b.code}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedBook && (
                      <div className="p-4 bg-secondary/5 rounded-2xl border border-secondary/20 space-y-4 animate-in slide-in-from-right-2">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-black text-secondary-foreground leading-tight">{selectedBook.title}</div>
                            <div className="text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest">{selectedBook.code}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                </div>

                <Button className="w-full h-16 text-lg font-black shadow-lg shadow-primary/20 rounded-[1.5rem] tracking-tight transition-all active:scale-95" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : "KONFIRMASI PINJAM"}
                </Button>
              </div>

              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm overflow-hidden h-full bg-transparent">
                  <CardHeader className="bg-muted/30 border-b dark:border-white/10 px-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                      <History className="h-4 w-4" /> Riwayat Bulan Berjalan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b dark:border-white/10">
                          <TableHead className="w-12 text-center text-[9px] font-black uppercase tracking-widest">No.</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest">Siswa</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest">Buku</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest">Pinjam</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest">Kembali</TableHead>
                          <TableHead className="text-right text-[9px] font-black uppercase tracking-widest">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyTrans?.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic text-xs">Belum ada riwayat di bulan ini.</TableCell></TableRow>
                        ) : historyTrans?.slice(0, 50).map((t, index) => (
                          <TableRow key={t.id} className="hover:bg-muted/20 border-b dark:border-white/5">
                            <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-bold text-xs">{t.memberName}</TableCell>
                            <TableCell className="text-xs truncate max-w-[150px] font-medium">{t.bookTitle} ({t.quantity || 1} Unit)</TableCell>
                            <TableCell className="text-[10px] font-mono text-muted-foreground">{t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yy') : '-'}</TableCell>
                            <TableCell className="text-xs font-black">{t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yy') : '-'}</TableCell>
                            <TableCell className="text-right text-xs">
                              {t.status === 'returned' ? (
                                <Badge variant="secondary" className="text-[8px] bg-green-500/10 text-green-500 border-none uppercase font-black px-2">KEMBALI</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[8px] bg-blue-500/10 text-blue-500 border-none uppercase font-black px-2">PINJAM</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-transparent p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/20 flex flex-col gap-6">
                <Button variant="secondary" className="h-20 w-full gap-3 shadow-md font-black text-base rounded-[1.5rem] bg-[#33CCF7] hover:bg-[#2BB8E0] text-white" onClick={startScanner}><ScanBarcode className="h-8 w-8" /> SCAN KARTU/BUKU</Button>
                <div className="w-full space-y-2 px-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pencarian Manual</Label>
                  <Input placeholder="Cari Nama/NIS..." className="h-12 bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 rounded-full text-foreground font-medium" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup(returnSearch)} />
                </div>
              </div>

              <Card className="md:col-span-2 border-none shadow-sm overflow-hidden bg-transparent">
                <CardHeader className="pb-3 border-b dark:border-white/10 px-6 bg-muted/20">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Pinjaman Siswa Aktif</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow className="border-b dark:border-white/10">
                          <TableHead className="w-12 text-center text-[9px] font-black uppercase tracking-widest">No.</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest">Peminjam & Buku</TableHead>
                          <TableHead className="w-32 text-[9px] font-black uppercase tracking-widest">Durasi</TableHead>
                          <TableHead className="w-24 text-right text-[9px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActiveTrans.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic text-xs">Tidak ada peminjaman aktif.</TableCell></TableRow>
                        ) : filteredActiveTrans.map((t, index) => {
                          const now = new Date();
                          const borrowDate = parseISO(t.borrowDate);
                          let durationDisplay = "";
                          let isUrdue = false;
                          if (t.borrowType === 'Kolektif') {
                            const diffHours = differenceInHours(now, borrowDate);
                            durationDisplay = `${diffHours} JAM`;
                            isUrdue = diffHours >= collHours;
                          } else {
                            const diffDays = differenceInDays(now, borrowDate);
                            durationDisplay = `${diffDays} HARI`;
                            const dueDate = parseISO(t.dueDate);
                            isUrdue = now > dueDate;
                          }
                          return (
                            <TableRow key={t.id} className="hover:bg-muted/20 border-b dark:border-white/5">
                              <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-bold text-sm leading-tight">{t.bookTitle} ({t.quantity || 1} Unit)</div>
                                    {t.borrowType === 'Kolektif' && (
                                      <Badge variant="secondary" className="h-4 text-[7px] bg-blue-900 text-white border-none font-black px-1.5">
                                        KOLEKTIF
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold opacity-70">{t.memberName} <span className="text-muted-foreground font-normal">/ {t.memberId}</span></div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={isUrdue ? "destructive" : "secondary"} className="h-5 text-[9px] font-bold border-none">
                                  <Clock className="h-2.5 w-2.5 mr-1" /> {durationDisplay}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-xl border-slate-300 dark:border-white/20 hover:bg-primary/10" onClick={() => prepareReturn(t)}>
                                  Terima
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isReturnConfirmOpen} onOpenChange={(v) => { setIsReturnConfirmOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle className="h-5 w-5" /> Konfirmasi Terima
            </DialogTitle>
            <DialogDescription>Lengkapi data kondisi fisik buku saat pengembalian.</DialogDescription>
          </DialogHeader>
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-muted/20 rounded-2xl border dark:border-white/10 space-y-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Buku & Peminjam</div>
                  <div className="text-sm font-black mt-1 leading-tight">{pendingReturnTrans.bookTitle}</div>
                  <div className="text-xs font-bold text-primary mt-1">{pendingReturnTrans.memberName} / {pendingReturnTrans.memberId}</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Kondisi Pengembalian</div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl border dark:border-white/10 bg-green-500/5">
                    <Label className="font-bold text-sm">Kembali Baik</Label>
                    <div className="w-16 h-10 flex items-center justify-center font-black bg-white dark:bg-black/40 rounded-xl border-none text-green-600">
                      {returnNormalQty}
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl border dark:border-white/10 bg-orange-500/5">
                    <Label className="font-bold text-sm">Rusak</Label>
                    <Input type="number" className="w-16 h-10 text-center font-black rounded-xl bg-white dark:bg-black/40 border-none text-orange-600" value={returnDamagedQty} onChange={(e) => handleDamagedQtyChange(Number(e.target.value))} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl border dark:border-white/10 bg-red-500/5">
                    <Label className="font-bold text-sm">Hilang</Label>
                    <Input type="number" className="w-16 h-10 text-center font-black rounded-xl bg-white dark:bg-black/40 border-none text-red-600" value={returnLostQty} onChange={(e) => handleLostQtyChange(Number(e.target.value))} />
                  </div>
                </div>
              </div>
              {calculatedFine > 0 && (
                <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex items-center justify-between animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3">
                    <Coins className="h-6 w-6 text-orange-600" />
                    <div className="text-2xl font-black text-orange-600">Rp {calculatedFine.toLocaleString()}</div>
                  </div>
                  <Badge variant="outline" className="border-orange-500/30 text-orange-600 text-[8px] font-black px-2 py-0.5">DENDA TERHITUNG</Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsReturnConfirmOpen(false); forceUnlockUI(); }} disabled={isProcessing} className="flex-1 rounded-xl h-12 font-bold">Batal</Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="flex-1 shadow-lg shadow-primary/20 rounded-xl h-12 font-black">
              {isProcessing ? <Loader2 className="animate-spin" /> : "PROSES TERIMA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={o => { if(!o) stopScanner(); }}>
        <DialogContent className="p-0 border-none bg-black max-xl h-[100dvh] sm:h-[450px] overflow-hidden rounded-none sm:rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Pemindai</DialogTitle>
            <DialogDescription>Arahkan kamera pada kode QR kartu siswa atau barcode buku.</DialogDescription>
          </DialogHeader>
          <div id="smart-scanner" className="w-full h-full bg-black flex items-center justify-center relative min-h-[300px]">
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

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full py-20"><p className="text-[10px] font-black animate-pulse uppercase tracking-[0.3em] text-primary">Memuat Sirkulasi...</p></div>}>
      <TransactionsContent />
    </Suspense>
  )
}
