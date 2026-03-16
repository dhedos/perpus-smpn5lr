
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Database, CloudUpload, CloudDownload, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function SyncPage() {
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleSync = () => {
    setSyncing(true)
    setProgress(0)
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setSyncing(false)
          toast({ title: "Sinkronisasi Berhasil", description: "Seluruh data offline telah diunggah ke cloud." })
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Backup & Sinkronisasi</h1>
        <p className="text-muted-foreground text-sm">Kelola data offline dan cadangan cloud.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm bg-primary/5 border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5 text-primary" />
              Status Cloud
            </CardTitle>
            <CardDescription>Terakhir sinkronisasi: 10 menit yang lalu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data Menunggu</span>
              <span className="font-bold">0 File</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Kesehatan Database</span>
              <Badge className="bg-green-500 hover:bg-green-600 border-none">Optimal</Badge>
            </div>
            <Button className="w-full gap-2" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sinkronisasi Sekarang'}
            </Button>
            {syncing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-secondary" />
              Backup Lokal
            </CardTitle>
            <CardDescription>Simpan salinan database ke penyimpanan lokal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/30 border border-primary/10 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Otomatisasi Backup</p>
                  <p className="text-xs text-muted-foreground">Backup harian pukul 23:59 aktif.</p>
                </div>
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2">
              <CloudDownload className="h-4 w-4" />
              Download Backup (.json)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm border-orange-200 bg-orange-50/50">
        <CardContent className="flex items-start gap-4 p-6">
          <AlertTriangle className="h-6 w-6 text-orange-500 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-orange-800">Peringatan Keamanan</p>
            <p className="text-sm text-orange-700">
              Jangan menghapus cache browser saat aplikasi dalam status "Offline" jika masih ada data yang belum disinkronkan ke Cloud.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
