
"use client"

import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ScanBarcode, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  History,
  ClipboardCheck,
  Check,
  PackageX
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"

export default function StockOpnamePage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  
  const [search, setSearch] = useState("")
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const scannerInstanceRef = useRef<any>(null)

  // Fetch all books for lookup
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const { data: books } = useCollection(booksRef)

  // Fetch recent opname activities from activity_logs
  const auditLogsQuery = useMemoFirebase(() => 
    db ? query(
      collection(db, 'activity_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(10)
    ) : null, 
  [db])
  const { data: recentAudits } = useCollection(auditLogsQuery)

  const filteredAudits = useMemo(() => {
    return recentAudits?.filter(log => log.actionType === 'STOCK_AUDIT') || []
  }, [recentAudits])

  const startScanner = async () => {
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.stop() } catch (e) {}
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        const scanner = new Html5Qrcode("stock-scanner-container")
        scannerInstanceRef.current = scanner
        
        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 150 }
          },
          (decodedText) => {
            handleLookupBook(decodedText)
            stopScanner()
          },
          () => {}
        )
        setHasCameraPermission(true)
      }, 500)
    } catch (err) {
      setHasCameraPermission(false)
    }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop()
        }
      } catch (e) {}
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
  }

  const handleLookupBook = (code: string) => {
    const book = books?.find(b => b.code === code || b.isbn === code)
    if (book) {
      setSelectedBook(book)
      setSearch(book.title)
      toast({ title: "Buku Ditemukan", description: book.title })
    } else {
      toast({ 
        title: "Tidak Ditemukan", 
        description: `Buku dengan kode ${code} tidak terdaftar.`, 
        variant: "destructive" 
      })
    }
  }

  const handleSaveAudit = (status: 'LENGKAP' | 'KURANG') => {
    if (!db || !selectedBook || !user) return
    setIsProcessing(true)

    const auditData = {
      userId: user.uid,
      userName: user.displayNameCustom || "Admin",
      actionType: 'STOCK_AUDIT',
      description: `Audit Stok: ${selectedBook.title} (${selectedBook.code}) - Status: ${status}`,
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      auditStatus: status,
      systemStock: selectedBook.totalStock,
      timestamp: new Date().toISOString()
    }

    addDoc(collection(db, 'activity_logs'), auditData)
      .then(() => {
        toast({ 
          title: "Audit Tersimpan", 
          description: `Status ${status} untuk buku "${selectedBook.title}" telah dicatat.` 
        })
        setSelectedBook(null)
        setSearch("")
      })
      .finally(() => setIsProcessing(false))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight text-primary flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Stok Opname
        </h1>
        <p className="text-muted-foreground text-sm">Audit fisik koleksi buku secara berkala.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Input Audit</CardTitle>
              <CardDescription>Scan barcode buku atau masukkan kode secara manual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Masukkan Kode Buku / ISBN..." 
                    className="pl-10 h-12" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookupBook(search)}
                  />
                </div>
                <Button size="lg" className="h-12 gap-2" onClick={startScanner}>
                  <ScanBarcode className="h-5 w-5" />
                  Scan
                </Button>
              </div>

              {selectedBook ? (
                <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 space-y-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge variant="outline" className="mb-2">{selectedBook.code}</Badge>
                      <h3 className="text-xl font-bold">{selectedBook.title}</h3>
                      <p className="text-sm text-muted-foreground">{selectedBook.author} • {selectedBook.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Stok Sistem</p>
                      <p className="text-3xl font-black text-primary">{selectedBook.totalStock}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-20 flex-col gap-1 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800"
                      onClick={() => handleSaveAudit('LENGKAP')}
                      disabled={isProcessing}
                    >
                      <Check className="h-6 w-6" />
                      <span className="font-bold">LENGKAP</span>
                      <span className="text-[10px] opacity-70">Fisik Sesuai Sistem</span>
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="h-20 flex-col gap-1 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                      onClick={() => handleSaveAudit('KURANG')}
                      disabled={isProcessing}
                    >
                      <PackageX className="h-6 w-6" />
                      <span className="font-bold">KURANG</span>
                      <span className="text-[10px] opacity-70">Ada Buku Hilang</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-muted-foreground">
                  <ClipboardCheck className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Belum ada buku yang dipilih.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Riwayat Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-sm">
                {filteredAudits.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-xs">Belum ada audit dilakukan.</div>
                ) : filteredAudits.map((audit) => (
                  <div key={audit.id} className="p-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold truncate max-w-[120px]">{audit.bookTitle}</span>
                      <Badge variant={audit.auditStatus === 'LENGKAP' ? 'secondary' : 'destructive'} className="text-[9px] px-1.5 h-4">
                        {audit.auditStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Oleh: {audit.userName}</span>
                      <span>{new Date(audit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-xl p-0 border-none bg-black overflow-hidden sm:rounded-2xl">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
             <div className="text-white">
                <DialogTitle className="text-lg font-bold">Scan Audit Stok</DialogTitle>
                <p className="text-xs text-white/70">Arahkan ke barcode atau QR buku</p>
             </div>
             <Button variant="ghost" size="icon" className="text-white" onClick={stopScanner}>
               <X className="h-6 w-6" />
             </Button>
          </div>
          
          <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center">
            <div id="stock-scanner-container" className="w-full h-full [&>video]:object-cover"></div>
            
            {hasCameraPermission === false && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 text-center text-white bg-black/90">
                <div className="max-w-xs space-y-4">
                  <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
                  <p className="font-bold">Izin Kamera Ditolak</p>
                  <p className="text-sm opacity-70">Aktifkan izin kamera di pengaturan browser untuk menggunakan fitur scan.</p>
                  <Button variant="outline" className="w-full" onClick={stopScanner}>Tutup</Button>
                </div>
              </div>
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-primary/50 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
