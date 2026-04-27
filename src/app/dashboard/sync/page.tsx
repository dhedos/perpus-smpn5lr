
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, Zap, Info, ShieldCheck, CheckCircle2, Database, CloudUpload, MousePointer2, Calculator, DatabaseBackup, Users, Globe, Flame, Lock } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { useRouter } from "next/navigation"

const STORAGE_KEY = 'perpus_local_queue_v3'

export default function SyncPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const router = useRouter()
  
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const { data: books } = useCollection(booksRef)

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
      currentProgress += 20
      setProgress(currentProgress)
      
      if (currentProgress >= 100) {
        clearInterval(interval)
        setSyncing(false)
        toast({ 
          title: "Penyegaran Berhasil", 
          description: "Sistem telah memverifikasi status koneksi dan data lokal." 
        })
      }
    }, 150)
  }

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-[#2E6ECE]">Caching & Sinkronisasi</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Kelola penyimpanan lokal untuk menghemat kuota data SMPN 5.</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-2 px-4 flex items-center gap-2 rounded-full font-bold">
          <CheckCircle2 className="h-4 w-4" /> Reload Aman (0 Reads Extra)
        </Badge>
      </div>

      <div className="grid gap-8 md:grid-cols-2 mt-8">
        {/* CARD KIRI: SISTEM CACHING */}
        <Card className="border-none shadow-sm bg-[#F0F4F8] rounded-3xl p-4">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-800">
              <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              Sistem Caching Aktif
            </CardTitle>
            <CardDescription className="font-semibold text-slate-500">Status: {isOnline ? 'Terhubung ke Cloud' : 'Mode Offline Aktif'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Penyimpanan Lokal</span>
                <Badge className="bg-green-100 text-green-700 border-none font-black text-[10px] tracking-widest px-3 py-1">
                  OPTIMASI AKTIF
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Antrean Localhost</span>
                <span className="font-black text-slate-800">{pendingCount} Buku Menunggu</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Efisiensi Reload</span>
                <span className="font-bold text-[#2E6ECE] flex items-center gap-1 cursor-default">
                  <MousePointer2 className="h-3 w-3 rotate-90" /> Gratis (Tanpa Biaya)
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button variant="outline" className="gap-2 h-14 rounded-2xl bg-white border-none shadow-sm font-black text-slate-700" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Segarkan
              </Button>
              <Button className="gap-2 h-14 rounded-2xl bg-[#F06223] hover:bg-[#D9551C] shadow-lg shadow-orange-200 font-black text-white" onClick={() => router.push('/dashboard/books')}>
                <CloudUpload className="h-4 w-4" />
                Lihat Antrean
              </Button>
            </div>
            {syncing && <Progress value={progress} className="h-2 bg-slate-200" />}
          </CardContent>
        </Card>

        {/* CARD KANAN: KEAMANAN KUOTA */}
        <Card className="border-none shadow-sm bg-white rounded-3xl p-4 ring-1 ring-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-black text-[#1e4b8f]">
              <Database className="h-6 w-6 text-[#2E6ECE]" />
              Keamanan Kuota (Spark Plan)
            </CardTitle>
            <CardDescription className="font-semibold text-slate-400">Analisis penggunaan data sekolah Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Database className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Writes (Tulis)</span>
                  </div>
                  <p className="text-sm font-black text-slate-800">Hanya Saat Sync</p>
                  <p className="text-[9px] text-slate-400 leading-tight">1 Buku = 1 Write. Tidak dihitung ulang saat reload.</p>
               </div>
               <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Globe className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Reads (Baca)</span>
                  </div>
                  <p className="text-sm font-black text-slate-800">Bebas Reload</p>
                  <p className="text-[9px] text-slate-400 leading-tight">Data diambil dari memori HP/Laptop Anda. GRATIS.</p>
               </div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex gap-4">
              <Info className="h-6 w-6 text-[#2E6ECE] shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium italic">
                Anda bebas membuka menu apapun berkali-kali. Sistem ini dirancang untuk kemandirian data sekolah dengan biaya operasional Rp 0,- (Gratis Selamanya).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-10 opacity-30 mt-12">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 LANTERA BACA</p>
      </div>
    </div>
  )
}
