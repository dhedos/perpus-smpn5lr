
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScanBarcode, User, BookOpen, Calendar, ArrowRight, RefreshCcw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState("borrow")

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight">Layanan Sirkulasi</h1>
        <p className="text-muted-foreground text-sm">Proses peminjaman dan pengembalian buku siswa/guru.</p>
      </div>

      <Tabs defaultValue="borrow" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-12 bg-card border shadow-sm">
          <TabsTrigger value="borrow" className="gap-2 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArrowRight className="h-4 w-4" />
            Peminjaman
          </TabsTrigger>
          <TabsTrigger value="return" className="gap-2 text-base data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
            <RefreshCcw className="h-4 w-4" />
            Pengembalian
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="borrow" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">1. Identitas Anggota</CardTitle>
                  <CardDescription>Scan kartu atau cari manual.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="NIS / NIP / Nama Anggota..." className="pl-10" />
                  </div>
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-accent/20">
                    <User className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada anggota dipilih</p>
                    <Button variant="outline" size="sm" className="mt-4 gap-2">
                      <ScanBarcode className="h-4 w-4" />
                      Scan Kartu
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">2. Scan Buku</CardTitle>
                  <CardDescription>Masukkan kode buku yang akan dipinjam.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Kode Buku / Barcode..." className="flex-1" />
                    <Button variant="secondary" size="icon">
                      <ScanBarcode className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Daftar Pinjam (0)</p>
                    <div className="h-40 flex items-center justify-center border rounded-xl bg-muted/30">
                      <p className="text-sm text-muted-foreground italic">Daftar kosong</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm bg-primary/5 border-primary/10">
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Batas Pengembalian</p>
                    <p className="text-xl font-bold text-primary">7 Hari Lagi (14 Jun 2024)</p>
                  </div>
                </div>
                <Button size="lg" className="px-10 h-14 text-lg shadow-lg">Proses Peminjaman</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="return" className="space-y-6">
            <Card className="border-none shadow-sm max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Scan Buku Kembali</CardTitle>
                <CardDescription>Sistem akan otomatis menghitung denda jika terlambat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pb-8">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-full max-w-md relative aspect-[4/3] bg-black rounded-2xl overflow-hidden flex items-center justify-center border-4 border-secondary/30">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center p-4">
                      <p className="text-white text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Simulasi Kamera Aktif</p>
                    </div>
                    <div className="w-48 h-1 bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
                  </div>
                  
                  <div className="w-full max-w-md space-y-2">
                    <Label htmlFor="manual-code">Input Manual (Jika kamera bermasalah)</Label>
                    <div className="flex gap-2">
                      <Input id="manual-code" placeholder="Kode Buku..." className="flex-1" />
                      <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Cek</Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-8">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Buku Ditemukan</p>
                    <p className="text-xl font-bold">0</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Terlambat</p>
                    <p className="text-xl font-bold text-destructive">0 Hari</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Total Denda</p>
                    <p className="text-xl font-bold">Rp 0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
