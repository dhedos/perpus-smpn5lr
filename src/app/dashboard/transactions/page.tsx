
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
  Coins
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

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore'
import { differenceInDays, parseISO } from "date-fns"

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

  // Fine & Return Modal State
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
  const [pendingReturnTrans, setPendingReturnTrans] = useState<any>(null)
  const [calculatedFine, setCalculatedFine] = useState(0)
  const [lateDays, setLateDays] = useState(0)

  // Settings for Loan Period and Fine Amount
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

  const startScanner = async () => {
    setIsScannerOpen(true); 
    setHasCameraPermission(null)
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        try {
          const scanner = new Html5Qrcode("smart-scanner")
          scannerInstanceRef.current = scanner
          await scanner.start(
            { facingMode: "environment" },
            { 
              fps: 20, 
              qrbox: (vw, vh) => { 
                const m = Math.min(vw, vh); 
                return { width: m * 0.8, height: m * 0.5 }; 
              }, 
              formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE, 
                Html5QrcodeSupportedFormats.EAN_13, 
                Html5QrcodeSupportedFormats.CODE_128
              ] 
            },
            (text) => handleScanResult(text),
            () => {}
          )
          setHasCameraPermission(true)
        } catch (err) { 
          console.error("Scanner start error:", err)
          setHasCameraPermission(false) 
        }
      }, 500)
    } catch (e) { 
      toast({ title: "Gagal", description: "Kamera tidak dapat diakses.", variant: "destructive" }) 
      setIsScannerOpen(false)
    }
  }

  const handleScanResult = (text: string) => {
    if (!text) return
    
    const member = members?.find(m => m.memberId?.toLowerCase() === text.toLowerCase())
    const book = books?.find(b => b.code?.toLowerCase() === text.toLowerCase() || b.isbn === text)

    if (activeTab === "borrow") {
      if (member) { 
        setSelectedMember(member); 
        toast({ title: "Anggota Terdeteksi", description: member.name }) 
      }
      else if (book) { 
        setSelectedBook(book); 
        toast({ title: "Buku Terdeteksi", description: book.title }) 
      }
      else {
        toast({ title: "Tidak Dikenali", description: `Data '${text}' tidak terdaftar di sistem.`, variant: "destructive" })
      }
    } else {
      // Logic for return
      const trans = activeTrans?.find(t => { 
        const b = books?.find(bk => bk.id === t.bookId); 
        return b?.code?.toLowerCase() === text.toLowerCase() || b?.isbn === text; 
      })
      if (trans) { 
        setReturnSearch(trans.bookTitle); 
        toast({ title: "Buku Ditemukan", description: trans.bookTitle }); 
        prepareReturn(trans); 
        stopScanner(); 
      } else {
        toast({ title: "Buku Tidak Sedang Dipinjam", description: "Pastikan kode benar dan buku memiliki status 'Dipinjam'.", variant: "destructive" })
      }
    }
  }

  const handleManualMemberSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && memberSearch) {
      const member = members?.find(m => 
        m.memberId?.toLowerCase() === memberSearch.toLowerCase() || 
        m.name?.toLowerCase().includes(memberSearch.toLowerCase())
      )
      if (member) {
        setSelectedMember(member)
        setMemberSearch("")
        toast({ title: "Anggota Terpilih", description: member.name })
      } else {
        toast({ title: "Anggota Tidak Ditemukan", variant: "destructive" })
      }
    }
  }

  const handleManualBookSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && bookSearch) {
      const book = books?.find(b => 
        b.code?.toLowerCase() === bookSearch.toLowerCase() || 
        b.isbn === bookSearch ||
        b.title?.toLowerCase().includes(bookSearch.toLowerCase())
      )
      if (book) {
        setSelectedBook(book)
        setBookSearch("")
        toast({ title: "Buku Terpilih", description: book.title })
      } else {
        toast({ title: "Buku Tidak Ditemukan", variant: "destructive" })
      }
    }
  }

  const handleManualReturnSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && returnSearch) {
      const trans = activeTrans?.find(t => 
        t.bookTitle?.toLowerCase().includes(returnSearch.toLowerCase()) || 
        t.memberId?.toLowerCase() === returnSearch.toLowerCase()
      )
      if (trans) {
        prepareReturn(trans)
      } else {
        toast({ title: "Transaksi Tidak Ditemukan", description: "Buku ini mungkin sudah dikembalikan.", variant: "destructive" })
      }
    }
  }

  const prepareReturn = (trans: any) => {
    const today = new Date();
    const dueDate = parseISO(trans.dueDate);
    const diffDays = differenceInDays(today, dueDate);
    
    if (diffDays > 0) {
      const finePerDay = settings?.fineAmount || 500;
      setLateDays(diffDays);
      setCalculatedFine(diffDays * finePerDay);
    } else {
      setLateDays(0);
      setCalculatedFine(0);
    }
    
    setPendingReturnTrans(trans);
    setIsReturnConfirmOpen(true);
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) { 
      try { 
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
      } catch (e) {
        console.error("Scanner stop error:", e)
      } 
    }
    setIsScannerOpen(false)
  }

  const handleProcessBorrow = () => {
    if (!db || !selectedMember || !selectedBook) return
    if (selectedBook.availableStock <= 0) {
      toast({ title: "Stok Habis", description: "Buku tidak tersedia untuk dipinjam.", variant: "destructive" })
      return
    }

    setIsProcessing(true)
    const loanDays = settings?.loanPeriod || 7;
    const due = new Date(); 
    due.setDate(due.getDate() + loanDays)
    
    addDoc(collection(db, 'transactions'), {
      memberId: selectedMember.memberId, 
      memberName: selectedMember.name, 
      bookId: selectedBook.id, 
      bookTitle: selectedBook.title, 
      type: 'borrow', 
      status: 'active', 
      borrowDate: new Date().toISOString(), 
      dueDate: due.toISOString(), 
      createdAt: serverTimestamp()
    }).then(() => {
      updateDoc(doc(db, 'books', selectedBook.id), { 
        availableStock: Number(selectedBook.availableStock) - 1 
      })
      toast({ title: "Berhasil!", description: `${selectedBook.title} telah dipinjam oleh ${selectedMember.name}.` })
      setSelectedBook(null); 
      setSelectedMember(null); 
      setBookSearch(""); 
      setMemberSearch("")
    }).catch((err) => {
      console.error("Borrow error:", err)
      toast({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan data.", variant: "destructive" })
    }).finally(() => setIsProcessing(false))
  }

  const handleConfirmReturn = async () => {
    if (!db || !pendingReturnTrans) return
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'transactions', pendingReturnTrans.id), { 
        status: 'returned', 
        returnDate: new Date().toISOString(), 
        type: 'return',
        fineAmount: calculatedFine,
        isFinePaid: calculatedFine > 0 // Anggap lunas saat dikembalikan
      })
      
      const bDoc = await getDoc(doc(db, 'books', pendingReturnTrans.bookId))
      if (bDoc.exists()) {
        await updateDoc(doc(db, 'books', pendingReturnTrans.bookId), { 
          availableStock: (bDoc.data().availableStock || 0) + 1 
        })
      }
      
      toast({ 
        title: "Berhasil!", 
        description: calculatedFine > 0 
          ? `Buku kembali. Denda Rp${calculatedFine.toLocaleString()} telah dicatat.` 
          : "Buku telah dikembalikan tepat waktu." 
      })
      
      setIsReturnConfirmOpen(false);
      setReturnSearch("");
      setPendingReturnTrans(null);
    } catch (err) {
      console.error("Return error:", err)
      toast({ title: "Gagal", description: "Gagal memproses pengembalian.", variant: "destructive" })
    } finally { 
      setIsProcessing(false) 
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Pinjam & Kembali Buku</h1>
          <p className="text-sm text-muted-foreground">Proses sirkulasi buku dengan Scan atau Input Manual.</p>
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
                <Button size="lg" className="h-16 px-10 gap-2 shadow-lg hover:shadow-primary/20 transition-all" onClick={startScanner}>
                  <ScanBarcode className="h-6 w-6" />
                  Buka Pemindai Smart Scan
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  <span>Scan Kartu Anggota lalu Barcode Buku Bergantian</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Data Peminjam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Input ID Anggota lalu Enter..." 
                      className="pl-10 h-11" 
                      value={memberSearch} 
                      onChange={e => setMemberSearch(e.target.value)}
                      onKeyDown={handleManualMemberSearch}
                    />
                  </div>
                  {selectedMember ? (
                    <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center animate-in fade-in zoom-in duration-300">
                      <div>
                        <p className="text-xs font-bold text-primary uppercase">Anggota Terpilih</p>
                        <p className="font-bold text-lg">{selectedMember.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedMember.memberId}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setSelectedMember(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground text-xs text-center px-4">
                      Belum ada anggota terpilih.<br/>Scan kartu atau ketik ID lalu tekan Enter.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-secondary" />
                    Data Buku
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Input Kode Buku lalu Enter..." 
                      className="pl-10 h-11" 
                      value={bookSearch} 
                      onChange={e => setBookSearch(e.target.value)}
                      onKeyDown={handleManualBookSearch}
                    />
                  </div>
                  {selectedBook ? (
                    <div className="p-4 bg-secondary/10 rounded-xl border border-secondary/20 flex justify-between items-center animate-in fade-in zoom-in duration-300">
                      <div>
                        <p className="text-xs font-bold text-secondary uppercase">Buku Terpilih</p>
                        <p className="font-bold text-lg leading-tight">{selectedBook.title}</p>
                        <p className="text-xs text-muted-foreground">{selectedBook.code}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setSelectedBook(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground text-xs text-center px-4">
                      Belum ada buku terpilih.<br/>Scan buku atau ketik Kode lalu tekan Enter.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button 
              className="w-full h-16 text-lg font-bold shadow-xl" 
              disabled={!selectedMember || !selectedBook || isProcessing} 
              onClick={handleProcessBorrow}
            >
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-6 w-6" />}
              KONFIRMASI PEMINJAMAN
            </Button>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm bg-accent/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCcw className="h-5 w-5 text-primary" />
                  Pengembalian Cepat
                </CardTitle>
                <CardDescription>Scan buku atau input manual untuk mengembalikan buku ke stok.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button variant="secondary" className="w-full h-14 text-base font-bold gap-3" onClick={startScanner}>
                  <ScanBarcode className="h-5 w-5" />
                  Scan QR Buku untuk Kembali
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input 
                    placeholder="Input Kode Buku atau Nama Peminjam lalu Enter..." 
                    className="pl-10 h-14 text-base" 
                    value={returnSearch} 
                    onChange={e => setReturnSearch(e.target.value)} 
                    onKeyDown={handleManualReturnSearch}
                  />
                </div>

                <div className="bg-background/50 p-6 rounded-xl border-2 border-dashed border-muted flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <AlertCircle className="h-8 w-8 opacity-20" />
                  <p className="text-sm font-medium">Menunggu input pengembalian...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Confirmation & Fine Dialog */}
      <Dialog open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5 text-primary" />
              Konfirmasi Pengembalian
            </DialogTitle>
            <DialogDescription>
              Pastikan data buku dan peminjam sudah sesuai.
            </DialogDescription>
          </DialogHeader>
          
          {pendingReturnTrans && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Peminjam:</span>
                  <span className="font-bold">{pendingReturnTrans.memberName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buku:</span>
                  <span className="font-bold">{pendingReturnTrans.bookTitle}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-2">
                  <span className="text-muted-foreground">Jatuh Tempo:</span>
                  <span className="font-medium text-orange-600">
                    {new Date(pendingReturnTrans.dueDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>

              {calculatedFine > 0 ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-in shake-1 duration-500">
                  <div className="flex items-center gap-3 text-red-700">
                    <div className="bg-red-100 p-2 rounded-full">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Terlambat {lateDays} Hari</p>
                      <p className="text-lg font-black">DENDA: Rp{calculatedFine.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-red-600 mt-2 italic">*Harap tagih denda ke siswa sebelum menekan tombol simpan.</p>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
                  <div className="bg-green-100 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <p className="font-bold">Buku Kembali Tepat Waktu</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReturnConfirmOpen(false)} disabled={isProcessing}>Batal</Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="bg-primary px-8">
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Simpan & Selesai"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-2xl p-0 h-[100dvh] sm:h-auto border-none bg-black overflow-hidden sm:rounded-2xl">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/80">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-2 rounded-lg">
                <ScanBarcode className="h-5 w-5" />
              </div>
              <DialogTitle className="text-white">Multifungsi Smart Scanner</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={stopScanner} className="text-white hover:bg-white/20">
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="relative w-full h-full aspect-square sm:aspect-video bg-black flex items-center justify-center">
            <div id="smart-scanner" className="w-full h-full"></div>
            
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-black/90">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-bold">Kamera Tidak Diakses</h3>
                <p className="text-sm text-muted-foreground mt-2">Harap izinkan akses kamera pada pengaturan browser Anda untuk menggunakan fitur ini.</p>
                <Button className="mt-6" onClick={() => window.location.reload()}>Muat Ulang Halaman</Button>
              </div>
            )}

            {hasCameraPermission === true && (
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                <div className="w-full h-full border-2 border-primary/50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-primary animate-[scan-line_2s_ease-in-out_infinite]"></div>
                  <style jsx>{`
                    @keyframes scan-line {
                      0% { top: 0; }
                      50% { top: 100%; }
                      100% { top: 0; }
                    }
                  `}</style>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-4 text-center">
            <p className="text-xs text-muted-foreground">Posisikan QR Code atau Barcode di tengah kotak untuk pemindaian otomatis.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
