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
  CameraOff
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
import { differenceInDays, parseISO, format, addDays, startOfDay } from "date-fns"

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
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        const focusGuards = document.querySelectorAll('[data-radix-focus-guard]');
        focusGuards.forEach(el => (el as HTMLElement).remove());
      }, 150);
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

  // FILTER KHUSUS SISWA
  const members = useMemo(() => {
    if (!allMembersData) return [];
    return allMembersData.filter(m => m.type === 'Student');
  }, [allMembersData]);

  const books = useMemo(() => {
    if (!allBooksData) return [];
    return [...allBooksData].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [allBooksData]);

  // RIWAYAT TRANSAKSI SISWA
  const activeTrans = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions.filter(t => 
      t.status === 'active' && 
      (t.memberType === 'Student' || t.type === 'borrow')
    );
  }, [allTransactions]);

  const historyTrans = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter(t => 
        t.status === 'returned' && 
        (t.memberType === 'Student' || t.type === 'borrow' || t.type === 'return') &&
        t.type !== 'teacher_handbook'
      )
      .sort((a, b) => {
        const dateA = a.returnDate ? new Date(a.returnDate).getTime() : 0;
        const dateB = b.returnDate ? new Date(b.returnDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [allTransactions]);

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
    const today = startOfDay(new Date());
    const borrowDate = startOfDay(parseISO(trans.borrowDate));
    const dynamicDueDate = addDays(borrowDate, loanDays);
    const diffDays = differenceInDays(today, dynamicDueDate);
    
    setLateDays(diffDays > 0 ? diffDays : 0);
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

    if (lateDays > 0) {
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
    const targetData = activeTab === "borrow" ? (historyTrans || []) : filteredActiveTrans;
    if (targetData.length === 0) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const rowsHtml = targetData.map((t, index) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.memberName}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yyyy') : '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yyyy') : 'PINJAM'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${(t.fineAmount || 0).toLocaleString()}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head><title>Laporan</title></head>
        <body onload="window.print(); window.close();">
          <h2 style="text-align: center;">DAFTAR TRANSAKSI SISWA</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>Judul Buku</th>
                <th>Tgl Pinjam</th>
                <th>Tgl Kembali</th>
                <th>Denda (Rp)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p style="text-align: center; margin-top: 30px; font-size: 10px;">© 2026 Lantera Baca</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const startScanner = async () => {
    setIsScannerOpen(true); 
    setHasCameraPermission(null)
    
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const el = document.getElementById("smart-scanner")
        if (!el) return

        const scanner = new Html5Qrcode("smart-scanner")
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
              if (handleLookup(text)) {
                stopScanner();
              }
            }, () => {})
          setHasCameraPermission(true)
        } catch (e: any) {
          console.error("Camera access error:", e)
          setHasCameraPermission(false)
          toast({ title: "Akses Kamera Ditolak", description: "Mohon aktifkan izin kamera di pengaturan browser.", variant: "destructive" })
        }
      }, 50)
    } catch (e) { 
      setIsScannerOpen(false) 
    }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
        const el = document.getElementById("smart-scanner")
        if (el) {
          await scannerInstanceRef.current.clear()
        }
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
      toast({ 
        title: "Stok Tidak Cukup", 
        description: `Stok tersedia hanya ${selectedBook.availableStock} unit.`,
        variant: "destructive"
      });
      return;
    }

    const today = startOfDay(new Date());
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
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> Sirkulasi Siswa</h1>
          <p className="text-sm text-muted-foreground">Fokus peminjaman dan pengembalian buku untuk siswa.</p>
        </div>
        <div className="text-right flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handlePrintReport}>
             <Printer className="h-4 w-4 mr-2" /> Cetak
           </Button>
           <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold gap-2 py-1.5 px-3">
            <CalendarDays className="h-4 w-4" />
            Batas: {loanDays} Hari
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); forceUnlockUI(); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50">
          <TabsTrigger value="borrow" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Peminjaman</TabsTrigger>
          <TabsTrigger value="return" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pengembalian</TabsTrigger>
        </TabsList>
        
        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20 overflow-hidden">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <Button size="lg" className="h-16 px-12 gap-3 shadow-xl hover:shadow-2xl transition-all" onClick={startScanner}><ScanBarcode className="h-6 w-6" /> Smart Scan</Button>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Scan Kartu Siswa atau Buku</div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm relative">
                  <CardHeader className="bg-slate-50/50 pb-4 border-b">
                    <CardTitle className="text-sm flex items-center gap-2 text-primary uppercase tracking-wider font-bold"><User className="h-4 w-4" /> Data Siswa</CardTitle>
                    <CardDescription>Gunakan NIS atau pencarian manual untuk memilih siswa.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cari Nama Siswa / NIS..." 
                        className="pl-10 h-12" 
                        value={memberSearch} 
                        onChange={e => {
                          setMemberSearch(e.target.value);
                          setShowMemberSuggestions(true);
                        }}
                        onFocus={() => setShowMemberSuggestions(true)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup(memberSearch)}
                      />
                      {showMemberSuggestions && memberSuggestions.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[250px] overflow-y-auto">
                          {memberSuggestions.map(m => (
                            <div 
                              key={m.id} 
                              className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b last:border-0"
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
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col gap-2 animate-in slide-in-from-left-2">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-bold text-primary text-lg">{selectedMember.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{selectedMember.memberId}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedMember(null)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm relative">
                  <CardHeader className="bg-slate-50/50 pb-4 border-b">
                    <CardTitle className="text-sm flex items-center gap-2 text-secondary uppercase tracking-wider font-bold"><BookOpen className="h-4 w-4" /> Data Buku</CardTitle>
                    <CardDescription>Gunakan kode stiker buku atau judul untuk memilih buku.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Judul atau Kode Buku..." 
                        className="pl-10 h-12" 
                        value={bookSearch} 
                        onChange={e => {
                          setBookSearch(e.target.value);
                          setShowBookSuggestions(true);
                        }}
                        onFocus={() => setShowBookSuggestions(true)}
                        onKeyDown={e => e.key === 'Enter' && handleLookup(bookSearch)}
                      />
                      {showBookSuggestions && bookSuggestions.length > 0 && (
                        <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[250px] overflow-y-auto">
                          {bookSuggestions.map(b => (
                            <div 
                              key={b.id} 
                              className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between border-b last:border-0"
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
                      <div className="p-4 bg-secondary/5 rounded-xl border border-secondary/20 space-y-4 animate-in slide-in-from-right-2">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="font-bold text-secondary-foreground leading-tight">{selectedBook.title}</div>
                            <div className="text-xs font-mono text-muted-foreground">{selectedBook.code}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button className="w-full h-16 text-lg font-black shadow-lg shadow-primary/20" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : "PINJAM SEKARANG"}
                </Button>
              </div>

              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm overflow-hidden h-full">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Riwayat Siswa (Terakhir)
                    </CardTitle>
                    <CardDescription>Daftar aktivitas sirkulasi yang baru saja diselesaikan.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">No.</TableHead>
                          <TableHead>Nama Siswa</TableHead>
                          <TableHead>Buku</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyTrans?.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">Belum ada riwayat siswa.</TableCell></TableRow>
                        ) : historyTrans?.slice(0, 10).map((t, index) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-center text-xs">{index + 1}</TableCell>
                            <TableCell className="font-bold text-xs">{t.memberName}</TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]">{t.bookTitle}</TableCell>
                            <TableCell className="text-right text-xs">
                              <Badge variant="outline" className="text-[8px] bg-green-50 text-green-700">KEMBALI</Badge>
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
              <Card className="md:col-span-1 border-none shadow-sm bg-accent/30 flex flex-col items-center justify-center p-8 gap-4">
                <Button variant="secondary" className="h-20 w-full gap-3 shadow-md font-bold" onClick={startScanner}><ScanBarcode className="h-8 w-8" /> Scan Buku/Kartu</Button>
                <div className="w-full space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pencarian Manual Siswa</Label>
                  <Input placeholder="Cari Nama/NIS..." className="h-12 bg-white" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup(returnSearch)} />
                </div>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Peminjaman Siswa Aktif</CardTitle>
                  <CardDescription>Daftar buku yang saat ini masih dipinjam oleh siswa.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-12 text-center">No.</TableHead>
                          <TableHead>Peminjam & Buku</TableHead>
                          <TableHead className="w-32">Batas Kembali</TableHead>
                          <TableHead className="w-24 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActiveTrans.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">Tidak ada peminjaman siswa aktif.</TableCell></TableRow>
                        ) : filteredActiveTrans.map((t, index) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-bold text-sm leading-tight">{t.bookTitle}</div>
                                <div className="text-xs font-semibold">{t.memberName} <span className="text-muted-foreground font-normal">/ {t.memberId}</span></div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-bold text-muted-foreground">
                              {t.dueDate ? format(parseISO(t.dueDate), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => prepareReturn(t)}>
                                Terima
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
        </div>
      </Tabs>

      <Dialog open={isReturnConfirmOpen} onOpenChange={(v) => { setIsReturnConfirmOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle className="h-5 w-5" /> Konfirmasi Pengembalian
            </DialogTitle>
            <DialogDescription>Lengkapi data kondisi fisik buku saat pengembalian untuk menghitung denda otomatis.</DialogDescription>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Buku & Peminjam</div>
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

              {calculatedFine > 0 && (
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3">
                    <Coins className="h-5 w-5 text-orange-700" />
                    <div className="text-xl font-black text-orange-700">Rp {calculatedFine.toLocaleString()}</div>
                  </div>
                  <Badge variant="outline" className="border-orange-300 text-orange-700 text-[8px] font-bold">DENDA</Badge>
                </div>
              )}
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
            <DialogTitle>Pemindai</DialogTitle>
            <DialogDescription>Arahkan kamera pada kode QR kartu siswa atau barcode buku.</DialogDescription>
          </DialogHeader>
          <div id="smart-scanner" className="w-full h-full bg-black flex items-center justify-center relative">
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
    <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <TransactionsContent />
    </Suspense>
  )
}
