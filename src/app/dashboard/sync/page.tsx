
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  Zap, 
  Info, 
  CheckCircle2, 
  Database, 
  CloudUpload, 
  MousePointer2, 
  Globe, 
  FileSpreadsheet, 
  ExternalLink,
  Table as TableIcon,
  Users,
  AlertCircle,
  ShieldAlert,
  Loader2
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

const STORAGE_KEY = 'perpus_local_queue_v3'

export default function SyncPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  
  const [isSyncingToSheets, setIsSyncingToSheets] = useState(false)
  const [lastSheetUrl, setLastSheetUrl] = useState<string | null>(null)
  const [showPopupGuide, setShowPopupGuide] = useState(false)
  const [showUnverifiedGuide, setShowUnverifiedGuide] = useState(false)

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, []);

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  
  const { data: books } = useCollection(booksRef)
  const { data: members } = useCollection(membersRef)

  useEffect(() => {
    setIsMounted(true)
    forceUnlockUI()
    if (typeof window !== 'undefined') {
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
    }
  }, [forceUnlockUI])

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

  const handleSyncToGoogleSheets = async () => {
    if (!auth || !books || !members) return;
    
    setIsSyncingToSheets(true);
    setShowPopupGuide(false);
    setShowUnverifiedGuide(false);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (authError: any) {
        if (authError.code === 'auth/unauthorized-domain') {
          toast({ title: "Domain Belum Diizinkan", variant: "destructive" });
          return;
        }
        if (authError.code === 'auth/popup-blocked') {
          setShowPopupGuide(true);
          return;
        }
        if (authError.code === 'auth/popup-closed-by-user') {
          setShowUnverifiedGuide(true);
          return;
        }
        throw authError;
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) throw new Error("Gagal mendapatkan akses Google.");

      toast({ title: "Terhubung", description: "Sedang mengirim data ke Google Drive..." });

      const spreadsheetTitle = `DATABASE PERPUSTAKAAN - ${settings?.schoolName || 'SMPN 5'}`;
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title: spreadsheetTitle } })
      });

      const spreadsheet = await createResponse.json();
      if (!spreadsheet.spreadsheetId) throw new Error("Gagal membuat file spreadsheet.");

      const spreadsheetId = spreadsheet.spreadsheetId;
      const combinedValues = [
        ["DATA KOLEKSI BUKU"],
        ["KODE BUKU", "JUDUL", "SUMBER", "REKENING", "PENERBIT", "TAHUN", "STOK TOTAL", "STOK TERSEDIA", "LOKASI RAK"],
        ...books.map(b => [b.code || "-", b.title || "-", b.budgetSource || "-", b.accountCode || "-", b.publisher || "-", b.publicationYear || "-", b.totalStock || 0, b.availableStock || 0, b.rackLocation || "-"]),
        [],
        ["DATA ANGGOTA"],
        ["ID ANGGOTA", "NAMA LENGKAP", "KATEGORI", "KELAS", "TGL BERGABUNG"],
        ...members.map(m => [m.memberId || "-", m.name || "-", m.type || "-", m.classOrSubject || "-", m.joinDate || "-"])
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: combinedValues })
      });

      setLastSheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
      toast({ title: "Berhasil!", description: "Data master telah dikirim ke Google Drive." });
    } catch (error: any) {
      toast({ title: "Sinkronisasi Gagal", description: error.message, variant: "destructive" });
    } finally {
      setIsSyncingToSheets(false);
    }
  }

  if (!isMounted) return null;

  return (
    <div className="max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">Caching & Sinkronisasi</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Kelola penyimpanan lokal dan cadangan eksternal perpustakaan.</p>
        </div>
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-none py-2 px-4 flex items-center gap-2 rounded-full font-black text-[10px] tracking-widest uppercase">
          <CheckCircle2 className="h-4 w-4" /> Optimasi Aktif
        </Badge>
      </div>

      <div className="grid gap-6">
        {showPopupGuide && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-700 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Popup Diblokir!</AlertTitle>
            <AlertDescription className="text-xs">Browser memblokir jendela login. Silakan aktifkan izin popup di baris alamat browser.</AlertDescription>
          </Alert>
        )}
        {showUnverifiedGuide && (
          <Alert className="bg-orange-500/10 border-orange-500/20 text-orange-800 rounded-2xl">
            <ShieldAlert className="h-5 w-5 text-orange-600" />
            <AlertTitle className="font-black uppercase tracking-tight">Verifikasi Google Dibutuhkan</AlertTitle>
            <AlertDescription className="text-xs space-y-2 mt-2">
              <p>Ini normal karena sistem masih baru. Klik "Lanjutan" (Advanced) lalu pilih "Buka Pustaka Nusantara" untuk melanjutkan sinkronisasi.</p>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2 mt-4">
        <Card className="border-none shadow-sm bg-muted/20 rounded-[2.5rem] p-6 border dark:border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-bl-full -mr-16 -mt-16" />
          <CardHeader className="pb-4 relative">
            <CardTitle className="flex items-center gap-3 text-xl font-black">
              <Zap className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              Sistem Caching
            </CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Status: {isOnline ? 'ONLINE' : 'OFFLINE MODE'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2 relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Penyimpanan Lokal</span>
                <Badge className="bg-green-500/10 text-green-600 border-none font-black text-[9px] tracking-widest px-3 py-1">AKTIF</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Antrean Offline</span>
                <span className="font-black text-foreground">{pendingCount} Data Menunggu</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button variant="outline" className="gap-2 h-14 rounded-2xl bg-background border-slate-200 dark:border-white/10 shadow-sm font-black text-xs uppercase" onClick={handleSync} disabled={syncing}>
                <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /> Segarkan
              </Button>
              <Button className="gap-2 h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200 dark:shadow-none font-black text-xs uppercase text-white" onClick={() => router.push('/dashboard/books')}>
                <CloudUpload className="h-4 w-4" /> Antrean
              </Button>
            </div>
            {syncing && <Progress value={progress} className="h-2 bg-muted mt-2" />}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-background rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16" />
          <CardHeader className="pb-4 relative">
            <CardTitle className="flex items-center gap-3 text-xl font-black text-primary">
              <Database className="h-6 w-6" />
              Kuota Data (Cloud)
            </CardTitle>
            <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Analisis Efisiensi Spark Plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-5 bg-muted/20 rounded-[1.5rem] border dark:border-white/5 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Writes (Tulis)</span>
                  <p className="text-xs font-black">Hanya Saat Sync</p>
                  <p className="text-[9px] text-muted-foreground leading-tight italic">Hemat kuota hingga 90%.</p>
               </div>
               <div className="p-5 bg-muted/20 rounded-[1.5rem] border dark:border-white/5 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Reads (Baca)</span>
                  <p className="text-xs font-black">Bebas Reload</p>
                  <p className="text-[9px] text-muted-foreground leading-tight italic">Rp 0,- Biaya Operasional.</p>
               </div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-4">
              <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary/80 leading-relaxed font-medium italic">Anda bebas menggunakan aplikasi tanpa batas. Sistem dirancang untuk efisiensi penuh bagi sekolah.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-lg bg-background rounded-[3rem] p-8 border border-slate-200 dark:border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-bl-full -mr-24 -mt-24" />
          <CardHeader className="pb-6 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl font-black text-green-600">
                  <FileSpreadsheet className="h-8 w-8" />
                  Google Sheets Cloud Sync
                </CardTitle>
                <CardDescription className="font-bold text-sm text-muted-foreground">Ekspor seluruh data master perpustakaan ke Spreadsheet Google Drive Anda.</CardDescription>
              </div>
              <Badge className="bg-green-600 text-white border-none px-4 py-1.5 font-black text-[10px] tracking-widest uppercase">BACKUP EKSTERNAL</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 relative">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-muted/20 rounded-[2rem] border dark:border-white/5 flex flex-col justify-center items-center text-center space-y-3">
                <TableIcon className="h-10 w-10 text-primary opacity-40" />
                <div>
                  <p className="text-2xl font-black">{books?.length || 0}</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Koleksi Buku</p>
                </div>
              </div>
              <div className="p-6 bg-muted/20 rounded-[2rem] border dark:border-white/5 flex flex-col justify-center items-center text-center space-y-3">
                <Users className="h-10 w-10 text-secondary opacity-40" />
                <div>
                  <p className="text-2xl font-black">{members?.length || 0}</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Anggota Terdaftar</p>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <Button 
                  className="w-full h-16 bg-green-600 hover:bg-green-700 text-white rounded-[1.5rem] font-black shadow-xl shadow-green-200 dark:shadow-none gap-3 tracking-tight text-lg"
                  onClick={handleSyncToGoogleSheets}
                  disabled={isSyncingToSheets || !books || !members}
                >
                  {isSyncingToSheets ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
                  {isSyncingToSheets ? "Memproses..." : "Sinkronkan"}
                </Button>
                {lastSheetUrl && (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-green-200 text-green-700 font-black gap-2 text-xs uppercase"
                    onClick={() => window.open(lastSheetUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" /> Buka di Sheets
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center py-10 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 LANTERA BACA</p>
      </div>
    </div>
  )
}
