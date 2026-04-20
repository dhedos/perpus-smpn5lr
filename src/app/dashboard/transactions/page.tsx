"use client"

import { useState, useMemo, useRef, useEffect } from "react"
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
  ShieldAlert,
  ThumbsUp,
  ArrowRightLeft,
  Coins,
  Ghost,
  CalendarDays,
  Clock,
  Library,
  ChevronRight,
  Minus,
  Plus
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { id as localeID } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const db = useFirestore()
  const { user, isStaff } = useUser()
  const { toast } = useToast()
  
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

  // Autocomplete suggestions
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)
  const [showBookSuggestions, setShowBookSuggestions] = useState(false)

  // Return Process State
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
  const [pendingReturnTrans, setPendingReturnTrans] = useState<any>(null)
  const [returnCondition, setReturnCondition] = useState<"normal" | "damaged" | "lost">("normal")
  const [calculatedFine, setCalculatedFine] = useState(0)
  const [lateDays, setLateDays] = useState(0)

  // Settings
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings, isLoading: loadingSettings } = useDoc(settingsRef)

  const membersRef = useMemoFirebase(() => db ? query(collection(db, 'members'), orderBy('name', 'asc')) : null, [db])
  const booksRef = useMemoFirebase(() => db ? query(collection(db, 'books'), orderBy('title', 'asc')) : null, [db])

  const { data: members } = useCollection(membersRef)
  const { data: books } = useCollection(booksRef)

  const activeTransQuery = useMemoFirebase(() => {
    if (!db || !isStaff) return null;
    return query(collection(db, 'transactions'), where('status', '==', 'active'));
  }, [db, isStaff])

  const { data: activeTrans, isLoading: loadingActive } = useCollection(activeTransQuery)

  const loanDays = useMemo(() => settings?.loanPeriod ? Number(settings.loanPeriod) : 7, [settings]);

  // Suggestions filtering
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

  const selectedMemberActiveLoans = useMemo(() => {
    if (!selectedMember || !activeTrans) return 0;
    return activeTrans.filter(t => t.memberId === selectedMember.memberId).length;
  }, [selectedMember, activeTrans]);

  const getMemberLoanCount = (memberId: string) => {
    if (!activeTrans) return 0;
    return activeTrans.filter(t => t.memberId === memberId).length;
  }

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

  const estimatedDueDate = useMemo(() => {
    return addDays(startOfDay(new Date()), loanDays);
  }, [loanDays]);

  const handleLookup = (text: string) => {
    if (!text) return
    const member = members?.find(m => m.memberId?.toLowerCase() === text.toLowerCase())
    const book = books?.find(b => b.code?.toLowerCase() === text.toLowerCase() || b.isbn === text)

    if (activeTab === "borrow") {
      if (member) { setSelectedMember(member); setMemberSearch(""); setShowMemberSuggestions(false); toast({ title: "Anggota Terpilih" }) }
      else if (book) { setSelectedBook(book); setBookSearch(""); setShowBookSuggestions(false); setBorrowQuantity(1); toast({ title: "Buku Terpilih" }) }
    } else {
      const trans = activeTrans?.find(t => { 
        const b = books?.find(bk => bk.id === t.bookId); 
        return b?.code?.toLowerCase() === text.toLowerCase() || b?.isbn === text || t.memberId?.toLowerCase() === text.toLowerCase(); 
      })
      if (trans) { prepareReturn(trans); stopScanner(); }
    }
  }

  const prepareReturn = (trans: any) => {
    const today = startOfDay(new Date());
    const borrowDate = startOfDay(parseISO(trans.borrowDate));
    const dynamicDueDate = addDays(borrowDate, loanDays);
    const diffDays = differenceInDays(today, dynamicDueDate);
    
    setLateDays(diffDays > 0 ? diffDays : 0);
    setPendingReturnTrans(trans);
    setReturnCondition("normal");
    setIsReturnConfirmOpen(true);
  }

  useEffect(() => {
    if (!pendingReturnTrans || !settings) return;
    let fine = 0;
    const finePerDay = Number(settings.fineAmount ?? 500);
    const lostFine = Number(settings.lostBookFine ?? 50000);
    if (lateDays > 0) fine += lateDays * finePerDay;
    if (returnCondition === "lost") fine += lostFine;
    else if (returnCondition === "damaged") fine += finePerDay * 10;
    setCalculatedFine(fine);
  }, [returnCondition, pendingReturnTrans, lateDays, settings]);

  const forceUnlockUI = () => {
    setTimeout(() => {
      document.body.style.pointerEvents = 'auto'
    }, 100)
  }

  const handleConfirmReturn = () => {
    if (!db || !pendingReturnTrans) return
    setIsProcessing(true)
    
    const transRef = doc(db, 'transactions', pendingReturnTrans.id)
    const updateData = { 
      status: 'returned', 
      returnDate: new Date().toISOString(), 
      type: 'return',
      condition: returnCondition,
      fineAmount: calculatedFine,
      isFinePaid: calculatedFine > 0 
    }

    setIsReturnConfirmOpen(false)
    forceUnlockUI()

    updateDoc(transRef, updateData).then(async () => {
      const bRef = doc(db, 'books', pendingReturnTrans.bookId)
      const bDoc = await getDoc(bRef)
      if (bDoc.exists()) {
        const currentTotal = bDoc.data().totalStock || 0
        const currentAvail = bDoc.data().availableStock || 0
        const transQty = Number(pendingReturnTrans.quantity || 1)
        
        if (returnCondition === "lost") {
          updateDoc(bRef, { 
            totalStock: Math.max(0, currentTotal - transQty),
            availableStock: currentAvail
          })
        } else {
          updateDoc(bRef, { availableStock: currentAvail + transQty })
        }
      }
      toast({ title: "Berhasil!", description: "Pengembalian buku telah dicatat." })
      setReturnSearch("");
    }).finally(() => setIsProcessing(false))
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
            handleLookup(text)
            if (activeTab === "return") stopScanner()
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
      toast({ 
        title: "Peminjaman Berhasil", 
        description: `Buku: ${selectedBook.title} (${borrowQuantity} unit). Jatuh tempo: ${format(finalDueDate, 'dd MMMM yyyy', { locale: localeID })}.` 
      }); 
      setSelectedBook(null); 
      setSelectedMember(null);
      setBorrowQuantity(1);
    }).finally(() => setIsProcessing(false))
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> Sirkulasi & Kondisi Buku</h1>
          <p className="text-sm text-muted-foreground">Proses peminjaman dan pengembalian sesuai kebijakan sekolah.</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold gap-2 py-1.5 px-3">
            <CalendarDays className="h-4 w-4" />
            Batas Pinjam: {loanDays} Hari
          </Badge>
          {loadingSettings && <p className="text-[10px] text-muted-foreground animate-pulse">Menghubungkan kebijakan...</p>}
        </div>
      </div>

      <Tabs defaultValue="borrow" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50">
          <TabsTrigger value="borrow" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Peminjaman</TabsTrigger>
          <TabsTrigger value="return" className="text-base font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pengembalian</TabsTrigger>
        </TabsList>
        
        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20 overflow-hidden">
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <Button size="lg" className="h-16 px-12 gap-3 shadow-xl hover:shadow-2xl transition-all" onClick={startScanner}><ScanBarcode className="h-6 w-6" /> Buka Smart Scan</Button>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Arahkan kamera ke QR Code Anggota atau Buku</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm relative">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary uppercase tracking-wider font-bold"><User className="h-4 w-4" /> Data Peminjam</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Ketik Nama atau ID Anggota..." 
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
                      <div className="pt-2 border-t border-primary/10 flex items-center justify-between">
                         <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                           <Library className="h-3 w-3" /> Pinjaman Aktif:
                         </div>
                         <Badge variant={selectedMemberActiveLoans >= 3 ? "destructive" : "secondary"} className="font-bold">
                           {selectedMemberActiveLoans} Buku
                         </Badge>
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Ketik Judul atau Kode Buku..." 
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
                              setBorrowQuantity(1);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-sm truncate max-w-[200px]">{b.title}</span>
                              <span className="text-[10px] font-mono text-secondary-foreground">{b.code}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={b.availableStock <= 0 ? "destructive" : "outline"} className="text-[8px] h-4">
                                {b.availableStock} Tersedia
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
                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Jumlah Buku yang Dipinjam</Label>
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
                          <span className="text-xl font-black w-8 text-center">{borrowQuantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full"
                            onClick={() => setBorrowQuantity(prev => Math.min(selectedBook.availableStock || 1, prev + 1))}
                            disabled={borrowQuantity >= (selectedBook.availableStock || 0)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <div className="text-[10px] text-muted-foreground font-medium italic">
                            Max: {selectedBook.availableStock || 0} unit
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-secondary/10 flex items-center justify-between">
                         <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                           <Clock className="h-3 w-3" /> Estimasi Jatuh Tempo:
                         </div>
                         <div className="text-xs font-bold text-primary">
                           {format(estimatedDueDate, 'EEEE, dd MMM yyyy', { locale: localeID })}
                         </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button className="w-full h-16 text-lg font-black shadow-lg shadow-primary/20 mt-4" disabled={!selectedMember || !selectedBook || isProcessing || loadingSettings} onClick={handleProcessBorrow}>
              {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : "KONFIRMASI PEMINJAMAN"}
            </Button>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-none shadow-sm bg-accent/30 flex flex-col items-center justify-center p-8 gap-4">
                <Button variant="secondary" className="h-20 w-full gap-3 shadow-md font-bold" onClick={startScanner}><ScanBarcode className="h-8 w-8" /> Scan Buku</Button>
                <div className="w-full space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pencarian Manual</Label>
                  <Input placeholder="Cari Nama/Kode..." className="h-12 bg-white" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} />
                </div>
              </Card>

              <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider">Peminjaman Aktif</CardTitle>
                      <CardDescription className="text-xs">Daftar sirkulasi buku yang sedang dipinjam.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-bold">{activeTrans?.length || 0} Buku</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-12 text-center">No.</TableHead>
                          <TableHead>Peminjam & Buku</TableHead>
                          <TableHead className="w-32">Tgl Pinjam</TableHead>
                          <TableHead className="w-32">Jatuh Tempo</TableHead>
                          <TableHead className="w-24 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingActive ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : filteredActiveTrans.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">Tidak ada peminjaman aktif{returnSearch && ' yang cocok'}.</TableCell></TableRow>
                        ) : filteredActiveTrans.map((t, index) => {
                          const borrowDate = t.borrowDate ? parseISO(t.borrowDate) : new Date();
                          const effectiveDueDate = addDays(borrowDate, loanDays);
                          const isOverdue = isAfter(new Date(), effectiveDueDate);
                          const totalMemberLoans = getMemberLoanCount(t.memberId);
                          
                          return (
                            <TableRow key={t.id} className={cn(isOverdue && "bg-red-50/50")}>
                              <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-sm leading-tight">
                                    {t.bookTitle} 
                                    {t.quantity && t.quantity > 1 && (
                                      <span className="ml-2 text-primary font-black">({t.quantity} unit)</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{t.memberName}</span>
                                    <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-primary/20 bg-primary/5 text-primary">
                                      {totalMemberLoans} Buku
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(borrowDate, 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className={cn("text-xs font-bold", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                    {format(effectiveDueDate, 'dd/MM/yyyy')}
                                  </div>
                                  {isOverdue && <Badge variant="destructive" className="text-[9px] h-4 px-1">Terlambat</Badge>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="h-8 text-xs font-bold hover:bg-primary hover:text-white" onClick={() => prepareReturn(t)}>
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
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isReturnConfirmOpen} onOpenChange={(v) => { setIsReturnConfirmOpen(v); if(!v) forceUnlockUI(); }}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-bold">
              <CheckCircle className="h-5 w-5" /> Konfirmasi & Kondisi Buku
            </DialogTitle>
            <DialogDescription>
              Tentukan kondisi fisik buku saat pengembalian.
            </DialogDescription>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Informasi Buku</div>
                    <div className="text-sm font-black">
                      {pendingReturnTrans.bookTitle}
                      {pendingReturnTrans.quantity && pendingReturnTrans.quantity > 1 && (
                        <span className="ml-1 text-primary">({pendingReturnTrans.quantity} unit)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Peminjam</div>
                    <div className="text-sm font-bold">{pendingReturnTrans.memberName}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <ShieldAlert className="h-3 w-3" /> Pilih Kondisi Fisik
                </Label>
                <RadioGroup value={returnCondition} onValueChange={(v: any) => setReturnCondition(v)} className="grid grid-cols-1 gap-2">
                  <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer", returnCondition === 'normal' ? "border-primary bg-primary/5" : "hover:bg-slate-50")}>
                    <RadioGroupItem value="normal" id="c-normal" />
                    <Label htmlFor="c-normal" className="flex-1 cursor-pointer flex items-center justify-between font-bold">
                      <span className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-600" /> Lengkap & Baik</span>
                      <Badge variant="outline" className="bg-white">Normal</Badge>
                    </Label>
                  </div>
                  <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer", returnCondition === 'damaged' ? "border-orange-500 bg-orange-50" : "hover:bg-slate-50")}>
                    <RadioGroupItem value="damaged" id="c-damaged" />
                    <Label htmlFor="c-damaged" className="flex-1 cursor-pointer flex items-center justify-between font-bold">
                      <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-orange-600" /> Rusak (Denda)</span>
                      <Badge variant="outline" className="bg-white border-orange-200 text-orange-700">Perbaikan</Badge>
                    </Label>
                  </div>
                  <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer", returnCondition === 'lost' ? "border-destructive bg-red-50" : "hover:bg-slate-50")}>
                    <RadioGroupItem value="lost" id="c-lost" />
                    <Label htmlFor="c-lost" className="flex-1 cursor-pointer flex items-center justify-between font-bold">
                      <span className="flex items-center gap-2"><Ghost className="h-4 w-4 text-destructive" /> Hilang (Ganti)</span>
                      <Badge variant="destructive" className="h-5 px-1.5">Penggantian</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {calculatedFine > 0 && (
                <div className="p-5 bg-orange-50 border-2 border-orange-200 rounded-2xl space-y-2 animate-in zoom-in-95">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-orange-800 uppercase tracking-widest flex items-center gap-2"><Coins className="h-4 w-4" /> Tagihan Denda</span>
                    <span className="text-2xl font-black text-orange-600">Rp{calculatedFine.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-orange-700 font-medium leading-relaxed opacity-80 pt-2 border-t border-orange-200">
                    {lateDays > 0 && <div className="flex justify-between"><span>• Terlambat {lateDays} hari</span> <span>Rp{(lateDays * Number(settings?.fineAmount || 500)).toLocaleString()}</span></div>}
                    {returnCondition === 'damaged' && <div className="flex justify-between"><span>• Biaya Kerusakan Buku</span> <span>Rp{(Number(settings?.fineAmount || 500) * 10).toLocaleString()}</span></div>}
                    {returnCondition === 'lost' && <div className="flex justify-between"><span>• Ganti Buku Hilang</span> <span>Rp{Number(settings?.lostBookFine || 50000).toLocaleString()}</span></div>}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReturnConfirmOpen(false)} disabled={isProcessing} className="flex-1">Batal</Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="flex-1 shadow-lg shadow-primary/20">{isProcessing ? <Loader2 className="animate-spin" /> : "Simpan Data"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="p-0 border-none bg-black max-w-xl h-[400px] overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Pemindai QR Code</DialogTitle>
          </DialogHeader>
          <div id="smart-scanner" className="w-full h-full"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
