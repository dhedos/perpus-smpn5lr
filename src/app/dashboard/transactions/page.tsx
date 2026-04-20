
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
  Sparkles,
  RefreshCcw,
  User,
  AlertCircle,
  Clock,
  Coins,
  CalendarDays,
  Ghost,
  ShieldAlert,
  ThumbsUp
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

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore'
import { differenceInDays, parseISO, format } from "date-fns"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
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

  // Return Process State
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
  const [pendingReturnTrans, setPendingReturnTrans] = useState<any>(null)
  const [returnCondition, setReturnCondition] = useState<"normal" | "damaged" | "lost">("normal")
  const [calculatedFine, setCalculatedFine] = useState(0)
  const [lateDays, setLateDays] = useState(0)

  // Settings
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])

  const { data: members } = useCollection(membersRef)
  const { data: books } = useCollection(booksRef)

  const activeTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), where('status', '==', 'active')) : null, 
  [db])
  const { data: activeTrans } = useCollection(activeTransQuery)

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
        return b?.code?.toLowerCase() === text.toLowerCase() || b?.isbn === text; 
      })
      if (trans) { prepareReturn(trans); stopScanner(); }
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

  // Recalculate fine when condition changes
  useEffect(() => {
    if (!pendingReturnTrans || !settings) return;
    
    let fine = 0;
    // Late fine
    if (lateDays > 0) {
      fine += lateDays * (settings.fineAmount || 500);
    }
    
    // Condition fine
    if (returnCondition === "lost") {
      fine += (settings.lostBookFine || 50000);
    } else if (returnCondition === "damaged") {
      fine += (settings.fineAmount || 500) * 10; // Simple damaged fine: 10x daily fine
    }
    
    setCalculatedFine(fine);
  }, [returnCondition, pendingReturnTrans, lateDays, settings]);

  const handleConfirmReturn = async () => {
    if (!db || !pendingReturnTrans) return
    setIsProcessing(true)
    try {
      // 1. Update Transaction
      await updateDoc(doc(db, 'transactions', pendingReturnTrans.id), { 
        status: 'returned', 
        returnDate: new Date().toISOString(), 
        type: 'return',
        condition: returnCondition,
        fineAmount: calculatedFine,
        isFinePaid: calculatedFine > 0 
      })
      
      // 2. Update Book Inventory
      const bRef = doc(db, 'books', pendingReturnTrans.bookId)
      const bDoc = await getDoc(bRef)
      if (bDoc.exists()) {
        const currentTotal = bDoc.data().totalStock || 0
        const currentAvail = bDoc.data().availableStock || 0
        
        if (returnCondition === "lost") {
          // If lost, total stock decreases by 1, available stock stays same
          await updateDoc(bRef, { 
            totalStock: currentTotal - 1 
          })
        } else {
          // If normal or damaged, available stock increases back
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

  // Existing helpers start here
  const startScanner = async () => {
    setIsScannerOpen(true); 
    setHasCameraPermission(null)
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("smart-scanner")
          scannerInstanceRef.current = scanner
          await scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (text) => handleScanResult(text), () => {})
          setHasCameraPermission(true)
        } catch (err) { setHasCameraPermission(false) }
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
    const due = new Date(); due.setDate(due.getDate() + (settings?.loanPeriod || 7))
    addDoc(collection(db, 'transactions'), {
      memberId: selectedMember.memberId, memberName: selectedMember.name, 
      bookId: selectedBook.id, bookTitle: selectedBook.title, 
      type: 'borrow', status: 'active', borrowDate: new Date().toISOString(), 
      dueDate: due.toISOString(), createdAt: serverTimestamp()
    }).then(() => {
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Number(selectedBook.availableStock) - 1 })
      toast({ title: "Berhasil Meminjam" }); setSelectedBook(null); setSelectedMember(null);
    }).finally(() => setIsProcessing(false))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Sirkulasi & Kondisi Buku</h1>
          <p className="text-sm text-muted-foreground">Proses peminjaman dan pengembalian dengan cek kondisi.</p>
        </div>
      </div>

      <Tabs defaultValue="borrow" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="borrow" className="text-base font-semibold">Peminjaman</TabsTrigger>
          <TabsTrigger value="return" className="text-base font-semibold">Pengembalian</TabsTrigger>
        </TabsList>
        
        <div className="mt-6">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 text-center space-y-4">
                <Button size="lg" className="h-16 px-10 gap-2 shadow-lg" onClick={startScanner}><ScanBarcode className="h-6 w-6" />Buka Smart Scan</Button>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" />Data Peminjam</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Input ID Anggota..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanResult(memberSearch)} />
                  {selectedMember && <div className="p-4 bg-primary/10 rounded-xl border flex justify-between"><div><p className="font-bold">{selectedMember.name}</p><p className="text-xs">{selectedMember.memberId}</p></div><Button variant="ghost" size="icon" onClick={() => setSelectedMember(null)}><X className="h-4 w-4" /></Button></div>}
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-secondary" />Data Buku</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Input Kode Buku..." value={bookSearch} onChange={e => setBookSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanResult(bookSearch)} />
                  {selectedBook && <div className="p-4 bg-secondary/10 rounded-xl border flex justify-between"><div><p className="font-bold">{selectedBook.title}</p><p className="text-xs">{selectedBook.code}</p></div><Button variant="ghost" size="icon" onClick={() => setSelectedBook(null)}><X className="h-4 w-4" /></Button></div>}
                </CardContent>
              </Card>
            </div>
            <Button className="w-full h-16 text-lg font-bold" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
              {isProcessing ? <Loader2 className="animate-spin" /> : "KONFIRMASI PEMINJAMAN"}
            </Button>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm bg-accent/30 p-10 text-center space-y-4">
              <Button variant="secondary" className="h-16 px-10 gap-2 shadow-md" onClick={startScanner}><ScanBarcode className="h-6 w-6" />Scan Buku Kembali</Button>
              <Input placeholder="Atau ketik Kode Buku/Nama Peminjam..." className="max-w-md mx-auto h-12" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScanResult(returnSearch)} />
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi & Kondisi Buku</DialogTitle>
            <DialogDescription>Tentukan kondisi fisik buku saat ini.</DialogDescription>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-6 py-4">
              <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                <p>Peminjam: <b>{pendingReturnTrans.memberName}</b></p>
                <p>Buku: <b>{pendingReturnTrans.bookTitle}</b></p>
              </div>

              <div className="space-y-3">
                <Label className="font-bold text-xs uppercase text-muted-foreground tracking-widest">Pilih Kondisi Fisik</Label>
                <RadioGroup value={returnCondition} onValueChange={(v: any) => setReturnCondition(v)} className="grid grid-cols-1 gap-2">
                  <div className={cn("flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50", returnCondition === 'normal' && "border-primary bg-primary/5")}>
                    <RadioGroupItem value="normal" id="c-normal" />
                    <Label htmlFor="c-normal" className="flex-1 cursor-pointer flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-600" /> Lengkap & Normal</Label>
                  </div>
                  <div className={cn("flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50", returnCondition === 'damaged' && "border-orange-500 bg-orange-50")}>
                    <RadioGroupItem value="damaged" id="c-damaged" />
                    <Label htmlFor="c-damaged" className="flex-1 cursor-pointer flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-orange-600" /> Rusak (Perlu Perbaikan)</Label>
                  </div>
                  <div className={cn("flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50", returnCondition === 'lost' && "border-destructive bg-red-50")}>
                    <RadioGroupItem value="lost" id="c-lost" />
                    <Label htmlFor="c-lost" className="flex-1 cursor-pointer flex items-center gap-2"><Ghost className="h-4 w-4 text-destructive" /> Hilang (Penggantian)</Label>
                  </div>
                </RadioGroup>
              </div>

              {calculatedFine > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-orange-800">TOTAL DENDA:</span>
                    <span className="text-xl font-black text-orange-600">Rp{calculatedFine.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-orange-700 flex flex-col gap-0.5 opacity-80">
                    {lateDays > 0 && <span>- Terlambat {lateDays} hari x Rp{(settings?.fineAmount || 500).toLocaleString()}</span>}
                    {returnCondition === 'damaged' && <span>- Biaya Kerusakan: Rp{((settings?.fineAmount || 500) * 10).toLocaleString()}</span>}
                    {returnCondition === 'lost' && <span>- Biaya Buku Hilang: Rp{(settings?.lostBookFine || 50000).toLocaleString()}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReturnConfirmOpen(false)} disabled={isProcessing}>Batal</Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="px-8">{isProcessing ? <Loader2 className="animate-spin" /> : "Simpan Data"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="p-0 border-none bg-black max-w-xl"><div id="smart-scanner" className="w-full h-80"></div></DialogContent>
      </Dialog>
    </div>
  )
}
