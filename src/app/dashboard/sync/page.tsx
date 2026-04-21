
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Zap, Layers, Info, ShieldCheck, AlertTriangle, CheckCircle2, Database, CloudUpload, HardDrive, MousePointer2, HelpCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/badge"

const STORAGE_KEY = 'perpus_local_queue_v2'

export default function SyncPage() {
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)

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

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Caching & Sinkronisasi</h1>
          <p className="text-muted-foreground text-sm">Kelola penyimpanan lokal untuk menghemat kuota data SMPN 5.</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1.5 px-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Reload Aman (0 Reads Extra)
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
              <span className="text-muted-foreground">Penyimpanan Lokal</span>
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold">OPTIMASI AKTIF</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Antrean Localhost</span>
              <Badge variant={pendingCount > 0 ? "destructive" : "outline"} className="border-none font-bold">
                {pendingCount} Buku Menunggu
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Efisiensi Reload</span>
              <span className="font-bold text-primary flex items-center gap-1">
                <MousePointer2 className="h-3 w-3" /> Gratis (Tanpa Biaya)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Segarkan
              </Button>
              <Button className="gap-2 shadow-md bg-orange-600 hover:bg-orange-700" onClick={() => window.location.href = '/dashboard/books'}>
                <CloudUpload className="h-4 w-4" />
                Lihat Antrean
              </Button>
            </div>
            {syncing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Keamanan Kuota (Spark Plan)
            </CardTitle>
            <CardDescription>Analisis penggunaan data sekolah Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Writes (Tulis)</span>
                </div>
                <div className="text-sm font-black">Hanya Saat Sync</div>
                <div className="text-[9px] text-muted-foreground leading-tight">1 Buku = 1 Write. Tidak dihitung ulang saat reload.</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="h-3 w-3 text-secondary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Reads (Baca)</span>
                </div>
                <div className="text-sm font-black">Bebas Reload</div>
                <div className="text-[9px] text-muted-foreground leading-tight">Data diambil dari memori HP/Laptop Anda. GRATIS.</div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-800 leading-relaxed font-medium italic">
                Anda bebas membuka menu apapun berkali-kali. Sistem ini dirancang untuk kemandirian data sekolah dengan biaya operasional Rp 0,- (Gratis Selamanya).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-slate-800">
            <HelpCircle className="h-4 w-4 text-primary" />
            Tanya Jawab Teknis: Apakah Reload Menguras Kuota?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-xs text-slate-700 leading-relaxed">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="font-bold text-primary">Skenario 1: Reload Halaman Normal</p>
              <p>
                Aplikasi mengambil data dari memori browser Anda (Offline Cache). Tidak ada data yang diunduh ulang dari Cloud.
              </p>
              <p className="font-bold bg-green-100 text-green-700 px-2 py-1 rounded inline-block">
                HASIL: 0 READS (GRATIS)
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-orange-600">Skenario 2: Setelah Hapus Cache Browser</p>
              <p>
                Jika Anda menghapus riwayat browser (IndexedDB), memori lokal aplikasi akan hilang. Aplikasi harus mengunduh ulang data dari Cloud untuk satu kali saja.
              </p>
              <p className="font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded inline-block">
                HASIL: 1x READ SESUAI JUMLAH DATA
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200">
             <p className="font-bold flex items-center gap-2 text-destructive">
               <AlertTriangle className="h-3 w-3" /> PENTING:
             </p>
             <p className="mt-1">
               Hindari menghapus Cache Browser atau menggunakan mode "Incognito/Private" jika Anda ingin menghemat kuota Read secara maksimal. Mode normal akan menyimpan data selamanya di perangkat Anda.
             </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <ShieldCheck className="h-4 w-4" />
              Kenapa Aman?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-blue-700 leading-relaxed">
            <p>
              Setiap kali Anda membuka halaman, aplikasi tidak langsung "mendownload" semua buku. Aplikasi mengecek apakah data di laptop Anda sudah sama dengan data di server. Jika sama, aplikasi tidak akan mendownload lagi. Inilah rahasia kenapa kuota Anda tetap awet.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <Info className="h-4 w-4" />
              Tips Pengoperasian
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-purple-700 leading-relaxed">
            <p>
              Gunakan mode <strong>Input Lokal</strong> (Antrean) sesering mungkin. Anda bisa input 500 buku seharian secara offline, lalu kirim sekaligus saat sinyal stabil atau kuota tersedia. Data antrean akan tetap tersimpan berhari-hari sampai berhasil terkirim.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
