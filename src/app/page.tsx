
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus, ShieldCheck, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { collection, doc, setDoc, query, limit } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"

export default function LoginPage() {
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useUser()
  
  const [loading, setLoading] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [adminName, setAdminName] = useState("")

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "users"), limit(1))
  }, [db])
  
  const { data: usersList, isLoading: checkingUsers } = useCollection(usersQuery)
  
  const noUsersExist = !checkingUsers && usersList !== null && usersList.length === 0

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const uid = userCredential.user.uid

      await setDoc(doc(db, "users", uid), {
        id: uid,
        name: adminName,
        email: email,
        role: "Admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      toast({ 
        title: "Setup Berhasil", 
        description: "Admin pertama telah didaftarkan." 
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
      <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white animate-in zoom-in duration-500">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-32 h-32 relative mb-2">
            <Image 
              src="https://picsum.photos/seed/smpn5logo/200/200" 
              alt="Logo SMPN 5" 
              fill 
              className="object-contain drop-shadow-md rounded-full border-4 border-primary/10"
              priority
              data-ai-hint="school logo"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold font-headline">SMPN 5 LANGKE REMBONG</CardTitle>
            <CardDescription>
              {isSetupMode ? "Setup Akun Admin Utama" : "Sistem Informasi Perpustakaan Sekolah"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={isSetupMode ? handleSetupAdmin : handleLogin}>
          <CardContent className="space-y-4">
            {noUsersExist && !isSetupMode && (
              <Alert className="bg-primary/10 border-primary/20 text-primary">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase">Sistem Baru Terdeteksi</AlertTitle>
                <AlertDescription className="text-xs">
                  Database masih kosong. Harap klik tombol inisialisasi di bawah untuk membuat akun Admin pertama.
                </AlertDescription>
              </Alert>
            )}

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
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg" disabled={loading || checkingUsers}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : isSetupMode ? (
                <><UserPlus className="mr-2 h-5 w-5" /> Daftarkan Admin Utama</>
              ) : (
                "Masuk Sekarang"
              )}
            </Button>
            
            {!checkingUsers && noUsersExist && !isSetupMode && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full border-dashed border-primary text-primary hover:bg-primary/5 h-12"
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
    </div>
  )
}
