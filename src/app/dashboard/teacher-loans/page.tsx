
"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Loader2, 
  ScanBarcode,
  X,
  GraduationCap,
  History,
  ArrowRightLeft,
  ChevronRight,
  Clock,
  Printer
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useDoc
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDoc, orderBy } from 'firebase/firestore'
import { format } from "date-fns"

export default function TeacherLoansPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("active")
  const [search, setSearch] = useState("")
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerMode, setScannerMode] = useState<"member" | "book">("member")
  
  const scannerInstanceRef = useRef<any>(null)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false)
  const [showBookSuggestions, setShowBookSuggestions] = useState(false)

  // Fetch Settings for Academic Year and Header
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const membersRef = useMemoFirebase(() => 
    db ? query(collection(db, 'members'), where('type', '==', 'Teacher')) : null, [db])
  const booksRef = useMemoFirebase(() => 
    db ? query(collection(db, 'books'), orderBy('title', 'asc')) : null, [db])
  
  // Query sederhana untuk menghindari Permission Error akibat indexing
  const teacherTransQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, 'transactions'), 
      where('type', '==', 'teacher_handbook')
    )
  }, [db])

  const { data: teachers } = useCollection(membersRef)
  const { data: books } = useCollection(booksRef)
  const { data: allTransactions, isLoading: loadingTrans } = useCollection(teacherTransQuery)

  // Filter data di client side untuk kestabilan akses
  const transactions = useMemo(() => {
    if (!allTransactions) return []
    const status = activeTab === "active" ? "active" : "returned"
    return allTransactions
      .filter(t => t.status === status)
      .sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0
        const dateB = b.createdAt?.seconds || 0
        return dateB - dateA
      })
  }, [allTransactions, activeTab])

  const memberSuggestions = useMemo(() => {
    if (!memberSearch || memberSearch.length < 1 || !teachers) return []
    return teachers.filter(m => 
      m.name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
      m.memberId?.toLowerCase().startsWith(memberSearch.toLowerCase())
    ).slice(0, 5)
  }, [memberSearch, teachers])

  const bookSuggestions = useMemo(() => {
    if (!bookSearch || bookSearch.length < 1 || !books) return []
    return books.filter(b => 
      b.title?.toLowerCase().includes(bookSearch.toLowerCase()) || 
      b.code?.toLowerCase().startsWith(bookSearch.toLowerCase())
    ).slice(0, 5)
  }, [bookSearch, books])

  const filteredTrans = useMemo(() => {
    if (!transactions) return []
    if (!search) return transactions
    const s = search.toLowerCase()
    return transactions.filter(t => 
      t.memberName?.toLowerCase().includes(s) || 
      t.bookTitle?.toLowerCase().includes(s) ||
      t.memberId?.toLowerCase().includes(s)
    )
  }, [transactions, search])

  const startScanner = async (mode: "member" | "book") => {
    setScannerMode(mode)
    setIsScannerOpen(true)
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      setTimeout(async () => {
        const sc = new Html5Qrcode("teacher-scanner")
        scannerInstanceRef.current = sc
        await sc.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (text) => {
          if (mode === "member") {
            const m = teachers?.find(t => t.memberId?.toLowerCase() === text.toLowerCase())
            if (m) { setSelectedMember(m); stopScanner(); }
          } else {
            const b = books?.find(bk => bk.code?.toLowerCase() === text.toLowerCase() || bk.isbn === text)
            if (b) { setSelectedBook(b); stopScanner(); }
          }
        }, () => {})
      }, 500)
    } catch (e) { setIsScannerOpen(false) }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current?.isScanning) await scannerInstanceRef.current.stop()
    setIsScannerOpen(false)
  }

  const handleProcessLoan = () => {
    if (!db || !selectedMember || !selectedBook) return
    setIsProcessing(true)

    const newLoan = {
      memberId: selectedMember.memberId,
      memberName: selectedMember.name,
      memberType: 'Teacher',
      classOrSubject: selectedMember.classOrSubject || "-",
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      quantity: 1,
      type: 'teacher_handbook',
      status: 'active',
      borrowDate: new Date().toISOString(),
      createdAt: serverTimestamp()
    }

    addDoc(collection(db, 'transactions'), newLoan).then(() => {
      const avail = Number(selectedBook.availableStock ?? 1)
      updateDoc(doc(db, 'books', selectedBook.id), { availableStock: Math.max(0, avail - 1) })
      toast({ title: "Buku Pegangan Dicatat", description: `${selectedBook.title} telah diserahkan ke ${selectedMember.name}.` })
      setSelectedBook(null)
      setSelectedMember(null)
    }).finally(() => setIsProcessing(false))
  }

  const handleReturn = (trans: any) => {
    if (!db) return
    setIsProcessing(true)
    const transRef = doc(db, 'transactions', trans.id)
    updateDoc(transRef, { 
      status: 'returned', 
      returnDate: new Date().toISOString() 
    }).then(async () => {
      const bRef = doc(db, 'books', trans.bookId)
      const bDoc = await getDoc(bRef)
      if (bDoc.exists()) {
        const avail = Number(bDoc.data().availableStock || 0)
        updateDoc(bRef, { availableStock: avail + 1 })
      }
      toast({ title: "Buku Telah Kembali", description: "Buku pegangan telah dikembalikan ke perpustakaan." })
    }).finally(() => setIsProcessing(false))
  }

  const handlePrintBukti = () => {
    if (filteredTrans.length === 0) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const titleLabel = activeTab === "active" ? "DAFTAR PENYERAHAN BUKU PEGANGAN GURU (AKTIF)" : "RIWAYAT PENGEMBALIAN BUKU PEGANGAN GURU"
    
    const rowsHtml = filteredTrans.map((t, index) => {
      const bookDetail = books?.find(b => b.id === t.bookId);
      return `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-family: monospace;">${t.memberId}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${t.memberName}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.classOrSubject || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${bookDetail?.publisher || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${bookDetail?.publicationYear || '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.borrowDate ? format(new Date(t.borrowDate), 'dd/MM/yyyy') : '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${activeTab === "active" ? "PEGANG" : (t.returnDate ? format(new Date(t.returnDate), 'dd/MM/yyyy') : '-')}</td>
      </tr>
    `}).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title> </title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 11px; margin: 0; padding: 15mm; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .school-name { font-size: 16px; font-weight: 900; }
            .title { text-align: center; font-size: 12px; font-weight: 800; margin: 20px 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f0f0f0; border: 1px solid #ccc; padding: 8px; font-size: 9px; }
            .footer { margin-top: 40px; float: right; text-align: center; width: 250px; }
            .print-footer { position: fixed; bottom: 5mm; left: 15mm; right: 15mm; font-size: 8px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>${settings?.govtInstitution || 'PEMERINTAH KABUPATEN MANGGARAI'}</div>
            <div>${settings?.eduDept || 'DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA'}</div>
            <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
            <div style="font-size: 9px;">Alamat: ${settings?.schoolAddress || 'Mando, Compang Carep'}</div>
          </div>
          <div class="title">${titleLabel}<br/>Tahun Ajaran: ${settings?.academicYear || '2024/2025'}</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>ID Guru</th>
                <th>Nama Guru</th>
                <th>Mengajar / Kelas</th>
                <th>Judul Buku</th>
                <th>Penerbit</th>
                <th>Thn Terbit</th>
                <th>Tgl Penyerahan</th>
                <th>${activeTab === "active" ? "Status" : "Tgl Kembali"}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">
            ${settings?.reportCity || 'Mando'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Kepala Sekolah,<br/><br/><br/><br/>
            <strong>${settings?.principalName || 'Lodovikus Jangkar, S.Pd.Gr'}</strong><br/>
            NIP. ${settings?.principalNip || '198507272011011020'}
          </div>
          <div class="print-footer">Sistem Informasi Pustaka Nusantara - SMPN 5 LANGKE REMBONG | Laporan Buku Pegangan Guru</div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="h-7 w-7" /> Buku Pegangan Guru
          </h1>
          <p className="text-sm text-muted-foreground">Peminjaman jangka panjang untuk kebutuhan mengajar di kelas.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handlePrintBukti}>
             <Printer className="h-4 w-4 mr-2" /> Cetak Bukti
           </Button>
           <Badge variant="secondary" className="h-9 px-3 bg-blue-100 text-blue-700 border-none font-bold">
            TA {settings?.academicYear || "2024/2025"}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-sm bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Form Penyerahan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pilih Guru */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Cari Guru</Label>
              <div className="relative">
                <Input 
                  placeholder="Nama atau NIP Guru..." 
                  className="bg-white"
                  value={memberSearch}
                  onChange={e => { setMemberSearch(e.target.value); setShowMemberSuggestions(true); }}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => startScanner("member")}
                >
                  <ScanBarcode className="h-4 w-4" />
                </Button>
                {showMemberSuggestions && memberSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                    {memberSuggestions.map(m => (
                      <div key={m.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0" onClick={() => { setSelectedMember(m); setMemberSearch(""); setShowMemberSuggestions(false); }}>
                        <div className="font-bold">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground">{m.memberId}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedMember && (
                <div className="p-3 bg-white rounded-lg border flex justify-between items-center animate-in slide-in-from-left-2">
                  <div className="text-xs font-bold text-primary">{selectedMember.name}</div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedMember(null)}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            {/* Pilih Buku */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Cari Buku Pegangan</Label>
              <div className="relative">
                <Input 
                  placeholder="Judul atau Kode Buku..." 
                  className="bg-white"
                  value={bookSearch}
                  onChange={e => { setBookSearch(e.target.value); setShowBookSuggestions(true); }}
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => startScanner("book")}
                >
                  <ScanBarcode className="h-4 w-4" />
                </Button>
                {showBookSuggestions && bookSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl overflow-hidden">
                    {bookSuggestions.map(b => (
                      <div key={b.id} className="p-3 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0" onClick={() => { setSelectedBook(b); setBookSearch(""); setShowBookSuggestions(false); }}>
                        <div className="font-bold">{b.title}</div>
                        <div className="text-[10px] text-muted-foreground">{b.code} ({b.availableStock} Tersedia)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedBook && (
                <div className="p-3 bg-white rounded-lg border flex justify-between items-center animate-in slide-in-from-right-2">
                  <div className="text-xs font-bold text-secondary-foreground">{selectedBook.title}</div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedBook(null)}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            <Button 
              className="w-full h-12 font-black shadow-lg shadow-primary/20" 
              disabled={!selectedMember || !selectedBook || isProcessing}
              onClick={handleProcessLoan}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : "SERAHKAN BUKU"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <TabsList className="grid grid-cols-2 w-48 h-9">
                <TabsTrigger value="active" className="text-xs gap-1.5"><Clock className="h-3 w-3" /> Aktif</TabsTrigger>
                <TabsTrigger value="history" className="text-xs gap-1.5"><History className="h-3 w-3" /> Riwayat</TabsTrigger>
              </TabsList>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input placeholder="Cari data..." className="pl-7 h-8 text-xs bg-muted/50 border-none" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">No.</TableHead>
                      <TableHead>Guru / Peminjam</TableHead>
                      <TableHead>Mengajar / Kelas</TableHead>
                      <TableHead>Judul & Info Buku</TableHead>
                      <TableHead>Tgl. {activeTab === "active" ? "Serah" : "Kembali"}</TableHead>
                      {activeTab === "active" && <TableHead className="text-right">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingTrans ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : filteredTrans.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">Belum ada data {activeTab === "active" ? "aktif" : "riwayat"}.</TableCell></TableRow>
                    ) : filteredTrans.map((t, index) => {
                      const bookDetail = books?.find(b => b.id === t.bookId);
                      return (
                      <TableRow key={t.id}>
                        <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-bold text-xs">{t.memberName}</div>
                          <div className="text-[10px] text-muted-foreground">{t.memberId}</div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{t.classOrSubject || '-'}</TableCell>
                        <TableCell>
                          <div className="font-medium text-xs leading-tight">{t.bookTitle}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">
                            {bookDetail?.publisher || '-'} | {bookDetail?.publicationYear || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {activeTab === "active" 
                            ? (t.borrowDate ? format(new Date(t.borrowDate), 'dd/MM/yyyy') : '-')
                            : (t.returnDate ? format(new Date(t.returnDate), 'dd/MM/yyyy') : '-')
                          }
                        </TableCell>
                        {activeTab === "active" && (
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 text-[10px] font-bold gap-1"
                              onClick={() => handleReturn(t)}
                              disabled={isProcessing}
                            >
                              <History className="h-3 w-3" /> Kembali
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={o => !o && stopScanner()}>
        <DialogContent className="p-0 border-none bg-black max-w-xl h-[400px] overflow-hidden">
          <div id="teacher-scanner" className="w-full h-full bg-black"></div>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopScanner}><X /></Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
