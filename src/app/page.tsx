
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Library, BookOpen, ShieldCheck, Zap, Globe, Github } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LandingPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Library className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold font-headline tracking-tight text-primary">
              Pustaka<span className="text-secondary">Nusa</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Fitur</Link>
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Bantuan</Link>
            <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Tentang</Link>
          </div>
          <Button variant="outline" className="rounded-full px-6">Buku Tamu</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 md:py-32 overflow-hidden">
          <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in slide-in-from-left duration-1000">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <Zap className="h-3 w-3" />
                Sistem Informasi Perpustakaan Modern
              </div>
              <h1 className="text-5xl md:text-6xl font-bold font-headline leading-tight tracking-tight">
                Mencerdaskan Bangsa Lewat <span className="text-primary italic">Akses Pengetahuan</span> Tanpa Batas.
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Pustaka Nusantara hadir untuk memudahkan pengelolaan perpustakaan sekolah dengan teknologi barcode, AI, dan fitur sinkronisasi offline-online.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="#login">
                  <Button size="lg" className="rounded-full px-10 h-14 text-lg shadow-xl shadow-primary/20">Mulai Kelola</Button>
                </Link>
                <Button variant="ghost" size="lg" className="rounded-full px-10 h-14 text-lg gap-2">
                  <Github className="h-5 w-5" />
                  Source Code
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map(i => (
                    <img key={i} className="h-10 w-10 rounded-full border-2 border-white" src={`https://picsum.photos/seed/${i+10}/100/100`} alt="Avatar" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Dipercaya oleh <span className="font-bold text-foreground">50+ Sekolah</span> di Indonesia
                </p>
              </div>
            </div>

            <div id="login" className="flex justify-center md:justify-end animate-in zoom-in duration-1000">
              <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-bold font-headline">Masuk ke Sistem</CardTitle>
                  <CardDescription>Masukkan kredensial Anda untuk mengakses dashboard.</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email / Username</Label>
                      <Input id="email" type="text" placeholder="admin@sekolah.sch.id" required className="bg-muted/30 h-12" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Kata Sandi</Label>
                        <Link href="#" className="text-xs text-primary hover:underline">Lupa sandi?</Link>
                      </div>
                      <Input id="password" type="password" required className="bg-muted/30 h-12" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg" disabled={loading}>
                      {loading ? "Menghubungkan..." : "Masuk Sekarang"}
                    </Button>
                    <div className="flex items-center gap-2 w-full">
                      <hr className="flex-1" />
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Atau Masuk Sebagai</span>
                      <hr className="flex-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button variant="outline" type="button">👨‍🎓 Siswa</Button>
                      <Button variant="outline" type="button">👩‍🏫 Guru</Button>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl font-bold font-headline">Keunggulan Utama</h2>
              <p className="text-muted-foreground">Sistem yang dirancang khusus untuk kebutuhan perpustakaan sekolah modern di Indonesia.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  title: "Offline-First", 
                  desc: "Tetap berjalan lancar meskipun internet sekolah terputus. Data disinkronisasi saat online.",
                  icon: Globe 
                },
                { 
                  title: "Integrasi AI", 
                  desc: "Generate deskripsi buku otomatis dengan bantuan kecerdasan buatan untuk katalog yang rapi.",
                  icon: BookOpen 
                },
                { 
                  title: "Scan Barcode", 
                  desc: "Sirkulasi buku jadi lebih cepat dengan scan barcode menggunakan kamera HP atau scanner laser.",
                  icon: ShieldCheck 
                }
              ].map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border-b-4 border-primary/20">
                  <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Library className="h-8 w-8 text-secondary" />
            <span className="text-2xl font-bold font-headline tracking-tight">
              Pustaka<span className="text-secondary">Nusa</span>
            </span>
          </div>
          <p className="text-sm text-primary-foreground/80">
            &copy; 2024 Pustaka Nusantara. Dibuat dengan ❤️ untuk Pendidikan Indonesia.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-secondary transition-colors">Syarat</Link>
            <Link href="#" className="hover:text-secondary transition-colors">Privasi</Link>
            <Link href="#" className="hover:text-secondary transition-colors">Bantuan</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
