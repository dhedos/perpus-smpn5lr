
"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  TrendingUp, 
  BookOpen, 
  Users,
  Printer,
  Ghost,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  DatabaseBackup,
  Download,
  AlertCircle,
  FileDown,
  History
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
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { isAfter, parseISO, startOfMonth, isWithinInterval, endOfMonth, format, lastDayOfMonth } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ReportsPage() {
  const db = useFirestore()
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

  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  
  const { data: allTrans, isLoading: loadingTrans } = useCollection(transRef)
  const { data: members, isLoading: loadingMembers } = useCollection(membersRef)
  const { data: books, isLoading: loadingBooks } = useCollection(booksRef)
  const { data: settings } = useDoc(settingsRef)

  // Validasi data: Hanya hitung data yang buku & anggotanya masih ada
  const validTransactions = useMemo(() => {
    if (!allTrans || !books || !members) return []
    return allTrans.filter(t => 
      books.some(b => b.id === t.bookId) &&
      members.some(m => m.memberId === t.memberId)
    )
  }, [allTrans, books, members])

  const conditionStats = useMemo(() => {
    if (validTransactions.length === 0) return { lost: 0, damaged: 0, normal: 0 }
    const returnedItems = validTransactions.filter(t => t.status === 'returned')
    
    let lost = 0;
    let damaged = 0;
    let normal = 0;

    returnedItems.forEach(t => {
      if (t.rincianKondisi) {
        lost += Number(t.rincianKondisi.lost || 0);
        damaged += Number(t.rincianKondisi.damaged || 0);
        normal += Number(t.rincianKondisi.normal || 0);
      } else {
        if (t.condition === 'lost') lost++;
        else if (t.condition === 'damaged') damaged++;
        else normal++;
      }
    });

    return { lost, damaged, normal }
  }, [validTransactions])

  const statsData = useMemo(() => {
    if (validTransactions.length === 0 || !members || !mounted) return null;

    const activeLoans = validTransactions.filter(t => t.status === 'active');
    const now = new Date();
    const overdueLoans = activeLoans.filter(t => t.dueDate && isAfter(now, parseISO(t.dueDate)));

    const startOfCurrentMonth = startOfMonth(now);
    const endOfCurrentMonth = endOfMonth(now);
    const finesThisMonth = validTransactions
      .filter(t => t.status === 'returned' && t.returnDate && isWithinInterval(parseISO(t.returnDate), { start: startOfCurrentMonth, end: endOfCurrentMonth }))
      .reduce((acc, t) => acc + (t.fineAmount || 0), 0);

    const totalBorrowings = validTransactions.filter(t => t.type === 'borrow' || t.status === 'active').length;
    const avgBorrowing = (totalBorrowings / 30).toFixed(1);

    return {
      avg: avgBorrowing,
      unreturned: activeLoans.length,
      overdue: overdueLoans.length,
      fines: finesThisMonth,
      totalMembers: members.length
    };
  }, [validTransactions, members, mounted]);

  const chartData = [
    { name: 'Normal', value: conditionStats.normal, color: '#22c55e' },
    { name: 'Rusak', value: conditionStats.damaged, color: '#f97316' },
    { name: 'Hilang', value: conditionStats.lost, color: '#ef4444' },
  ]

  const isLoading = loadingTrans || loadingMembers || loadingBooks;

  const handlePrintTransactionBackup = (type: 'Student' | 'Teacher') => {
    if (validTransactions.length === 0) return;
    
    // Filter transaksi untuk bulan berjalan saja
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    const targetTrans = validTransactions.filter(t => {
      const transDate = t.createdAt ? new Date(t.createdAt.seconds * 1000) : new Date();
      return t.memberType === type && isWithinInterval(transDate, { start, end });
    });

    if (targetTrans.length === 0) {
      alert(`Tidak ada riwayat pinjaman ${type === 'Student' ? 'Siswa' : 'Guru'} aktif di bulan ini.`);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const label = type === 'Student' ? 'SISWA' : 'GURU/STAF';
    const rowsHtml = targetTrans.map((t, i) => `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${i+1}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.memberName}</td>
        <td style="border: 1px solid #ccc; padding: 8px;">${t.bookTitle} (${t.quantity || 1} Unit)</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yy') : '-'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${t.returnDate ? format(parseISO(t.returnDate), 'dd/MM/yy') : 'AKTIF'}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${(t.fineAmount || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Backup Riwayat - ${label}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 10pt; padding: 15mm; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background: #f2f2f2; font-weight: bold; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 10mm; }
            .footer-meta { font-size: 8pt; color: #666; margin-top: 10px; text-align: right; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h3 style="margin-bottom: 5px;">ARSIP BULANAN RIWAYAT PINJAMAN ${label}</h3>
            <div style="text-transform: uppercase; font-size: 11pt;">PERIODE: ${format(new Date(), 'MMMM yyyy')}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>Nama Peminjam</th>
                <th>Judul Buku</th>
                <th style="width: 80px; text-align: center;">Pinjam</th>
                <th style="width: 80px; text-align: center;">Kembali</th>
                <th style="width: 70px; text-align: right;">Denda</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer-meta">Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          <div style="position: fixed; bottom: 5mm; left: 15mm; font-size: 8pt; color: #999;">© 2026 Lantera Baca - Sistem Informasi Perpustakaan</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintFullReport = () => {
    if (!statsData) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Audit Perpustakaan - ${format(new Date(), 'yyyy')}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1.6; margin: 0; padding: 15mm; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 30px; }
            .school-name { font-size: 20px; font-weight: 900; }
            .report-title { text-align: center; font-size: 16px; font-weight: 800; margin-bottom: 30px; text-decoration: underline; }
            .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
            .stat-box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; }
            .stat-label { font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase; }
            .stat-value { font-size: 18px; font-weight: 900; margin-top: 5px; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-left: 4px solid #1e4b8f; padding-left: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f9f9f9; }
            .footer-sign { margin-top: 60px; float: right; text-align: center; width: 250px; }
            .print-footer { position: fixed; bottom: 5mm; left: 15mm; right: 15mm; font-size: 8px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>${settings?.govtInstitution || 'PEMERINTAH KABUPATEN MANGGARAI'}</div>
            <div>${settings?.eduDept || 'DINAS PENDIDIKAN, PEMUDA DAN OLAHRAGA'}</div>
            <div class="school-name">${settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG'}</div>
            <div style="font-size: 10px;">${settings?.schoolAddress || 'Mando, Compang Carep'}</div>
          </div>
          <div class="report-title">LAPORAN AUDIT & STATISTIK PERPUSTAKAAN</div>
          <div style="margin-bottom: 20px;">Periode Laporan: ${format(new Date(), 'MMMM yyyy')}</div>
          
          <div class="section-title">Ringkasan Aktivitas</div>
          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-label">Total Anggota Terdaftar</div>
              <div class="stat-value">${statsData.totalMembers} Orang</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Rata-rata Sirkulasi Harian</div>
              <div class="stat-value">${statsData.avg} Buku</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Buku Belum Dikembalikan</div>
              <div class="stat-value">${statsData.unreturned} Unit (${statsData.overdue} Terlambat)</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Total Denda Bulan Ini</div>
              <div class="stat-value">Rp ${statsData.fines.toLocaleString('id-ID')}</div>
            </div>
          </div>

          <div class="section-title">Kondisi Fisik Koleksi (Berdasarkan Pengembalian)</div>
          <table>
            <thead>
              <tr>
                <th>Kategori Kondisi</th>
                <th>Jumlah Unit</th>
                <th>Persentase</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Normal / Baik</td>
                <td>${conditionStats.normal}</td>
                <td>${((conditionStats.normal / (conditionStats.normal + conditionStats.damaged + conditionStats.lost || 1)) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Rusak</td>
                <td>${conditionStats.damaged}</td>
                <td>${((conditionStats.damaged / (conditionStats.normal + conditionStats.damaged + conditionStats.lost || 1)) * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Hilang / Tidak Ada</td>
                <td>${conditionStats.lost}</td>
                <td>${((conditionStats.lost / (conditionStats.normal + conditionStats.damaged + conditionStats.lost || 1)) * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-sign">
            ${settings?.reportCity || 'Mando'}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
            Kepala Sekolah,<br/><br/><br/><br/>
            <strong>${settings?.principalName || 'Lodovikus Jangkar, S.Pd.Gr'}</strong><br/>
            NIP. ${settings?.principalNip || '198507272011011020'}
          </div>
          <div class="print-footer">© 2026 Lantera Baca - Sistem Informasi Perpustakaan Modern</div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Laporan & Audit Inventaris</h1>
          <p className="text-muted-foreground text-sm">Analisis data koleksi dan kondisi fisik buku sekolah.</p>
        </div>
        
        <div className="flex gap-2">
          <Button className="gap-2 shadow-lg" onClick={handlePrintFullReport} disabled={isLoading}>
            <Printer className="h-4 w-4" /> Cetak Laporan Audit
          </Button>
        </div>
      </div>

      {showMonthlyReminder && (
        <Alert className="bg-orange-50 border-orange-200 text-orange-800 animate-in slide-in-from-top-4">
          <DatabaseBackup className="h-5 w-5 text-orange-600" />
          <AlertTitle className="font-bold">PENGINGAT BACKUP BULANAN!</AlertTitle>
          <AlertDescription className="text-sm">
            Mohon segera unduh cadangan **Riwayat Pinjaman** Siswa dan Guru di bawah ini untuk arsip fisik/digital sekolah bulan ini.
          </AlertDescription>
        </Alert>
      )}

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

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Backup Riwayat (Bulanan)
              </CardTitle>
              <CardDescription className="text-[10px]">Unduh arsip transaksi pinjaman bulan ini.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button 
                variant="outline" 
                className="w-full justify-between font-bold h-11 border-primary/20 hover:bg-primary/10"
                onClick={() => handlePrintTransactionBackup('Student')}
                disabled={isLoading}
              >
                Riwayat Pinjaman Siswa
                <Download className="h-4 w-4 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between font-bold h-11 border-primary/20 hover:bg-primary/10"
                onClick={() => handlePrintTransactionBackup('Teacher')}
                disabled={isLoading}
              >
                Riwayat Pinjaman Guru
                <Download className="h-4 w-4 ml-2" />
              </Button>
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
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center py-6 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}
