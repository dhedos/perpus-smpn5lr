
"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Plus, 
  Search, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Lock,
  KeyRound,
  Send,
  X,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, useAuth } from "@/firebase"
import { collection, doc, deleteDoc, updateDoc, setDoc, query, where, getDoc } from "firebase/firestore"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"
import { useToast } from "@/hooks/use-toast"
import { initializeApp, deleteApp } from "firebase/app"
import { sendPasswordResetEmail, getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"

export default function StaffPage() {
  const db = useFirestore()
  const auth = useAuth()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Staff" as "Admin" | "Staff"
  })

  const forceUnlockUI = useCallback(() => {
    if (typeof document !== 'undefined') {
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
      const focusGuards = document.querySelectorAll('[data-radix-focus-guard]');
      focusGuards.forEach(el => (el as HTMLElement).remove());
    }
  }, []);

  useEffect(() => {
    forceUnlockUI();
  }, [forceUnlockUI]);

  const usersCollectionRef = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, 'users')
  }, [db])

  const { data: allUsers, loading } = useCollection(usersCollectionRef)
  
  const staffMembers = useMemo(() => {
    if (!allUsers) return []
    return allUsers.filter(u => u.role === 'Admin' || u.role === 'Staff')
  }, [allUsers])

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(s => 
      (s.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
      (s.email?.toLowerCase() || "").includes(search.toLowerCase())
    )
  }, [staffMembers, search])

  const handleRegisterStaff = async () => {
    if (!db) return
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Data Belum Lengkap", variant: "destructive" })
      return
    }

    setIsRegistering(true)
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary')
    const secondaryAuth = getAuth(secondaryApp)

    try {
      let uid = ""
      try {
        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth, 
          formData.email, 
          formData.password
        )
        uid = userCredential.user.uid

        await updateProfile(userCredential.user, {
          displayName: formData.name
        })
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          // Robust Sinkronisasi: Jika akun ada di Auth tapi tidak di Firestore
          try {
            const loginResult = await signInWithEmailAndPassword(secondaryAuth, formData.email, formData.password)
            uid = loginResult.user.uid
          } catch (loginError: any) {
            throw authError
          }
        } else {
          throw authError
        }
      }

      const userDocRef = doc(db, 'users', uid)
      await setDoc(userDocRef, {
        id: uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true })

      toast({ 
        title: "Berhasil!", 
        description: `Akun ${formData.name} telah disinkronkan dengan database.` 
      })
      
      setIsOpen(false)
      setFormData({ name: "", email: "", password: "", role: "Staff" })
      setShowPassword(false)
      forceUnlockUI()
    } catch (error: any) {
      toast({ 
        title: "Pendaftaran Gagal", 
        description: "Firebase: Error (auth/email-already-in-use).", 
        variant: "destructive" 
      })
    } finally {
      await deleteApp(secondaryApp)
      setIsRegistering(false)
    }
  }

  const handleSendResetEmail = async (email: string, id: string) => {
    if (!auth) return
    setIsSendingReset(id)
    try {
      await sendPasswordResetEmail(auth, email)
      toast({ 
        title: "Email Terkirim", 
        description: `Tautan pemulihan kata sandi telah dikirim ke alamat: ${email}.` 
      })
    } catch (error: any) {
      toast({ 
        title: "Gagal Mengirim", 
        description: error.message, 
        variant: "destructive" 
      })
    } finally {
      setIsSendingReset(null)
    }
  }

  const handleDeleteStaff = (id: string) => {
    if (!db) return
    const userDocRef = doc(db, 'users', id)
    deleteDoc(userDocRef).catch(async (error) => {
       const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'delete',
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    })
    toast({ title: "Terhapus", description: "Petugas telah dihapus dari sistem." })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-primary">Petugas Perpustakaan</h1>
          <p className="text-muted-foreground text-sm">Kelola akses petugas dan sinkronisasi database akun.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if(!v) forceUnlockUI(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
              <UserPlus className="h-4 w-4" />
              Daftarkan Petugas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-background border-none rounded-[2rem] shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-primary font-black uppercase text-xl">Pendaftaran Petugas Baru</DialogTitle>
              <DialogDescription>
                Akun akan langsung terdaftar di database utama dan Firebase Auth.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest px-1">Nama Lengkap</Label>
                <Input 
                  placeholder="Nama Lengkap..." 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-xl bg-muted/20 border-slate-300 dark:border-white/10 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest px-1">Peran Akses</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v: any) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-slate-300 dark:border-white/10 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Petugas (Staff)</SelectItem>
                    <SelectItem value="Admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest px-1">Email Login</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input 
                    type="email"
                    placeholder="nama@email.com" 
                    className="pl-11 h-12 rounded-xl bg-muted/20 border-slate-300 dark:border-white/10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase text-muted-foreground tracking-widest px-1">Kata Sandi Awal</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter" 
                    className="pl-11 pr-12 h-12 rounded-xl bg-muted/20 border-slate-300 dark:border-white/10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 border-t pt-5">
              <Button variant="outline" onClick={() => { setIsOpen(false); forceUnlockUI(); }} className="rounded-xl">Batal</Button>
              <Button onClick={handleRegisterStaff} disabled={isRegistering} className="rounded-xl px-8 shadow-lg shadow-primary/20 font-black transition-all active:scale-95">
                {isRegistering ? <span className="animate-pulse">MENDAFTARKAN...</span> : "Konfirmasi Daftar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 bg-transparent p-4 rounded-[2rem] border border-slate-200 dark:border-white/20">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari berdasarkan nama atau email..." 
            className="pl-11 h-12 bg-background dark:bg-muted/10 border-slate-300 dark:border-white/10 rounded-full text-foreground font-medium" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-transparent">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-b dark:border-white/10">
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Petugas</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse duration-[2000ms]">LANTERA BACA</p>
                </TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                  Tidak ada petugas ditemukan.
                </TableCell>
              </TableRow>
            ) : filteredStaff.map((person) => (
              <TableRow key={person.id} className="hover:bg-muted/30 border-b dark:border-white/5">
                <TableCell>
                  <div className="font-bold">{person.name}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "h-5 px-2 text-[9px] font-black border-none uppercase",
                    person.role === 'Admin' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  )}>
                    {person.role?.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Mail className="h-3 w-3 opacity-60" />
                    <span className="text-xs">{person.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-primary hover:bg-primary/10 gap-2 font-bold text-xs rounded-lg"
                      onClick={() => handleSendResetEmail(person.email, person.id)}
                      disabled={isSendingReset === person.id}
                    >
                      {isSendingReset === person.id ? (
                         <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <KeyRound className="h-3 w-3" />
                      )}
                      <span>Reset Sandi</span>
                    </Button>
                    <DropdownMenu onOpenChange={(open) => { if(!open) forceUnlockUI(); }}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50">
                        <DropdownMenuItem className="gap-2 text-destructive font-bold" onSelect={(e) => {
                          e.preventDefault();
                          if(confirm("Hapus petugas ini dari database?")) handleDeleteStaff(person.id);
                        }}>
                          <Trash2 className="h-4 w-4" /> Hapus Permanen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="text-center py-6 opacity-30">
        <p className="text-[10px] font-black uppercase tracking-widest">© 2026 Lantera Baca</p>
      </div>
    </div>
  )
}
