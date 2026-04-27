
"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  AlertCircle,
  Loader2,
  Library,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Layers
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts"
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { isAfter, parseISO, differenceInDays, startOfDay } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const { user } = useUser()
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)

  // Pastikan komponen sudah terpasang di client untuk menghindari perbedaan waktu (hydration mismatch)
  useEffect(() => {
    setMounted(true)
  }, [])

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  
  const activeTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), where('status', '==', 'active')) : null, 
  [db])

  const latestTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(10)) : null, 
  [db])

  const { data: books, isLoading: loadingBooks } = useCollection(booksRef)
  const { data: members, isLoading: loadingMembers } = useCollection(membersRef)
  const { data: activeTransactions, isLoading: loadingActive } = useCollection(activeTransQuery)
  const { data: latestTransactions } = useCollection(latestTransQuery)

  // Filter transaksi aktif agar hanya menampilkan yang buku & anggotanya masih ada
  const filteredActiveTransactions = useMemo(() => {
    if (!activeTransactions || !books || !members) return []
    return activeTransactions.filter(t => 
      books.some(b => b.id === t.bookId) &&
      members.some(m => m.memberId === t.memberId)
    )
  }, [activeTransactions, books, members])

  // Filter transaksi terbaru agar sinkron (tidak menampilkan data dari entitas yang sudah dihapus)
  const filteredLatestTransactions = useMemo(() => {
    if (!latestTransactions || !books || !members) return []
    return latestTransactions.filter(t => 
      books.some(b => b.id === t.bookId) &&
      members.some(m => m.memberId === t.memberId)
    ).slice(0, 5)
  }, [latestTransactions, books, members])

  // Hitung transaksi yang jatuh tempo (overdue) dengan rincian hari terlambat
  const overdueTransactions = useMemo(() => {
    if (!mounted || !filteredActiveTransactions) return []
    const now = startOfDay(new Date())
    return filteredActiveTransactions
      .filter(t => {
        if (!t.dueDate) return false
        try {
          return isAfter(now, startOfDay(parseISO(t.dueDate)))
        } catch (e) {
          return false
        }
      })
      .map(t => {
        const diff = differenceInDays(now, parseISO(t.dueDate))
        const duration = differenceInDays(now, parseISO(t.borrowDate))
        return { ...t, lateDays: diff > 0 ? diff : 0, currentDuration: duration }
      })
  }, [filteredActiveTransactions, mounted])

  const stats = [
    { 
      title: "Total Jenis Buku", 
      value: loadingBooks ? "..." : (books?.length || 0), 
      desc: "Judul terdaftar", 
      icon: BookOpen, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      title: "Anggota", 
      value: loadingMembers ? "..." : (members?.length || 0), 
      desc: "Siswa & Guru", 
      icon: Users, 
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    { 
      title: "Peminjaman Aktif", 
      value: filteredActiveTransactions.length, 
      desc: "Buku di tangan siswa", 
      icon: Clock, 
      color: "text-blue-500",
      bgColor: "bg-blue-100"
    },
    { 
      title: "Jatuh Tempo", 
      value: mounted ? overdueTransactions.length : 0, 
      desc: "Perlu dikembalikan", 
      icon: AlertTriangle, 
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
  ]

  const chartData = [
    { name: "Sen", value: 4 },
    { name: "Sel", value: 7 },
    { name: "Rab", value: 5 },
    { name: "Kam", value: 9 },
    { name: "Jum", value: 12 },
    { name: "Sab", value: 3 },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-80">
          Selamat Datang,
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-primary leading-tight">
          {user?.displayNameCustom || "Petugas Perpustakaan"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Pantau aktivitas sirkulasi dan koleksi perpustakaan hari ini.
        </p>
      </div>

      {/* Overdue Alert Banner - HANYA muncul jika ada yang jatuh tempo */}
      {mounted && overdueTransactions.length > 0 && (
        <Card className="border-none shadow-md bg-destructive/5 overflow-hidden ring-1 ring-destructive/20 animate-in slide-in-from-top duration-500">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive animate-pulse" />
              <CardTitle className="text-lg font-bold text-destructive">Peringatan Jatuh Tempo!</CardTitle>
            </div>
            <Link href="/dashboard/transactions?tab=return">
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs font-bold gap-1">
                Proses Sekarang <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive/80 mb-4">
              Ditemukan <strong>{overdueTransactions.length} transaksi</strong> yang telah melewati batas waktu pengembalian. Segera hubungi anggota berikut:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overdueTransactions.slice(0, 6).map((t) => (
                <div key={t.id} className="bg-white/70 p-3 rounded-lg border border-destructive/10 flex flex-col gap-1 shadow-sm relative overflow-hidden">
                  {t.borrowType === 'Kolektif' && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-md uppercase">
                      Kolektif
                    </div>
                  )}
                  <div className="font-bold text-xs truncate text-destructive">{t.bookTitle}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground truncate">{t.memberName} ({t.classOrSubject})</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="destructive" className="h-4 text-[8px] w-fit border-none font-bold">
                      Terlambat {t.lateDays} Hari
                    </Badge>
                    {t.borrowType === 'Kolektif' && (
                      <span className="text-[8px] font-bold text-blue-600 flex items-center gap-0.5">
                        <Clock className="h-2 w-2" /> {t.currentDuration} Hari
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Statistik Peminjaman</CardTitle>
            <CardDescription>Aktivitas peminjaman real-time (Minggu ini).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription>Aktivitas sirkulasi terakhir.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {!latestTransactions ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-muted-foreground" /></div>
              ) : filteredLatestTransactions.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Belum ada transaksi.</div>
              ) : filteredLatestTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={t.type === 'return' ? "bg-green-100 text-green-600 p-2 rounded-full" : "bg-blue-100 text-blue-600 p-2 rounded-full"}>
                      {t.type === 'return' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.bookTitle}</p>
                        {t.borrowType === 'Kolektif' && <Badge className="h-3.5 text-[7px] bg-blue-600 hover:bg-blue-600 border-none font-black uppercase">Kolektif</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{t.memberName} • {t.createdAt ? new Date(t.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru saja'}</p>
                    </div>
                  </div>
                  <Badge variant={t.type === 'return' ? "outline" : "secondary"}>
                    {t.type === 'return' ? "Kembali" : "Pinjam"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
