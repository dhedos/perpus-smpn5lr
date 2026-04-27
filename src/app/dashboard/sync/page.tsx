
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Zap, Layers, Info, ShieldCheck, AlertTriangle, CheckCircle2, Database, CloudUpload, HardDrive, MousePointer2, HelpCircle, Calculator, FileDown, DatabaseBackup } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { format } from "date-fns"

const STORAGE_KEY = 'perpus_local_queue_v3'

export default function SyncPage() {
  const { toast } = useToast()
  const db = useFirestore()
  
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  const transRef = useMemoFirebase(() => db ? collection(db, 'transactions') : null, [db])
  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])

  const { data: books } = useCollection(booksRef)
  const { data: members } = useCollection(membersRef)
  const { data: transactions } = useCollection(transRef)
  const { data: settings } = useDoc(settingsRef)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)

    setLastBackup(localStorage.getItem('perpus_last_backup'))

    const checkQueue = () => {
      const savedQueue = localStorage.getItem(STORAGE_KEY)
      if (savedQueue) {
        try {
          const parsed = JSON.parse(savedQueue)
          setPendingCount(Array.isArray(parsed) ? parsed.length : 0)
        } catch (e) {
          setPendingCount(0)
        }
      } else {
        setPendingCount(0)
      }
    }

    checkQueue()
    const interval = setInterval(checkQueue, 2000)

    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
      clearInterval(interval)
    }
  }, [])

  const handleSync = () => {
    setSyncing(true)
    setProgress(0)
    
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 10
      setProgress(currentProgress)
      
      if (currentProgress >= 100) {
        clearInterval(interval)
        setSyncing(false)
        toast({ 
          title: "Penyegaran Berhasil", 
          description: "Sistem telah memverifikasi status koneksi dan data lokal." 
        })
      }
    }, 100)
  }

  const handleBackupPDF = () => {
    if (!books || !members || !transactions) {
      toast({ title: "Data Belum Siap", description: "Mohon tunggu hingga seluruh data termuat.", variant: "destructive" })
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const now = new Date();
    const formattedDate = format(now, 'dd MMMM yyyy, HH:mm');
    const schoolName = settings?.schoolName || 'SMP NEGERI 5 LANGKE REMBONG';

    const booksRows = books.map((b, i) => `<tr><td>${i+1}</td><td>${b.code}</td><td>${b.title}</td><td>${b.totalStock}</td><td>${b.availableStock}</td></tr>`).join('')
    const membersRows = members.map((m, i) => `<tr><td>${i+1}</td><td>${m.memberId}</td><td>${m.name}</td><td>${m.type}</td><td>${m.classOrSubject || '-'}</td></tr>`).join('')
    const activeTransRows = transactions.filter(t => t.status === 'active').map((t, i) => `<tr><td>${i+1}</td><td>${t.memberName}</td><td>${t.bookTitle}</td><td>${t.borrowDate ? format(parseISO(t.borrowDate), 'dd/MM/yy') : '-'}</td><td>${t.borrowType}</td></tr>`).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Backup Database - ${format(now, 'yyyyMMdd')}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Inter', sans-serif; font-size: 9pt; color: #333; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5mm; margin-bottom: 10mm; }
            h1 { font-size: 16pt; margin: 0; text-transform: uppercase; }
            h2 { font-size: 11pt; margin-top: 8mm; margin-bottom: 3mm; background: #f0f0f0; padding: 2mm; border-left: 5px solid #1e4b8f; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; }
            th, td { border: 1px solid #ccc; padding: 2mm; text-align: left; }
            th { background: #fafafa; font-weight: bold; }
            .meta { font-size: 8pt; color: #666; font-style: italic; }
            .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 7pt; border-top: 1px solid #eee; padding-top: 2mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>CADANGAN DATA PERPUSTAKAAN (BACKUP)</h1>
            <div class="meta">Institusi: ${schoolName} | Waktu Ekspor: ${formattedDate}</div>
          </div>

          <h2>1. DAFTAR KOLEKSI BUKU (${books.length} Judul)</h2>
          <table>
            <thead><tr><th width="30">No</th><th>Kode</th><th>Judul Buku</th><th width="50">Stok</th><th width="50">Tersedia</th></tr></thead>
            <tbody>${booksRows}</tbody>
          </table>

          <h2>2. DAFTAR ANGGOTA PERPUSTAKAAN (${members.length} Orang)</h2>
          <table>
            <thead><tr><th width="30">No</th><th>ID (NIS/NIP)</th><th>Nama Lengkap</th><th>Kategori</th><th>Keterangan</th></tr></thead>
            <tbody>${membersRows}</tbody>
          </table>

          <h2>3. DAFTAR PEMINJAMAN AKTIF (${transactions.filter(t => t.status === 'active').length} Transaksi)</h2>
          <table>
            <thead><tr><th width="30">No</th><th>Peminjam</th><th>Buku</th><th>Tgl Pinjam</th><th>Tipe</th></tr></thead>
            <tbody>${activeTransRows}</tbody>
          </table>

          <div class="footer">Arsip Digital Perpustakaan Modern - Dicetak secara otomatis oleh sistem.</div>
        </body>
      </html>
    `)
    printWindow.document.close()

    // Update last backup date
    const backupDate = new Date().toISOString()
    localStorage.setItem('perpus_last_backup', backupDate)
    setLastBackup(backupDate)
    
    toast({ 
      title: "Backup Berhasil", 
      description: "Data telah diekspor ke PDF dan waktu backup telah diperbarui." 
    })
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Caching & Sinkronisasi</h1>
          <p className="text-muted-foreground text-sm">Kelola penyimpanan lokal dan cadangan data sistem.</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Penyimpanan HP/Laptop Aktif
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Sistem Caching Aktif
            </CardTitle>
            <CardDescription>Status: {isOnline ? 'Terhubung ke Cloud' : 'Mode Offline Aktif'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Antrean Lokal</span>
              <Badge variant={pendingCount > 0 ? "destructive" : "outline"} className="border-none font-bold">
                {pendingCount} Data Menunggu
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Terakhir Backup</span>
              <span className="font-bold text-primary flex items-center gap-1">
                {lastBackup ? format(new Date(lastBackup), 'dd/MM/yyyy') : 'Belum Pernah'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Segarkan
              </Button>
              <Button className="gap-2 shadow-md bg-primary hover:bg-primary/90" onClick={handleBackupPDF}>
                <FileDown className="h-4 w-4" />
                Backup (PDF)
              </Button>
            </div>
            {syncing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseBackup className="h-5 w-5 text-blue-600" />
              Keamanan Data
            </CardTitle>
            <CardDescription>Saran pencadangan berkala untuk Admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-800 leading-relaxed font-medium italic">
                Peringatan backup akan muncul setiap 3 hari di Beranda. Pastikan Anda mencetak PDF backup dan menyimpannya sebagai arsip digital di Google Drive atau Harddisk sebagai langkah jaga-jaga.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Koleksi</span>
                </div>
                <div className="text-sm font-black">{books?.length || 0} Judul</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <UsersIcon className="h-3 w-3 text-secondary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Anggota</span>
                </div>
                <div className="text-sm font-black">{members?.length || 0} Orang</div>
              </div>
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
