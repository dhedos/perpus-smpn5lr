
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Library, Bell, Shield, Smartphone, Save, Loader2, Coins, CalendarDays, AlertTriangle, FileText, MapPin, UserCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

// Firebase
import { 
  useFirestore, 
  useDoc, 
  errorEmitter,
  useMemoFirebase
} from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export default function SettingsPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Settings State
  const [settings, setSettings] = useState({
    libraryName: "Perpustakaan SMPN 5",
    schoolName: "SMP NEGERI 5 LANGKE REMBONG",
    loanPeriod: 7,
    fineAmount: 500,
    lostBookFine: 50000,
    whatsappReminder: true,
    emailReport: true,
    digitalCatalog: true,
    govtInstitution: "PEMERINTAH KABUPATEN MANGGARAI",
    eduDept: "DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA",
    schoolAddress: "Mando, Compang Carep Kab. Manggarai NTT",
    reportCity: "Mando",
    principalName: "Lodovikus Jangkar, S.Pd.Gr",
    principalNip: "198507272011011020"
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
        loanPeriod: Number(remoteSettings.loanPeriod ?? 7),
        fineAmount: Number(remoteSettings.fineAmount ?? 500),
        lostBookFine: Number(remoteSettings.lostBookFine ?? 50000)
      }))
    }
  }, [remoteSettings])

  const handleSaveSettings = () => {
    if (!db || !settingsDocRef) return

    setIsSaving(true)
    
    const dataToSave = {
      ...settings,
      loanPeriod: Math.max(1, Number(settings.loanPeriod)),
      fineAmount: Math.max(0, Number(settings.fineAmount)),
      lostBookFine: Math.max(0, Number(settings.lostBookFine))
    }
    
    setDoc(settingsDocRef, dataToSave, { merge: true })
      .then(() => {
        toast({
          title: "Berhasil Disimpan",
          description: "Pengaturan sistem dan laporan telah diperbarui.",
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
          Role: Administrator
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
              <CardDescription>Atur denda dan jatuh tempo yang akan berlaku di seluruh sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="lib-name" className="font-bold text-xs uppercase text-muted-foreground">Nama Perpustakaan</Label>
                    <Input 
                      id="lib-name" 
                      value={settings.libraryName} 
                      onChange={(e) => setSettings({ ...settings, libraryName: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-6 p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                  <div className="grid gap-3">
                    <Label htmlFor="loan-period" className="flex items-center gap-2 font-bold text-sm text-primary">
                      <CalendarDays className="h-4 w-4" />
                      Masa Peminjaman (Hari)
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
                    <Label htmlFor="fine-amount" className="flex items-center gap-2 font-bold text-sm text-orange-600">
                      <Coins className="h-4 w-4" />
                      Denda Terlambat (Rp)
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
                    <Label htmlFor="lost-fine" className="flex items-center gap-2 font-bold text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Denda Buku Hilang (Rp)
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 px-3 h-12 flex items-center rounded-l-md font-bold text-destructive border border-red-200 border-r-0">Rp</div>
                      <Input 
                        id="lost-fine" 
                        type="number" 
                        value={settings.lostBookFine}
                        onChange={(e) => setSettings({ ...settings, lostBookFine: Number(e.target.value) })}
                        className="bg-white border-red-200 h-12 text-xl font-black text-destructive rounded-l-none"
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
                      placeholder="Contoh: PEMERINTAH KABUPATEN MANGGARAI"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">Dinas Pendidikan</Label>
                    <Input 
                      value={settings.eduDept} 
                      onChange={(e) => setSettings({ ...settings, eduDept: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                      placeholder="Contoh: DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">Nama Sekolah</Label>
                    <Input 
                      value={settings.schoolName} 
                      onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                      placeholder="Contoh: SMP NEGERI 5 LANGKE REMBONG"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">Alamat Sekolah</Label>
                    <Input 
                      value={settings.schoolAddress} 
                      onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                      placeholder="Alamat lengkap sekolah"
                    />
                  </div>
                </div>

                <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border">
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Kota Laporan
                    </Label>
                    <Input 
                      value={settings.reportCity} 
                      onChange={(e) => setSettings({ ...settings, reportCity: e.target.value })}
                      className="bg-white border-slate-200 h-11"
                      placeholder="Contoh: Mando"
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
                      placeholder="Nama lengkap dengan gelar"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold text-xs uppercase text-muted-foreground">NIP Kepala Sekolah</Label>
                    <Input 
                      value={settings.principalNip} 
                      onChange={(e) => setSettings({ ...settings, principalNip: e.target.value })}
                      className="bg-white border-slate-200 h-11"
                      placeholder="NIP tanpa spasi"
                    />
                  </div>
                  <div className="pt-4 opacity-50 text-[10px] italic">
                    * Data ini digunakan otomatis pada bagian Kop Surat dan Tanda Tangan saat mengunduh laporan Excel.
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
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Laporan Email Mingguan</Label>
                  <p className="text-xs text-muted-foreground">Kirim rekap buku yang belum kembali ke email Admin.</p>
                </div>
                <Switch 
                  checked={settings.emailReport} 
                  onCheckedChange={(v) => setSettings({ ...settings, emailReport: v })}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={isSaving}>Simpan Notifikasi</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Keamanan Admin</CardTitle>
              <CardDescription>Manajemen akses tingkat tinggi untuk sekolah.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border-2 border-dashed rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-bold">Ganti Password Utama</p>
                  <p className="text-xs text-muted-foreground">Ganti kata sandi akses administrator sekolah Anda.</p>
                </div>
                <Button variant="outline">Ganti Sekarang</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
