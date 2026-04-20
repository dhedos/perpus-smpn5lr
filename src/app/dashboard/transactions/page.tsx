
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  User, 
  BookOpen, 
  Calendar, 
  ArrowRight, 
  RefreshCcw, 
  Search, 
  Loader2, 
  CheckCircle,
  Users,
  GraduationCap,
  School,
  UserPlus,
  ArrowDownLeft,
  QrCode,
  ScanBarcode,
  X,
  Sparkles
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function TransactionsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("borrow")
  const [borrowerType, setBorrowerType] = useState("Siswa") 
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [returnSearch, setReturnSearch] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<"borrow" | "return">("borrow")
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)

  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])

  const { data: members, loading: membersLoading } = useCollection(membersRef)
  const { data: books } = useCollection(booksRef)

  const activeTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), where('status', '==', 'active')) : null, 
  [db])
  const { data: activeTrans } = useCollection(activeTransQuery)

  const foundActiveTrans = useMemo(() => {
    if (!returnSearch || !activeTrans) return []
    const term = returnSearch.toLowerCase()
    return activeTrans.filter(t => 
      (t.memberName?.toLowerCase() || "").includes(term) || 
      (t.bookTitle?.toLowerCase() || "").includes(term) ||
      (t.memberId || "").includes(term)
    )
  }, [activeTrans, returnSearch])

  const foundMembers = useMemo(() => {
    if (!memberSearch || !members) return []
    const term = memberSearch.toLowerCase()
    return members.filter(m => {
      const matchesSearch = (m.name?.toLowerCase() || "").includes(term) || (m.memberId || "").includes(term)
      if (borrowerType === "Siswa") return matchesSearch && m.type === "Student"
      if (borrowerType === "Guru") return matchesSearch && m.type === "Teacher"
      return matchesSearch
    })
  }, [members, memberSearch, borrowerType])

  const foundBooks = useMemo(() => {
    if (!bookSearch || !books) return []
    const term = bookSearch.toLowerCase()
    return books.filter(b => (b.title?.toLowerCase() || "").includes(term) || (b.code?.toLowerCase() || "").includes(term) || (b.isbn || "").includes(term))
  }, [books, bookSearch])

  const startScanner = async (target: "borrow" | "return") => {
    setScannerTarget(target)
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.stop() } catch (e) {}
    }

    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")

    setTimeout(async () => {
      const container = document.getElementById("qr-transaction-scanner")
      if (!container) return

      try {
        const scanner = new Html5Qrcode("qr-transaction-scanner")
        scannerInstanceRef.current = scanner
        
        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 20, 
            qrbox: (viewWidth, viewHeight) => {
              const minSide = Math.min(viewWidth, viewHeight);
              return { width: minSide * 0.8, height: minSide * 0.5 };
            },
            aspectRatio: 1.0,
            formatsToSupport: [ 
              Html5QrcodeSupportedFormats.QR_CODE, 
              Html5QrcodeSupportedFormats.EAN_13, 
              Html5QrcodeSupportedFormats.EAN_8, 
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF
            ]
          },
          (decodedText) => {
            handleScanResult(decodedText, target)
          },
          () => {}
        )
        setHasCameraPermission(true)
      } catch (err) {
        setHasCameraPermission(false)
      }
    }, 500)
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
      } catch (e) {
        console.error("Error stopping scanner:", e)
      }
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
  }

  const handleScanResult = (decodedText: string, target: "borrow" | "return") => {
    if (target === "borrow") {
      // SMART SCAN: Check if it's a member OR a book
      const member = members?.find(m => m.memberId === decodedText)
      const book = books?.find(b => b.code === decodedText || b.isbn === decodedText)

      if (member) {
        setSelectedMember(member)
        setMemberSearch(member.name)
        toast({ title: "Anggota Terdeteksi", description: member.name })
      } else if (book) {
        setSelectedBook(book)
        setBookSearch(book.title)
        toast({ title: "Buku Terdeteksi", description: book.title })
      } else {
        toast({ title: "Tidak Dikenali", description: "Kode tidak terdaftar sebagai Anggota atau Buku.", variant: "destructive" })
      }
    } else {
      // Return Scan: find transaction by book code or ISBN
      const transaction = activeTrans?.find(t => {
        const book = books?.find(b => b.id === t.bookId)
        return book?.code === decodedText || book?.isbn === decodedText
      })
      if (transaction) {
        setReturnSearch(transaction.bookTitle)
        toast({ title: "Peminjaman Ditemukan", description: `Buku: ${transaction.bookTitle}` })
        stopScanner()
      } else {
        toast({ title: "Gagal", description: "Buku ini tidak sedang dipinjam.", variant: "destructive" })
      }
    }
  }

  const handleBookKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const exactBook = books?.find(b => b.code === bookSearch || b.isbn === bookSearch)
      if (exactBook) {
        setSelectedBook(exactBook)
        setBookSearch(exactBook.title)
        toast({ title: "Buku Terdeteksi", description: exactBook.title })
      }
    }
  }

  const handleMemberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      const exactMember = members?.find(m => m.memberId === memberSearch)
      if (exactMember) {
        setSelectedMember(exactMember)
        setMemberSearch(exactMember.name)
        toast({ title: "Anggota Terdeteksi", description: exactMember.name })
      }
    }
  }

  const handleProcessBorrow = () => {
    if (!db || !transRef || !selectedMember || !selectedBook) return
    if (Number(selectedBook.availableStock) <= 0) {
      toast({ title: "Stok Habis", variant: "destructive" }); return;
    }
    setIsProcessing(true)
    const dueDate = new Date()
    const days = selectedMember.type === "Teacher" || borrowerType === "Kelas" ? 14 : 7
    dueDate.setDate(dueDate.getDate() + days)

    addDoc(transRef, {
      memberId: selectedMember.memberId,
      memberName: selectedMember.name,
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      type: 'borrow',
      status: 'active',
      borrowDate: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      createdAt: serverTimestamp()
    }).then(() => {
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Number(selectedBook.availableStock) - 1 })
      toast({ title: "Berhasil!", description: "Buku telah dipinjam." })
      setSelectedBook(null); setSelectedMember(null); setMemberSearch(""); setBookSearch("");
    }).finally(() => setIsProcessing(false))
  }

  const handleProcessReturn = async (transaction: any) => {
    if (!db) return
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'transactions', transaction.id), {
        status: 'returned', returnDate: new Date().toISOString(), type: 'return'
      })
      const bDoc = await getDoc(doc(db, 'books', transaction.bookId))
      if (bDoc.exists()) {
        await updateDoc(doc(db, 'books', transaction.bookId), { availableStock: (bDoc.data().availableStock || 0) + 1 })
      }
      toast({ title: "Berhasil!", description: "Buku telah dikembalikan." })
      setReturnSearch("")
    } finally { setIsProcessing(false) }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Sirkulasi</h1>
          <p className="text-muted-foreground text-sm">Peminjaman & Pengembalian Buku.</p>
        </div>
      </div>

      <Tabs defaultValue="borrow" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14 bg-card border shadow-sm p-1 rounded-xl">
          <TabsTrigger value="borrow" className="gap-2 text-base rounded-lg data-[state=active]:bg-primary">Pinjam</TabsTrigger>
          <TabsTrigger value="return" className="gap-2 text-base rounded-lg data-[state=active]:bg-secondary">Kembali</TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="border-none shadow-sm bg-primary/5 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                   <Sparkles className="h-5 w-5 text-primary" />
                   Smart Scan Multifungsi
                </CardTitle>
                <CardDescription>Scan Barcode/QR Anggota ATAU Buku secara bergantian.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                 <Button size="lg" className="h-16 px-10 gap-3 text-lg font-bold shadow-xl" onClick={() => startScanner("borrow")}>
                    <ScanBarcode className="h-6 w-6" />
                    Buka Pemindai QR/Barcode
                 </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <RadioGroup defaultValue="Siswa" value={borrowerType} onValueChange={(v) => { setBorrowerType(v); setSelectedMember(null); setMemberSearch(""); }} className="grid grid-cols-3 gap-4">
                  {['Siswa', 'Guru', 'Kelas'].map(t => (
                    <div key={t}>
                      <RadioGroupItem value={t} id={t} className="peer sr-only" />
                      <Label htmlFor={t} className="flex flex-col items-center justify-center rounded-xl border-2 p-4 peer-data-[state=checked]:border-primary cursor-pointer transition-all">
                        <span className="font-bold text-xs">{t}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Peminjam (Siswa/Guru)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari Nama / ID Anggota..." 
                      className="pl-10" 
                      value={memberSearch} 
                      onChange={(e) => setMemberSearch(e.target.value)}
                      onKeyDown={handleMemberKeyDown}
                    />
                    {foundMembers.length > 0 && !selectedMember && (
                      <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {foundMembers.map(m => (
                          <div key={m.id} className="p-3 hover:bg-accent cursor-pointer text-sm border-b" onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}>
                            <div className="font-bold">{m.name}</div>
                            <div className="text-[10px] text-muted-foreground">{m.memberId}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMember && (
                    <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20 flex items-center justify-between animate-in zoom-in-95 duration-200">
                      <div>
                        <div className="text-sm font-bold text-primary">{selectedMember.name}</div>
                        <div className="text-[10px] font-mono">{selectedMember.memberId}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setSelectedMember(null)}>Hapus</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Buku</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari Judul / Scan Barcode Buku..." 
                      className="pl-10" 
                      value={bookSearch} 
                      onChange={(e) => setBookSearch(e.target.value)}
                      onKeyDown={handleBookKeyDown}
                    />
                    {foundBooks.length > 0 && !selectedBook && (
                      <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-40 overflow-y-auto">
                        {foundBooks.map(b => (
                          <div key={b.id} className="p-3 hover:bg-accent cursor-pointer text-sm border-b flex justify-between" onClick={() => { setSelectedBook(b); setBookSearch(b.title); }}>
                            <div className="font-bold truncate mr-2">{b.title}</div>
                            <Badge variant="outline" className="text-[8px]">{b.availableStock}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedBook && (
                    <div className="p-4 rounded-xl bg-secondary/10 border-2 border-secondary/20 flex items-center justify-between animate-in zoom-in-95 duration-200">
                      <div className="flex-1 mr-2">
                        <div className="text-sm font-bold text-secondary-foreground truncate">{selectedBook.title}</div>
                        <div className="text-[10px] font-mono">{selectedBook.code}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setSelectedBook(null)}>Hapus</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button className="w-full h-16 text-lg font-bold shadow-lg" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
              PROSES PEMINJAMAN
            </Button>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Pengembalian Cepat</CardTitle>
                <Button variant="secondary" size="lg" className="gap-2 h-12 px-6" onClick={() => startScanner("return")}><ScanBarcode className="h-5 w-5" /> Scan QR/Barcode Buku</Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Scan Barcode Buku atau Ketik Judul..." 
                    className="h-14 pl-12 text-lg" 
                    value={returnSearch} 
                    onChange={(e) => setReturnSearch(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const transaction = activeTrans?.find(t => {
                          const book = books?.find(b => b.id === t.bookId)
                          return book?.code === returnSearch || book?.isbn === returnSearch
                        })
                        if (transaction) handleProcessReturn(transaction)
                      }
                    }}
                  />
                </div>
                <div className="grid gap-4">
                  {foundActiveTrans.map(t => (
                    <div key={t.id} className="p-5 rounded-2xl border-2 flex items-center justify-between bg-card hover:border-primary/50 transition-colors">
                      <div className="flex-1 mr-4">
                        <p className="font-bold text-base line-clamp-1">{t.bookTitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">{t.memberId}</Badge>
                          <span className="text-xs text-muted-foreground">{t.memberName}</span>
                        </div>
                      </div>
                      <Button size="lg" variant="secondary" className="font-bold" onClick={() => handleProcessReturn(t)} disabled={isProcessing}>Kembalikan</Button>
                    </div>
                  ))}
                  {returnSearch && foundActiveTrans.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">Tidak ada transaksi aktif untuk buku ini.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isScannerOpen} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-3xl sm:h-[80vh] w-screen h-[100dvh] p-0 border-none bg-black overflow-hidden sm:rounded-2xl">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
             <div className="text-white">
                <DialogTitle className="text-lg font-bold">Multifungsi Scanner</DialogTitle>
                <p className="text-xs text-white/70">Mencari Anggota atau Buku secara otomatis</p>
             </div>
             <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={stopScanner}>
               <X className="h-6 w-6" />
             </Button>
          </div>
          
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <div id="qr-transaction-scanner" className="h-full w-full [&>video]:object-cover"></div>
            
            {hasCameraPermission === false && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center text-white bg-black/90">
                <Alert variant="destructive" className="bg-destructive border-none text-white max-w-sm">
                  <AlertTitle>Izin Kamera Diperlukan</AlertTitle>
                  <AlertDescription>Mohon "Allow" kamera di perangkat Anda agar bisa memindai QR/Barcode.</AlertDescription>
                  <Button variant="outline" className="mt-4 w-full" onClick={stopScanner}>Tutup</Button>
                </Alert>
              </div>
            )}
            
            {/* Overlay UI */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-[85vw] max-w-[450px] h-[35vh] max-h-[300px] border-2 border-primary/70 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                {/* Scanner corners */}
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-2xl"></div>
                
                {/* Laser animation line */}
                <div className="absolute left-6 right-6 h-1 bg-primary/40 shadow-[0_0_20px_rgba(46,110,206,1)] animate-pulse top-1/2"></div>
              </div>
              
              <div className="mt-10 px-8 py-3 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
                <p className="text-white text-sm font-bold animate-pulse flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" /> Mendeteksi Koleksi / Siswa...
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
