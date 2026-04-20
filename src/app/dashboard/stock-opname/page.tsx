
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
  History
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
import { collection, addDoc, query, orderBy, limit } from "firebase/firestore"

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

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const { data: books } = useCollection(booksRef)

  const auditLogsQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(10)) : null, 
  [db])
  const { data: audits } = useCollection(auditLogsQuery)

  const handleLookup = (code: string) => {
    const b = books?.find(bk => bk.code === code || bk.isbn === code)
    if (b) { setSelectedBook(b); setSearch(b.title); }
    else toast({ title: "Buku Tidak Ditemukan", variant: "destructive" })
  }

  const startScanner = async () => {
    setIsScannerOpen(true); setHasCameraPermission(null)
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        const sc = new Html5Qrcode("audit-scanner")
        scannerInstanceRef.current = sc
        try {
          await sc.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 150 } }, (txt) => { handleLookup(txt); stopScanner(); }, () => {})
          setHasCameraPermission(true)
        } catch (e) { setHasCameraPermission(false) }
      }, 500)
    } catch (e) {}
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) { try { if (scannerInstanceRef.current.isScanning) await scannerInstanceRef.current.stop() } catch (e) {} }
    setIsScannerOpen(false)
  }

  const handleSaveAudit = (status: 'LENGKAP' | 'KURANG') => {
    if (!db || !selectedBook || !user) return
    setIsProcessing(true)
    addDoc(collection(db, 'activity_logs'), {
      userId: user.uid, userName: user.displayNameCustom || "Admin", actionType: 'STOCK_AUDIT', description: `Audit: ${selectedBook.title} - ${status}`, auditStatus: status, timestamp: new Date().toISOString()
    }).then(() => {
      toast({ title: "Audit Tersimpan" }); setSelectedBook(null); setSearch("")
    }).finally(() => setIsProcessing(false))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div><h1 className="text-2xl font-bold text-primary flex items-center gap-2"><ClipboardCheck />Cek Stok Buku (Opname)</h1><p className="text-muted-foreground text-sm">Verifikasi fisik koleksi perpustakaan dengan data sistem.</p></div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-primary/5"><CardContent className="pt-6 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Scan atau Ketik Kode Buku..." className="pl-10 h-12" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup(search)} /></div>
              <Button size="lg" className="h-12" onClick={startScanner}><ScanBarcode className="mr-2" />Scan</Button>
            </div>
            {selectedBook ? (
              <div className="bg-white p-6 rounded-xl border-2 border-primary/20 space-y-4">
                <div className="flex justify-between"><div><Badge variant="outline">{selectedBook.code}</Badge><h3 className="text-lg font-bold">{selectedBook.title}</h3></div><div className="text-right"><p className="text-xs font-bold">STOK</p><p className="text-2xl font-black text-primary">{selectedBook.totalStock}</p></div></div>
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-20 flex-col border-green-200 bg-green-50" onClick={() => handleSaveAudit('LENGKAP')} disabled={isProcessing}><Check />FISIK LENGKAP</Button>
                  <Button variant="outline" className="h-20 flex-col border-red-200 bg-red-50" onClick={() => handleSaveAudit('KURANG')} disabled={isProcessing}><PackageX />STOK KURANG</Button>
                </div>
              </div>
            ) : <div className="h-40 flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground">Silakan scan kode buku untuk mulai mengecek stok.</div>}
          </CardContent></Card>
        </div>
        <Card className="h-full"><CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Riwayat Cek Hari Ini</CardTitle></CardHeader><CardContent className="p-0">
          <div className="divide-y text-xs">
            {audits?.filter(a => a.actionType === 'STOCK_AUDIT').map(a => (
              <div key={a.id} className="p-4 flex justify-between items-center"><div><p className="font-bold">{a.description.split(': ')[1]}</p><p className="text-[10px] text-muted-foreground">{new Date(a.timestamp).toLocaleTimeString()}</p></div><Badge variant={a.auditStatus === 'LENGKAP' ? 'secondary' : 'destructive'}>{a.auditStatus}</Badge></div>
            ))}
          </div>
        </CardContent></Card>
      </div>
      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-xl p-0 h-[100dvh] sm:h-auto border-none bg-black overflow-hidden"><div id="audit-scanner" className="w-full h-full bg-black"></div></DialogContent>
      </Dialog>
    </div>
  )
}
