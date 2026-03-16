"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Library, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const auth = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return

    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({ title: "Berhasil Masuk", description: "Selamat datang di Sistem Perpustakaan SMPN 5 Langke Rembong." })
      router.push("/dashboard")
    } catch (error: any) {
      toast({ 
        title: "Gagal Masuk", 
        description: "Email atau kata sandi salah.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white animate-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20 w-fit">
            <Library className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold font-headline">SMPN 5 LANGKE REMBONG</CardTitle>
            <CardDescription>Sistem Informasi Perpustakaan Sekolah</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@smpn5langkerembong.sch.id" 
                required 
                className="bg-muted/30 h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                className="bg-muted/30 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Masuk Sekarang"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              &copy; 2024 Perpustakaan SMPN 5 Langke Rembong.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
