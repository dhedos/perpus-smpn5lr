
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  BookOpen, 
  Users,
  Printer
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"

const categoryData = [
  { name: 'Fiksi', value: 400, color: 'hsl(var(--primary))' },
  { name: 'Sains', value: 300, color: 'hsl(var(--secondary))' },
  { name: 'Sejarah', value: 200, color: 'hsl(var(--primary) / 0.6)' },
  { name: 'Religi', value: 150, color: 'hsl(var(--secondary) / 0.6)' },
]

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Laporan & Statistik</h1>
          <p className="text-muted-foreground text-sm">Analisis data koleksi dan sirkulasi perpustakaan.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Cetak PDF
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Tren Peminjaman Bulanan</CardTitle>
            <CardDescription>Perbandingan aktivitas peminjaman tahun 2023 vs 2024.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { name: 'Jan', current: 40, previous: 24 },
                  { name: 'Feb', current: 30, previous: 13 },
                  { name: 'Mar', current: 65, previous: 38 },
                  { name: 'Apr', current: 45, previous: 39 },
                  { name: 'Mei', current: 50, previous: 48 },
                  { name: 'Jun', current: 70, previous: 55 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="current" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="previous" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Distribusi Kategori</CardTitle>
            <CardDescription>Persentase koleksi berdasarkan kategori.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                  <span className="font-semibold">{cat.value} Buku</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Rata-rata Peminjaman", value: "4.2", desc: "Buku/hari", icon: TrendingUp },
          { title: "Buku Belum Kembali", value: "42", desc: "15 Terlambat", icon: BookOpen },
          { title: "Anggota Baru", value: "12", desc: "Bulan ini", icon: Users },
          { title: "Koleksi Terpopuler", value: "Laskar Pelangi", desc: "45x Dipinjam", icon: FileText },
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
