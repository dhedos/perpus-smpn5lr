
"use client"

import { useMemo } from "react"
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
  Library
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

export default function DashboardPage() {
  const { user } = useUser()
  const db = useFirestore()

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])
  
  const activeTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), where('status', '==', 'active')) : null, 
  [db])

  const latestTransQuery = useMemoFirebase(() => 
    db ? query(collection(db, 'transactions'), orderBy('createdAt', 'desc'), limit(5)) : null, 
  [db])

  const { data: books } = useCollection(booksRef)
  const { data: members } = useCollection(membersRef)
  const { data: activeTransactions } = useCollection(activeTransQuery)
  const { data: latestTransactions } = useCollection(latestTransQuery)

  const stats = [
    { 
      title: "Total Buku", 
      value: books?.length || 0, 
      desc: "Koleksi terdaftar", 
      icon: BookOpen, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      title: "Anggota Aktif", 
      value: members?.length || 0, 
      desc: "Siswa & Guru", 
      icon: Users, 
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    { 
      title: "Peminjaman Aktif", 
      value: activeTransactions?.length || 0, 
      desc: "Buku sedang dipinjam", 
      icon: Clock, 
      color: "text-orange-500",
      bgColor: "bg-orange-100"
    },
    { 
      title: "Denda (Simulasi)", 
      value: "Rp 0", 
      desc: "Total denda hari ini", 
      icon: AlertCircle, 
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
        <h1 className="text-2xl font-black tracking-tight text-primary uppercase leading-tight">
          {user?.displayNameCustom || "Petugas Perpustakaan"}
        </h1>
        <p className="text-muted-foreground text-xs mt-1">
          Pantau aktivitas sirkulasi dan koleksi perpustakaan hari ini.
        </p>
      </div>

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
              ) : latestTransactions.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">Belum ada transaksi.</div>
              ) : latestTransactions.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={t.type === 'return' ? "bg-green-100 text-green-600 p-2 rounded-full" : "bg-blue-100 text-blue-600 p-2 rounded-full"}>
                      {t.type === 'return' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">{t.memberName} • {new Date(t.createdAt?.seconds * 1000).toLocaleDateString('id-ID')}</p>
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
