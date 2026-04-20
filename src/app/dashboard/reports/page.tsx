
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Download, 
  TrendingUp, 
  BookOpen, 
  Users,
  Printer,
  Ghost,
  ShieldAlert,
  CheckCircle2
} from "lucide-react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where } from "firebase/firestore"

export default function ReportsPage() {
  const db = useFirestore()

  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])
  const { data: allTrans } = useCollection(transRef)

  // Statistik Kondisi Buku
  const conditionStats = useMemo(() => {
    if (!allTrans) return { lost: 0, damaged: 0, normal: 0 }
    const filtered = allTrans.filter(t => t.type === 'return')
    return {
      lost: filtered.filter(t => t.condition === 'lost').length,
      damaged: filtered.filter(t => t.condition === 'damaged').length,
      normal: filtered.filter(t => t.condition === 'normal').length,
    }
  }, [allTrans])

  const chartData = [
    { name: 'Normal', value: conditionStats.normal, color: '#22c55e' },
    { name: 'Rusak', value: conditionStats.damaged, color: '#f97316' },
    { name: 'Hilang', value: conditionStats.lost, color: '#ef4444' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight">Laporan & Audit Inventaris</h1>
          <p className="text-muted-foreground text-sm">Analisis data koleksi dan kondisi fisik buku sekolah.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Printer className="h-4 w-4" /> Cetak PDF</Button>
          <Button className="gap-2"><Download className="h-4 w-4" /> Export Excel</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Ringkasan Kondisi Pengembalian</CardTitle>
            <CardDescription>Visualisasi kualitas perawatan buku oleh siswa.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Rincian Inventaris Bermasalah</CardTitle>
            <CardDescription>Buku yang hilang atau perlu diganti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
               <div className="flex items-center gap-3">
                 <Ghost className="h-5 w-5 text-red-600" />
                 <span className="text-sm font-semibold">Total Hilang</span>
               </div>
               <span className="text-xl font-bold text-red-700">{conditionStats.lost}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
               <div className="flex items-center gap-3">
                 <ShieldAlert className="h-5 w-5 text-orange-600" />
                 <span className="text-sm font-semibold">Total Rusak</span>
               </div>
               <span className="text-xl font-bold text-orange-700">{conditionStats.damaged}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="h-5 w-5 text-green-600" />
                 <span className="text-sm font-semibold">Lengkap/Baik</span>
               </div>
               <span className="text-xl font-bold text-green-700">{conditionStats.normal}</span>
             </div>
             <p className="text-[10px] text-muted-foreground mt-4 italic text-center">
               Data ini digunakan untuk pengajuan pengadaan buku baru ke sekolah.
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Rata-rata Peminjaman", value: "4.2", desc: "Buku/hari", icon: TrendingUp },
          { title: "Buku Belum Kembali", value: "42", desc: "15 Terlambat", icon: BookOpen },
          { title: "Denda Terkumpul", value: "Rp450rb", desc: "Bulan ini", icon: FileText },
          { title: "Anggota Aktif", value: "125", desc: "Siswa & Guru", icon: Users },
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
