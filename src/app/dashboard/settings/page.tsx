
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Library, Bell, Shield, Smartphone, Save } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Pengaturan Sistem</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi operasional dan profil perpustakaan.</p>
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
              <CardTitle>Informasi Perpustakaan</CardTitle>
              <CardDescription>Nama dan alamat yang tampil di kartu anggota & struk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="lib-name">Nama Perpustakaan</Label>
                <Input id="lib-name" defaultValue="Pustaka Nusantara" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school-name">Nama Sekolah</Label>
                <Input id="school-name" defaultValue="SMA Negeri 1 Indonesia" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="loan-period">Batas Pinjam (Hari)</Label>
                  <Input id="loan-period" type="number" defaultValue="7" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fine-amount">Denda per Hari (Rp)</Label>
                  <Input id="fine-amount" type="number" defaultValue="500" />
                </div>
              </div>
              <div className="pt-4">
                <Button className="gap-2">
                  <Save className="h-4 w-4" />
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
              <CardDescription>Atur pengingat otomatis untuk anggota.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>WhatsApp Pengingat</Label>
                  <p className="text-xs text-muted-foreground">Kirim pesan otomatis 1 hari sebelum jatuh tempo.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Laporan Mingguan</Label>
                  <p className="text-xs text-muted-foreground">Kirim ringkasan statistik ke Admin setiap Senin.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>Kelola verifikasi dua langkah dan akses API.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Ganti Password Admin</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="mt-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Aplikasi Mobile Anggota</CardTitle>
              <CardDescription>Aktifkan akses scan kartu anggota digital.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Akses Katalog Digital</Label>
                  <p className="text-xs text-muted-foreground">Siswa dapat melihat ketersediaan buku dari HP.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
