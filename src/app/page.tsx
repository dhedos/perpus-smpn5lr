
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus, ShieldCheck, AlertCircle, Library, KeyRound, Mail, Chrome } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { collection, doc, setDoc, query, limit, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

  // Password Reset State
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)

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
      toast({ title: "Berhasil Masuk", description: "Selamat datang di Pustaka Nusantara." })
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

  const handleGoogleLogin = async () => {
    if (!auth || !db) return
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Cek apakah user sudah ada di Firestore
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        // Jika belum ada (misal login pertama kali), buat profile default
        // Jika ini user pertama kali di sistem, jadikan Admin
        const role = noUsersExist ? "Admin" : "Staff"
        
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || "User Baru",
          email: user.email,
          role: role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        toast({ title: "Pendaftaran Berhasil", description: `Anda masuk sebagai ${role}.` })
      } else {
        toast({ title: "Login Berhasil", description: "Selamat datang kembali." })
      }
      
      router.push("/dashboard")
    } catch (error: any) {
      toast({ title: "Gagal Login Google", description: error.message, variant: "destructive" })
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

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !resetEmail) return

    setIsSendingReset(true)
    try {
      await sendPasswordResetEmail(auth, resetEmail)
      toast({ 
        title: "Email Terkirim", 
        description: "Silakan periksa kotak masuk email Anda untuk instruksi reset kata sandi." 
      })
      setIsResetOpen(false)
      setResetEmail("")
    } catch (error: any) {
      toast({ 
        title: "Gagal Mengirim", 
        description: error.message || "Pastikan email Anda sudah terdaftar.", 
        variant: "destructive" 
      })
    } finally {
      setIsSendingReset(false)
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
          <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-3xl bg-primary/10 text-primary mb-2">
            <Library className="h-12 w-12" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black font-headline uppercase tracking-tight text-primary">PUSTAKA NUSANTARA</CardTitle>
            <CardDescription className="font-bold text-secondary uppercase tracking-widest text-xs">
              {isSetupMode ? "Inisialisasi Sistem Baru" : "SMPN 5 LANGKE REMBONG"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={isSetupMode ? handleSetupAdmin : handleLogin} className="space-y-4">
            {noUsersExist && !isSetupMode && (
              <Alert className="bg-primary/10 border-primary/20 text-primary">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase">Sistem Belum Siap</AlertTitle>
                <AlertDescription className="text-xs">
                  Database Admin masih kosong. Klik tombol di bawah untuk mendaftarkan akun Admin pertama sekolah.
                </AlertDescription>
              </Alert>
            )}

            {isSetupMode && (
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Nama Lengkap Admin</Label>
                <input 
                  id="name" 
                  placeholder="Nama Penanggung Jawab" 
                  required 
                  className="flex h-12 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="email@smpn5langkerembong.sch.id" 
                required 
                className="bg-white h-12 border-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-semibold">Kata Sandi</Label>
                {!isSetupMode && (
                  <button 
                    type="button" 
                    onClick={() => setIsResetOpen(true)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Lupa Kata Sandi?
                  </button>
                )}
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="Minimal 6 karakter"
                required 
                className="bg-white h-12 border-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg bg-primary hover:bg-primary/90" disabled={loading || checkingUsers}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : isSetupMode ? (
                <><UserPlus className="mr-2 h-5 w-5" /> Aktifkan Admin Utama</>
              ) : (
                "Masuk ke Sistem"
              )}
            </Button>
          </form>

          {!isSetupMode && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground font-bold">Atau</span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 border-slate-200 gap-2 font-semibold"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <Chrome className="h-5 w-5 text-red-500" />
                Masuk dengan Google
              </Button>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
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
          
          <p className="text-[10px] text-muted-foreground text-center uppercase font-bold tracking-widest mt-4">
            &copy; 2024 Pustaka Nusantara SMPN 5
          </p>
        </CardFooter>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-md bg-white">
          <form onSubmit={handleSendResetEmail}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                Pemulihan Kata Sandi
              </DialogTitle>
              <DialogDescription>
                Masukkan email Anda untuk menerima tautan reset kata sandi melalui email.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="font-semibold">Email Terdaftar</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="reset-email" 
                    type="email"
                    placeholder="nama@email.com"
                    required
                    className="pl-10 bg-white h-12 border-slate-300"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsResetOpen(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isSendingReset}
              >
                {isSendingReset ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Kirim Tautan"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
