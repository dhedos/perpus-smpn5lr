
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanBarcode, User, BookOpen, Calendar, ArrowRight, RefreshCcw, Search, Loader2, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

// Firebase
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  errorEmitter 
} from '@/firebase'
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function TransactionsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("borrow")
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
    return members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.memberId.includes(memberSearch))
  }, [members, memberSearch])

  const foundBooks = useMemo(() => {
    if (!bookSearch) return []
    return books.filter(b => b.title.toLowerCase().includes(bookSearch.toLowerCase()) || b.code.includes(bookSearch))
  }, [books, bookSearch])

  const handleProcessBorrow = () => {
    if (!db || !transRef || !selectedMember || !selectedBook) {
      toast({ title: "Data tidak lengkap", description: "Pilih anggota dan buku terlebih dahulu.", variant: "destructive" })
      return
    }

    if (selectedBook.availableStock <= 0) {
      toast({ title: "Stok Habis", description: "Buku ini sedang tidak tersedia untuk dipinjam.", variant: "destructive" })
      return
    }

    setIsProcessing(true)

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7)

    const transactionData = {
      memberId: selectedMember.memberId,
      memberName: selectedMember.name,
      bookId: selectedBook.id,
      bookTitle: selectedBook.title,
      type: 'borrow',
      status: 'active',
      borrowDate: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      createdAt: serverTimestamp()
    }

    // Add transaction
    addDoc(transRef, transactionData).then(() => {
      // Update book stock
      const bookDoc = doc(db, 'books', selectedBook.id)
      updateDoc(bookDoc, {
        availableStock: Number(selectedBook.availableStock) - 1
      })

      toast({ title: "Peminjaman Berhasil", description: `Buku ${selectedBook.title} telah dipinjam oleh ${selectedMember.name}.` })
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Layanan Sirkulasi</h1>
        <p className="text-muted-foreground text-sm">Proses peminjaman dan pengembalian buku siswa/guru.</p>
      </div>

      <Tabs defaultValue="borrow" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-12 bg-card border shadow-sm">
          <TabsTrigger value="borrow" className="gap-2 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArrowRight className="h-4 w-4" />
            Peminjaman
          </TabsTrigger>
          <TabsTrigger value="return" className="gap-2 text-base data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <RefreshCcw className="h-4 w-4" />
            Pengembalian
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg">1. Identitas Anggota</CardTitle>
                  <CardDescription>Cari nama atau NIS/NIP.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari Anggota..." 
                      className="pl-10" 
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                    {foundMembers.length > 0 && !selectedMember && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {foundMembers.map(m => (
                          <div 
                            key={m.id} 
                            className="p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                            onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}
                          >
                            <div className="font-bold">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.memberId} - {m.type}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedMember ? (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
                      <div className="bg-primary p-3 rounded-full">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold">{selectedMember.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedMember.memberId} ({selectedMember.type})</p>
                      </div>
                      <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setSelectedMember(null)}>Batal</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-accent/20">
                      <User className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Anggota belum dipilih</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm h-full">
                <CardHeader>
                  <CardTitle className="text-lg">2. Scan/Cari Buku</CardTitle>
                  <CardDescription>Pilih buku yang akan dipinjam.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cari Buku..." 
                      className="pl-10" 
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                    />
                    {foundBooks.length > 0 && !selectedBook && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {foundBooks.map(b => (
                          <div 
                            key={b.id} 
                            className="p-2 hover:bg-accent cursor-pointer text-sm border-b last:border-0"
                            onClick={() => { setSelectedBook(b); setBookSearch(b.title); }}
                          >
                            <div className="font-bold">{b.title}</div>
                            <div className="text-xs text-muted-foreground">Kode: {b.code} | Stok: {b.availableStock}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedBook ? (
                    <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-4">
                      <div className="bg-secondary p-3 rounded-full">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold truncate">{selectedBook.title}</p>
                        <p className="text-xs text-muted-foreground">Rak {selectedBook.rackLocation || '-'}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => setSelectedBook(null)}>Batal</Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-accent/20">
                      <BookOpen className="h-10 w-10 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Buku belum dipilih</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm bg-primary/5 border-primary/10">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Batas Pengembalian</p>
                    <p className="text-xl font-bold text-primary">7 Hari Lagi</p>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  className="px-10 h-14 text-lg shadow-lg" 
                  disabled={!selectedMember || !selectedBook || isProcessing}
                  onClick={handleProcessBorrow}
                >
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                  Proses Peminjaman
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Pengembalian Buku</CardTitle>
                <CardDescription>Cari buku yang sedang dipinjam untuk dikembalikan.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pb-8 text-center">
                <div className="py-10 border-2 border-dashed rounded-2xl bg-muted/30">
                  <RefreshCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Gunakan fitur pencarian di atas untuk memproses pengembalian.</p>
                  <p className="text-xs text-muted-foreground mt-1">(Integrasi penuh dalam pengembangan lanjutan)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
