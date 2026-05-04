
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
  Layers,
  DatabaseBackup,
  BellRing
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
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, orderBy, limit, doc } from "firebase/firestore"
import { isAfter, parseISO, differenceInDays, differenceInHours, startOfDay, addHours, isToday, lastDayOfMonth } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false)

  useEffect(() => {
    setMounted(true)
    const now = new Date();
    const lastDay = lastDayOfMonth(now).getDate();
    const reminderStartDay = lastDay - 3; 
    if (now.getDate() >= reminderStartDay) {
      setShowMonthlyReminder(true);
    }
  }, [])

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  
  const activeTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), where('status', '==', 'active')) : null, 
  [db])

  const latestTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(100)) : null, 
  [db])

  const { data: books, isLoading: loadingBooks } = useCollection(booksRef)
  const { data: members, isLoading: loadingMembers } = useCollection(membersRef)
  const { data: activeTransactions, isLoading: loadingActive } = useCollection(activeTransQuery)
  const { data: latestTransactions } = useCollection(latestTransQuery)

  const filteredActiveTransactions = useMemo(() => {
    if (!activeTransactions || !books || !members) return []
    return activeTransactions.filter(t => 
      books.some(b => b.id === t.bookId) &&
      members.some(m => m.memberId === t.memberId)
    )
  }, [activeTransactions, books, members])

  const filteredLatestTransactions = useMemo(() => {
    if (!latestTransactions || !books || !members) return []
    return latestTransactions.filter(t => {
      const transDate = t.createdAt ? new Date(t.createdAt.seconds * 1000) : new Date();
      return (
        isToday(transDate) &&
        books.some(b => b.id === t.bookId) &&
        members.some(m => m.memberId === t.memberId)
      )
    }).slice(0, 8)
  }, [latestTransactions, books, members])

  const overdueTransactions = useMemo(() => {
    if (!mounted || !filteredActiveTransactions || !settings) return []
    const now = new Date()
    const collHours = Number(settings.collectiveLoanHours || 2)

    return filteredActiveTransactions
      .filter(t => {
        if (t.borrowType === 'Kolektif') {
          const dueDate = addHours(parseISO(t.borrowDate), collHours)
          return isAfter(now, dueDate)
        } else {
          if (!t.dueDate) return false
          return isAfter(now, parseISO(t.dueDate))
        }
      })
      .map(t => {
        if (t.borrowType === 'Kolektif') {
          const diffHours = differenceInHours(now, parseISO(t.borrowDate))
          return { 
            ...t, 
            lateLabel: `${diffHours} Jam Pinjam`,
            currentDuration: `${diffHours} Jam`
          }
        } else {
          const diff = differenceInDays(startOfDay(now), startOfDay(parseISO(t.dueDate)))
          const duration = differenceInDays(now, parseISO(t.borrowDate))
          return { 
            ...t, 
            lateLabel: `Terlambat ${diff} Hari`,
            currentDuration: `${duration} Hari`
          }
        }
      })
  }, [filteredActiveTransactions, mounted, settings])

  const chartData = useMemo(() => {
    const daysIndo = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const result = [
      { name: "Sen", value: 0 },
      { name: "Sel", value: 0 },
      { name: "Rab", value: 0 },
      { name: "Kam", value: 0 },
      { name: "Jum", value: 0 },
      { name: "Sab", value: 0 },
      { name: "Min", value: 0 },
    ];

    if (!latestTransactions) return result;

    latestTransactions.forEach(t => {
      // Hitung hanya transaksi peminjaman (borrow)
      if (t.type === 'borrow' || t.type === 'teacher_handbook' || t.status === 'active') {
        const date = t.createdAt ? new Date(t.createdAt.seconds * 1000) : new Date();
        const dayName = daysIndo[date.getDay()];
        const target = result.find(r => r.name === dayName);
        if (target) target.value++;
      }
    });

    return result;
  }, [latestTransactions]);

  const stats = [
    { 
      title: "Koleksi Buku", 
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        {mounted && showMonthlyReminder && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/dashboard/reports')}
            className="bg-orange-50 border-orange-200 text-orange-700 font-black animate-pulse hover:bg-orange-100 shadow-sm border-2"
          >
            <DatabaseBackup className="h-4 w-4 mr-2" />
            BACKUP DATA!
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {mounted && overdueTransactions.length > 0 && (
        <Card className="border-none shadow-md bg-destructive/5 overflow-hidden ring-1 ring-destructive/20">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overdueTransactions.slice(0, 6).map((t) => (
                <div key={t.id} className="bg-white/70 dark:bg-black/40 p-3 rounded-lg border border-destructive/10 flex flex-col gap-1 shadow-sm relative overflow-hidden">
                  {t.borrowType === 'Kolektif' && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-bl-md uppercase">
                      Kolektif
                    </div>
                  )}
                  <div className="font-bold text-xs truncate text-destructive">{t.bookTitle}</div>
                  <div className="text-[10px] font-semibold text-muted-foreground truncate">{t.memberName} ({t.classOrSubject})</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="destructive" className="h-4 text-[8px] w-fit border-none font-bold uppercase">
                      {t.lateLabel}
                    </Badge>
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
            <CardTitle>Statistik Mingguan</CardTitle>
            <CardDescription>Aktivitas peminjaman 7 hari terakhir.</CardDescription>
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
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/30">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Aktivitas Hari Ini</CardTitle>
              <CardDescription className="text-[10px]">Menampilkan riwayat sirkulasi hanya untuk hari ini.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {!latestTransactions ? (
                <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6 text-muted-foreground" /></div>
              ) : filteredLatestTransactions.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center gap-2">
                   <Clock className="h-8 w-8 text-muted-foreground/20" />
                   <p className="text-xs text-muted-foreground font-medium italic">Belum ada sirkulasi hari ini.</p>
                </div>
              ) : filteredLatestTransactions.map((t) => (
                <div 
                  key={t.id} 
                  className={cn(
                    "flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors group",
                    t.status === 'active' && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (t.status === 'returned') return;
                    
                    const targetPage = t.type === 'teacher_handbook' 
                      ? `/dashboard/teacher-loans?tab=return&q=${encodeURIComponent(t.memberName || '')}`
                      : `/dashboard/transactions?tab=return&q=${encodeURIComponent(t.memberName || '')}`;
                    
                    router.push(targetPage);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={t.status === 'returned' ? "bg-green-100 dark:bg-green-900/30 text-green-600 p-2 rounded-full" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 p-2 rounded-full"}>
                      {t.status === 'returned' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm font-bold truncate max-w-[150px]",
                          t.status === 'active' && "group-hover:text-primary transition-colors"
                        )}>{t.bookTitle}</p>
                        {t.borrowType === 'Kolektif' && <Badge className="h-3.5 text-[6px] bg-blue-600 border-none font-black uppercase">Kolektif</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{t.memberName} • {t.createdAt ? new Date(t.createdAt.seconds * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}</p>
                    </div>
                  </div>
                  <Badge variant={t.status === 'returned' ? "outline" : "secondary"} className="text-[8px] font-bold uppercase">
                    {t.status === 'returned' ? "KEMBALI" : "PINJAM"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="text-center py-6 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}
