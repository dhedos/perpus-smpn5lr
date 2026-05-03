
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Library, Bell, Shield, Save, Loader2, Coins, CalendarDays, FileText, MapPin, UserCheck, Type, Wallet, LockKeyhole, Image as ImageIcon, Upload, Fingerprint, Clock, ShieldAlert, Ghost } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

// Firebase
import { 
  useFirestore, 
  useDoc, 
  errorEmitter,
  useMemoFirebase,
  useUser
} from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function SettingsPage() {
  const db = useFirestore()
  const { user, isAdmin } = useUser()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [settings, setSettings] = useState({
    libraryName: "LANTERA BACA",
    librarySubtitle: "SMPN 5 LANGKE REMBONG",
    libraryLogoUrl: "",
    schoolName: "SMP NEGERI 5 LANGKE REMBONG",
    loanPeriod: 7,
    collectiveLoanHours: 2,
    fineAmount: 500,
    damagedBookFine: 10000,
    lostBookFine: 50000,
    academicYear: "2024/2025",
    whatsappReminder: true,
    emailReport: true,
    digitalCatalog: true,
    govtInstitution: "PEMERINTAH KABUPATEN MANGGARAI",
    eduDept: "DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA",
    schoolAddress: "Mando, Compang Carep Kab. Manggarai NTT",
    reportCity: "Mando",
    principalName: "Lodovikus Jangkar, S.Pd.Gr",
    principalNip: "198507272011011020",
    isDataLocked: false,
    budgetSources: "BOSP, DAK, Hibah"
  })

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, []);

  useEffect(() => {
    forceUnlockUI();
  }, [forceUnlockUI]);

  const settingsDocRef = useMemoFirebase(() => 
    db ? doc(db, 'settings', 'general') : null, 
  [db])
  
  const { data: remoteSettings, isLoading: loading } = useDoc(settingsDocRef)

  useEffect(() => {
    if (remoteSettings) {
      setSettings(prev => ({ 
        ...prev, 
        ...remoteSettings,
        libraryName: remoteSettings.libraryName || "LANTERA BACA",
        librarySubtitle: remoteSettings.librarySubtitle || "SMPN 5 LANGKE REMBONG",
        libraryLogoUrl: remoteSettings.libraryLogoUrl || "",
        loanPeriod: Number(remoteSettings.loanPeriod ?? 7),
        collectiveLoanHours: Number(remoteSettings.collectiveLoanHours ?? 2),
        fineAmount: Number(remoteSettings.fineAmount ?? 500),
        damagedBookFine: Number(remoteSettings.damagedBookFine ?? 10000),
        lostBookFine: Number(remoteSettings.lostBookFine ?? 50000),
        isDataLocked: remoteSettings.isDataLocked === true,
        budgetSources: remoteSettings.budgetSources || "BOSP, DAK, Hibah"
      }))
    }
  }, [remoteSettings])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File Terlalu Besar", description: "Maksimal ukuran logo adalah 2MB.", variant: "destructive" })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, libraryLogoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveSettings = () => {
    if (!db || !settingsDocRef) return
    setIsSaving(true)
    
    const dataToSave = {
      ...settings,
      loanPeriod: Math.max(1, Number(settings.loanPeriod)),
      collectiveLoanHours: Math.max(1, Number(settings.collectiveLoanHours)),
      fineAmount: Math.max(0, Number(settings.fineAmount)),
      damagedBookFine: Math.max(0, Number(settings.damagedBookFine)),
      lostBookFine: Math.max(0, Number(settings.lostBookFine)),
      isDataLocked: Boolean(settings.isDataLocked)
    }
    
    setDoc(settingsDocRef, dataToSave, { merge: true })
      .then(() => {
        toast({
          title: "Berhasil Disimpan",
          description: "Pengaturan sistem dan kebijakan keamanan telah diperbarui.",
        })
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({path: settingsDocRef.path, operation: 'write', requestResourceData: dataToSave}));
      })
      .finally(() => setIsSaving(false))
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Pengaturan Sistem</h1>
          <p className="text-muted-foreground text-sm">Konfigurasi profil sekolah dan kebijakan sirkulasi.</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-none mb-1 font-black text-[10px] uppercase tracking-widest px-3 py-1">
          ROLE: {user?.role || "Petugas"}
        </Badge>
      </div>

      <Tabs defaultValue="general" className="w-full" onValueChange={() => forceUnlockUI()}>
        <TabsList className="grid w-full grid-cols-4 h-14 bg-muted/50 rounded-2xl p-1">
          <TabsTrigger value="general" className="gap-2 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"><Library className="h-4 w-4" /> Umum</TabsTrigger>
          <TabsTrigger value="report" className="gap-2 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"><FileText className="h-4 w-4" /> Kop Laporan</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"><Bell className="h-4 w-4" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="security" className="gap-2 rounded-xl font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"><Shield className="h-4 w-4" /> Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-8">
          <Card className="border-none shadow-sm overflow-hidden bg-transparent">
            <CardHeader className="bg-muted/20 border-b dark:border-white/5">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Kebijakan Sirkulasi Utama</CardTitle>
              <CardDescription className="text-xs">Atur identitas judul perpustakaan, logo, denda, dan sumber anggaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-2">Nama Utama (Judul)</Label>
                    <Input 
                      value={settings.libraryName} 
                      onChange={(e) => setSettings({ ...settings, libraryName: e.target.value.toUpperCase() })}
                      className="bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 h-12 rounded-xl font-black text-primary"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-2">Sub-judul / Unit</Label>
                    <Input 
                      value={settings.librarySubtitle} 
                      onChange={(e) => setSettings({ ...settings, librarySubtitle: e.target.value })}
                      className="bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 h-12 rounded-xl font-bold"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-2">Logo Perpustakaan</Label>
                    <div className="flex gap-4 items-center">
                      <div className="w-20 h-20 rounded-2xl border-2 border-primary/20 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-xl">
                        {settings.libraryLogoUrl ? (
                          <img src={settings.libraryLogoUrl} alt="Logo" className="w-14 h-14 object-contain" />
                        ) : (
                          <Library className="h-10 w-10 text-primary/10" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        <Button variant="secondary" size="sm" className="w-full gap-2 rounded-xl h-10 bg-[#33CCF7] hover:bg-[#2BB8E0] text-white" onClick={() => logoInputRef.current?.click()}><Upload className="h-4 w-4" /> Unggah Baru</Button>
                        <p className="text-[9px] text-muted-foreground italic px-1">Gunakan format PNG/JPG (Maks 2MB).</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10">
                  <div className="grid gap-3">
                    <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-primary"><CalendarDays className="h-3 w-3" /> Pinjam Pribadi (Hari)</Label>
                    <div className="flex items-center gap-4">
                      <Input type="number" value={settings.loanPeriod} onChange={(e) => setSettings({ ...settings, loanPeriod: Number(e.target.value) })} className="bg-background border-primary/20 h-14 text-2xl font-black w-24 text-center rounded-2xl" />
                      <span className="text-xs font-bold text-muted-foreground uppercase">Hari Kalender</span>
                    </div>
                  </div>
                  <div className="grid gap-3 pt-2">
                    <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-blue-600"><Clock className="h-3 w-3" /> Pinjam Kolektif (Jam)</Label>
                    <div className="flex items-center gap-4">
                      <Input type="number" value={settings.collectiveLoanHours} onChange={(e) => setSettings({ ...settings, collectiveLoanHours: Number(e.target.value) })} className="bg-background border-blue-200 h-14 text-2xl font-black w-24 text-center text-blue-600 rounded-2xl" />
                      <span className="text-xs font-bold text-muted-foreground uppercase">Jam Efektif</span>
                    </div>
                  </div>
                  <div className="grid gap-3 pt-2">
                    <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-orange-600"><Coins className="h-3 w-3" /> Denda Terlambat</Label>
                    <div className="flex items-center">
                      <div className="bg-orange-100 dark:bg-orange-950 px-4 h-14 flex items-center rounded-l-2xl font-black text-orange-600 border-y border-l border-orange-200 dark:border-orange-800">Rp</div>
                      <Input type="number" value={settings.fineAmount} onChange={(e) => setSettings({ ...settings, fineAmount: Number(e.target.value) })} className="bg-background border-orange-200 dark:border-orange-800 h-14 text-xl font-black text-orange-600 rounded-l-none rounded-r-2xl border-l-0" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/10 mt-2">
                    <div className="grid gap-3">
                      <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-orange-600"><ShieldAlert className="h-3 w-3" /> Denda Buku Rusak</Label>
                      <div className="flex items-center">
                        <div className="bg-orange-50 dark:bg-orange-950/50 px-3 h-12 flex items-center rounded-l-xl font-black text-orange-600 border-y border-l border-orange-200 dark:border-orange-800">Rp</div>
                        <Input type="number" value={settings.damagedBookFine} onChange={(e) => setSettings({ ...settings, damagedBookFine: Number(e.target.value) })} className="bg-background border-orange-200 dark:border-orange-800 h-12 text-base font-black text-orange-600 rounded-l-none rounded-r-xl border-l-0" />
                      </div>
                    </div>
                    <div className="grid gap-3">
                      <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-red-600"><Ghost className="h-3 w-3" /> Denda Buku Hilang</Label>
                      <div className="flex items-center">
                        <div className="bg-red-50 dark:bg-red-950/50 px-3 h-12 flex items-center rounded-l-xl font-black text-red-600 border-y border-l border-red-200 dark:border-red-800">Rp</div>
                        <Input type="number" value={settings.lostBookFine} onChange={(e) => setSettings({ ...settings, lostBookFine: Number(e.target.value) })} className="bg-background border-red-200 dark:border-red-800 h-12 text-base font-black text-red-600 rounded-l-none rounded-r-xl border-l-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-8 border-t dark:border-white/10">
                <Button className="gap-2 h-14 px-12 shadow-xl shadow-primary/20 rounded-[1.5rem] font-black tracking-tight" onClick={handleSaveSettings} disabled={isSaving || loading}>
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  SIMPAN SEMUA KEBIJAKAN
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-8">
          <Card className="border-none shadow-sm overflow-hidden bg-transparent">
            <CardHeader className="bg-muted/20 border-b dark:border-white/5">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Konfigurasi Kop Laporan</CardTitle>
              <CardDescription className="text-xs">Sesuaikan identitas sekolah untuk pencetakan laporan sirkulasi resmi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Instansi Pemerintah</Label>
                    <Input value={settings.govtInstitution} onChange={(e) => setSettings({ ...settings, govtInstitution: e.target.value })} className="bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 h-12 rounded-xl font-bold" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Dinas Pendidikan</Label>
                    <Input value={settings.eduDept} onChange={(e) => setSettings({ ...settings, eduDept: e.target.value })} className="bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 h-12 rounded-xl font-bold" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest">Nama Sekolah Utama</Label>
                    <Input value={settings.schoolName} onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })} className="bg-background dark:bg-muted/20 border-slate-200 dark:border-white/10 h-12 rounded-xl font-black text-primary" />
                  </div>
                </div>
                <div className="space-y-6 p-6 bg-muted/20 rounded-[2rem] border dark:border-white/10">
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-2"><MapPin className="h-3 w-3" /> Lokasi Kota Laporan</Label>
                    <Input value={settings.reportCity} onChange={(e) => setSettings({ ...settings, reportCity: e.target.value })} className="bg-background h-11 rounded-xl font-bold" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-2"><UserCheck className="h-3 w-3" /> Nama Kepala Sekolah</Label>
                    <Input value={settings.principalName} onChange={(e) => setSettings({ ...settings, principalName: e.target.value })} className="bg-background h-11 rounded-xl font-black" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground tracking-widest flex items-center gap-2"><Fingerprint className="h-3 w-3" /> NIP (Nomor Induk Pegawai)</Label>
                    <Input value={settings.principalNip} onChange={(e) => setSettings({ ...settings, principalNip: e.target.value })} className="bg-background h-11 rounded-xl font-mono text-sm" placeholder="1985..." />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t dark:border-white/10">
                <Button className="gap-2 h-14 px-10 shadow-lg rounded-[1.5rem] font-black" onClick={handleSaveSettings} disabled={isSaving}><Save className="h-5 w-5" /> SIMPAN KOP LAPORAN</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-8">
          <Card className="border-none shadow-sm bg-transparent">
            <CardHeader className="bg-muted/20 border-b dark:border-white/5">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Notifikasi & Pengingat</CardTitle>
              <CardDescription className="text-xs">Atur sistem pengingat otomatis untuk keterlambatan pengembalian buku.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              <div className="flex items-center justify-between p-6 bg-muted/20 rounded-[2rem] border dark:border-white/10">
                <div className="space-y-1">
                  <Label className="text-base font-black uppercase tracking-tight">Status WhatsApp Reminder</Label>
                  <p className="text-xs text-muted-foreground font-medium">Kirim instruksi pengembalian 1 hari sebelum jatuh tempo secara otomatis.</p>
                </div>
                <Switch 
                  checked={settings.whatsappReminder} 
                  onCheckedChange={(v) => setSettings({ ...settings, whatsappReminder: v })}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={isSaving} className="h-12 px-8 rounded-xl font-bold shadow-lg">Simpan Notifikasi</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-8">
          <Card className="border-none shadow-sm bg-transparent">
            <CardHeader className="bg-muted/20 border-b dark:border-white/5">
              <CardTitle className="text-lg font-black uppercase tracking-tight text-primary">Keamanan & Hak Akses</CardTitle>
              <CardDescription className="text-xs">Manajemen pembatasan akses data bagi petugas operasional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-8">
              {isAdmin && (
                <div className="flex items-center justify-between p-6 bg-orange-500/10 border border-orange-500/20 rounded-[2rem] animate-in zoom-in-95">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-tighter">
                      <LockKeyhole className="h-5 w-5" />
                      Kunci Modifikasi Data Koleksi
                    </div>
                    <p className="text-[11px] text-orange-700/80 leading-relaxed max-w-md font-medium">
                      Aktifkan fitur ini untuk mencegah petugas (Staff) mengubah atau menghapus data Koleksi Buku. Hanya Administrator yang dapat membuka kunci ini.
                    </p>
                  </div>
                  <Switch 
                    checked={settings.isDataLocked} 
                    onCheckedChange={(v) => setSettings({ ...settings, isDataLocked: v })}
                    className="data-[state=checked]:bg-orange-600 scale-125 mr-4"
                  />
                </div>
              )}

              <div className="p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] flex items-center justify-between bg-background/50">
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-tight">Kata Sandi Utama Administrator</p>
                  <p className="text-xs text-muted-foreground font-medium">Lakukan pembaruan rutin pada kata sandi akses sistem untuk keamanan database.</p>
                </div>
                <Button variant="outline" className="rounded-xl font-bold h-11 px-6">Ganti Password</Button>
              </div>

              {isAdmin && (
                <div className="pt-8 border-t dark:border-white/10 flex justify-end">
                   <Button className="gap-2 h-14 px-10 shadow-xl shadow-orange-600/20 bg-orange-600 hover:bg-orange-700 rounded-[1.5rem] font-black" onClick={handleSaveSettings} disabled={isSaving}>
                    <Shield className="h-5 w-5" /> SIMPAN PERUBAHAN KEAMANAN
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="text-center py-10 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}
