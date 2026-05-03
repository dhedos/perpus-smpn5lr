
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, AlertCircle, Library } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth, useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
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
  const [logoLoaded, setLogoLoaded] = useState(false)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [adminName, setAdminName] = useState("")

  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [isSendingReset, setIsSendingReset] = useState(false)

  const [branding, setBranding] = useState<{logoUrl: string, libraryName: string, librarySubtitle: string} | null>(null)

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'settings', 'general') : null, [db])
  const { data: settings } = useDoc(settingsRef)

  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined' && (window as any).__BRANDING__) {
      setBranding((window as any).__BRANDING__)
    }
  }, [])

  useEffect(() => {
    if (settings) {
      setBranding({
        logoUrl: settings.libraryLogoUrl || branding?.logoUrl || '',
        libraryName: settings.libraryName || branding?.libraryName || 'LANTERA BACA',
        librarySubtitle: settings.librarySubtitle || branding?.librarySubtitle || 'SMPN 5 LANGKE REMBONG'
      })
    }
  }, [settings])

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
      toast({ 
        title: "Gagal Masuk", 
        description: "Email atau kata sandi salah. Pastikan akun sudah didaftarkan oleh Administrator.", 
        variant: "destructive" 
      })
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
      toast({ title: "Email Terkirim", description: "Tautan pengaturan ulang kata sandi telah dikirim ke email Anda." })
      setIsResetOpen(false)
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" })
    } finally {
      setIsSendingReset(false)
    }
  }

  const displayTitle = branding?.libraryName || "LANTERA BACA";
  const displaySubtitle = branding?.librarySubtitle || "SMPN 5 LANGKE REMBONG";
  const displayLogo = branding?.logoUrl;

  const shouldShowSplash = !isMounted || (authLoading && !user) || (user && user.role && isRedirecting) || isRedirecting;

  if (shouldShowSplash) {
    return (
      <div className="fixed inset-0 z-[9999] w-full h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
          <div className="w-32 h-32 flex items-center justify-center rounded-[2.5rem] bg-card shadow-2xl ring-1 ring-black/5 overflow-hidden relative">
            <Library className={`w-16 h-16 text-primary/10 animate-pulse absolute transition-opacity duration-300 ${logoLoaded ? 'opacity-0' : 'opacity-100'}`} />
            {displayLogo && (
              <img 
                src={displayLogo} 
                alt="Logo" 
                className={`w-20 h-20 object-contain relative z-10 transition-opacity duration-700 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`} 
                onLoad={() => setLogoLoaded(true)}
              />
            )}
          </div>

          <div className="flex flex-col items-center space-y-3 text-center">
            <p className="text-lg font-black text-primary uppercase tracking-[0.4em] animate-pulse duration-[2000ms]">
              {displayTitle}
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-80 px-4">
              {displaySubtitle}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in duration-700">
      <Card className="w-full max-w-md shadow-2xl border-none p-2 bg-card rounded-3xl overflow-hidden">
        <CardHeader className="space-y-4 text-center pt-8">
          <div className="mx-auto w-24 h-24 flex items-center justify-center rounded-[2rem] bg-primary/10 text-primary mb-2 shadow-sm overflow-hidden relative">
            <Library className={`w-12 h-12 text-primary/20 animate-pulse absolute transition-opacity duration-300 ${logoLoaded ? 'opacity-0' : 'opacity-100'}`} />
            {displayLogo && (
              <img 
                src={displayLogo} 
                alt="Logo" 
                className={`w-16 h-16 object-contain relative z-10 transition-opacity duration-700 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`} 
                onLoad={() => setLogoLoaded(true)}
              />
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black font-headline uppercase tracking-tighter text-primary leading-tight">
              {displayTitle}
            </CardTitle>
            <CardDescription className="font-bold text-secondary uppercase tracking-[0.15em] text-xs text-center px-4">
              {isSetupMode ? "Inisialisasi Sistem Baru" : displaySubtitle}
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
                <Input id="name" placeholder="Nama Penanggung Jawab" required value={adminName} onChange={(e) => setAdminName(e.target.value)} className="h-12 rounded-xl bg-background border-slate-200 dark:border-white/10" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-[10px] uppercase text-muted-foreground ml-1">Alamat Email</Label>
              <Input id="email" type="email" placeholder="email@sekolah.sch.id" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-background border-slate-200 dark:border-white/10" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-bold text-[10px] uppercase text-muted-foreground ml-1">Kata Sandi</Label>
                {!isSetupMode && <button type="button" onClick={() => setIsResetOpen(true)} className="text-[10px] font-black text-primary hover:underline uppercase">Lupa Sandi?</button>}
              </div>
              <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-background border-slate-200 dark:border-white/10" />
            </div>
            <Button type="submit" className="w-full h-12 text-sm font-black shadow-lg shadow-primary/20 rounded-xl" disabled={loading || (isMounted && checkingUsers)}>
              {loading ? <span className="animate-pulse">MEMPROSES...</span> : isSetupMode ? "AKTIFKAN ADMIN UTAMA" : "MASUK KE SISTEM"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 bg-muted/30 p-6 border-t dark:border-white/5">
          {!checkingUsers && noUsersExist && !isSetupMode && (
            <Button variant="outline" className="w-full border-dashed border-primary/40 text-primary h-12 rounded-xl font-bold bg-card" onClick={() => setIsSetupMode(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Inisialisasi Admin Pertama
            </Button>
          )}
          {isSetupMode && <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setIsSetupMode(false)}>Kembali ke Login</Button>}
          <p className="text-[10px] text-muted-foreground/60 text-center uppercase font-bold tracking-[0.2em]">© 2026 Lantera Baca</p>
        </CardFooter>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="bg-card rounded-3xl max-w-sm border-none shadow-2xl">
          <form onSubmit={handleSendResetEmail}>
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-tight text-primary">Reset Kata Sandi</DialogTitle>
              <DialogDescription className="text-xs">Kami akan mengirimkan tautan pemulihan ke email Anda jika sudah terdaftar.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Email Terdaftar</Label>
                <Input type="email" required className="h-12 rounded-xl" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="nama@email.com" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSendingReset} className="w-full h-11 font-bold rounded-xl">
                {isSendingReset ? "Mengirim..." : "Kirim Tautan Pemulihan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
