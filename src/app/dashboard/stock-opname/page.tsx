
"use client"

import { useState, useRef, useMemo, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ScanBarcode, 
  Search, 
  X, 
  Loader2, 
  ClipboardCheck,
  History,
  Minus,
  Plus,
  RefreshCcw,
  AlertTriangle,
  Printer,
  CameraOff,
  ChevronRight,
  BookOpen
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
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, addDoc, query, orderBy, limit, doc, serverTimestamp } from "firebase/firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function StockOpnamePage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  
  const [search, setSearch] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [physicalCount, setPhysicalCount] = useState(0)
  
  const scannerInstanceRef = useRef<any>(null)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const { data: books } = useCollection(booksRef)

  const auditLogsQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(100)) : null, 
  [db])
  const { data: audits } = useCollection(auditLogsQuery)

  const filteredAudits = useMemo(() => {
    if (!audits || !books) return [];
    return audits.filter(a => 
      a.actionType === 'STOCK_AUDIT' && 
      books.some(b => b.id === a.bookId)
    );
  }, [audits, books]);

  const bookSuggestions = useMemo(() => {
    if (!search || search.length < 1 || !books) return []
    const s = search.toLowerCase()
    return books.filter(b => 
      b.title?.toLowerCase().includes(s) || 
      b.code?.toLowerCase().includes(s) ||
      b.isbn?.toLowerCase().includes(s)
    ).slice(0, 5)
  }, [search, books])

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, []);

  const handleSelectBook = (b: any) => {
    setSelectedBook(b);
    setPhysicalCount(Number(b.totalStock || 0));
    setSearch(b.title);
    setShowSuggestions(false);
  }

  const handleLookup = (code: string) => {
    if (!books) return;
    const b = books.find(bk => bk.code?.toLowerCase() === code.toLowerCase() || bk.isbn === code)
    if (b) { 
      handleSelectBook(b);
    } else {
      // Jika tidak ketemu exact code, tapi ada di saran, ambil yang pertama
      if (bookSuggestions.length > 0) {
        handleSelectBook(bookSuggestions[0]);
      } else {
        toast({ title: "Buku Tidak Ditemukan", variant: "destructive" })
      }
    }
  }

  const startScanner = async () => {
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    setTimeout(async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
        const scannerElement = document.getElementById("audit-scanner")
        if (!scannerElement) return

        const sc = new Html5Qrcode("audit-scanner")
        scannerInstanceRef.current = sc
        try {
          await sc.start(
            { facingMode: "environment" }, 
            { 
              fps: 15, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128]
            }, 
            (txt) => { 
              handleLookup(txt); 
              stopScanner(); 
            }, 
            () => {}
          )
          setHasCameraPermission(true)
        } catch (e: any) { 
          console.error("Camera error:", e)
          setHasCameraPermission(false)
          if (!e?.toString()?.includes("already being used")) {
             toast({ title: "Akses Kamera Ditolak", description: "Mohon aktifkan izin kamera di pengaturan browser.", variant: "destructive" })
          }
        }
      } catch (e) {
        setHasCameraPermission(false)
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
        console.warn("Audit scanner cleanup warning:", e)
      } 
      scannerInstanceRef.current = null
    }
    setIsScannerOpen(false)
    forceUnlockUI()
  }

  const handleSaveAudit = () => {
    if (!db || !selectedBook || !user) return
    setIsProcessing(true)

    const expected = Number(selectedBook.totalStock || 0);
    const physical = Number(physicalCount);
    const diff = expected - physical;
    
    let statusText = 'LENGKAP';
    let auditStatus = 'LENGKAP';
    
    if (diff > 0) {
      statusText = `KURANG ${diff}`;
      auditStatus = 'KURANG';
    } else if (diff < 0) {
      statusText = `LEBIH ${Math.abs(diff)}`;
      auditStatus = 'LEBIH';
    }

    const logData = {
      userId: user.uid, 
      userName: user.displayNameCustom || "Admin", 
      actionType: 'STOCK_AUDIT', 
      bookId: selectedBook.id || "unknown",
      bookTitle: selectedBook.title || "Buku Tanpa Judul",
      bookCode: selectedBook.code || "-",
      expectedQty: Number(expected),
      physicalQty: Number(physical),
      diffQty: Number(diff),
      description: `Audit: ${selectedBook.title} - ${statusText}`, 
      auditStatus: auditStatus, 
      timestamp: new Date().toISOString()
    }

    addDoc(collection(db, 'activity_logs'), logData).then(() => {
      toast({ title: "Audit Tersimpan", description: `Buku "${selectedBook.title}" tercatat ${statusText}.` }); 
      setSelectedBook(null); 
      setSearch("")
    }).catch((e) => {
      toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan audit.", variant: "destructive" })
    }).finally(() => setIsProcessing(false))
  }

  const handleLengkapiBuku = (audit: any) => {
    if (!db || !user || !audit?.bookId) return;
    setIsProcessing(true)

    const masterBook = books?.find(b => b.id === audit.bookId);
    const bookTitle = audit.bookTitle || masterBook?.title || "Buku Terhapus";
    const bookCode = audit.bookCode && audit.bookCode !== "-" ? audit.bookCode : (masterBook?.code || "-");

    const logData = {
      userId: user.uid, 
      userName: user.displayNameCustom || "Admin", 
      actionType: 'STOCK_AUDIT', 
      bookId: audit.bookId,
      bookTitle: bookTitle,
      bookCode: bookCode,
      expectedQty: Number(audit.expectedQty || 0),
      physicalQty: Number(audit.expectedQty || 0), 
      diffQty: 0,
      description: `Audit: ${bookTitle} - LENGKAPI LAGI (Buku Ketemu)`, 
      auditStatus: 'LENGKAP', 
      timestamp: new Date().toISOString()
    }

    addDoc(collection(db, 'activity_logs'), logData).then(() => {
      toast({ title: "Status Diperbarui", description: "Buku kini ditandai sebagai LENGKAP." });
    }).finally(() => setIsProcessing(false))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" /> Cek Stok Buku (Opname)
          </h1>
          <p className="text-muted-foreground text-sm">Verifikasi fisik koleksi perpustakaan dengan data sistem.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {}} className="rounded-xl border-slate-300 dark:border-white/20">
          <Printer className="h-4 w-4 mr-2" /> Cetak Laporan
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-transparent p-6 rounded-[2.5rem] border border-slate-200 dark:border-white/20 space-y-8">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Ketik Judul atau Kode Buku..." 
                    className="pl-11 h-12 bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 rounded-full text-foreground font-medium" 
                    value={search} 
                    onChange={e => {
                      setSearch(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={e => e.key === 'Enter' && handleLookup(search)} 
                  />
                  
                  {showSuggestions && bookSuggestions.length > 0 && (
                    <div className="absolute z-[100] left-0 right-0 top-full mt-2 bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[300px] overflow-y-auto">
                      {bookSuggestions.map(b => (
                        <div 
                          key={b.id} 
                          className="p-4 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b last:border-0"
                          onClick={() => handleSelectBook(b)}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-sm leading-tight text-foreground">{b.title}</span>
                            <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">{b.code}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button variant="secondary" className="h-12 w-28 gap-2 rounded-2xl bg-[#33CCF7] hover:bg-[#2BB8E0] text-white shadow-md" onClick={startScanner}>
                  <ScanBarcode className="h-5 w-5" /> Scan
                </Button>
              </div>

              {selectedBook ? (
                <div className="bg-background dark:bg-muted/10 p-6 rounded-[2rem] border-2 border-primary/20 space-y-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold border-primary/30 text-primary">{selectedBook.code}</Badge>
                      <h3 className="text-xl font-black text-foreground leading-tight">{selectedBook.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium">Rek: {selectedBook.accountCode}</p>
                    </div>
                    <div className="text-right p-4 bg-muted/20 rounded-2xl border dark:border-white/10">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Sistem</p>
                      <p className="text-3xl font-black text-primary leading-none">{selectedBook.totalStock}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t dark:border-white/10">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-muted-foreground">Jumlah Fisik Ditemukan</div>
                    <div className="flex items-center justify-center gap-8">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-14 w-14 rounded-2xl border-none bg-muted/40"
                        onClick={() => setPhysicalCount(p => Math.max(0, p - 1))}
                        disabled={isProcessing}
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <div className="flex flex-col items-center">
                        <Input 
                          type="number"
                          className="w-24 text-center text-5xl font-black h-20 border-none bg-transparent"
                          value={physicalCount}
                          onChange={(e) => setPhysicalCount(Number(e.target.value))}
                          disabled={isProcessing}
                        />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Unit Fisik</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-14 w-14 rounded-2xl border-none bg-muted/40"
                        onClick={() => setPhysicalCount(p => p + 1)}
                        disabled={isProcessing}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-4">
                    <Button 
                      className="h-16 text-lg font-black shadow-lg shadow-primary/20 rounded-2xl tracking-tight" 
                      onClick={handleSaveAudit} 
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : (
                        physicalCount === Number(selectedBook.totalStock) ? "KONFIRMASI LENGKAP" : "SIMPAN HASIL AUDIT"
                      )}
                    </Button>
                    {physicalCount < Number(selectedBook.totalStock) && (
                      <div className="flex items-center gap-2 justify-center text-orange-600 font-bold text-xs bg-orange-500/10 py-3 rounded-xl border border-orange-500/20">
                        <AlertTriangle className="h-4 w-4" />
                        Tercatat KURANG {Number(selectedBook.totalStock) - physicalCount} unit
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] text-muted-foreground bg-muted/5 gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
                    <ClipboardCheck className="h-8 w-8 opacity-40" />
                  </div>
                  <p className="text-sm font-medium italic opacity-60">Silakan cari atau scan kode buku untuk mulai audit fisik.</p>
                </div>
              )}
          </div>
        </div>

        <Card className="h-full border-none shadow-sm overflow-hidden bg-transparent">
          <CardHeader className="bg-muted/30 border-b dark:border-white/10 px-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
              <History className="h-4 w-4" /> Riwayat Cek Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y dark:divide-white/5 text-xs max-h-[600px] overflow-y-auto">
              {!audits ? (
                <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground/30" /></div>
              ) : filteredAudits.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground italic text-[11px] opacity-60">Belum ada audit hari ini.</div>
              ) : filteredAudits.map(a => {
                const masterBook = books?.find(b => b.id === a.bookId);
                const displayCode = (a.bookCode && a.bookCode !== "-") ? a.bookCode : (masterBook?.code || "-");
                const displayTitle = a.bookTitle || masterBook?.title || "[Buku Telah Dihapus]";
                
                return (
                  <div key={a.id} className="p-5 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div className="space-y-1 flex-1 pr-3">
                      <p className="font-bold leading-tight truncate max-w-[160px]">{displayTitle}</p>
                      <p className="text-[10px] text-muted-foreground font-mono opacity-70">{displayCode}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                         <Badge 
                          variant={a.auditStatus === 'LENGKAP' ? 'secondary' : 'destructive'}
                          className="h-4 px-1.5 text-[8px] font-black border-none uppercase"
                         >
                          {a.auditStatus === 'KURANG' ? `KURANG ${Math.abs(a.diffQty) || ''}` : a.auditStatus}
                         </Badge>
                         {a.auditStatus === 'KURANG' && (
                           <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-blue-600 hover:bg-blue-500/10 rounded-full"
                            title="Lengkapi (Buku Ketemu)"
                            onClick={() => handleLengkapiBuku(a)}
                            disabled={isProcessing}
                           >
                             <RefreshCcw className="h-3 w-3" />
                           </Button>
                         )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Fisik</p>
                      <p className="font-black text-xl leading-none text-primary mt-0.5">{a.physicalQty ?? '-'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-xl p-0 h-[100dvh] sm:h-auto border-none bg-black overflow-hidden rounded-none sm:rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Pemindai Stok Opname</DialogTitle>
            <DialogDescription>Arahkan kamera ke kode QR buku untuk verifikasi fisik.</DialogDescription>
          </DialogHeader>
          <div id="audit-scanner" className="w-full h-full bg-black min-h-[300px] flex items-center justify-center relative">
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
