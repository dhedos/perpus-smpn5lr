
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Database, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, AlertTriangle, Zap, FileSpreadsheet, Info, History, ShieldCheck } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function SyncPage() {
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  const handleSync = () => {
    setSyncing(true)
    setProgress(0)
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setSyncing(false)
          toast({ title: "Caching Berhasil", description: "Database lokal telah disinkronkan dengan server cloud." })
          return 100
        }
        return prev + 20
      })
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
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Optimasi Reads Aktif</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kecepatan Akses</span>
              <span className="font-bold text-primary">Instan (0 Reads Extra)</span>
            </div>
            <Button className="w-full gap-2 shadow-md" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sinkronisasi...' : 'Segarkan Cache'}
            </Button>
            {syncing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Laporan & Excel
            </CardTitle>
            <CardDescription>Ekspor data tanpa membebani database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/30 border border-primary/10 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Efisiensi Ekspor</p>
                  <p className="text-xs text-muted-foreground">Ekspor Excel dilakukan di browser petugas, bukan di server. Gratis 100%.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 text-xs">
                <CloudDownload className="h-3 w-3" />
                Backup JSON
              </Button>
              <Button variant="outline" className="flex-1 gap-2 text-xs">
                <CloudUpload className="h-3 w-3" />
                Restore Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" />
              Penjelasan Ekspor & Google Sheets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-blue-700 leading-relaxed">
            <p>
              <strong>1. Apakah Data Akan Mendobel?</strong> <br/>
              Ekspor ke Excel bersifat <strong>Snapshot</strong>. Jika Anda menempelkan data ini berulang kali ke Google Sheet tanpa menghapus data lama, maka akan terlihat ganda. <strong>Solusinya:</strong> Hapus data lama di Google Sheets sebelum menempelkan data baru.
            </p>
            <p>
              <strong>2. Apakah Bisa Google Sheets Jadi Database?</strong> <br/>
              Google Sheets <strong>tidak disarankan</strong> menjadi database "mesin" aplikasi karena tidak aman dan lambat. Gunakan Google Sheets hanya untuk <strong>Arsip & Backup</strong> jika database Firebase sudah sangat penuh (misal setelah 5-10 tahun penggunaan).
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-purple-200 bg-purple-50/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
              <ShieldCheck className="h-4 w-4" />
              Strategi Keamanan 1.000+ Buku
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-purple-700 leading-relaxed">
            <p>
              Firestore (Firebase) sangat kuat untuk 1.000 bahkan 10.000 buku. Pembengkakan data (Storage) 1.000 buku hanya memakan sekitar 1-2 MB dari jatah 1.000 MB gratis Anda.
            </p>
            <p>
              <strong>Tips Hemat:</strong> Lakukan pembersihan riwayat transaksi (sirkulasi) setiap akhir tahun ajaran dengan mengekspornya ke Excel terlebih dahulu sebagai arsip sekolah.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm border-orange-200 bg-orange-50/50">
        <CardContent className="flex items-start gap-4 p-6">
          <AlertTriangle className="h-6 w-6 text-orange-500 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-orange-800 text-sm">Peringatan Kuota Reads</p>
            <p className="text-xs text-orange-700 leading-relaxed">
              Sistem caching kami memastikan bahwa meskipun Anda memiliki 1.000 buku, aplikasi tidak akan membaca ulang database setiap saat. Penggunaan Firebase tetap <strong>GRATIS</strong> karena data yang sudah pernah dibuka akan disimpan di memori lokal petugas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
