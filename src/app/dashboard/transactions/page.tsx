
"use client"

import { useState, useMemo } from "react"
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
  School
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function TransactionsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("borrow")
  const [borrowerType, setBorrowerType] = useState("Siswa") // Siswa, Guru, Kelas
  const [memberSearch, setMemberSearch] = useState("")
  const [bookSearch, setBookSearch] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [selectedBook, setSelectedBook] = useState<any>(null)

  // Collections
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])

  const { data: members = [] } = useCollection(membersRef)
  const { data: books = [] } = useCollection(booksRef)

  const foundMembers = useMemo(() => {
    if (!memberSearch) return []
    const term = memberSearch.toLowerCase()
    
    return members.filter(m => {
      const matchesSearch = m.name?.toLowerCase().includes(term) || m.memberId?.includes(term) || m.classOrSubject?.toLowerCase().includes(term)
      
      if (borrowerType === "Siswa") return matchesSearch && m.type === "Student"
      if (borrowerType === "Guru") return matchesSearch && m.type === "Teacher"
      if (borrowerType === "Kelas") return matchesSearch // Kelas bisa dicari berdasarkan nama siswa atau nama kelasnya
      
      return matchesSearch
    })
  }, [members, memberSearch, borrowerType])

  const foundBooks = useMemo(() => {
    if (!bookSearch) return []
    const term = bookSearch.toLowerCase()
    return books.filter(b => b.title?.toLowerCase().includes(term) || b.code?.toLowerCase().includes(term))
  }, [books, bookSearch])

  const handleProcessBorrow = () => {
    if (!db || !transRef || !selectedMember || !selectedBook) {
      toast({ title: "Data tidak lengkap", description: "Pilih peminjam dan buku terlebih dahulu.", variant: "destructive" })
      return
    }

    if (Number(selectedBook.availableStock) <= 0) {
      toast({ title: "Stok Habis", description: "Buku ini sedang tidak tersedia untuk dipinjam.", variant: "destructive" })
      return
    }

    setIsProcessing(true)

    const dueDate = new Date()
    // Guru & Kelas biasanya punya waktu pinjam lebih lama (misal 14 hari), Siswa 7 hari
    const days = borrowerType === "Siswa" ? 7 : 14
    dueDate.setDate(dueDate.getDate() + days)

    const transactionData = {
      memberId: selectedMember.memberId,
      memberName: selectedMember.name,
      memberType: selectedMember.type,
      borrowerCategory: borrowerType, // Siswa Pribadi, Guru, Kelas
      classOrSubject: selectedMember.classOrSubject,
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      type: 'borrow',
      status: 'active',
      borrowDate: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      createdAt: serverTimestamp()
    }

    addDoc(transRef, transactionData).then(() => {
      const bookDoc = doc(db, 'books', selectedBook.id)
      updateDoc(bookDoc, {
        availableStock: Number(selectedBook.availableStock) - 1
      })

      toast({ 
        title: "Peminjaman Berhasil", 
        description: `Buku ${selectedBook.title} dipinjam oleh ${selectedMember.name} (${borrowerType}).` 
      })
      
      setSelectedBook(null)
      setSelectedMember(null)
      setMemberSearch("")
      setBookSearch("")
    }).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: transRef.path,
        operation: 'create',
        requestResourceData: transactionData,
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsProcessing(false)
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Layanan Sirkulasi</h1>
          <p className="text-muted-foreground text-sm">Kelola peminjaman Siswa, Guru, dan Kolektif Kelas.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 bg-white">
          Sirkulasi Aktif
        </Badge>
      </div>

      <Tabs defaultValue="borrow" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-14 bg-card border shadow-sm p-1 rounded-xl">
          <TabsTrigger value="borrow" className="gap-2 text-base rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArrowRight className="h-5 w-5" />
            Peminjaman Baru
          </TabsTrigger>
          <TabsTrigger value="return" className="gap-2 text-base rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <RefreshCcw className="h-5 w-5" />
            Proses Pengembalian
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="text-lg">Tipe Peminjam</CardTitle>
                <CardDescription>Pilih kategori peminjaman untuk menyesuaikan aturan durasi.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <RadioGroup 
                  defaultValue="Siswa" 
                  value={borrowerType} 
                  onValueChange={(v) => {
                    setBorrowerType(v)
                    setSelectedMember(null)
                    setMemberSearch("")
                  }}
                  className="grid grid-cols-3 gap-4"
                >
                  <div>
                    <RadioGroupItem value="Siswa" id="siswa" className="peer sr-only" />
                    <Label
                      htmlFor="siswa"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <GraduationCap className="mb-3 h-6 w-6" />
                      <span className="font-bold">Siswa Pribadi</span>
                      <span className="text-[10px] text-muted-foreground mt-1">Batas: 7 Hari</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="Guru" id="guru" className="peer sr-only" />
                    <Label
                      htmlFor="guru"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <School className="mb-3 h-6 w-6" />
                      <span className="font-bold">Guru</span>
                      <span className="text-[10px] text-muted-foreground mt-1">Batas: 14 Hari</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="Kelas" id="kelas" className="peer sr-only" />
                    <Label
                      htmlFor="kelas"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                    >
                      <Users className="mb-3 h-6 w-6" />
                      <span className="font-bold">Pinjam Kelas</span>
                      <span className="text-[10px] text-muted-foreground mt-1">Batas: 14 Hari</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Pilih Peminjam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder={`Cari ${borrowerType}...`} 
                      className="pl-10" 
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                    {foundMembers.length > 0 && !selectedMember && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                        {foundMembers.map(m => (
                          <div 
                            key={m.id} 
                            className="p-3 hover:bg-accent cursor-pointer text-sm border-b last:border-0 flex justify-between items-center"
                            onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}
                          >
                            <div>
                              <div className="font-bold">{m.name}</div>
                              <div className="text-xs text-muted-foreground">{m.memberId} • {m.classOrSubject}</div>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedMember ? (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4 animate-in zoom-in duration-300">
                      <div className="bg-primary p-3 rounded-full shadow-sm shadow-primary/30">
                        {selectedMember.type === 'Teacher' ? <School className="h-6 w-6 text-white" /> : <GraduationCap className="h-6 w-6 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{selectedMember.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedMember.memberId} | {selectedMember.classOrSubject}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-destructive hover:bg-destructive/10" onClick={() => setSelectedMember(null)}>Batal</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-accent/20">
                      <Search className="h-10 w-10 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Silakan cari nama atau ID peminjam</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-secondary" />
                    Pilih Buku
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari Judul atau Kode Buku..." 
                      className="pl-10" 
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                    />
                    {foundBooks.length > 0 && !selectedBook && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                        {foundBooks.map(b => (
                          <div 
                            key={b.id} 
                            className="p-3 hover:bg-accent cursor-pointer text-sm border-b last:border-0 flex justify-between items-center"
                            onClick={() => { setSelectedBook(b); setBookSearch(b.title); }}
                          >
                            <div className="flex-1 mr-2">
                              <div className="font-bold truncate">{b.title}</div>
                              <div className="text-xs text-muted-foreground">Kode: {b.code} | Rak: {b.rackLocation}</div>
                            </div>
                            <Badge variant={Number(b.availableStock) > 0 ? "secondary" : "destructive"}>
                              Stok: {b.availableStock}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedBook ? (
                    <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-4 animate-in zoom-in duration-300">
                      <div className="bg-secondary p-3 rounded-full shadow-sm shadow-secondary/30">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{selectedBook.title}</p>
                        <p className="text-xs text-muted-foreground">Kode: {selectedBook.code} | Rak {selectedBook.rackLocation || '-'}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-destructive hover:bg-destructive/10" onClick={() => setSelectedBook(null)}>Batal</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-accent/20">
                      <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Cari buku melalui input di atas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-lg bg-primary text-primary-foreground overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <CheckCircle className="h-32 w-32" />
              </div>
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium uppercase tracking-wider">Durasi Peminjaman</p>
                    <p className="text-3xl font-black">
                      {borrowerType === "Siswa" ? "7 HARI" : "14 HARI"}
                    </p>
                    <p className="text-xs text-white/60">Batas: {new Date(new Date().setDate(new Date().getDate() + (borrowerType === "Siswa" ? 7 : 14))).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  variant="secondary"
                  className="px-12 h-16 text-xl font-bold shadow-xl hover:scale-105 transition-transform" 
                  disabled={!selectedMember || !selectedBook || isProcessing}
                  onClick={handleProcessBorrow}
                >
                  {isProcessing ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <CheckCircle className="h-6 w-6 mr-2" />}
                  PROSES PINJAM
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <RefreshCcw className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl">Pengembalian Buku</CardTitle>
                <CardDescription>Scan barcode buku atau cari berdasarkan nama siswa yang meminjam.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-12">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Cari transaksi aktif (Nama Siswa / Judul Buku)..." className="pl-10 h-12" />
                </div>
                <div className="py-12 border-2 border-dashed rounded-2xl bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">Gunakan pencarian untuk memuat daftar peminjaman aktif.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
