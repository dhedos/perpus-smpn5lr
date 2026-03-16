"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  BookOpen, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  AlertCircle 
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts"
import { useUser } from "@/firebase"

const borrowingData = [
  { name: "Sen", value: 12 },
  { name: "Sel", value: 18 },
  { name: "Rab", value: 25 },
  { name: "Kam", value: 20 },
  { name: "Jum", value: 30 },
  { name: "Sab", value: 15 },
]

const popularBooks = [
  { title: "Laskar Pelangi", count: 45, fill: "hsl(var(--primary))" },
  { title: "Bumi Manusia", count: 38, fill: "hsl(var(--secondary))" },
  { title: "Negeri 5 Menara", count: 32, fill: "hsl(var(--primary) / 0.7)" },
  { title: "Filosofi Kopi", count: 28, fill: "hsl(var(--secondary) / 0.7)" },
  { title: "Perahu Kertas", count: 25, fill: "hsl(var(--primary) / 0.4)" },
]

export default function DashboardPage() {
  const { user } = useUser()

  const stats = [
    { 
      title: "Total Buku", 
      value: "2,450", 
      desc: "12 buku baru minggu ini", 
      icon: BookOpen, 
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      title: "Anggota Aktif", 
      value: "842", 
      desc: "+5% dari bulan lalu", 
      icon: Users, 
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    { 
      title: "Peminjaman Aktif", 
      value: "156", 
      desc: "24 jatuh tempo besok", 
      icon: Clock, 
      color: "text-orange-500",
      bgColor: "bg-orange-100"
    },
    { 
      title: "Denda Belum Bayar", 
      value: "Rp 125rb", 
      desc: "Dari 12 transaksi", 
      icon: AlertCircle, 
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">
          SMPN 5 LANGKE REMBONG
        </h1>
        <p className="text-muted-foreground mt-1">
          Selamat datang, {user?.displayNameCustom || "Admin"}. Berikut ringkasan aktivitas perpustakaan hari ini.
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
            <CardDescription>Frekuensi peminjaman buku dalam 1 minggu terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={borrowingData}>
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

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Buku Terpopuler</CardTitle>
            <CardDescription>Buku yang paling sering dipinjam bulan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={popularBooks} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" axisLine={false} tickLine={false} hide />
                  <YAxis type="category" dataKey="title" axisLine={false} tickLine={false} width={100} fontSize={12} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {popularBooks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaksi Terbaru</CardTitle>
              <CardDescription>Aktivitas sirkulasi terakhir di SMPN 5.</CardDescription>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">Lihat Semua</button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={i % 2 === 0 ? "bg-green-100 text-green-600 p-2 rounded-full" : "bg-blue-100 text-blue-600 p-2 rounded-full"}>
                      {i % 2 === 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">Buku: {["Laskar Pelangi", "Fisika Modern", "Sejarah Dunia", "Kamus Inggris"][i]}</p>
                      <p className="text-xs text-muted-foreground">{["Rian Hidayat", "Ibu Ratna", "Andi", "Siti"][i]} • {i + 1} jam yang lalu</p>
                    </div>
                  </div>
                  <Badge variant={i % 2 === 0 ? "outline" : "secondary"}>
                    {i % 2 === 0 ? "Kembali" : "Pinjam"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Jatuh Tempo</CardTitle>
            <CardDescription>Siswa yang terlambat mengembalikan buku.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-accent/30 border-primary/10">
                <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold">NIS{12340 + i} - Ahmad S.</p>
                  <p className="text-xs text-muted-foreground">Buku: Harry Potter</p>
                  <p className="text-[10px] font-bold text-orange-600 mt-1 uppercase">Terlambat 2 Hari</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
