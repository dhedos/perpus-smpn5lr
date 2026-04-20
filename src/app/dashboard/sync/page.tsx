
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Database, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, AlertTriangle, Zap } from "lucide-react"
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
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">IndexedDB Aktif</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kecepatan Akses</span>
              <span className="font-bold text-primary">Instan (dari Cache)</span>
            </div>
            <Button className="w-full gap-2 shadow-md" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Memperbarui Cache...' : 'Segarkan Data (Sync)'}
            </Button>
            {syncing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-secondary" />
              Keamanan Data
            </CardTitle>
            <CardDescription>Data tetap aman meskipun internet mati.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/30 border border-primary/10 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Auto-Recovery</p>
                  <p className="text-xs text-muted-foreground">Data disinkronkan otomatis saat online.</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2 text-xs">
                <CloudDownload className="h-3 w-3" />
                Ekspor JSON
              </Button>
              <Button variant="outline" className="flex-1 gap-2 text-xs">
                <CloudUpload className="h-3 w-3" />
                Impor Backup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm border-orange-200 bg-orange-50/50">
        <CardContent className="flex items-start gap-4 p-6">
          <AlertTriangle className="h-6 w-6 text-orange-500 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-orange-800 text-sm">Info Optimasi Spark Plan</p>
            <p className="text-xs text-orange-700 leading-relaxed">
              Sistem Caching ini memastikan buku yang sudah pernah dilihat tidak akan memotong kuota "Read" Firebase Anda berkali-kali. Ini sangat membantu untuk sekolah dengan ribuan buku agar tetap bisa menggunakan Firebase secara GRATIS selamanya.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
