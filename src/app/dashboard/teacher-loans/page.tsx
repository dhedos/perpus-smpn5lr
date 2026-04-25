
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
  BookOpen
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

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc,
  useUser,
  errorEmitter
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc, orderBy } from 'firebase/firestore'
import { format } from "date-fns"
import { cn } from "@/lib/utils"

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
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
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
  const { data: allTransactions, isLoading: loadingTrans } = useCollection(allTransRef)

  // FILTER KHUSUS GURU
  const teachers = useMemo(() => {
    if (!allMembersData) return [];
    return allMembersData.filter(m => m.type === 'Teacher');
  }, [allMembersData]);

  const books = useMemo(() => {
    if (!allBooksData) return [];
    return [...allBooksData].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [allBooksData]);

  // Transaksi aktif khusus peminjaman GURU (Diorganisir berdasarkan memberType)
  const activeTransactions = useMemo(() => {
    if (!allTransactions) return []
    return allTransactions
      .filter(t => t.status === 'active' && t.memberType === 'Teacher')
      .sort((a, b) => {
        const dateA = a.borrowDate ? new Date(a.borrowDate).getTime() : 0;
        const dateB = b.borrowDate ? new Date(b.borrowDate).getTime() : 0;
        return dateB - dateA
      })
  }, [allTransactions])

  const historyTransactions = useMemo(() => {
    if (!allTransactions) return []
    return allTransactions
      .filter(t => t.status === 'returned' && t.memberType === 'Teacher')
      .sort((a, b) => {
        const dateA = a.returnDate ? new Date(a.returnDate).getTime() : 0;
        const dateB = b.returnDate ? new Date(b.returnDate).getTime() : 0;
        return dateB - dateA
      })
  }, [allTransactions])

  const memberSuggestions = useMemo(() => {
    if (!memberSearch || memberSearch.length < 1 || !teachers) return []
    return teachers.filter(m => 
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
      m.memberId?.toLowerCase().startsWith(memberSearch.toLowerCase())
    ).slice(0, 5)
  }, [memberSearch, teachers])

  const bookSuggestions = useMemo(() => {
    if (!bookSearch || bookSearch.length < 1 || !books) return []
    return books.filter(b => 
      b.title?.toLowerCase().includes(bookSearch.toLowerCase()) || 
      b.code?.toLowerCase().startsWith(bookSearch.toLowerCase())
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
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.overflow = 'auto';
        const overlays = document.querySelectorAll('[data-radix-focus-guard]');
        overlays.forEach(el => (el as HTMLElement).remove());
      }, 300);
    }
  }, []);

  const startScanner = async (mode: "member" | "book" | "return") => {
    setIsScannerOpen(true)
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        const sc = new Html5Qrcode("teacher-scanner")
        scannerInstanceRef.current = sc
        await sc.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (text) => {
          if (mode === "member") {
            const m = teachers?.find(t => t.memberId?.toLowerCase() === text.toLowerCase())
            if (m) { setSelectedMember(m); stopScanner(); }
          } else if (mode === "book") {
            const b = books?.find(bk => bk.code?.toLowerCase() === text.toLowerCase() || bk.isbn === text)
            if (b) { setSelectedBook(b); stopScanner(); }
          } else if (mode === "return") {
            const trans = activeTransactions?.find(t => t.memberId?.toLowerCase() === text.toLowerCase() || t.bookTitle?.toLowerCase().includes(text.toLowerCase()))
            if (trans) { stopScanner(); setTimeout(() => prepareReturn(trans), 10); }
          }
        }, () => {})
      }, 500)
    } catch (e) { setIsScannerOpen(false) }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current?.isScanning) await scannerInstanceRef.current.stop()
    setIsScannerOpen(false)
    forceUnlockUI()
  }

  const handleProcessLoan = () => {
    if (!db || !selectedMember || !selectedBook) return
    if (isLockedForUser) {
      toast({ title: "Fitur Terkunci", description: "Admin mengunci fitur pengubahan data.", variant: "destructive" })
      return
    }

    setIsProcessing(true)

    const newLoan = {
      memberId: selectedMember.memberId,
      memberName: selectedMember.name,
      memberType: 'Teacher',
      classOrSubject: selectedMember.classOrSubject || "-",
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      quantity: 1,
      type: 'teacher_handbook',
      status: 'active',
      borrowDate: new Date().toISOString(),
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, 'transactions'), newLoan).then(() => {
      const avail = Number(selectedBook.availableStock ?? 1)
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Math.max(0, avail - 1) })
      toast({ title: "Buku Pegangan Dicatat", description: `${selectedBook.title} telah diserahkan ke ${selectedMember.name}.` })
      setSelectedBook(null)
      setSelectedMember(null)
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
      toast({ title: "Berhasil!", description: "Pengembalian buku pegangan telah dicatat." })
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
        <td style="border: 1px solid #ccc; padding: 8px;">${t.memberName}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.borrowDate ? new Date(t.borrowDate).toLocaleDateString('id-ID') : '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.returnDate ? new Date(t.returnDate).toLocaleDateString('id-ID') : 'PEGANG'}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head><title>Buku Pegangan Guru</title></head>
        <body onload="window.print(); window.close();">
          <h2 style="text-align: center;">DAFTAR PENYERAHAN BUKU PEGANGAN GURU</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ccc; padding: 10px;">No</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Nama Guru</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Judul Buku</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Tgl Pinjam</th>
                <th style="border: 1px solid #ccc; padding: 10px;">Tgl Kembali</th>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> Buku Pegangan Guru
          </h1>
          <p className="text-sm text-muted-foreground">Peminjaman khusus untuk kebutuhan mengajar bapak/ibu guru.</p>
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
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-none shadow-sm bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Identitas Penyerahan</CardTitle>
                <DialogDescription>Pilih nama guru dan judul buku yang akan diserahkan.</DialogDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pilih Guru</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Nama atau NIP Guru..." 
                      className="pl-10 bg-white"
                      value={memberSearch}
                      onChange={e => { setMemberSearch(e.target.value); setShowMemberSuggestions(true); }}
                      onFocus={() => setShowMemberSuggestions(true)}
                    />
                    {showMemberSuggestions && memberSuggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                        {memberSuggestions.map(m => (
                          <div key={m.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0" onClick={() => { setSelectedMember(m); setMemberSearch(""); setShowMemberSuggestions(false); }}>
                            <div className="font-bold">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground">{m.memberId}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMember && (
                    <div className="p-3 bg-white rounded-lg border flex justify-between items-center animate-in slide-in-from-left-2">
                      <div className="text-xs font-bold text-primary">{selectedMember.name}</div>
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

            <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Riwayat Guru (Terakhir)
                </CardTitle>
                <DialogDescription>Daftar 10 penyerahan buku terakhir kepada guru.</DialogDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">No.</TableHead>
                      <TableHead>Nama Guru</TableHead>
                      <TableHead>Judul Buku</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTrans ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : historyTransactions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">Belum ada riwayat guru.</TableCell></TableRow>
                    ) : historyTransactions.slice(0, 10).map((t, index) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-center text-xs">{index + 1}</TableCell>
                        <TableCell className="font-bold text-xs">{t.memberName}</TableCell>
                        <TableCell className="text-xs">{t.bookTitle}</TableCell>
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
              <Button variant="secondary" className="h-20 w-full gap-3 shadow-md font-bold" onClick={() => startScanner("return")}><ScanBarcode className="h-8 w-8" /> Scan Buku Guru</Button>
              <div className="w-full space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pencarian Manual Guru</Label>
                <Input placeholder="Cari Nama/NIP Guru..." className="h-12 bg-white" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} />
              </div>
            </Card>

            <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Buku Guru Aktif</CardTitle>
                <DialogDescription>Daftar buku yang saat ini masih dipegang oleh bapak/ibu guru.</DialogDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">No.</TableHead>
                        <TableHead>Nama Guru & Buku</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTrans ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                      ) : filteredActive.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Tidak ada buku guru aktif.</TableCell></TableRow>
                      ) : filteredActive.map((t, index) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-center text-xs text-muted-foreground font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-bold text-sm leading-tight">{t.bookTitle}</div>
                              <div className="text-xs font-semibold">{t.memberName} <span className="text-muted-foreground font-normal">/ {t.memberId}</span></div>
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
              <CheckCircle className="h-5 w-5" /> Konfirmasi Guru
            </DialogTitle>
            <DialogDescription>Verifikasi kondisi fisik buku saat pengembalian dilakukan.</DialogDescription>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-slate-50 rounded-xl border space-y-3">
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Buku & Guru</div>
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

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="p-0 border-none bg-black max-w-xl h-[400px] overflow-hidden">
          <DialogHeader className="sr-only">
             <DialogTitle>Pemindai</DialogTitle>
             <DialogDescription>Arahkan kamera ke kode buku atau kartu guru.</DialogDescription>
          </DialogHeader>
          <div id="teacher-scanner" className="w-full h-full bg-black"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>
      <div className="text-center py-6 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}
