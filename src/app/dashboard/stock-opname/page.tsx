
"use client"

import { useState, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  ScanBarcode, 
  Search, 
  X, 
  Loader2, 
  ClipboardCheck,
  Check,
  PackageX,
  History,
  Minus,
  Plus,
  RefreshCcw,
  AlertTriangle,
  FileDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { collection, addDoc, query, orderBy, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore"

export default function StockOpnamePage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  
  const [search, setSearch] = useState("")
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [physicalCount, setPhysicalCount] = useState(0)
  
  const scannerInstanceRef = useRef<any>(null)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const { data: books } = useCollection(booksRef)

  const auditLogsQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(50)) : null, 
  [db])
  const { data: audits } = useCollection(auditLogsQuery)

  const handleLookup = (code: string) => {
    if (!books) return;
    const b = books.find(bk => bk.code === code || bk.isbn === code)
    if (b) { 
      setSelectedBook(b); 
      setPhysicalCount(Number(b.totalStock || 0));
      setSearch(b.title); 
    }
    else toast({ title: "Buku Tidak Ditemukan", variant: "destructive" })
  }

  const startScanner = async () => {
    setIsScannerOpen(true)
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        const scannerElement = document.getElementById("audit-scanner")
        if (!scannerElement) return;
        const sc = new Html5Qrcode("audit-scanner")
        scannerInstanceRef.current = sc
        try {
          await sc.start(
            { facingMode: "environment" }, 
            { fps: 15, qrbox: { width: 250, height: 150 } }, 
            (txt) => { handleLookup(txt); stopScanner(); }, 
            () => {}
          )
        } catch (e) { 
          toast({ title: "Kamera Gagal", variant: "destructive" })
          setIsScannerOpen(false)
        }
      }, 500)
    } catch (e) {}
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) { 
      try { 
        if (scannerInstanceRef.current.isScanning) await scannerInstanceRef.current.stop() 
        await scannerInstanceRef.current.clear()
      } catch (e) {} 
    }
    setIsScannerOpen(false)
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
    if (!db || !user || !audit?.bookId) {
       toast({ title: "Gagal", description: "Data audit tidak lengkap untuk diproses.", variant: "destructive" });
       return;
    }
    setIsProcessing(true)

    const logData = {
      userId: user.uid, 
      userName: user.displayNameCustom || "Admin", 
      actionType: 'STOCK_AUDIT', 
      bookId: audit.bookId,
      bookTitle: audit.bookTitle || "Buku",
      expectedQty: Number(audit.expectedQty || 0),
      physicalQty: Number(audit.expectedQty || 0), 
      diffQty: 0,
      description: `Audit: ${audit.bookTitle || 'Buku'} - LENGKAPI LAGI (Buku Ketemu)`, 
      auditStatus: 'LENGKAP', 
      timestamp: new Date().toISOString()
    }

    addDoc(collection(db, 'activity_logs'), logData).then(() => {
      toast({ title: "Status Diperbarui", description: "Buku kini ditandai sebagai LENGKAP." });
    }).catch((e) => {
      toast({ title: "Gagal", description: "Gagal memperbarui status audit.", variant: "destructive" });
    }).finally(() => setIsProcessing(false))
  }

  const handleExportAudit = async () => {
    if (!audits) return
    setIsExporting(true)
    try {
      const { utils, writeFile } = await import("xlsx")
      const stockAudits = audits.filter(a => a.actionType === 'STOCK_AUDIT')
      
      if (stockAudits.length === 0) {
        toast({ title: "Data Kosong", description: "Tidak ada riwayat audit untuk diekspor." })
        setIsExporting(false)
        return
      }

      // Menyiapkan Kop Surat (Header)
      const header = [
        ["PEMERINTAH KABUPATEN MANGGARAI"],
        ["DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA"],
        ["SMP NEGERI 5 LANGKE REMBONG"],
        ["Alamat: Jl. Satar Tacik, Ruteng, Flores, NTT"],
        [""],
        ["LAPORAN HASIL AUDIT STOK PERPUSTAKAAN (STOCK OPNAME)"],
        [`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`],
        [""],
        ["No", "Waktu", "Judul Buku", "Stok Sistem", "Fisik", "Selisih", "Status", "Petugas"]
      ];

      // Menyiapkan Data Laporan
      const dataRows = stockAudits.map((a, index) => [
        index + 1,
        new Date(a.timestamp).toLocaleString('id-ID'),
        a.bookTitle,
        a.expectedQty,
        a.physicalQty,
        a.diffQty,
        a.auditStatus,
        a.userName
      ]);

      // Menggabungkan Header dan Data
      const finalAOA = [...header, ...dataRows];
      
      const worksheet = utils.aoa_to_sheet(finalAOA)
      const workbook = utils.book_new()
      utils.book_append_sheet(workbook, worksheet, "Laporan Opname")
      
      const dateStr = new Date().toISOString().split('T')[0]
      writeFile(workbook, `Laporan_Audit_Stok_SMPN5_${dateStr}.xlsx`)
      
      toast({ title: "Ekspor Berhasil", description: "Laporan audit dengan Kop Surat telah diunduh." })
    } catch (error) {
      toast({ title: "Gagal Ekspor", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
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
        <Button variant="outline" size="sm" onClick={handleExportAudit} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
          Export Excel (Kop Surat)
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden">
            <CardContent className="pt-6 space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Scan atau Ketik Kode Buku..." 
                    className="pl-10 h-12 bg-white" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleLookup(search)} 
                  />
                </div>
                <Button size="lg" className="h-12 shadow-md" onClick={startScanner}>
                  <ScanBarcode className="mr-2 h-5 w-5" /> Scan
                </Button>
              </div>

              {selectedBook ? (
                <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 space-y-6 animate-in zoom-in-95">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold">{selectedBook.code}</Badge>
                      <h3 className="text-xl font-black text-primary leading-tight">{selectedBook.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium">Rek: {selectedBook.accountCode}</p>
                    </div>
                    <div className="text-right p-3 bg-slate-50 rounded-xl border">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Stok Sistem</p>
                      <p className="text-3xl font-black text-primary leading-none">{selectedBook.totalStock}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Jumlah Fisik Ditemukan</div>
                    <div className="flex items-center justify-center gap-6">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-12 w-12 rounded-full border-2"
                        onClick={() => setPhysicalCount(p => Math.max(0, p - 1))}
                        disabled={isProcessing}
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <div className="flex flex-col items-center">
                        <Input 
                          type="number"
                          className="w-24 text-center text-4xl font-black h-16 border-none bg-transparent"
                          value={physicalCount}
                          onChange={(e) => setPhysicalCount(Number(e.target.value))}
                          disabled={isProcessing}
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Unit Fisik</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-12 w-12 rounded-full border-2"
                        onClick={() => setPhysicalCount(p => p + 1)}
                        disabled={isProcessing}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-2">
                    <Button 
                      className="h-14 text-lg font-black shadow-lg shadow-primary/20" 
                      onClick={handleSaveAudit} 
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : (
                        physicalCount === Number(selectedBook.totalStock) ? "KONFIRMASI LENGKAP" : "SIMPAN HASIL AUDIT"
                      )}
                    </Button>
                    {physicalCount < Number(selectedBook.totalStock) && (
                      <div className="flex items-center gap-2 justify-center text-orange-600 font-bold text-xs bg-orange-50 py-2 rounded-lg border border-orange-100">
                        <AlertTriangle className="h-4 w-4" />
                        Tercatat KURANG {Number(selectedBook.totalStock) - physicalCount} unit
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-muted-foreground bg-white/50 gap-3">
                  <ClipboardCheck className="h-10 w-10 opacity-20" />
                  <p className="text-sm font-medium">Silakan scan kode buku untuk mulai audit fisik.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-full border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Riwayat Cek Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y text-xs max-h-[500px] overflow-y-auto">
              {!audits || audits.filter(a => a.actionType === 'STOCK_AUDIT').length === 0 ? (
                <div className="p-10 text-center text-muted-foreground italic">Belum ada audit hari ini.</div>
              ) : audits.filter(a => a.actionType === 'STOCK_AUDIT').map(a => (
                <div key={a.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                  <div className="space-y-1 flex-1 pr-2">
                    <p className="font-bold leading-tight truncate max-w-[150px]">{a.bookTitle}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString('id-ID')}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                       <Badge 
                        variant={a.auditStatus === 'LENGKAP' ? 'secondary' : 'destructive'}
                        className="h-4 px-1.5 text-[8px] font-bold border-none"
                       >
                        {a.auditStatus === 'KURANG' ? `KURANG ${a.diffQty || ''}` : a.auditStatus}
                       </Badge>
                       {a.auditStatus === 'KURANG' && (
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-blue-600 hover:bg-blue-50"
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
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Fisik</p>
                    <p className="font-black text-lg leading-none">{a.physicalQty ?? '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-xl p-0 h-[100dvh] sm:h-auto border-none bg-black overflow-hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Pemindai Stok Opname</DialogTitle>
          </DialogHeader>
          <div id="audit-scanner" className="w-full h-full bg-black min-h-[300px]"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
