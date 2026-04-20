
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Library, Bell, Shield, Smartphone, Save, Loader2, Coins, CalendarDays } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Firebase
import { 
  useFirestore, 
  useDoc, 
  errorEmitter 
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
    schoolName: "SMPN 5 LANGKE REMBONG",
    loanPeriod: 7,
    fineAmount: 500,
    whatsappReminder: true,
    emailReport: true,
    digitalCatalog: true
  })

  // Fetch settings from Firestore
  const settingsDocRef = db ? doc(db, 'settings', 'general') : null
  const { data: remoteSettings, isLoading: loading } = useDoc(settingsDocRef)

  useEffect(() => {
    if (remoteSettings) {
      setSettings(prev => ({ 
        ...prev, 
        ...remoteSettings,
        loanPeriod: Number(remoteSettings.loanPeriod || 7),
        fineAmount: Number(remoteSettings.fineAmount || 500)
      }))
    }
  }, [remoteSettings])

  const handleSaveSettings = () => {
    if (!db || !settingsDocRef) return

    setIsSaving(true)
    
    setDoc(settingsDocRef, settings, { merge: true })
      .then(() => {
        toast({
          title: "Berhasil Disimpan",
          description: "Pengaturan kebijakan perpustakaan (Batas Pinjam & Denda) telah diperbarui.",
        })
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: settingsDocRef.path,
          operation: 'write',
          requestResourceData: settings,
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
          <p className="text-muted-foreground text-sm">Konfigurasi profil sekolah dan kebijakan denda sirkulasi.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-none mb-1">
          Role: Administrator
        </Badge>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="general" className="gap-2"><Library className="h-4 w-4" /> Umum & Kebijakan</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Keamanan</TabsTrigger>
          <TabsTrigger value="mobile" className="gap-2"><Smartphone className="h-4 w-4" /> Akses Mobile</TabsTrigger>
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
                  <div className="grid gap-2">
                    <Label htmlFor="school-name" className="font-bold text-xs uppercase text-muted-foreground">Nama Sekolah</Label>
                    <Input 
                      id="school-name" 
                      value={settings.schoolName}
                      onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                      className="bg-slate-50 border-slate-200 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-6 p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Coins className="h-24 w-24" />
                  </div>
                  
                  <div className="grid gap-3">
                    <Label htmlFor="loan-period" className="flex items-center gap-2 font-bold text-sm text-primary">
                      <CalendarDays className="h-4 w-4" />
                      Masa Peminjaman Buku (Hari)
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
                    <p className="text-[10px] text-muted-foreground italic">Buku harus kembali sebelum lewat jumlah hari ini.</p>
                  </div>

                  <div className="grid gap-3 pt-2">
                    <Label htmlFor="fine-amount" className="flex items-center gap-2 font-bold text-sm text-orange-600">
                      <Coins className="h-4 w-4" />
                      Tarif Denda Terlambat (Rp)
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
                    <p className="text-[10px] text-muted-foreground italic">Denda per buku per hari keterlambatan.</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t">
                <Button className="gap-2 h-12 px-10 shadow-lg shadow-primary/20" onClick={handleSaveSettings} disabled={isSaving || loading}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Perubahan Kebijakan
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

        <TabsContent value="mobile" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Aplikasi Web Anggota</CardTitle>
              <CardDescription>Izinkan siswa melihat ketersediaan buku dari HP mereka.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Katalog Publik Aktif</Label>
                  <p className="text-xs text-muted-foreground">Halaman cari buku dapat diakses tanpa login oleh siswa.</p>
                </div>
                <Switch 
                  checked={settings.digitalCatalog} 
                  onCheckedChange={(v) => setSettings({ ...settings, digitalCatalog: v })}
                />
              </div>
              <Button onClick={handleSaveSettings}>Simpan Akses</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Badge({ children, className, variant }: any) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </div>
  )
}
