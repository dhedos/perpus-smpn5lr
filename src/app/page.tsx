"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Library } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      window.location.href = "/dashboard"
    }, 800)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
          <Library className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold font-headline tracking-tight text-primary mt-2">
          Pustaka<span className="text-secondary">Nusa</span>
        </h1>
        <p className="text-muted-foreground text-sm">Sistem Informasi Perpustakaan Sekolah</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white animate-in zoom-in duration-500">
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
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-2">Role Lain</span>
              <hr className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" type="button" className="text-xs">Siswa</Button>
              <Button variant="outline" type="button" className="text-xs">Guru</Button>
            </div>
          </CardFooter>
        </form>
      </Card>
      
      <p className="mt-8 text-xs text-muted-foreground">
        &copy; 2024 Pustaka Nusantara.
      </p>
    </div>
  )
}
