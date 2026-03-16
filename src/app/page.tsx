"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Library, Loader2, UserPlus, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { collection, doc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [adminName, setAdminName] = useState("")

  // Check if any staff exists to show setup mode
  const staffRef = useMemoFirebase(() => db ? collection(db, "staff") : null, [db])
  const { data: staffList, loading: checkingStaff } = useCollection(staffRef)
  
  const noStaffExists = !checkingStaff && staffList.length === 0

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

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !db) return

    setLoading(true)
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = userCredential.user.uid

      // 2. Create Staff Document with Admin Role
      await setDoc(doc(db, "staff", uid), {
        name: adminName,
        email: email,
        staffId: "ADMIN-001",
        role: "Admin",
        status: "Active",
        createdAt: new Date().toISOString()
      })

      toast({ 
        title: "Setup Berhasil", 
        description: "Admin pertama telah didaftarkan. Anda akan diarahkan ke Dashboard." 
      })
      router.push("/dashboard")
    } catch (error: any) {
      toast({ 
        title: "Setup Gagal", 
        description: error.message, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
      <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white animate-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20 w-fit">
            <Library className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold font-headline">SMPN 5 LANGKE REMBONG</CardTitle>
            <CardDescription>
              {isSetupMode ? "Setup Akun Admin Pertama" : "Sistem Informasi Perpustakaan Sekolah"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={isSetupMode ? handleSetupAdmin : handleLogin}>
          <CardContent className="space-y-4">
            {isSetupMode && (
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap Admin</Label>
                <Input 
                  id="name" 
                  placeholder="Contoh: Kepala Perpustakaan" 
                  required 
                  className="bg-muted/30 h-12"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
            )}
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
                placeholder="Minimal 6 karakter"
                required 
                className="bg-muted/30 h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg" disabled={loading || checkingStaff}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : isSetupMode ? (
                <><UserPlus className="mr-2 h-5 w-5" /> Daftarkan Admin Sekarang</>
              ) : (
                "Masuk Sekarang"
              )}
            </Button>
            
            {!checkingStaff && noStaffExists && !isSetupMode && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full border-dashed border-primary text-primary hover:bg-primary/5"
                onClick={() => setIsSetupMode(true)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Inisialisasi Admin Pertama
              </Button>
            )}

            {isSetupMode && (
              <Button 
                type="button" 
                variant="ghost" 
                className="text-xs"
                onClick={() => setIsSetupMode(false)}
              >
                Kembali ke Login
              </Button>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              &copy; 2024 Perpustakaan SMPN 5 Langke Rembong.
            </p>
          </CardFooter>
        </form>
      </Card>

      {!checkingStaff && noStaffExists && (
        <div className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-bold animate-pulse">
          SISTEM BARU: SILAKAN DAFTARKAN ADMIN PERTAMA
        </div>
      )}
    </div>
  )
}
