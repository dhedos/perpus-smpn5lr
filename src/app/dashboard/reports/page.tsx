
"use client"

import { useMemo, useState, useEffect } from "react"
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
  CheckCircle2,
  Loader2
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
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, where, orderBy } from "firebase/firestore"
import { isAfter, parseISO, startOfMonth, isWithinInterval, endOfMonth } from "date-fns"

export default function ReportsPage() {
  const db = useFirestore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  
  const { data: allTrans, isLoading: loadingTrans } = useCollection(transRef)
  const { data: members, isLoading: loadingMembers } = useCollection(membersRef)

  // 1. Statistik Kondisi Buku (Berdasarkan Buku yang Kembali)
  const conditionStats = useMemo(() => {
    if (!allTrans) return { lost: 0, damaged: 0, normal: 0 }
    const returnedItems = allTrans.filter(t => t.status === 'returned')
    
    let lost = 0;
    let damaged = 0;
    let normal = 0;

    returnedItems.forEach(t => {
      if (t.rincianKondisi) {
        lost += Number(t.rincianKondisi.lost || 0);
        damaged += Number(t.rincianKondisi.damaged || 0);
        normal += Number(t.rincianKondisi.normal || 0);
      } else {
        // Fallback untuk data lama
        if (t.condition === 'lost') lost++;
        else if (t.condition === 'damaged') damaged++;
        else normal++;
      }
    });

    return { lost, damaged, normal }
  }, [allTrans])

  // 2. Kalkulasi Data Kartu Statistik (Real-time)
  const statsData = useMemo(() => {
    if (!allTrans || !members || !mounted) return null;

    const activeLoans = allTrans.filter(t => t.status === 'active');
    const now = new Date();
    const overdueLoans = activeLoans.filter(t => t.dueDate && isAfter(now, parseISO(t.dueDate)));

    // Hitung denda bulan ini
    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    const finesThisMonth = allTrans
      .filter(t => t.status === 'returned' && t.returnDate && isWithinInterval(parseISO(t.returnDate), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
      .reduce((acc, t) => acc + (t.fineAmount || 0), 0);

    // Hitung rata-rata peminjaman (Total pinjam / 30 hari sebagai sampel)
    const totalBorrowings = allTrans.filter(t => t.type === 'borrow' || t.status === 'active').length;
    const avgBorrowing = (totalBorrowings / 30).toFixed(1);

    return {
      avg: avgBorrowing,
      unreturned: activeLoans.length,
      overdue: overdueLoans.length,
      fines: finesThisMonth,
      totalMembers: members.length
    };
  }, [allTrans, members, mounted]);

  const chartData = [
    { name: 'Normal', value: conditionStats.normal, color: '#22c55e' },
    { name: 'Rusak', value: conditionStats.damaged, color: '#f97316' },
    { name: 'Hilang', value: conditionStats.lost, color: '#ef4444' },
  ]

  const isLoading = loadingTrans || loadingMembers;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Laporan & Audit Inventaris</h1>
          <p className="text-muted-foreground text-sm">Analisis data koleksi dan kondisi fisik buku sekolah.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak PDF</Button>
          <Button className="gap-2"><Download className="h-4 w-4" /> Export Excel</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Ringkasan Kondisi Pengembalian</CardTitle>
            <CardDescription>Visualisasi kualitas perawatan buku oleh siswa (kumulatif).</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
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
            )}
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
                 <span className="text-sm font-semibold">Total Unit Hilang</span>
               </div>
               <span className="text-xl font-bold text-red-700">{conditionStats.lost}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
               <div className="flex items-center gap-3">
                 <ShieldAlert className="h-5 w-5 text-orange-600" />
                 <span className="text-sm font-semibold">Total Unit Rusak</span>
               </div>
               <span className="text-xl font-bold text-orange-700">{conditionStats.damaged}</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
               <div className="flex items-center gap-3">
                 <CheckCircle2 className="h-5 w-5 text-green-600" />
                 <span className="text-sm font-semibold">Unit Kembali Baik</span>
               </div>
               <span className="text-xl font-bold text-green-700">{conditionStats.normal}</span>
             </div>
             <p className="text-[10px] text-muted-foreground mt-4 italic text-center leading-relaxed">
               Data dihitung berdasarkan rincian kondisi saat pengembalian buku dilakukan oleh petugas.
             </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            title: "Rata-rata Peminjaman", 
            value: statsData ? `${statsData.avg}` : "...", 
            desc: "Buku/hari (Estimasi)", 
            icon: TrendingUp 
          },
          { 
            title: "Buku Belum Kembali", 
            value: statsData ? `${statsData.unreturned}` : "...", 
            desc: statsData ? `${statsData.overdue} Terlambat` : "...", 
            icon: BookOpen 
          },
          { 
            title: "Denda Terkumpul", 
            value: statsData ? `Rp${statsData.fines.toLocaleString('id-ID')}` : "...", 
            desc: "Bulan ini", 
            icon: FileText 
          },
          { 
            title: "Anggota Aktif", 
            value: statsData ? `${statsData.totalMembers}` : "...", 
            desc: "Siswa & Guru terdaftar", 
            icon: Users 
          },
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.title}</CardTitle>
              <item.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black truncate">{item.value}</div>
              <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-tighter">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
