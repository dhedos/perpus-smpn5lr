
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

  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)

  // Prefetch dashboard for faster navigation
  useEffect(() => {
    router.prefetch("/dashboard")
  }, [router])

  // Redirect jika sudah login dan punya profile lengkap
  useEffect(() => {
    if (!authLoading && user && user.role) {
      router.replace("/dashboard")
    }
  }, [user, authLoading, router])

  // Cek apakah ada user di DB untuk menentukan mode setup
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
      toast({ title: "Berhasil Masuk", description: "Mengarahkan ke Dashboard..." })
      // Immediate push to reduce delay
      router.push("/dashboard")
    } catch (error: any) {
      toast({ 
        title: "Gagal Masuk", 
        description: "Email atau kata sandi salah atau akun belum terdaftar di database.", 
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
      const userResult = result.user

      const userDocRef = doc(db, "users", userResult.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        const role = noUsersExist ? "Admin" : "Staff"
        await setDoc(userDocRef, {
          id: userResult.uid,
          name: userResult.displayName || "User Baru",
          email: userResult.email,
          role: role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        toast({ title: "Pendaftaran Berhasil", description: `Anda masuk sebagai ${role}.` })
      } else {
        toast({ title: "Berhasil Masuk", description: "Selamat datang kembali." })
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

      toast({ title: "Setup Berhasil", description: "Admin pertama telah didaftarkan." })
      router.push("/dashboard")
    } catch (error: any) {
      toast({ title: "Setup Gagal", description: error.message, variant: "destructive" })
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
      toast({ title: "Email Terkirim", description: "Cek kotak masuk Anda." })
      setIsResetOpen(false)
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" })
    } finally {
      setIsSendingReset(false)
    }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

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
                <AlertTitle className="text-xs font-bold uppercase">Database Masih Kosong</AlertTitle>
                <AlertDescription className="text-xs">
                  Klik tombol "Inisialisasi Admin Pertama" di bawah untuk mendaftarkan akun pengelola sekolah Anda.
                </AlertDescription>
              </Alert>
            )}

            {isSetupMode && (
              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold">Nama Lengkap Admin</Label>
                <Input id="name" placeholder="Nama Penanggung Jawab" required value={adminName} onChange={(e) => setAdminName(e.target.value)} className="h-12" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">Email</Label>
              <Input id="email" type="email" placeholder="email@smpn5langkerembong.sch.id" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-semibold">Kata Sandi</Label>
                {!isSetupMode && <button type="button" onClick={() => setIsResetOpen(true)} className="text-xs font-bold text-primary hover:underline">Lupa?</button>}
              </div>
              <Input id="password" type="password" placeholder="Minimal 6 karakter" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg" disabled={loading || checkingUsers}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : isSetupMode ? "Aktifkan Admin Utama" : "Masuk ke Sistem"}
            </Button>
          </form>

          {!isSetupMode && (
            <>
              <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground font-bold">Atau</span></div></div>
              <Button variant="outline" className="w-full h-12 gap-2 font-semibold" onClick={handleGoogleLogin} disabled={loading}><Chrome className="h-5 w-5 text-red-500" /> Masuk dengan Google</Button>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {!checkingUsers && noUsersExist && !isSetupMode && (
            <Button variant="outline" className="w-full border-dashed border-primary text-primary h-12" onClick={() => setIsSetupMode(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Inisialisasi Admin Pertama
            </Button>
          )}
          {isSetupMode && <Button variant="ghost" className="text-xs" onClick={() => setIsSetupMode(false)}>Kembali ke Login</Button>}
          <p className="text-[10px] text-muted-foreground text-center uppercase font-bold tracking-widest mt-4">&copy; 2026 Pustaka Nusantara SMPN 5</p>
        </CardFooter>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="bg-white">
          <form onSubmit={handleSendResetEmail}>
            <DialogHeader><DialogTitle>Reset Kata Sandi</DialogTitle></DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label>Email Terdaftar</Label>
                <Input type="email" required className="h-12" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={isSendingReset}>Kirim Tautan Reset</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
