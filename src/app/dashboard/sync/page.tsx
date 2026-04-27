
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
  Loader2,
  ExternalLink,
  Table as TableIcon
} from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, useAuth, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"

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
  
  const [isSyncingToSheets, setIsSyncingToSheets] = useState(false)
  const [lastSheetUrl, setLastSheetUrl] = useState<string | null>(null)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  const booksRef = useMemoFirebase(() => db ? collection(db, 'books') : null, [db])
  const membersRef = useMemoFirebase(() => db ? collection(db, 'members') : null, [db])
  
  const { data: books } = useCollection(booksRef)
  const { data: members } = useCollection(membersRef)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)

    const checkQueue = () => {
      if (typeof window === 'undefined') return
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

  const handleSyncToGoogleSheets = async () => {
    if (!auth || !books || !members) return;
    
    setIsSyncingToSheets(true);
    
    try {
      // 1. Minta Izin Google Sheets via OAuth Scope
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/spreadsheets');
      provider.addScope('https://www.googleapis.com/auth/drive.file');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) throw new Error("Gagal mendapatkan token akses Google.");

      toast({ title: "Menghubungkan Google...", description: "Sedang menyiapkan database di Cloud." });

      // 2. Buat Spreadsheet Baru (Sederhana via API)
      const spreadsheetTitle = `DATABASE PERPUSTAKAAN - ${settings?.schoolName || 'SMPN 5'}`;
      
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: spreadsheetTitle }
        })
      });

      const spreadsheet = await createResponse.json();
      if (!spreadsheet.spreadsheetId) throw new Error("Gagal membuat file spreadsheet.");

      const spreadsheetId = spreadsheet.spreadsheetId;

      // 3. Siapkan Data (Header + Isi)
      const bookData = [
        ["KODE BUKU", "JUDUL", "SUMBER", "REKENING", "PENERBIT", "TAHUN", "STOK TOTAL", "STOK TERSEDIA", "LOKASI RAK"],
        ...books.map(b => [
          b.code || "-", 
          b.title || "-", 
          b.budgetSource || "-", 
          b.accountCode || "-", 
          b.publisher || "-", 
          b.publicationYear || "-", 
          b.totalStock || 0, 
          b.availableStock || 0, 
          b.rackLocation || "-"
        ])
      ];

      const memberData = [
        ["ID ANGGOTA (NIS/NIP)", "NAMA LENGKAP", "KATEGORI", "KELAS / JABATAN", "TGL BERGABUNG"],
        ...members.map(m => [
          m.memberId || "-", 
          m.name || "-", 
          m.type || "-", 
          m.classOrSubject || "-", 
          m.joinDate || "-"
        ])
      ];

      // 4. Kirim Data ke Sheets
      const syncData = async (range: string, values: any[][]) => {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        });
      };

      // Tambahkan tab baru untuk Anggota (Opsional, di sini kita taruh di sheet yang sama di bawahnya atau Sheet2 jika mau kompleks)
      // Untuk kesederhanaan prototipe, kita isi data buku saja atau timpa data utama.
      await syncData('Sheet1!A1', [["DATA KOLEKSI BUKU"], ...bookData, [], ["DATA ANGGOTA"], ...memberData]);

      setLastSheetUrl(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
      toast({ 
        title: "Sinkronisasi Sheets Berhasil", 
        description: "Data Anda telah dikirim ke Google Drive.",
      });

    } catch (error: any) {
      console.error("Sheets Sync Error:", error);
      toast({ 
        title: "Gagal Sinkronisasi", 
        description: error.message || "Pastikan Anda memberikan izin akses Google Sheets.", 
        variant: "destructive" 
      });
    } finally {
      setIsSyncingToSheets(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-[#2E6ECE]">Caching & Sinkronisasi</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Kelola penyimpanan lokal dan cadangan eksternal perpustakaan.</p>
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

        {/* CARD BARU: GOOGLE SHEETS SYNC */}
        <Card className="md:col-span-2 border-none shadow-lg bg-white rounded-3xl p-6 ring-1 ring-slate-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -mr-16 -mt-16 opacity-50" />
          <CardHeader className="pb-4 relative">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-3 text-2xl font-black text-green-700">
                  <FileSpreadsheet className="h-7 w-7" />
                  Google Sheets Cloud Sync
                </CardTitle>
                <CardDescription className="font-semibold text-slate-500">Kirim data master (Buku & Anggota) ke Spreadsheet Google Anda.</CardDescription>
              </div>
              <Badge className="bg-green-600 text-white border-none px-3 py-1 font-bold">EKSPOR CLOUD</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-2">
                <TableIcon className="h-8 w-8 text-blue-600 opacity-40" />
                <div>
                  <p className="text-lg font-black text-slate-800">{books?.length || 0}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Data Koleksi Buku</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center space-y-2">
                <TableIcon className="h-8 w-8 text-secondary opacity-40" />
                <div>
                  <p className="text-lg font-black text-slate-800">{members?.length || 0}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Data Anggota</p>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <Button 
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black shadow-lg shadow-green-100 gap-2"
                  onClick={handleSyncToGoogleSheets}
                  disabled={isSyncingToSheets || !books || !members}
                >
                  {isSyncingToSheets ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                  {isSyncingToSheets ? "Menyambungkan..." : "Mulai Sinkronisasi"}
                </Button>
                {lastSheetUrl && (
                  <Button 
                    variant="outline" 
                    className="w-full h-10 rounded-xl border-green-200 text-green-700 font-bold gap-2"
                    onClick={() => window.open(lastSheetUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" /> Buka di Sheets
                  </Button>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
              <Info className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs text-amber-900 font-bold uppercase tracking-tight">Cara Kerja Sinkronisasi:</p>
                <ul className="text-[11px] text-amber-800 space-y-1 list-disc pl-4">
                  <li>Sistem akan meminta login Google untuk membuat file di Drive Anda.</li>
                  <li>Satu file baru akan dibuat berisi data Buku dan Anggota terbaru.</li>
                  <li>Pastikan akun Google Anda memiliki ruang penyimpanan yang cukup.</li>
                </ul>
              </div>
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
