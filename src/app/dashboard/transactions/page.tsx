
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
  X
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
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<"borrow" | "return">("borrow")
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)

  const [newMemberData, setNewMemberData] = useState({
    memberId: "",
    name: "",
    type: "Student",
    classOrSubject: "",
    phone: "",
    joinDate: new Date().toISOString().split('T')[0]
  })

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

  const nextAvailableId = useMemo(() => {
    if (membersLoading || !members) return ""
    const ids = members.map(m => parseInt(m.memberId)).filter(id => !isNaN(id)).sort((a, b) => a - b)
    let candidate = 1
    for (const id of ids) {
      if (id === candidate) candidate++; else if (id > candidate) break;
    }
    return candidate.toString().padStart(4, '0')
  }, [members, membersLoading])

  useEffect(() => {
    if (isMemberDialogOpen && nextAvailableId) {
      setNewMemberData(prev => ({ ...prev, memberId: nextAvailableId }))
    }
  }, [isMemberDialogOpen, nextAvailableId])

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
    return books.filter(b => (b.title?.toLowerCase() || "").includes(term) || (b.code?.toLowerCase() || "").includes(term))
  }, [books, bookSearch])

  const startScanner = async (target: "borrow" | "return") => {
    setScannerTarget(target)
    setIsScannerOpen(true)
    setHasCameraPermission(null)
    
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.stop() } catch (e) {}
    }

    const { Html5Qrcode } = await import("html5-qrcode")

    setTimeout(async () => {
      const container = document.getElementById("qr-transaction-scanner")
      if (!container) return

      try {
        const scanner = new Html5Qrcode("qr-transaction-scanner")
        scannerInstanceRef.current = scanner
        
        await scanner.start(
          { facingMode: "environment" },
          { 
            fps: 15, 
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleScanResult(decodedText, target)
            stopScanner()
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
      const book = books?.find(b => b.code === decodedText || b.isbn === decodedText)
      if (book) {
        setSelectedBook(book); setBookSearch(book.title);
        toast({ title: "Buku Terpilih", description: book.title })
      } else {
        toast({ title: "Gagal", description: "Buku tidak ditemukan.", variant: "destructive" })
      }
    } else {
      const transaction = activeTrans?.find(t => {
        const book = books?.find(b => b.id === t.bookId)
        return book?.code === decodedText || book?.isbn === decodedText
      })
      if (transaction) {
        setReturnSearch(transaction.bookTitle)
        toast({ title: "Peminjaman Ditemukan", description: `Buku: ${transaction.bookTitle}` })
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

  const handleAddNewMember = () => {
    if (!db || !membersRef) return
    if (!newMemberData.name || !newMemberData.memberId) return
    setIsAddingMember(true)
    addDoc(membersRef, { ...newMemberData, createdAt: serverTimestamp() }).then((docRef) => {
      setSelectedMember({ ...newMemberData, id: docRef.id }); setMemberSearch(newMemberData.name);
      setIsMemberDialogOpen(false)
    }).finally(() => setIsAddingMember(false))
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
            <Card className="border-none shadow-sm">
              <CardContent className="pt-6">
                <RadioGroup defaultValue="Siswa" value={borrowerType} onValueChange={(v) => { setBorrowerType(v); setSelectedMember(null); setMemberSearch(""); }} className="grid grid-cols-3 gap-4">
                  {['Siswa', 'Guru', 'Kelas'].map(t => (
                    <div key={t}>
                      <RadioGroupItem value={t} id={t} className="peer sr-only" />
                      <Label htmlFor={t} className="flex flex-col items-center justify-center rounded-xl border-2 p-4 peer-data-[state=checked]:border-primary cursor-pointer">
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
                      placeholder="Input ID (HP/Alat scanner)..." 
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
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                      <div className="text-sm font-bold">{selectedMember.name}</div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>Hapus</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Buku</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => startScanner("borrow")}>
                    <QrCode className="h-3.5 w-3.5" /> Scan
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Scan QR (HP/Alat scanner)..." 
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
                    <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-between">
                      <div className="text-sm font-bold truncate flex-1 mr-2">{selectedBook.title}</div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedBook(null)}>Hapus</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button className="w-full h-14 text-lg font-bold" disabled={!selectedMember || !selectedBook || isProcessing} onClick={handleProcessBorrow}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2" />}
              PROSES PINJAM
            </Button>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Pengembalian</CardTitle>
                <Button variant="secondary" className="gap-2" onClick={() => startScanner("return")}><ScanBarcode className="h-4 w-4" /> Scan</Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input 
                  placeholder="Scan QR (HP/Alat scanner)..." 
                  className="h-12" 
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
                <div className="grid gap-3">
                  {foundActiveTrans.map(t => (
                    <div key={t.id} className="p-4 rounded-xl border flex items-center justify-between bg-card">
                      <div className="flex-1 mr-4">
                        <p className="font-bold text-sm line-clamp-1">{t.bookTitle}</p>
                        <p className="text-[10px] text-muted-foreground">Peminjam: {t.memberName}</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => handleProcessReturn(t)} disabled={isProcessing}>Kembalikan</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isScannerOpen} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-black">
          <div className="p-4 bg-background flex justify-between items-center">
             <DialogTitle className="text-base">Scan QR Sirkulasi</DialogTitle>
             <Button variant="ghost" size="icon" onClick={stopScanner}><X className="h-5 w-5" /></Button>
          </div>
          <div className="relative aspect-square w-full bg-black">
            <div id="qr-transaction-scanner" className="h-full w-full"></div>
            {hasCameraPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white bg-black/80">
                <Alert variant="destructive" className="bg-destructive border-none text-white">
                  <AlertTitle>Izin Kamera Diperlukan</AlertTitle>
                  <AlertDescription>Mohon "Allow" kamera di perangkat Anda agar bisa memindai QR Buku.</AlertDescription>
                </Alert>
              </div>
            )}
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
               <div className="w-full h-full border-2 border-primary rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
