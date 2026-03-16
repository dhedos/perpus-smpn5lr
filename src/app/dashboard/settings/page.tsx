"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Library, Bell, Shield, Smartphone, Save, Loader2 } from "lucide-react"
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
          description: "Pengaturan sistem telah diperbarui.",
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
        <p className="text-muted-foreground text-sm">Konfigurasi profil SMPN 5 LANGKE REMBONG.</p>
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
              <CardTitle>Informasi Sekolah</CardTitle>
              <CardDescription>Nama sekolah yang tampil di aplikasi dan dokumen cetak.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="lib-name">Nama Perpustakaan</Label>
                <Input 
                  id="lib-name" 
                  value={settings.libraryName} 
                  onChange={(e) => setSettings({ ...settings, libraryName: e.target.value })}
                  placeholder="Contoh: Perpustakaan SMPN 5..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school-name">Nama Sekolah</Label>
                <Input 
                  id="school-name" 
                  value={settings.schoolName}
                  onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                  placeholder="Contoh: SMPN 5 LANGKE REMBONG"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="loan-period">Batas Pinjam (Hari)</Label>
                  <Input 
                    id="loan-period" 
                    type="number" 
                    value={settings.loanPeriod}
                    onChange={(e) => setSettings({ ...settings, loanPeriod: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fine-amount">Denda per Hari (Rp)</Label>
                  <Input 
                    id="fine-amount" 
                    type="number" 
                    value={settings.fineAmount}
                    onChange={(e) => setSettings({ ...settings, fineAmount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="pt-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={isSaving || loading}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Perubahan
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
