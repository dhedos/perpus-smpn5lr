
"use client"

import { useState, useEffect, useRef } from "react"
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

  // Settings State
  const [settings, setSettings] = useState({
    libraryName: "LANTERA BACA",
    librarySubtitle: "SMPN 5 LANGKE REMBONG",
    libraryLogoUrl: "https://picsum.photos/seed/librarylogo/512/512",
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

  // Fetch settings from Firestore
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
        libraryLogoUrl: remoteSettings.libraryLogoUrl || "https://picsum.photos/seed/librarylogo/512/512",
        loanPeriod: Number(remoteSettings.loanPeriod ?? 7),
        collectiveLoanHours: Number(remoteSettings.collectiveLoanHours ?? 2),
        fineAmount: Number(remoteSettings.fineAmount ?? 500),
        damagedBookFine: Number(remoteSettings.damagedBookFine ?? 10000),
        lostBookFine: Number(remoteSettings.lostBookFine ?? 50000),
        isDataLocked: remoteSettings.isDataLocked === true,
        budgetSources: remoteSettings.budgetSources || "BOSP, DAK, Hibah",
        principalNip: remoteSettings.principalNip || "198507272011011020"
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
        const permissionError = new FirestorePermissionError({
          path: settingsDocRef.path,
          operation: 'write',
          requestResourceData: dataToSave,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Pengaturan Sistem</h1>
          <p className="text-muted-foreground text-sm">Konfigurasi profil sekolah dan kebijakan sirkulasi.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-none mb-1">
          Role: {user?.role || "Petugas"}
        </Badge>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="general" className="gap-2"><Library className="h-4 w-4" /> Umum</TabsTrigger>
          <TabsTrigger value="report" className="gap-2"><FileText className="h-4 w-4" /> Kop Laporan</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Keamanan</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle>Kebijakan Sirkulasi Utama</CardTitle>
              <CardDescription>Atur identitas judul perpustakaan, logo, denda, dan sumber anggaran.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid gap-2">
                    <Label htmlFor="lib-name" className="font-bold text-xs uppercase text-primary tracking-widest flex items-center gap-2">
                       <Library className="h-3 w-3" /> Nama Utama (Judul)
                    </Label>
                    <Input 
                      id="lib-name" 
                      value={settings.libraryName} 
                      onChange={(e) => setSettings({ ...settings, libraryName: e.target.value.toUpperCase() })}
                      className="bg-white border-primary/20 h-11 font-black text-primary"
                      placeholder="Cth: LANTERA BACA"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="lib-subtitle" className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <Type className="h-3 w-3" /> Sub-judul
                    </Label>
                    <Input 
                      id="lib-subtitle" 
                      value={settings.librarySubtitle} 
                      onChange={(e) => setSettings({ ...settings, librarySubtitle: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                      placeholder="Cth: SMPN 5 LANGKE REMBONG"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="lib-logo" className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-3 w-3" /> Logo Perpustakaan
                    </Label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 items-center">
                        <div className="w-16 h-16 rounded-xl border-2 border-primary/10 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                          <img 
                            src={settings.libraryLogoUrl} 
                            alt="Logo" 
                            className="w-12 h-12 object-contain" 
                            onError={(e) => (e.currentTarget.src = 'https://picsum.photos/seed/error/50/50')} 
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 flex-1">
                          <input 
                            type="file" 
                            ref={logoInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleLogoUpload} 
                          />
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="w-full gap-2 h-9" 
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <Upload className="h-3.5 w-3.5" /> Pilih dari Perangkat
                          </Button>
                          <p className="text-[9px] text-muted-foreground px-1 italic">Ukuran ideal: 512x512 pixel (PNG/JPG).</p>
                        </div>
                      </div>
                      <Input 
                        id="lib-logo" 
                        value={settings.libraryLogoUrl.startsWith('data:') ? 'Terunggah dari perangkat' : settings.libraryLogoUrl} 
                        onChange={(e) => setSettings({ ...settings, libraryLogoUrl: e.target.value })}
                        className="bg-slate-50 border-slate-200 h-9 text-xs"
                        placeholder="Atau masukkan URL: https://..."
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="budget-sources" className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-3 w-3" /> Daftar Sumber Anggaran
                    </Label>
                    <Input 
                      id="budget-sources" 
                      value={settings.budgetSources} 
                      onChange={(e) => setSettings({ ...settings, budgetSources: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                      placeholder="Pisahkan dengan koma, cth: BOSP, DAK, Hibah"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Pisahkan pilihan dengan tanda koma.</p>
                  </div>
                </div>

                <div className="space-y-6 p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                  <div className="grid gap-3">
                    <Label htmlFor="loan-period" className="flex items-center gap-2 font-bold text-sm text-primary">
                      <CalendarDays className="h-4 w-4" />
                      Masa Peminjaman Pribadi (Hari)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="loan-period" 
                        type="number" 
                        value={settings.loanPeriod}
                        onChange={(e) => setSettings({ ...settings, loanPeriod: Number(e.target.value) })}
                        className="bg-white border-primary/20 h-12 text-xl font-black w-24 text-center"
                      />
                      <span className="text-sm font-semibold text-muted-foreground">Hari Kalender</span>
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2">
                    <Label htmlFor="collective-loan-hours" className="flex items-center gap-2 font-bold text-sm text-blue-600">
                      <Clock className="h-4 w-4" />
                      Durasi Pinjam Kolektif (Jam)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input 
                        id="collective-loan-hours" 
                        type="number" 
                        value={settings.collectiveLoanHours}
                        onChange={(e) => setSettings({ ...settings, collectiveLoanHours: Number(e.target.value) })}
                        className="bg-white border-blue-200 h-12 text-xl font-black w-24 text-center text-blue-600"
                      />
                      <span className="text-sm font-semibold text-muted-foreground">Jam Pelajaran</span>
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2">
                    <Label htmlFor="fine-amount" className="flex items-center gap-2 font-bold text-sm text-orange-600">
                      <Coins className="h-4 w-4" />
                      Denda Terlambat (Rp/Hari)
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 px-3 h-12 flex items-center rounded-l-md font-bold text-orange-600 border border-orange-200 border-r-0">Rp</div>
                      <Input 
                        id="fine-amount" 
                        type="number" 
                        value={settings.fineAmount}
                        onChange={(e) => setSettings({ ...settings, fineAmount: Number(e.target.value) })}
                        className="bg-white border-orange-200 h-12 text-xl font-black text-orange-600 rounded-l-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2">
                    <Label htmlFor="damaged-fine" className="flex items-center gap-2 font-bold text-sm text-orange-600">
                      <ShieldAlert className="h-4 w-4" />
                      Denda Buku Rusak (Rp/Unit)
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 px-3 h-12 flex items-center rounded-l-md font-bold text-orange-600 border border-orange-200 border-r-0">Rp</div>
                      <Input 
                        id="damaged-fine" 
                        type="number" 
                        value={settings.damagedBookFine}
                        onChange={(e) => setSettings({ ...settings, damagedBookFine: Number(e.target.value) })}
                        className="bg-white border-orange-200 h-12 text-xl font-black text-orange-600 rounded-l-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 pt-2">
                    <Label htmlFor="lost-fine" className="flex items-center gap-2 font-bold text-sm text-destructive">
                      <Ghost className="h-4 w-4" />
                      Denda Buku Hilang (Rp/Unit)
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 px-3 h-12 flex items-center rounded-l-md font-bold text-red-600 border border-red-200 border-r-0">Rp</div>
                      <Input 
                        id="lost-fine" 
                        type="number" 
                        value={settings.lostBookFine}
                        onChange={(e) => setSettings({ ...settings, lostBookFine: Number(e.target.value) })}
                        className="bg-white border-red-200 h-12 text-xl font-black text-red-600 rounded-l-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <Button className="gap-2 h-12 px-10 shadow-lg shadow-primary/20" onClick={handleSaveSettings} disabled={isSaving || loading}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Kebijakan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <CardTitle>Pengaturan Kop Laporan</CardTitle>
              <CardDescription>Identitas sekolah untuk laporan resmi dan tanda tangan Kepala Sekolah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">Instansi Pemerintah</Label>
                    <Input 
                      value={settings.govtInstitution} 
                      onChange={(e) => setSettings({ ...settings, govtInstitution: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">Dinas Pendidikan</Label>
                    <Input 
                      value={settings.eduDept} 
                      onChange={(e) => setSettings({ ...settings, eduDept: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">Nama Sekolah</Label>
                    <Input 
                      value={settings.schoolName} 
                      onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border">
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Alamat Laporan
                    </Label>
                    <Input 
                      value={settings.reportCity} 
                      onChange={(e) => setSettings({ ...settings, reportCity: e.target.value })}
                      className="bg-white border-slate-200 h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <UserCheck className="h-3 w-3" /> Nama Kepala Sekolah
                    </Label>
                    <Input 
                      value={settings.principalName} 
                      onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                      className="bg-white border-slate-200 h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <Fingerprint className="h-3 w-3" /> NIP Kepala Sekolah
                    </Label>
                    <Input 
                      value={settings.principalNip} 
                      onChange={(e) => setSettings({ ...settings, principalNip: e.target.value })}
                      className="bg-white border-slate-200 h-11 font-mono"
                      placeholder="Masukkan NIP..."
                    />
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t">
                <Button className="gap-2 h-12 px-10 shadow-lg" onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Pengaturan Laporan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pengingat Otomatis</CardTitle>
              <CardDescription>Konfigurasi notifikasi jatuh tempo ke smartphone anggota.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifikasi WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Kirim instruksi pengembalian 1 hari sebelum jatuh tempo.</p>
                </div>
                <Switch 
                  checked={settings.whatsappReminder} 
                  onCheckedChange={(v) => setSettings({ ...settings, whatsappReminder: v })}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={isSaving}>Simpan Notifikasi</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Keamanan & Hak Akses</CardTitle>
              <CardDescription>Manajemen akses tingkat tinggi untuk operasional sekolah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isAdmin && (
                <div className="flex items-center justify-between p-5 bg-orange-50 border border-orange-200 rounded-2xl animate-in zoom-in-95">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-orange-700 font-bold">
                      <LockKeyhole className="h-5 w-5" />
                      Kunci Modifikasi Data
                    </div>
                    <p className="text-xs text-orange-800/70 leading-relaxed max-w-md">
                      Aktifkan fitur ini untuk mencegah petugas (Staff) mengubah atau menghapus data Koleksi Buku dan Buku Pegangan Guru.
                    </p>
                  </div>
                  <Switch 
                    checked={settings.isDataLocked} 
                    onCheckedChange={(v) => setSettings({ ...settings, isDataLocked: v })}
                    className="data-[state=checked]:bg-orange-600"
                  />
                </div>
              )}

              <div className="p-4 border-2 border-dashed rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-bold">Ganti Password Utama</p>
                  <p className="text-xs text-muted-foreground">Ganti kata sandi akses administrator sekolah Anda.</p>
                </div>
                <Button variant="outline">Ganti Sekarang</Button>
              </div>

              {isAdmin && (
                <div className="pt-4 border-t flex justify-end">
                   <Button className="gap-2 h-11 px-8 shadow-lg shadow-orange-600/20 bg-orange-600 hover:bg-orange-700" onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    Simpan Perubahan Keamanan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
