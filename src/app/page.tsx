
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck, AlertCircle, Chrome } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
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
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [adminName, setAdminName] = useState("")

  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings, isLoading: settingsLoading } = useDoc(settingsRef)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && !authLoading && user && user.role && !isRedirecting) {
      setIsRedirecting(true)
      router.replace("/dashboard")
    }
  }, [user, authLoading, router, isMounted, isRedirecting])

  const usersQuery = useMemoFirebase(() => {
    if (!db || !isMounted || user) return null
    return query(collection(db, "users"), limit(1))
  }, [db, isMounted, user])
  
  const { data: usersList, isLoading: checkingUsers } = useCollection(usersQuery)
  const noUsersExist = !checkingUsers && usersList !== null && usersList.length === 0

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth) return
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      toast({ title: "Gagal Masuk", description: "Email atau kata sandi salah.", variant: "destructive" })
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
      }
    } catch (error: any) {
      toast({ title: "Gagal Login Google", description: error.message, variant: "destructive" })
      setLoading(false)
    }
  }

  const handleSetupAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !db) return
    setLoading(true)
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, "users", userCredential.user.uid), {
        id: userCredential.user.uid,
        name: adminName,
        email: email,
        role: "Admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    } catch (error: any) {
      toast({ title: "Setup Gagal", description: error.message, variant: "destructive" })
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

  const displayTitle = settings?.libraryName;
  const displaySubtitle = settings?.librarySubtitle;
  const displayLogo = settings?.libraryLogoUrl;

  const shouldShowLoading = !isMounted || (authLoading && !user) || (user && user.role && isRedirecting) || isRedirecting || settingsLoading;

  if (shouldShowLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          {displayLogo && !settingsLoading ? (
            <div className="w-24 h-24 flex items-center justify-center rounded-[2rem] bg-primary/10 text-primary shadow-sm overflow-hidden">
              <img src={displayLogo} alt="Logo" className="w-16 h-16 object-contain" />
            </div>
          ) : null}

          <div className="flex flex-col items-center space-y-2 text-center">
            {!settingsLoading && displayTitle ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm font-black text-primary uppercase tracking-[0.2em]">
                    {displayTitle}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50 px-4">
                  {displaySubtitle}
                </p>
              </>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-white rounded-3xl overflow-hidden">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-[2rem] bg-primary/10 text-primary mb-2 shadow-sm overflow-hidden">
            {displayLogo ? (
              <img src={displayLogo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black font-headline uppercase tracking-tighter text-primary leading-tight">
              {displayTitle || "LANTERA BACA"}
            </CardTitle>
            <CardDescription className="font-bold text-secondary uppercase tracking-[0.15em] text-xs text-center px-4">
              {isSetupMode ? "Inisialisasi Sistem Baru" : (displaySubtitle || "SMPN 5 LANGKE REMBONG")}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6 pb-6">
          <form onSubmit={isSetupMode ? handleSetupAdmin : handleLogin} className="space-y-4">
            {noUsersExist && !isSetupMode && (
              <Alert className="bg-primary/5 border-primary/20 text-primary rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase">Database Kosong</AlertTitle>
                <AlertDescription className="text-[10px] font-medium leading-relaxed">
                  Klik tombol "Inisialisasi Admin Pertama" di bawah untuk mendaftarkan akun pengelola sekolah Anda.
                </AlertDescription>
              </Alert>
            )}

            {isSetupMode && (
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold text-[10px] uppercase text-muted-foreground ml-1">Nama Lengkap Admin</Label>
                <Input id="name" placeholder="Nama Penanggung Jawab" required value={adminName} onChange={(e) => setAdminName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-[10px] uppercase text-muted-foreground ml-1">Alamat Email</Label>
              <Input id="email" type="email" placeholder="email@sekolah.sch.id" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold text-[10px] uppercase text-muted-foreground ml-1">Kata Sandi</Label>
                {!isSetupMode && <button type="button" onClick={() => setIsResetOpen(true)} className="text-[10px] font-black text-primary hover:underline uppercase">Lupa Sandi?</button>}
              </div>
              <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-slate-200" />
            </div>
            <Button type="submit" className="w-full h-12 text-sm font-black shadow-lg shadow-primary/20 rounded-xl" disabled={loading || (isMounted && checkingUsers)}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : isSetupMode ? "AKTIFKAN ADMIN UTAMA" : "MASUK KE SISTEM"}
            </Button>
          </form>

          {!isSetupMode && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-muted-foreground/40">
                  <span className="bg-white px-3">Atau Akses Cepat</span>
                </div>
              </div>
              <Button variant="outline" className="w-full h-12 gap-2 font-bold rounded-xl border-slate-200 hover:bg-slate-50" onClick={handleGoogleLogin} disabled={loading}>
                <Chrome className="h-5 w-5 text-red-500" /> Masuk dengan Google
              </Button>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 bg-slate-50/50 p-6 border-t border-slate-50">
          {!checkingUsers && noUsersExist && !isSetupMode && (
            <Button variant="outline" className="w-full border-dashed border-primary/40 text-primary h-12 rounded-xl font-bold bg-white" onClick={() => setIsSetupMode(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Inisialisasi Admin Pertama
            </Button>
          )}
          {isSetupMode && <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setIsSetupMode(false)}>Kembali ke Login</Button>}
          <p className="text-[10px] text-muted-foreground/60 text-center uppercase font-bold tracking-[0.2em]">© 2026 Lantera Baca</p>
        </CardFooter>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="bg-white rounded-3xl max-w-sm border-none shadow-2xl">
          <form onSubmit={handleSendResetEmail}>
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-tight text-primary">Reset Kata Sandi</DialogTitle>
              <DialogDescription className="text-xs">Kami akan mengirimkan tautan pemulihan ke email Anda.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Email Terdaftar</Label>
                <Input type="email" required className="h-12 rounded-xl" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="nama@email.com" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSendingReset} className="w-full h-11 font-bold rounded-xl">
                {isSendingReset ? <Loader2 className="animate-spin h-4 w-4" /> : "Kirim Tautan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
