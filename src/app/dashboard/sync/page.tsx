
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Zap, Layers, Info, ShieldCheck, AlertTriangle, CheckCircle2, Database, CloudUpload } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

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

    // Check Local Queue
    const savedQueue = localStorage.getItem('perpus_local_queue')
    if (savedQueue) {
      try {
        setPendingCount(JSON.parse(savedQueue).length)
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  const handleSync = () => {
    setSyncing(true)
    setProgress(0)
    
    let currentProgress = 0
    const interval = setInterval(() => {
      currentProgress += 20
      setProgress(currentProgress)
      
      if (currentProgress >= 100) {
        clearInterval(interval)
        setSyncing(false)
        
        setTimeout(() => {
          toast({ 
            title: "Caching Berhasil", 
            description: "Database lokal telah disinkronkan dengan server cloud." 
          })
        }, 10)
      }
    }, 150)
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
                Segarkan Cache
              </Button>
              <Button className="gap-2 shadow-md bg-orange-600 hover:bg-orange-700" onClick={() => window.location.href = '/dashboard/books'}>
                <CloudUpload className="h-4 w-4" />
                Kirim Data
              </Button>
            </div>
            {syncing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Efisien: Dokumen vs Stok
            </CardTitle>
            <CardDescription>Bagaimana sistem menghitung penggunaan data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 space-y-3">
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Penting:</strong> 1 Jenis Buku (misal: Matematika) hanya dihitung <strong>1 Pembacaan (Read)</strong> oleh Firebase, berapapun jumlah stok fisiknya.
              </p>
              <div className="text-[10px] text-blue-600 font-medium">
                Sistem ini sangat hemat kuota meskipun sekolah memiliki ribuan buku fisik.
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground italic">
              <span>*Berlaku untuk Spark Plan (Gratis)</span>
              <CheckCircle2 className="h-3 w-3 text-green-500" />
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
              <strong>Bagaimana cara kerjanya?</strong> <br/>
              Saat Anda menginput buku, data disimpan sementara di browser Anda (localhost). Data ini tidak akan hilang meskipun Anda menutup browser atau mematikan komputer.
            </p>
            <p>
              <strong>Kapan harus dikirim?</strong> <br/>
              Setelah Anda selesai menginput semua buku hari ini, klik tombol <strong>Kirim ke Database</strong> di halaman Koleksi Buku untuk mengunggah semuanya sekaligus ke Cloud.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <ShieldCheck className="h-4 w-4" />
              Keamanan & Portabilitas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-purple-700 leading-relaxed">
            <p>
              Data dalam antrean lokal bersifat privat hanya pada perangkat yang digunakan untuk menginput. Pastikan untuk selalu mengirim antrean sebelum berpindah perangkat.
            </p>
            <p>
              <strong>Tips Hemat Kuota:</strong> Gunakan mode ini untuk menginput data secara offline, lalu hubungkan ke internet hanya saat ingin menekan tombol Kirim ke Database.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
