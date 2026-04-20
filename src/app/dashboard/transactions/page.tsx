
"use client"

import { useState, useMemo, useRef } from "react"
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
  RefreshCcw
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc } from 'firebase/firestore'

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

  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])

  const { data: members } = useCollection(membersRef)
  const { data: books } = useCollection(booksRef)

  const activeTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), where('status', '==', 'active')) : null, 
  [db])
  const { data: activeTrans } = useCollection(activeTransQuery)

  const startScanner = async () => {
    setIsScannerOpen(true); setHasCameraPermission(null)
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
      setTimeout(async () => {
        const scanner = new Html5Qrcode("smart-scanner")
        scannerInstanceRef.current = scanner
        try {
          await scanner.start(
            { facingMode: "environment" },
            { fps: 20, qrbox: (vw, vh) => { const m = Math.min(vw, vh); return { width: m * 0.8, height: m * 0.5 }; }, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128] },
            (text) => handleScanResult(text),
            () => {}
          )
          setHasCameraPermission(true)
        } catch (e) { setHasCameraPermission(false) }
      }, 500)
    } catch (e) { toast({ title: "Gagal", description: "Kamera tidak dapat diakses.", variant: "destructive" }) }
  }

  const handleScanResult = (text: string) => {
    const member = members?.find(m => m.memberId === text)
    const book = books?.find(b => b.code === text || b.isbn === text)

    if (activeTab === "borrow") {
      if (member) { setSelectedMember(member); toast({ title: "Anggota Terdeteksi", description: member.name }) }
      else if (book) { setSelectedBook(book); toast({ title: "Buku Terdeteksi", description: book.title }) }
      else toast({ title: "Tidak Dikenali", variant: "destructive" })
    } else {
      const trans = activeTrans?.find(t => { const b = books?.find(bk => bk.id === t.bookId); return b?.code === text || b?.isbn === text; })
      if (trans) { setReturnSearch(trans.bookTitle); toast({ title: "Ketemu!", description: trans.bookTitle }); handleProcessReturn(trans); stopScanner(); }
      else toast({ title: "Buku Tidak Sedang Dipinjam", variant: "destructive" })
    }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) { try { if (scannerInstanceRef.current.isScanning) await scannerInstanceRef.current.stop() } catch (e) {} }
    setIsScannerOpen(false)
  }

  const handleProcessBorrow = () => {
    if (!db || !selectedMember || !selectedBook) return
    setIsProcessing(true)
    const due = new Date(); due.setDate(due.getDate() + 7)
    addDoc(collection(db, 'transactions'), {
      memberId: selectedMember.memberId, memberName: selectedMember.name, bookId: selectedBook.id, bookTitle: selectedBook.title, type: 'borrow', status: 'active', borrowDate: new Date().toISOString(), dueDate: due.toISOString(), createdAt: serverTimestamp()
    }).then(() => {
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Number(selectedBook.availableStock) - 1 })
      toast({ title: "Selesai!", description: "Buku dipinjam." })
      setSelectedBook(null); setSelectedMember(null); setBookSearch(""); setMemberSearch("")
    }).finally(() => setIsProcessing(false))
  }

  const handleProcessReturn = async (trans: any) => {
    if (!db) return
    setIsProcessing(true)
    try {
      await updateDoc(doc(db, 'transactions', trans.id), { status: 'returned', returnDate: new Date().toISOString(), type: 'return' })
      const bDoc = await getDoc(doc(db, 'books', trans.bookId))
      if (bDoc.exists()) await updateDoc(doc(db, 'books', trans.bookId), { availableStock: (bDoc.data().availableStock || 0) + 1 })
      toast({ title: "Berhasil!", description: "Buku dikembalikan." })
      setReturnSearch("")
    } finally { setIsProcessing(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-primary">Sirkulasi Perpustakaan</h1>
      <Tabs defaultValue="borrow" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="borrow">Peminjaman</TabsTrigger><TabsTrigger value="return">Pengembalian</TabsTrigger></TabsList>
        <div className="mt-6">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="bg-primary/5"><CardContent className="pt-6 text-center"><Button size="lg" className="h-16 px-10 gap-2" onClick={startScanner}><ScanBarcode />Buka Pemindai Smart Scan</Button><p className="mt-2 text-xs text-muted-foreground">Scan QR Anggota & Buku Bergantian</p></CardContent></Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card><CardHeader><CardTitle className="text-sm">Peminjam</CardTitle></CardHeader><CardContent>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Scan atau Cari Anggota..." className="pl-10" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} /></div>
                {selectedMember && <div className="mt-2 p-3 bg-primary/10 rounded-lg flex justify-between items-center"><span className="text-sm font-bold">{selectedMember.name}</span><Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>X</Button></div>}
              </CardContent></Card>
              <Card><CardHeader><CardTitle className="text-sm">Buku</CardTitle></CardHeader><CardContent>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Scan atau Cari Buku..." className="pl-10" value={bookSearch} onChange={e => setBookSearch(e.target.value)} /></div>
                {selectedBook && <div className="mt-2 p-3 bg-secondary/10 rounded-lg flex justify-between items-center"><span className="text-sm font-bold">{selectedBook.title}</span><Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)}>X</Button></div>}
              </CardContent></Card>
            </div>
            <Button className="w-full h-14" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>{isProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle className="mr-2" />}PROSES</Button>
          </TabsContent>
          <TabsContent value="return" className="space-y-6">
            <Card><CardHeader><CardTitle className="text-sm">Pengembalian Cepat</CardTitle></CardHeader><CardContent className="space-y-4">
              <Button variant="secondary" className="w-full h-12" onClick={startScanner}><ScanBarcode className="mr-2" />Scan QR Buku</Button>
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Ketik Judul / Scan..." className="pl-10" value={returnSearch} onChange={e => setReturnSearch(e.target.value)} /></div>
            </CardContent></Card>
          </TabsContent>
        </div>
      </Tabs>
      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="sm:max-w-2xl p-0 h-[100dvh] sm:h-auto border-none bg-black overflow-hidden sm:rounded-2xl">
          <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/80">
            <DialogTitle>Multifungsi Scanner</DialogTitle><Button variant="ghost" size="icon" onClick={stopScanner}><X /></Button>
          </div>
          <div id="smart-scanner" className="w-full h-full bg-black"></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
