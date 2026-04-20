
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
  Ghost
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
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore'
import { differenceInDays, parseISO, format, isAfter } from "date-fns"
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

  // Return Process State
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
  const [pendingReturnTrans, setPendingReturnTrans] = useState<any>(null)
  const [returnCondition, setReturnCondition] = useState<"normal" | "damaged" | "lost">("normal")
  const [calculatedFine, setCalculatedFine] = useState(0)
  const [lateDays, setLateDays] = useState(0)

  // Settings: Menarik batas pinjam dan tarif denda dari Admin
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])

  const { data: members } = useCollection(membersRef)
  const { data: books } = useCollection(booksRef)

  // Query sirkulasi aktif - Disederhanakan untuk menghindari error permission/index
  const activeTransQuery = useMemoFirebase(() => {
    if (!db || !isStaff) return null;
    return query(collection(db, 'transactions'), where('status', '==', 'active'));
  }, [db, isStaff])

  const { data: activeTrans, isLoading: loadingActive } = useCollection(activeTransQuery)

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

  const handleScanResult = (text: string) => {
    if (!text) return
    const member = members?.find(m => m.memberId?.toLowerCase() === text.toLowerCase())
    const book = books?.find(b => b.code?.toLowerCase() === text.toLowerCase() || b.isbn === text)

    if (activeTab === "borrow") {
      if (member) { setSelectedMember(member); toast({ title: "Anggota Terdeteksi" }) }
      else if (book) { setSelectedBook(book); toast({ title: "Buku Terdeteksi" }) }
    } else {
      const trans = activeTrans?.find(t => { 
        const b = books?.find(bk => bk.id === t.bookId); 
        return b?.code?.toLowerCase() === text.toLowerCase() || b?.isbn === text || t.memberId?.toLowerCase() === text.toLowerCase(); 
      })
      if (trans) { prepareReturn(trans); stopScanner(); }
      else toast({ title: "Transaksi Aktif Tidak Ditemukan", variant: "destructive" })
    }
  }

  const prepareReturn = (trans: any) => {
    const today = new Date();
    const dueDate = parseISO(trans.dueDate);
    const diffDays = differenceInDays(today, dueDate);
    setLateDays(diffDays > 0 ? diffDays : 0);
    setPendingReturnTrans(trans);
    setReturnCondition("normal");
    setIsReturnConfirmOpen(true);
  }

  // Efek untuk menghitung denda secara otomatis saat input kondisi berubah
  useEffect(() => {
    if (!pendingReturnTrans || !settings) return;
    
    let fine = 0;
    // Denda keterlambatan (Rp per hari dari Admin)
    if (lateDays > 0) {
      fine += lateDays * Number(settings.fineAmount || 500);
    }
    
    // Denda kondisi khusus (Buku Hilang/Rusak)
    if (returnCondition === "lost") {
      fine += Number(settings.lostBookFine || 50000);
    } else if (returnCondition === "damaged") {
      fine += Number(settings.fineAmount || 500) * 10; // Ilustrasi: denda rusak 10x tarif harian
    }
    
    setCalculatedFine(fine);
  }, [returnCondition, pendingReturnTrans, lateDays, settings]);

  const handleConfirmReturn = async () => {
    if (!db || !pendingReturnTrans) return
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'transactions', pendingReturnTrans.id), { 
        status: 'returned', 
        returnDate: new Date().toISOString(), 
        type: 'return',
        condition: returnCondition,
        fineAmount: calculatedFine,
        isFinePaid: calculatedFine > 0 
      })
      
      const bRef = doc(db, 'books', pendingReturnTrans.bookId)
      const bDoc = await getDoc(bRef)
      if (bDoc.exists()) {
        const currentTotal = bDoc.data().totalStock || 0
        const currentAvail = bDoc.data().availableStock || 0
        
        if (returnCondition === "lost") {
          await updateDoc(bRef, { 
            totalStock: currentTotal - 1,
            availableStock: currentAvail // Tidak bertambah karena buku tidak ada fisiknya
          })
        } else {
          await updateDoc(bRef, { 
            availableStock: currentAvail + 1 
          })
        }
      }
      
      toast({ title: "Berhasil!", description: "Pengembalian buku telah dicatat." })
      setIsReturnConfirmOpen(false);
      setReturnSearch("");
    } catch (err) {
      toast({ title: "Gagal", variant: "destructive" })
    } finally { setIsProcessing(false) }
  }

  const startScanner = async () => {
    setIsScannerOpen(true); 
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("smart-scanner")
          scannerInstanceRef.current = scanner
          await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => handleScanResult(text), () => {})
        } catch (err) {}
      }, 500)
    } catch (e) { setIsScannerOpen(false) }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current?.isScanning) await scannerInstanceRef.current.stop()
    setIsScannerOpen(false)
  }

  const handleProcessBorrow = () => {
    if (!db || !selectedMember || !selectedBook) return
    setIsProcessing(true)
    
    // LOGIKA DINAMIS: Menggunakan loanPeriod dari Admin
    const loanDays = Number(settings?.loanPeriod || 7);
    const today = new Date();
    const dueDate = new Date(); 
    dueDate.setDate(today.getDate() + loanDays);

    addDoc(collection(db, 'transactions'), {
      memberId: selectedMember.memberId, 
      memberName: selectedMember.name, 
      bookId: selectedBook.id, 
      bookTitle: selectedBook.title, 
      type: 'borrow', 
      status: 'active', 
      borrowDate: today.toISOString(), 
      dueDate: dueDate.toISOString(), 
      createdAt: serverTimestamp()
    }).then(() => {
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Number(selectedBook.availableStock) - 1 })
      toast({ 
        title: "Peminjaman Berhasil", 
        description: `Jatuh tempo: ${format(dueDate, 'dd MMMM yyyy')} (${loanDays} hari).` 
      }); 
      setSelectedBook(null); 
      setSelectedMember(null);
    }).finally(() => setIsProcessing(false))
  }

  // Tampilkan loading jika status staff belum terverifikasi
  if (!isStaff && !user) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat data akses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> Sirkulasi & Kondisi Buku</h1>
          <p className="text-sm text-muted-foreground">Proses peminjaman dan pengembalian sesuai kebijakan sekolah.</p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-[10px] font-bold">Kebijakan: {settings?.loanPeriod || 7} Hari</Badge>
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
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary uppercase tracking-wider font-bold"><User className="h-4 w-4" /> Data Peminjam</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Ketik ID Anggota..." className="pl-10 h-12" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanResult(memberSearch)} />
                  </div>
                  {selectedMember && (
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center animate-in slide-in-from-left-2">
                      <div>
                        <p className="font-bold text-primary">{selectedMember.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{selectedMember.memberId}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedMember(null)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 pb-4 border-b">
                  <CardTitle className="text-sm flex items-center gap-2 text-secondary uppercase tracking-wider font-bold"><BookOpen className="h-4 w-4" /> Data Buku</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Ketik Kode Buku..." className="pl-10 h-12" value={bookSearch} onChange={e => setBookSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanResult(bookSearch)} />
                  </div>
                  {selectedBook && (
                    <div className="p-4 bg-secondary/5 rounded-xl border border-secondary/20 flex justify-between items-center animate-in slide-in-from-right-2">
                      <div className="flex-1">
                        <p className="font-bold text-secondary-foreground leading-tight">{selectedBook.title}</p>
                        <p className="text-xs font-mono text-muted-foreground">{selectedBook.code}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)} className="h-8 w-8 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button className="w-full h-16 text-lg font-black shadow-lg shadow-primary/20" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
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
                      <CardDescription className="text-xs">Buku yang saat ini sedang dibawa siswa.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="font-bold">{activeTrans?.length || 0} Buku</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Peminjam & Buku</TableHead>
                          <TableHead className="w-32">Jatuh Tempo</TableHead>
                          <TableHead className="w-24 text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingActive ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                        ) : filteredActiveTrans.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">Tidak ada peminjaman aktif{returnSearch && ' yang cocok'}.</TableCell></TableRow>
                        ) : filteredActiveTrans.map((t) => {
                          const isOverdue = t.dueDate ? isAfter(new Date(), parseISO(t.dueDate)) : false;
                          return (
                            <TableRow key={t.id} className={cn(isOverdue && "bg-red-50/50")}>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="font-bold text-sm leading-tight">{t.bookTitle}</p>
                                  <p className="text-xs text-muted-foreground">{t.memberName} ({t.memberId})</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className={cn("text-xs font-bold", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                                    {t.dueDate ? format(parseISO(t.dueDate), 'dd/MM/yyyy') : '-'}
                                  </p>
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

      <Dialog open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
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
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Informasi Buku</p>
                    <p className="text-sm font-black">{pendingReturnTrans.bookTitle}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-primary mt-1" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Peminjam</p>
                    <p className="text-sm font-bold">{pendingReturnTrans.memberName}</p>
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
                    {lateDays > 0 && <p className="flex justify-between"><span>• Terlambat {lateDays} hari</span> <span>Rp{(lateDays * Number(settings?.fineAmount || 500)).toLocaleString()}</span></p>}
                    {returnCondition === 'damaged' && <p className="flex justify-between"><span>• Biaya Kerusakan Buku</span> <span>Rp{(Number(settings?.fineAmount || 500) * 10).toLocaleString()}</span></p>}
                    {returnCondition === 'lost' && <p className="flex justify-between"><span>• Ganti Buku Hilang</span> <span>Rp{Number(settings?.lostBookFine || 50000).toLocaleString()}</span></p>}
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
          <div id="smart-scanner" className="w-full h-full"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
