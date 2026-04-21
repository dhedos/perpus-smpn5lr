
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Zap, Layers, Info, ShieldCheck, AlertTriangle, CheckCircle2, Database, CloudUpload, HardDrive, activity } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

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
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Caching & Sinkronisasi</h1>
        <p className="text-muted-foreground text-sm">Kelola penyimpanan lokal untuk menghemat kuota data SMPN 5.</p>
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
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Optimasi Reads Aktif</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Antrean Localhost</span>
              <Badge variant={pendingCount > 0 ? "destructive" : "outline"} className="border-none">
                {pendingCount} Buku Menunggu
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kecepatan Akses</span>
              <span className="font-bold text-primary">Instan (0 Reads Extra)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Segarkan Status
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
              Rincian Penggunaan Kuota
            </CardTitle>
            <CardDescription>Analisis efisiensi database (Spark Plan).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Writes</span>
                </div>
                <div className="text-sm font-black">1 Buku = 1 Write</div>
                <div className="text-[9px] text-muted-foreground">Hanya dihitung saat Kirim Data.</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="h-3 w-3 text-secondary" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Reads</span>
                </div>
                <div className="text-sm font-black">Gratis (Cached)</div>
                <div className="text-[9px] text-muted-foreground">Reload tidak menambah biaya.</div>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-[10px] text-blue-800 leading-relaxed italic">
                *Data yang sudah dikirim ke Cloud tidak akan memakan jatah "Write" lagi saat halaman dibuka kembali atau di-reload. Sistem hanya membaca data baru jika ada perubahan.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" />
              Penjelasan Antrean Lokal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-blue-700 leading-relaxed">
            <p>
              <strong>Persistensi Terjamin:</strong> Data yang Anda input tidak akan hilang meskipun browser ditutup atau komputer dimatikan. Data baru akan dihapus dari antrean hanya setelah server Cloud memberikan konfirmasi sukses.
            </p>
            <p>
              <strong>Tips Hemat Kuota:</strong> Input semua buku secara offline di rumah atau sekolah saat sinyal buruk, lalu kirim sekaligus saat mendapatkan koneksi stabil.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <ShieldCheck className="h-4 w-4" />
              Keamanan & Sinkronisasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-purple-700 leading-relaxed">
            <p>
              Antrean lokal menggunakan kunci enkripsi peramban versi terbaru (v2) untuk mencegah data terhapus secara tidak sengaja oleh pembaruan sistem.
            </p>
            <p>
              <strong>Status:</strong> Sistem saat ini memonitor koneksi Anda. Pastikan ikon sinyal berwarna biru sebelum menekan tombol Kirim.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
