
"use client"

import { useState, useMemo, useRef, useEffect, Suspense, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  BookOpen, 
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
  Minus,
  Plus,
  Home,
  Users as UsersIcon,
  Printer,
  History
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc,
  useUser
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc, orderBy, limit } from 'firebase/firestore'
import { differenceInDays, parseISO, format, isAfter, addDays, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"

function TransactionsContent() {
  const db = useFirestore()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState("borrow")
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [returnSearch, setReturnSearch] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [borrowQuantity, setBorrowQuantity] = useState(1)
  const [loanType, setLoanType] = useState<"personal" | "class">("personal")

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

  const studentMembersRef = useMemoFirebase(() => 
    db ? query(collection(db, 'members'), where('type', '==', 'Student')) : null, [db])
  const booksRef = useMemoFirebase(() => db ? query(collection(db, 'books'), orderBy('title', 'asc')) : null, [db])

  const { data: members } = useCollection(studentMembersRef)
  const { data: books } = useCollection(booksRef)

  const activeTransQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'transactions'), 
      where('status', '==', 'active'),
      where('type', '==', 'borrow')
    );
  }, [db])

  const historyTransQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'transactions'),
      where('status', '==', 'returned'),
      orderBy('returnDate', 'desc'),
      limit(50)
    );
  }, [db])

  const { data: activeTrans, isLoading: loadingActive } = useCollection(activeTransQuery)
  const { data: historyTrans, isLoading: loadingHistory } = useCollection(historyTransQuery)

  const loanDays = useMemo(() => settings?.loanPeriod ? Number(settings.loanPeriod) : 7, [settings]);

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
        if (selectedBook && selectedBook.id === book.id) {
          const maxAvail = book.availableStock || 0;
          if (borrowQuantity < maxAvail) {
            setBorrowQuantity(prev => prev + 1);
            toast({ title: "Jumlah Bertambah", description: `${book.title} +1` });
          } else {
            toast({ title: "Stok Maksimal", description: "Tidak bisa menambah jumlah lagi.", variant: "destructive" });
          }
        } else {
          setSelectedBook(book); 
          setBookSearch(""); 
          setShowBookSuggestions(false); 
          setBorrowQuantity(1); 
          toast({ title: "Buku Terpilih" }) 
        }
        return true
      }
    } else {
      const trans = activeTrans?.find(t => { 
        const b = books?.find(bk => bk.id === t.bookId); 
        return b?.code?.toLowerCase() === text.toLowerCase() || b?.isbn === text || t.memberId?.toLowerCase() === text.toLowerCase(); 
      })
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
    
    const totalInput = returnNormalQty + returnDamagedQty + returnLostQty;
    const expectedTotal = Number(pendingReturnTrans.quantity || 1);
    
    if (totalInput !== expectedTotal) {
      toast({ 
        title: "Jumlah Tidak Sesuai", 
        description: `Total unit harus ${expectedTotal}.`,
        variant: "destructive"
      });
      return;
    }

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
    if (targetData.length === 0) {
      toast({ title: "Data Kosong", description: "Tidak ada data untuk dicetak." });
      return;
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const titleLabel = activeTab === "borrow" ? "RIWAYAT SIRKULASI SISWA (SUDAH KEMBALI)" : "DAFTAR PEMINJAMAN SISWA AKTIF"
    
    const rowsHtml = targetData.map((t, index) => {
        const borrowDateStr = t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yyyy') : '-';
        const returnDateStr = t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yyyy') : (t.status === 'active' ? 'PINJAM' : '-');
        const fineStr = t.fineAmount ? `Rp ${t.fineAmount.toLocaleString('id-ID')}` : '-';

        return `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${t.memberName}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle} ${t.quantity > 1 ? `(${t.quantity} unit)` : ''}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center; font-family: monospace;">${t.memberId}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${borrowDateStr}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${returnDateStr}</td>
            <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${fineStr}</td>
          </tr>
        `
    }).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 11px; margin: 0; padding: 15mm; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .school-name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
            .dept-name { font-size: 14px; font-weight: 700; }
            .address { font-size: 10px; font-style: italic; }
            .title { text-align: center; font-size: 12px; font-weight: 800; margin: 20px 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f0f0f0; border: 1px solid #ccc; padding: 10px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            td { border: 1px solid #ccc; padding: 8px; }
            .footer-sign { margin-top: 40px; float: right; text-align: center; width: 250px; }
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
          <div class="title">${titleLabel}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama Siswa</th>
                <th>Judul Buku</th>
                <th>NIS/NIP</th>
                <th>Tgl Pinjam</th>
                <th>Tgl Kembali</th>
                <th>Denda</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer-sign">
            ${settings?.reportCity || 'Mando'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Kepala Sekolah,<br/><br/><br/><br/>
            <strong>${settings?.principalName || 'Lodovikus Jangkar, S.Pd.Gr'}</strong><br/>
            NIP. ${settings?.principalNip || '198507272011011020'}
          </div>
          <div class="print-footer">${settings?.libraryName || 'LANTERA BACA'} - © 2026 Lantera Baca</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    forceUnlockUI()
  }

  const startScanner = async () => {
    setIsScannerOpen(true); 
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("smart-scanner")
          scannerInstanceRef.current = scanner
          await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => {
            if (handleLookup(text)) {
              stopScanner();
            }
          }, () => {})
        } catch (err) {}
      }, 500)
    } catch (e) { setIsScannerOpen(false) }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current?.isScanning) await scannerInstanceRef.current.stop()
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
      loanType: loanType,
      type: 'borrow', 
      status: 'active', 
      borrowDate: today.toISOString(), 
      dueDate: finalDueDate.toISOString(), 
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, 'transactions'), newBorrow).then(() => {
      const avail = Number(selectedBook.availableStock ?? 1);
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Math.max(0, avail - borrowQuantity) })
      toast({ 
        title: "Peminjaman Berhasil", 
        description: `Siswa: ${selectedMember.name}` 
      }); 
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
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex gap-2">
             <Button variant="outline" size="sm" onClick={handlePrintReport}>
               <Printer className="h-4 w-4 mr-2" /> Cetak Laporan
             </Button>
             <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold gap-2 py-1.5 px-3">
              <CalendarDays className="h-4 w-4" />
              Batas: {loanDays} Hari
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); forceUnlockUI(); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50">
          <TabsTrigger value="borrow" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Peminjaman Siswa</TabsTrigger>
          <TabsTrigger value="return" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pengembalian Siswa</TabsTrigger>
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
                                <span className="text-[10px] font-mono text-primary">{m.memberId} / {m.classOrSubject}</span>
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
                            <div className="text-xs font-mono text-muted-foreground">{selectedMember.memberId} / {selectedMember.classOrSubject}</div>
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
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                      <Button variant={loanType === "personal" ? "default" : "ghost"} size="sm" className="gap-2 h-9" onClick={() => setLoanType("personal")}><Home className="h-3 w-3" /> Pribadi</Button>
                      <Button variant={loanType === "class" ? "default" : "ghost"} size="sm" className="gap-2 h-9" onClick={() => setLoanType("class")}><UsersIcon className="h-3 w-3" /> Kolektif</Button>
                    </div>

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
                              <div className="flex items-center gap-2">
                                <Badge variant={b.availableStock <= 0 ? "destructive" : "outline"} className="text-[8px] h-4">
                                  {b.availableStock} Unit
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
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

                        <div className="flex flex-col gap-2 pt-2 border-t border-secondary/10">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Jumlah Pinjam</Label>
                          <div className="flex items-center gap-4">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full"
                              onClick={() => setBorrowQuantity(prev => Math.max(1, prev - 1))}
                              disabled={borrowQuantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input 
                              type="number"
                              className="w-20 text-center font-black text-xl h-10 border-primary/20 bg-white"
                              value={borrowQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                const max = selectedBook.availableStock || 1;
                                if (!isNaN(val)) {
                                  setBorrowQuantity(Math.min(max, Math.max(1, val)));
                                }
                              }}
                            />
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full"
                              onClick={() => setBorrowQuantity(prev => Math.min(selectedBook.availableStock || 1, prev + 1))}
                              disabled={borrowQuantity >= (selectedBook.availableStock || 0)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button className="w-full h-16 text-lg font-black shadow-lg shadow-primary/20" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
                  {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : "PROSES PEMINJAMAN"}
                </Button>
              </div>

              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm overflow-hidden h-full">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Riwayat Sirkulasi Selesai
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">No.</TableHead>
                          <TableHead>Nama Siswa</TableHead>
                          <TableHead>Buku</TableHead>
                          <TableHead className="text-right">Tgl Kembali</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingHistory ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : historyTrans?.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">Belum ada riwayat hari ini.</TableCell></TableRow>
                        ) : historyTrans?.slice(0, 10).map((t, index) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-center text-xs">{index + 1}</TableCell>
                            <TableCell className="font-bold text-xs">{t.memberName}</TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]">{t.bookTitle}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yyyy') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="text-center py-6 opacity-30">
              <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
            </div>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-none shadow-sm bg-accent/30 flex flex-col items-center justify-center p-8 gap-4">
                <Button variant="secondary" className="h-20 w-full gap-3 shadow-md font-bold" onClick={startScanner}><ScanBarcode className="h-8 w-8" /> Scan Buku Siswa</Button>
                <div className="w-full space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pencarian Siswa</Label>
                  <Input placeholder="Cari Nama/NIS..." className="h-12 bg-white" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} />
                </div>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Peminjaman Siswa Aktif</CardTitle>
                      <CardDescription className="text-xs">Daftar buku yang sedang dipinjam oleh siswa.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-12 text-center">No.</TableHead>
                          <TableHead>Peminjam & Buku</TableHead>
                          <TableHead className="w-24 text-center">Tipe</TableHead>
                          <TableHead className="w-32">Jatuh Tempo</TableHead>
                          <TableHead className="w-24 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingActive ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : filteredActiveTrans.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Tidak ada peminjaman siswa aktif.</TableCell></TableRow>
                        ) : filteredActiveTrans.map((t, index) => {
                          const borrowDate = t.borrowDate ? parseISO(t.borrowDate) : new Date();
                          const effectiveDueDate = addDays(borrowDate, loanDays);
                          const isOverdue = isAfter(new Date(), effectiveDueDate);
                          
                          return (
                            <TableRow key={t.id} className={cn(isOverdue && "bg-red-50/50")}>
                              <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-bold text-sm leading-tight">{t.bookTitle} {t.quantity > 1 && `(${t.quantity} unit)`}</div>
                                  <div className="text-xs font-semibold">{t.memberName} <span className="text-muted-foreground font-normal">/ {t.memberId}</span></div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[8px] h-4 uppercase font-bold">{t.loanType === 'class' ? "Kolektif" : "Pribadi"}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className={cn("text-xs font-bold", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                  {format(effectiveDueDate, 'dd/MM/yyyy')}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={() => prepareReturn(t)}>
                                  Kembali
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="text-center py-6 opacity-30">
              <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isReturnConfirmOpen} onOpenChange={(v) => { setIsReturnConfirmOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle className="h-5 w-5" /> Konfirmasi Pengembalian Siswa
            </DialogTitle>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Buku & Siswa</div>
                  <div className="text-sm font-black">{pendingReturnTrans.bookTitle} ({pendingReturnTrans.quantity} unit)</div>
                  <div className="text-xs font-bold text-primary mt-1">{pendingReturnTrans.memberName} / {pendingReturnTrans.memberId}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rincian Kondisi</div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-green-50/50">
                    <Label className="font-bold text-sm">Kembali Normal</Label>
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
                    <div className="p-2 bg-orange-200 rounded-full">
                      <Coins className="h-5 w-5 text-orange-700" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-orange-800 uppercase tracking-tighter">Estimasi Denda</div>
                      <div className="text-xl font-black text-orange-700">Rp {calculatedFine.toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-orange-300 text-orange-700 text-[8px] font-bold bg-white/50">WAJIB BAYAR</Badge>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsReturnConfirmOpen(false); forceUnlockUI(); }} disabled={isProcessing} className="flex-1">Batal</Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="flex-1 shadow-lg shadow-primary/20">
              {isProcessing ? <Loader2 className="animate-spin" /> : "Simpan Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={o => { if(!o) stopScanner(); }}>
        <DialogContent className="p-0 border-none bg-black max-w-xl h-[400px] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Pemindai QR Code Siswa</DialogTitle>
          </DialogHeader>
          <div id="smart-scanner" className="w-full h-full bg-black"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>
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
