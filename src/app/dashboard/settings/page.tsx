
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
  const { data: remoteSettings, loading } = useDoc(settingsDocRef)

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
          description: "Pengaturan sistem (Denda & Jatuh Tempo) telah diperbarui.",
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
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Pengaturan Sistem</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi profil dan kebijakan sirkulasi SMPN 5 LANGKE REMBONG.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="general" className="gap-2"><Library className="h-4 w-4" /> Umum</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /> Keamanan</TabsTrigger>
          <TabsTrigger value="mobile" className="gap-2"><Smartphone className="h-4 w-4" /> Aplikasi</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Kebijakan Sirkulasi & Profil</CardTitle>
              <CardDescription>Atur batas waktu peminjaman dan denda keterlambatan secara global.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="grid gap-2">
                    <Label htmlFor="lib-name" className="font-bold text-xs uppercase text-muted-foreground">Nama Perpustakaan</Label>
                    <Input 
                      id="lib-name" 
                      value={settings.libraryName} 
                      onChange={(e) => setSettings({ ...settings, libraryName: e.target.value })}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="school-name" className="font-bold text-xs uppercase text-muted-foreground">Nama Sekolah</Label>
                    <Input 
                      id="school-name" 
                      value={settings.schoolName}
                      onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="grid gap-2">
                    <Label htmlFor="loan-period" className="flex items-center gap-2 font-bold text-xs uppercase text-primary">
                      <CalendarDays className="h-3 w-3" />
                      Durasi Pinjam (Hari)
                    </Label>
                    <Input 
                      id="loan-period" 
                      type="number" 
                      value={settings.loanPeriod}
                      onChange={(e) => setSettings({ ...settings, loanPeriod: Number(e.target.value) })}
                      className="bg-white border-primary/20 h-12 text-lg font-bold"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Buku akan otomatis jatuh tempo setelah X hari.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fine-amount" className="flex items-center gap-2 font-bold text-xs uppercase text-orange-600">
                      <Coins className="h-3 w-3" />
                      Denda per Hari (Rp)
                    </Label>
                    <Input 
                      id="fine-amount" 
                      type="number" 
                      value={settings.fineAmount}
                      onChange={(e) => setSettings({ ...settings, fineAmount: Number(e.target.value) })}
                      className="bg-white border-orange-200 h-12 text-lg font-bold text-orange-600"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Denda otomatis dihitung saat pengembalian terlambat.</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button className="gap-2 h-12 px-8" onClick={handleSaveSettings} disabled={isSaving || loading}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Semua Pengaturan
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi</CardTitle>
              <CardDescription>Atur pengingat otomatis untuk siswa dan guru.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp Pengingat</Label>
                  <p className="text-xs text-muted-foreground">Kirim pesan otomatis sebelum jatuh tempo.</p>
                </div>
                <Switch 
                  checked={settings.whatsappReminder} 
                  onCheckedChange={(v) => setSettings({ ...settings, whatsappReminder: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Laporan Mingguan</Label>
                  <p className="text-xs text-muted-foreground">Kirim ringkasan statistik ke Admin.</p>
                </div>
                <Switch 
                  checked={settings.emailReport} 
                  onCheckedChange={(v) => setSettings({ ...settings, emailReport: v })}
                />
              </div>
              <div className="pt-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Notifikasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>Kelola verifikasi dua langkah dan akses Admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Ganti Password Admin Sekolah</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Aplikasi Mobile Siswa</CardTitle>
              <CardDescription>Aktifkan akses scan kartu anggota digital SMPN 5.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Akses Katalog Digital</Label>
                  <p className="text-xs text-muted-foreground">Siswa dapat melihat stok buku dari smartphone.</p>
                </div>
                <Switch 
                  checked={settings.digitalCatalog} 
                  onCheckedChange={(v) => setSettings({ ...settings, digitalCatalog: v })}
                />
              </div>
              <div className="pt-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Akses
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
